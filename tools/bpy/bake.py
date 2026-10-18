# tools/bpy/bake.py — round 17a: Cycles headless lightmap bake + ADR-0013 probe (bake side).
#
# Implements docs/design-staircase.md
#   §3.2  bake row: Cycles CPU, OIDN denoise, <= 2K, sample cap, one Blender process per state;
#         wall time is measured by tools/bake.mjs around this process (no clock reads here).
#   §3.3  committed layout: lm/day | dusk | night and probe/dusk — written here as LDR PNG
#         intermediates (+ never-committed EXRs); tools/bake.mjs turns them into ktx2.
#   §4    three light states baked independently with absolute brightness; LDR encode is
#         clamp(linear / whitePoint, 0, 1) against ONE per-room white point that the manifest's
#         lightmaps.intensity restores at runtime (17b). The lightmap is irradiance only.
#   §5 / ADR-0013 (amended): one static dusk probe per room, Cycles panorama camera, committed
#         as a single equirectangular 512x256, white point 1.0 (absolute LDR clamp).
#
# Invocation — the room-builder grammar plus --state:
#   blender -b --factory-startup -noaudio -P tools/bpy/bake.py -- \
#     --room <rastrelli-gallery|jordan> --state <day|dusk|nightChandeliers> --out <stage>
#
# State law (declared once, applied in build_rig):
#   day               sun lamp at the +15 deg plateau, neutral-white world, fixtures OFF,
#                     jordan panes swapped to transmissive glass (in-bake only, glb untouched).
#   dusk              no sun (the -6.6 deg one-hot centre is below the horizon), dim neutral
#                     world with a north horizon glow, fixtures ON, panes swapped, probe rendered.
#   nightChandeliers  black world, no sun, fixtures ON — emission is the only light.
# Bake law: target = the committed 'lm' UV layer; DIFFUSE with DIRECT+INDIRECT, COLOR off.
# Instanced template meshes bake once (first instance by name): the lm cells live on the shared
# mesh data, so every instance would overwrite the same cells.
# Determinism law: fixed Cycles seed, CPU device, no randomness, no clock reads, sorted-key JSON,
# locale-independent output. The committed glb is never read or written here.
import argparse
import json
import math
import os
import sys
import traceback
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector

ROOMS = ('rastrelli-gallery', 'jordan')
STATES = ('day', 'dusk', 'nightChandeliers')
STATE_ALIASES = {'night': 'nightChandeliers'}
STATE_FILE = {'day': 'day', 'dusk': 'dusk', 'nightChandeliers': 'night'}
LM_UV_LAYER = 'lm'
BPY_DIR = Path(__file__).resolve().parent

# ---- Declared numbers (FILL: the orchestrator tunes these from the first real bake logs) ----
# Directions are in the glTF/three frame (+X east, +Y up, +Z south), unit, pointing TO the sun.
DAY_SUN_DIR = (0.9016, 0.2591, -0.3463)      # FILL: +15 deg plateau, 2026-06-22 06:18 UTC+3
DUSK_WORLD_DIR = (0.0000, -0.1150, -0.9930)  # FILL: -6.6 deg one-hot centre, 00:50 UTC+3
SUN_STRENGTH = 4.0        # FILL — new default; MASKED-IN-BRIEF: keep the SUN_STRENGTH value
SUN_ANGLE_DEG = 0.53      # solar disc
# FILL — new defaults; MASKED-IN-BRIEF: keep the WORLD_STRENGTH values
WORLD_STRENGTH = {'day': 1.0, 'dusk': 0.08, 'nightChandeliers': 0.0}
DUSK_GLOW_GAIN = 0.25     # FILL — new default; MASKED-IN-BRIEF: keep the DUSK_GLOW_GAIN value
DUSK_GLOW_POWER = 4.0     # FILL — new default; MASKED-IN-BRIEF: keep the DUSK_GLOW_POWER value
BAKE_SAMPLES = 128        # FILL — new default; MASKED-IN-BRIEF: keep the BAKE_SAMPLES value
PROBE_SAMPLES = 256       # FILL — new default; MASKED-IN-BRIEF: keep the PROBE_SAMPLES value
BAKE_MARGIN_PX = None     # FILL — None = the builder's LM_PAD_PX; MASKED-IN-BRIEF: keep the value
# FILL — ONE scalar per room (the manifest type pins a single number); tuned so the night
# chandelier range survives. MASKED-IN-BRIEF: keep the WHITE_POINT values
WHITE_POINT = {'rastrelli-gallery': 4.0, 'jordan': 6.0}
PROBE_WHITE_POINT = 1.0   # pinned by ADR-0013: "neutral" = absolute LDR clamp
PROBE_RES = (512, 256)    # pinned by the ADR-0013 amendment (equirect)
# FILL — glTF frame; gallery ~ the passage end, jordan ~ under the vault centre.
# MASKED-IN-BRIEF: keep the PROBE_POINT values
PROBE_POINT = {'rastrelli-gallery': (0.0, 1.7, 80.0), 'jordan': (79.0, 9.0, -74.0)}
PROBE_YAW_DEG = 0.0       # FILL — aligned against three's equirect convention in 17b
PANE_MATERIAL_NAMES = ('pane',)  # FILL — exact committed name(s) of the jordan window pane
CYCLES_SEED = 0
MAX_BOUNCES = 8
DIFFUSE_BOUNCES = 4
GLOSSY_BOUNCES = 4
TRANSMISSION_BOUNCES = 8
TRANSPARENT_BOUNCES = 8
SAMPLE_CLAMP_INDIRECT = 10.0
DENOISER = 'OPENIMAGEDENOISE'


def fail(message):
    print(f'bake.py: {message}', file=sys.stderr, flush=True)
    sys.exit(1)


def gltf_to_blender(vector):
    # glTF (x, y, z) with +Y up  ->  Blender (x, -z, y) with +Z up (inverse of the exporter).
    x, y, z = vector
    return (x, -z, y)


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    parser = argparse.ArgumentParser(prog='bake.py')
    parser.add_argument('--room', required=True)
    parser.add_argument('--state', required=True)
    parser.add_argument('--out', '--stage', dest='out')
    parser.add_argument('out_positional', nargs='?')
    args = parser.parse_args(argv)
    out = args.out or args.out_positional
    if out is None:
        parser.error('--out <stage> is required')
    state = STATE_ALIASES.get(args.state, args.state)
    if args.room not in ROOMS:
        fail(f'unknown room {args.room!r}; expected one of {list(ROOMS)}')
    if state not in STATES:
        fail(f'unknown state {args.state!r}; expected one of {list(STATES)}')
    return args.room, state, Path(out).resolve()


def build_room(room, stage):
    # Factory-empty scene, then exec the committed builder with ZIMNY_BAKE=1 so it populates
    # bpy.data and (guard patch) skips the glb export + its ZIMNY_SUMMARY line.
    bpy.ops.wm.read_factory_settings(use_empty=True)
    source_path = BPY_DIR / f'{room}.py'
    if not source_path.exists():
        fail(f'no committed builder at {source_path}')
    saved_argv = sys.argv
    # The builders parse their own argv; hand them exactly their grammar (no --state).
    sys.argv = [sys.argv[0], '--', '--room', room, '--out', str(stage)]
    os.environ['ZIMNY_BAKE'] = '1'
    namespace = {'__name__': '__main__', '__file__': str(source_path)}
    try:
        code = compile(source_path.read_text(encoding='utf-8'), str(source_path), 'exec')
        exec(code, namespace)
    finally:
        sys.argv = saved_argv
    scene = bpy.context.scene
    meshes = [obj for obj in scene.objects if obj.type == 'MESH' and not obj.hide_render]
    if not meshes:
        fail(f'the {room} builder produced no renderable mesh objects')
    return namespace, scene, meshes


def builder_constant(namespace, name, required=True):
    if name not in namespace:
        if required:
            fail(f'builder namespace has no {name}')
        return None
    return namespace[name]


def new_fallback_material():
    mat = bpy.data.materials.new('ZIMNY_BAKE_FALLBACK')
    mat.use_nodes = True
    return mat


def ensure_materials(meshes):
    # Every baked object needs at least one material carrying the target image node.
    fallback = None
    for obj in meshes:
        if len(obj.material_slots) == 0:
            fallback = fallback or new_fallback_material()
            obj.data.materials.append(fallback)
        for slot in obj.material_slots:
            if slot.material is None:
                fallback = fallback or new_fallback_material()
                slot.material = fallback
    unique = {}
    for obj in meshes:
        for slot in obj.material_slots:
            unique[slot.material.name] = slot.material
    return [unique[name] for name in sorted(unique)]


def is_pane_material(mat):
    base = mat.name.split('.')[0]
    return base in PANE_MATERIAL_NAMES


def swap_panes_to_glass(materials):
    # Baked-opaque at runtime, but the sun must enter during day/dusk: glass for camera rays,
    # transparent for shadow + diffuse rays so direct sun and bounces pass without caustics.
    swapped = []
    for mat in materials:
        if not is_pane_material(mat):
            continue
        mat.use_nodes = True
        tree = mat.node_tree
        tree.nodes.clear()
        output = tree.nodes.new('ShaderNodeOutputMaterial')
        glass = tree.nodes.new('ShaderNodeBsdfGlass')
        glass.inputs['Color'].default_value = (1.0, 1.0, 1.0, 1.0)
        glass.inputs['Roughness'].default_value = 0.0
        glass.inputs['IOR'].default_value = 1.45
        transparent = tree.nodes.new('ShaderNodeBsdfTransparent')
        light_path = tree.nodes.new('ShaderNodeLightPath')
        either = tree.nodes.new('ShaderNodeMath')
        either.operation = 'MAXIMUM'
        mix = tree.nodes.new('ShaderNodeMixShader')
        tree.links.new(light_path.outputs['Is Shadow Ray'], either.inputs[0])
        tree.links.new(light_path.outputs['Is Diffuse Ray'], either.inputs[1])
        tree.links.new(either.outputs['Value'], mix.inputs['Fac'])
        tree.links.new(glass.outputs['BSDF'], mix.inputs[1])
        tree.links.new(transparent.outputs['BSDF'], mix.inputs[2])
        tree.links.new(mix.outputs['Shader'], output.inputs['Surface'])
        swapped.append(mat.name)
    return swapped


def set_fixtures_off(materials):
    # Day: fixtures OFF. Emission strengths otherwise stay exactly as committed.
    for mat in materials:
        if not mat.use_nodes:
            continue
        for node in mat.node_tree.nodes:
            if node.type == 'BSDF_PRINCIPLED' and 'Emission Strength' in node.inputs:
                node.inputs['Emission Strength'].default_value = 0.0
            elif node.type == 'EMISSION':
                node.inputs['Strength'].default_value = 0.0


def add_sun(scene):
    data = bpy.data.lights.new('ZIMNY_SUN', 'SUN')
    data.energy = SUN_STRENGTH
    data.angle = math.radians(SUN_ANGLE_DEG)
    data.color = (1.0, 1.0, 1.0)
    data.use_shadow = True
    obj = bpy.data.objects.new('ZIMNY_SUN', data)
    scene.collection.objects.link(obj)
    to_sun = Vector(gltf_to_blender(DAY_SUN_DIR)).normalized()
    # A sun lamp shines along its local -Z: point it from the sun toward the scene.
    obj.rotation_euler = (-to_sun).to_track_quat('-Z', 'Y').to_euler()
    return obj


def build_world(scene, state):
    world = bpy.data.worlds.new('ZIMNY_BAKE_WORLD')
    world.use_nodes = True
    tree = world.node_tree
    tree.nodes.clear()
    output = tree.nodes.new('ShaderNodeOutputWorld')
    background = tree.nodes.new('ShaderNodeBackground')
    background.inputs['Color'].default_value = (1.0, 1.0, 1.0, 1.0)
    base = WORLD_STRENGTH[state]
    background.inputs['Strength'].default_value = base
    if state == 'dusk' and DUSK_GLOW_GAIN > 0.0:
        # Horizon glow toward the below-horizon sun: base + gain * max(dot, 0) ^ power.
        coords = tree.nodes.new('ShaderNodeTexCoord')
        dot = tree.nodes.new('ShaderNodeVectorMath')
        dot.operation = 'DOT_PRODUCT'
        dot.inputs[1].default_value = gltf_to_blender(DUSK_WORLD_DIR)
        positive = tree.nodes.new('ShaderNodeMath')
        positive.operation = 'MAXIMUM'
        positive.inputs[1].default_value = 0.0
        power = tree.nodes.new('ShaderNodeMath')
        power.operation = 'POWER'
        power.inputs[1].default_value = DUSK_GLOW_POWER
        strength = tree.nodes.new('ShaderNodeMath')
        strength.operation = 'MULTIPLY_ADD'
        strength.inputs[1].default_value = DUSK_GLOW_GAIN
        strength.inputs[2].default_value = base
        tree.links.new(coords.outputs['Generated'], dot.inputs[0])
        tree.links.new(dot.outputs['Value'], positive.inputs[0])
        tree.links.new(positive.outputs['Value'], power.inputs[0])
        tree.links.new(power.outputs['Value'], strength.inputs[0])
        tree.links.new(strength.outputs['Value'], background.inputs['Strength'])
    tree.links.new(background.outputs['Background'], output.inputs['Surface'])
    scene.world = world


def set_panorama_type(camera, value):
    # Blender 4.0 moved panorama settings from Camera.cycles to Camera itself.
    if hasattr(camera, 'panorama_type'):
        camera.panorama_type = value
    else:
        camera.cycles.panorama_type = value


def add_probe_camera(scene, room):
    camera = bpy.data.cameras.new('ZIMNY_PROBE')
    camera.type = 'PANO'
    set_panorama_type(camera, 'EQUIRECTANGULAR')
    obj = bpy.data.objects.new('ZIMNY_PROBE', camera)
    scene.collection.objects.link(obj)
    obj.location = gltf_to_blender(PROBE_POINT[room])
    obj.rotation_euler = (math.radians(90.0), 0.0, math.radians(PROBE_YAW_DEG))
    scene.camera = obj
    return obj


def configure_cycles(scene, samples):
    scene.render.engine = 'CYCLES'
    cycles = scene.cycles
    cycles.device = 'CPU'
    cycles.samples = samples
    cycles.use_adaptive_sampling = False
    cycles.time_limit = 0.0
    cycles.seed = CYCLES_SEED
    cycles.use_animated_seed = False
    cycles.max_bounces = MAX_BOUNCES
    cycles.diffuse_bounces = DIFFUSE_BOUNCES
    cycles.glossy_bounces = GLOSSY_BOUNCES
    cycles.transmission_bounces = TRANSMISSION_BOUNCES
    cycles.transparent_max_bounces = TRANSPARENT_BOUNCES
    cycles.caustics_reflective = False
    cycles.caustics_refractive = False
    cycles.blur_glossy = 1.0
    cycles.sample_clamp_direct = 0.0
    cycles.sample_clamp_indirect = SAMPLE_CLAMP_INDIRECT
    cycles.use_light_tree = True
    render = scene.render
    render.use_persistent_data = False
    render.dither_intensity = 0.0
    render.resolution_percentage = 100
    render.pixel_aspect_x = 1.0
    render.pixel_aspect_y = 1.0
    render.film_transparent = False
    render.use_compositing = True
    render.use_sequencer = False
    scene.view_settings.view_transform = 'Standard'
    scene.view_settings.look = 'None'
    scene.view_settings.exposure = 0.0
    scene.view_settings.gamma = 1.0


def configure_bake(scene, margin_px):
    bake = scene.render.bake
    bake.target = 'IMAGE_TEXTURES'
    bake.use_selected_to_active = False
    bake.use_clear = True
    bake.margin = margin_px
    bake.margin_type = 'EXTEND'
    bake.use_pass_direct = True
    bake.use_pass_indirect = True
    bake.use_pass_color = False
    scene.cycles.bake_type = 'DIFFUSE'
    scene.cycles.use_denoising = False


def configure_render_denoise(scene):
    cycles = scene.cycles
    cycles.use_denoising = True
    cycles.denoiser = DENOISER
    cycles.denoising_input_passes = 'RGB_ALBEDO_NORMAL'
    cycles.denoising_prefilter = 'ACCURATE'
    if hasattr(cycles, 'denoising_use_gpu'):
        cycles.denoising_use_gpu = False


def set_exr_output(render, path):
    settings = render.image_settings
    settings.file_format = 'OPEN_EXR'
    settings.color_mode = 'RGB'
    settings.color_depth = '32'
    settings.exr_codec = 'ZIP'
    render.filepath = str(path)
    render.use_file_extension = False


def attach_target(mat, image):
    mat.use_nodes = True
    nodes = mat.node_tree.nodes
    for node in nodes:
        node.select = False
    node = nodes.new('ShaderNodeTexImage')
    node.name = 'ZIMNY_BAKE_TARGET'
    node.image = image
    node.select = True
    nodes.active = node


def bake_targets(meshes):
    # One representative per mesh datablock, chosen deterministically by object name.
    by_mesh = {}
    for obj in sorted(meshes, key=lambda item: item.name):
        by_mesh.setdefault(obj.data.name, obj)
    return [by_mesh[name] for name in sorted(by_mesh)]


def bake_lightmap(scene, meshes, targets, materials, res, margin_px):
    image = bpy.data.images.new(
        'ZIMNY_LM', res, res, alpha=False, float_buffer=True, is_data=True
    )
    if hasattr(image, 'use_half_precision'):
        image.use_half_precision = False
    for mat in materials:
        attach_target(mat, image)
    for obj in scene.objects:
        obj.select_set(False)
    for obj in targets:
        layer = obj.data.uv_layers.get(LM_UV_LAYER)
        if layer is None:
            fail(f"mesh {obj.data.name!r} has no '{LM_UV_LAYER}' UV layer")
        obj.data.uv_layers.active = layer
        obj.hide_viewport = False
        obj.hide_set(False)
        obj.select_set(True)
    bpy.context.view_layer.objects.active = targets[0]
    result = bpy.ops.object.bake(
        type='DIFFUSE',
        pass_filter={'DIRECT', 'INDIRECT'},
        margin=margin_px,
        margin_type='EXTEND',
        use_selected_to_active=False,
        target='IMAGE_TEXTURES',
        save_mode='INTERNAL',
        use_clear=True,
        uv_layer=LM_UV_LAYER,
    )
    if 'FINISHED' not in result:
        fail(f'bpy.ops.object.bake returned {sorted(result)}')
    for obj in meshes:
        obj.select_set(False)
    return image


def save_exr(image, path):
    image.filepath_raw = str(path)
    image.file_format = 'OPEN_EXR'
    image.save()


def denoise_image(scene, image, exr_path):
    # Cycles 4.2 does not denoise bakes; run the baked float image through the compositor's
    # OIDN node (no Render Layers node, so the composite output is the image itself). The
    # 3D pass Blender still runs behind the compositor is unused: pin it to one sample so
    # it stays cheap (the baked image already holds the full-sample result).
    scene.use_nodes = True
    tree = scene.node_tree
    tree.nodes.clear()
    source = tree.nodes.new('CompositorNodeImage')
    source.image = image
    denoise = tree.nodes.new('CompositorNodeDenoise')
    denoise.use_hdr = True
    denoise.prefilter = 'ACCURATE'
    composite = tree.nodes.new('CompositorNodeComposite')
    tree.links.new(source.outputs['Image'], denoise.inputs['Image'])
    tree.links.new(denoise.outputs['Image'], composite.inputs['Image'])
    render = scene.render
    render.resolution_x, render.resolution_y = image.size
    render.resolution_percentage = 100
    scene.cycles.samples = 1  # orchestrator adjudication: the discarded 3D pass must be cheap
    if hasattr(render, 'compositor_device'):
        render.compositor_device = 'CPU'
    if hasattr(render, 'compositor_precision'):
        render.compositor_precision = 'FULL'
    set_exr_output(render, exr_path)
    bpy.ops.render.render(write_still=True)
    scene.use_nodes = False
    if not exr_path.exists():
        fail(f'compositor wrote no denoised EXR at {exr_path}')
    return bpy.data.images.load(str(exr_path))


def render_probe(scene, exr_path):
    render = scene.render
    render.resolution_x, render.resolution_y = PROBE_RES
    render.resolution_percentage = 100
    scene.cycles.samples = PROBE_SAMPLES
    configure_render_denoise(scene)
    scene.use_nodes = False
    set_exr_output(render, exr_path)
    bpy.ops.render.render(write_still=True)
    if not exr_path.exists():
        fail(f'probe render wrote no EXR at {exr_path}')
    return bpy.data.images.load(str(exr_path))


def encode_ldr(source, white_point, name, png_path):
    # encoded = clamp(linear / whitePoint, 0, 1), saved as Non-Color (linear) 8-bit PNG.
    width, height = source.size
    channels = source.channels
    linear = np.empty(width * height * channels, dtype=np.float32)
    source.pixels.foreach_get(linear)
    rgb = linear.reshape(-1, channels)[:, :3]
    peak = float(rgb.max())
    clipped = float(np.mean(np.any(rgb > white_point, axis=1)))
    ldr = bpy.data.images.new(name, width, height, alpha=False, float_buffer=False, is_data=True)
    encoded = np.ones((width * height, ldr.channels), dtype=np.float32)
    encoded[:, :3] = np.clip(rgb / white_point, 0.0, 1.0)
    ldr.pixels.foreach_set(encoded.ravel())
    ldr.filepath_raw = str(png_path)
    ldr.file_format = 'PNG'
    ldr.save()
    return peak, clipped


def print_summary(summary):
    print('ZIMNY_SUMMARY ' + json.dumps(summary, sort_keys=True), flush=True)


def main():
    room, state, stage = parse_args()
    stage.mkdir(parents=True, exist_ok=True)
    namespace, scene, meshes = build_room(room, stage)
    lm_res = int(builder_constant(namespace, 'LM_RES'))
    lm_pad = int(builder_constant(namespace, 'LM_PAD_PX'))
    lm_grid = builder_constant(namespace, 'LM_GRID', required=False)
    margin_px = lm_pad if BAKE_MARGIN_PX is None else BAKE_MARGIN_PX
    white_point = WHITE_POINT[room]
    file_state = STATE_FILE[state]
    materials = ensure_materials(meshes)
    swapped = swap_panes_to_glass(materials) if state != 'nightChandeliers' else []
    if state == 'day':
        set_fixtures_off(materials)
        add_sun(scene)
    build_world(scene, state)
    add_probe_camera(scene, room)
    configure_cycles(scene, BAKE_SAMPLES)
    configure_bake(scene, margin_px)
    targets = bake_targets(meshes)
    lm_dir = stage / 'lm'
    lm_dir.mkdir(parents=True, exist_ok=True)
    raw = bake_lightmap(scene, meshes, targets, materials, lm_res, margin_px)
    save_exr(raw, lm_dir / f'{file_state}.raw.exr')
    denoised = denoise_image(scene, raw, lm_dir / f'{file_state}.exr')
    lm_png = lm_dir / f'{file_state}.png'
    peak, clipped = encode_ldr(denoised, white_point, 'ZIMNY_LM_LDR', lm_png)
    files = [(f'lm/{file_state}.png', lm_png)]
    probe = None
    if state == 'dusk':
        probe_dir = stage / 'probe'
        probe_dir.mkdir(parents=True, exist_ok=True)
        probe_image = render_probe(scene, probe_dir / 'dusk.exr')
        probe_png = probe_dir / 'dusk.png'
        probe_peak, probe_clipped = encode_ldr(
            probe_image, PROBE_WHITE_POINT, 'ZIMNY_PROBE_LDR', probe_png
        )
        files.append(('probe/dusk.png', probe_png))
        probe = {
            'clippedFraction': round(probe_clipped, 4),
            'peak': round(probe_peak, 4),
            'point': list(PROBE_POINT[room]),
            'res': list(PROBE_RES),
            'samples': PROBE_SAMPLES,
            'whitePoint': PROBE_WHITE_POINT,
        }
    print_summary({
        'bakedObjects': len(targets),
        'blender': bpy.app.version_string,
        'clippedFraction': round(clipped, 4),
        'denoiser': DENOISER,
        'device': 'CPU',
        'files': [{'bytes': os.path.getsize(path), 'rel': rel} for rel, path in files],
        'lmGrid': lm_grid,
        'margin': margin_px,
        'meshObjects': len(meshes),
        'panesSwapped': swapped,
        'peak': round(peak, 4),
        'probe': probe,
        'res': lm_res,
        'room': room,
        'samples': BAKE_SAMPLES,
        'seconds': None,
        'state': state,
        'whitePoint': white_point,
    })


def run():
    try:
        main()
    except SystemExit:
        raise
    except Exception:  # noqa: BLE001 — a loud non-zero exit is the contract
        traceback.print_exc()
        fail('bake failed (traceback above)')


run()
