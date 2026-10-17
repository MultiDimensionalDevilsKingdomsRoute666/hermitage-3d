# Pipeline-check room (_check) — design-staircase.md §3.2 rule 2, DEC-016.
# usage: blender -b --factory-startup -noaudio -P tools/bpy/_pipeline_check.py -- --room _check --out <stage>
# Deterministic by construction: fixed seed, math-generated meshes (no procedural noise), stable
# object/mesh names, no modifiers, export_apply=True, two UV maps per mesh ('uv' -> TEXCOORD_0,
# 'lm' -> TEXCOORD_1), no tangents. Writes <stage>/<room>.raw.glb + <stage>/albedo.png and prints
# one ZIMNY_SUMMARY line (captured by tools/asset.mjs).
import json
import math
import os
import random
import sys

import bmesh
import bpy

SEED = 20261017
random.seed(SEED)  # nothing below draws randomness; pinned so future edits inherit the rule
# Sconce emission strength 6.0: clearly above the planned r18 bloom threshold (~1.0 luminance),
# low enough that KHR_materials_emissive_strength stays in the range three tonemaps gracefully.
SCONCE_EMISSION = 6.0
CHECKER = ((0.86, 0.80, 0.70), (0.30, 0.26, 0.24))  # warm stone / dark stone, sRGB


def parse_args():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    out, room = None, '_check'
    for i, a in enumerate(argv):
        if a == '--out':
            out = argv[i + 1]
        elif a == '--room':
            room = argv[i + 1]
    if not out:
        raise SystemExit('usage: blender -b -P _pipeline_check.py -- --room _check --out <dir>')
    return room, os.path.abspath(out)


def checker_png(path):
    """64x64 tileable checker, 8 cells per edge, pure math (no per-pixel noise)."""
    size, cells = 64, 8
    img = bpy.data.images.new('checker_gen', size, size, alpha=False)
    img.colorspace_settings.name = 'sRGB'
    px = []
    for y in range(size):
        for x in range(size):
            c = CHECKER[((x * cells // size) + (y * cells // size)) % 2]
            px.extend((c[0], c[1], c[2], 1.0))
    img.pixels = px
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    bpy.data.images.remove(img)
    loaded = bpy.data.images.load(path)  # FILE source: exporter embeds the PNG bytes verbatim
    loaded.name = 'checker'
    loaded.colorspace_settings.name = 'sRGB'
    return loaded


def principled(name, color, roughness, image=None, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nodes, links = mat.node_tree.nodes, mat.node_tree.links
    bsdf = nodes['Principled BSDF']
    bsdf.inputs['Base Color'].default_value = (*color, 1.0)
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = 0.0
    if image is not None:
        tex = nodes.new('ShaderNodeTexImage')
        tex.image = image
        tex.interpolation = 'Linear'
        uv = nodes.new('ShaderNodeUVMap')
        uv.uv_map = 'uv'
        links.new(uv.outputs['UV'], tex.inputs['Vector'])
        links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    if emission is not None:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = SCONCE_EMISSION
    return mat


def project(co, axis):
    return (co.y, co.z) if axis == 0 else (co.x, co.z) if axis == 1 else (co.x, co.y)


def assign_uvs(bm, tile):
    """'uv': world-space box projection (tile metres per repeat). 'lm': non-overlapping per-face atlas."""
    uv = bm.loops.layers.uv.new('uv')
    lm = bm.loops.layers.uv.new('lm')
    n = max(1, math.ceil(math.sqrt(len(bm.faces))))
    pad = 0.1
    for i, f in enumerate(bm.faces):
        axis = max(range(3), key=lambda k: abs(f.normal[k]))
        pts = [project(l.vert.co, axis) for l in f.loops]
        lo = (min(p[0] for p in pts), min(p[1] for p in pts))
        ext = (max(max(p[0] for p in pts) - lo[0], 1e-6), max(max(p[1] for p in pts) - lo[1], 1e-6))
        cx, cy = i % n, i // n
        for l, p in zip(f.loops, pts):
            l[uv].uv = (p[0] / tile, p[1] / tile)
            l[lm].uv = ((cx + pad + (p[0] - lo[0]) / ext[0] * (1 - 2 * pad)) / n,
                        (cy + pad + (p[1] - lo[1]) / ext[1] * (1 - 2 * pad)) / n)


def finish(name, bm, materials, tile=1.0, smooth=True):
    bm.normal_update()
    assign_uvs(bm, tile)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in materials:
        me.materials.append(m)
    for p in me.polygons:
        p.use_smooth = smooth
    return me


def add_object(name, me, location=(0.0, 0.0, 0.0)):
    ob = bpy.data.objects.new(name, me)
    ob.location = location
    bpy.context.scene.collection.objects.link(ob)
    return ob


def floor_mesh(mat):
    bm = bmesh.new()
    bmesh.ops.create_grid(bm, x_segments=2, y_segments=2, size=4.0)  # 8 x 8 m, 2 x 2 quads
    return finish('floor', bm, [mat], tile=2.0, smooth=False)


def arch_mesh(mat, big=3.0, small=0.25, major=24, minor=12):
    """180-degree torus arc standing in the XZ plane; outward winding, open ends."""
    bm = bmesh.new()
    rings = []
    for i in range(major + 1):
        u = math.pi * i / major
        ring = []
        for j in range(minor):
            v = 2 * math.pi * j / minor
            ring.append(bm.verts.new(((big + small * math.cos(v)) * math.cos(u), small * math.sin(v), (big + small * math.cos(v)) * math.sin(u))))
        rings.append(ring)
    for i in range(major):
        a, b = rings[i], rings[i + 1]
        for j in range(minor):
            bm.faces.new((a[j], a[(j + 1) % minor], b[(j + 1) % minor], b[j]))
    return finish('arch', bm, [mat])


def sconce_mesh(mat_bracket, mat_glow):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=(0.10, 0.30, 0.10), verts=bm.verts)
    bracket = set(bm.faces)
    cone = bmesh.ops.create_cone(bm, cap_ends=True, segments=16, radius1=0.06, radius2=0.16, depth=0.24)
    bmesh.ops.translate(bm, vec=(0.0, 0.25, 0.20), verts=cone['verts'])
    for f in bm.faces:
        f.material_index = 0 if f in bracket else 1
    me = finish('sconce', bm, [mat_bracket, mat_glow])
    for p in me.polygons:
        p.use_smooth = p.material_index == 1  # flat bracket, smooth shade
    return me


def baluster_mesh(mat):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=8, radius1=0.05, radius2=0.05, depth=0.9)
    return finish('baluster', bm, [mat])  # 2nd/3rd datablocks become baluster.001/.002 (identical geometry)


def export(path):
    bpy.ops.export_scene.gltf(
        filepath=path, export_format='GLB', export_apply=True, export_yup=True,
        export_texcoords=True, export_normals=True, export_tangents=False,
        export_materials='EXPORT', export_image_format='AUTO',
        export_cameras=False, export_lights=False, export_animations=False, export_skins=False,
        export_morph=False, export_extras=False, use_selection=False,
        export_draco_mesh_compression_enable=False, will_save_settings=False)


def main():
    room, out = parse_args()
    os.makedirs(out, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    png = os.path.join(out, 'albedo.png')
    checker = checker_png(png)
    m_checker = principled('stone_checker', (1.0, 1.0, 1.0), 0.9, image=checker)
    m_stone = principled('stone_plain', (0.72, 0.68, 0.62), 0.8)
    m_iron = principled('bracket_iron', (0.18, 0.17, 0.16), 0.6)
    m_glow = principled('sconce_glow', (0.05, 0.04, 0.03), 0.4, emission=(1.0, 0.75, 0.45))
    add_object('floor', floor_mesh(m_checker))
    add_object('arch', arch_mesh(m_stone))
    add_object('sconce', sconce_mesh(m_iron, m_glow), (3.4, 0.0, 1.8))
    for x in (1.0, 1.5, 2.0):
        add_object('baluster', baluster_mesh(m_stone), (x, 2.0, 0.45))
    glb = os.path.join(out, f'{room}.raw.glb')
    export(glb)
    meshes = [{'name': me.name, 'triangles': sum(len(p.vertices) - 2 for p in me.polygons)}
              for me in sorted(bpy.data.meshes, key=lambda m: m.name)]
    summary = {'room': room, 'seed': SEED, 'emission': SCONCE_EMISSION, 'meshes': meshes,
               'triangles': sum(m['triangles'] for m in meshes), 'glb': glb, 'albedo': png}
    print('ZIMNY_SUMMARY ' + json.dumps(summary, sort_keys=True))


main()
