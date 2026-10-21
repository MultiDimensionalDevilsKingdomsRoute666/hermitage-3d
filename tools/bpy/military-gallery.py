# Zimny Phase 3 R1b — military-gallery room kit (Blender 4.2 LTS, headless).
# Run by tools/asset.mjs `bpy military-gallery` (stem = room id verbatim).
#
# Implements design-gallery.md §2.2 (placement), §2.4 (palette), §2.5/§2.6
# (kit), §3.1 (kit list), DEC-024 (torchere振 candelabra, DEC-028 night law)
# with the frame kit in tools/bpy/military_gallery_frames.py.
#
# Writes:  <stage>/military-gallery.raw.glb
#          <stage>/tex/military-gallery-parquet.png (math-only, 512x512)
#          <stage>/summary.json  and one `ZIMNY_SUMMARY <json sorted-keys>` line.
# INT: stage-dir handoff mirrors the sibling rooms (asset.mjs invokes
# `... -P <py> -- --room <id> --out <stage>`; also --stage, positional,
# ZIMNY_STAGE_DIR).
#
# Deterministic: no randomness, no clock, every dimension a named constant,
# stable part names for the gltf-transform pass. Repeat runs byte-identical.
# ZIMNY_BAKE=1: build the scene, skip export/summary (the bake owns stdout).

import bmesh
import bpy
from mathutils import Vector

import os
import sys

BAKE = os.environ.get('ZIMNY_BAKE') == '1'
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, SCRIPT_DIR)
import military_gallery_frames as frames_kit  # noqa: E402

import json  # noqa: E402
import math  # noqa: E402
ROOM_ID = 'military-gallery'
PARQUET_TEX_NAME = 'military-gallery-parquet.png'
TEX_SIZE = 512

# ---- shell (design-gallery.md §2.2; metres, glTF world axes) -----------------
WALL_X_WEST = 82.0
WALL_X_EAST = 90.5
WALL_Z_NORTH = -40.0
WALL_Z_SOUTH = 15.0
FLOOR_Y = 10.0             # the committed jordan landing floor height (§2.2)
SPRING_Y = 16.5            # vault springing / the cornice band's top
VAULT_RISE = 2.0           # crown at floor+8.5
LANTERN_KERB_H = 0.3
LANTERN_PITCH_H = 0.8      # lantern ridge at floor+9.6 (bounds Y max 19.7)

# ---- vault                                                                   -
VAULT_SEGMENTS = 16
COFFER_ROWS = 5
COFFER_COLS = 22
COFFER_INSET = 0.18
COFFER_MARGIN = 0.35

# ---- lantern (one authored glazed lantern, merged over three placements) ----
LANTERN_Z = (-27.0, -12.5, 2.0)
LANTERN_LEN = 10.0
LANTERN_WIDTH = 3.0
LANTERN_BARS = 6
LANTERN_BAR_W = 0.10
LANTERN_BAR_D = 0.08

# ---- doors (K4: one authored double-door panel, six reuses) ------------------
DOOR_W = 1.9
DOOR_H = 3.4
DOOR_LEAF_INSET = 0.04
DOOR_PANEL_D = 0.10
DOOR_CASE_W = 0.28
NORTH_DOOR_SWING = 0.0     # the entry pair reads as the airlock face (closed)
SOUTH_DOOR_INSET = 0.75    # the flanking panels sit ±(half width - inset)
BLIND_DOOR_BAYS = (4, 8)   # pier indices per long wall (of 12)

# ---- piers (twelve per wall between the law's eleven portrait bays) ---------
PIERS_PER_WALL = 12
PILASTER_W = 0.55
PILASTER_D = 0.14
PILASTER_PAIR_GAP = 0.9
CAP_H = 0.35
CAP_FLARE = 0.06
BASE_H = 0.45
COLUMN_R = 0.32
COLUMN_SIDES = 12
WIDE_PIER_EVERY = 4        # piers 0/4/8 carry the engaged light-stone columns

# ---- torchere candelabra (DEC-026: the night state's light bearers) ---------
TORCHERE_H = 2.4
TORCHERE_BASE_R = 0.16
TORCHERE_STEM_R = 0.05
TORCHERE_SIDES = 10
TORCHERE_CANDLES = 5
TORCHERE_CANDLE_R = 0.025
TORCHERE_CANDLE_H = 0.18
TORCHERE_RING_R = 0.18
TORCHERE_WALL_OFF = 0.9

# ---- benches -----------------------------------------------------------------
BENCH_L = 1.8
BENCH_W = 0.5
BENCH_H = 0.45
BENCH_WALL_OFF = 0.9
BENCHES_PER_WALL = 7

# ---- K8 monarch portal surround (the south end wall composition) -------------
PORTAL_PED_W = 2.4
PORTAL_PED_H = 0.9
PORTAL_PED_D = 0.3
PORTAL_VALANCE_W = 0.24
PORTAL_VALANCE_H = 0.3
PORTAL_VALANCE_COUNT = 5
PORTAL_STEP_W = 2.4
PORTAL_STEP_D = 1.2
PORTAL_STEP_H = 0.15
PORTAL_LEAF_W = 1.2
PORTAL_LEAF_H = 3.6
PORTAL_LEAF_OFF = 3.5      # the two dark panels near the end-wall corners (§2.7)

# ---- materials (§2.4 palette; flat colours except the procedural parquet) ----
CRIMSON_RGB = (0.520, 0.115, 0.155)
PLASTER_RGB = (0.700, 0.690, 0.660)
VAULT_RGB = (0.660, 0.650, 0.630)
GILT_RGB = (0.550, 0.410, 0.150)
STONE_RGB = (0.520, 0.510, 0.480)
GLASS_RGB = (0.020, 0.024, 0.030)
DOOR_RGB = (0.160, 0.100, 0.060)
UPHOLSTERY_RGB = (0.240, 0.055, 0.075)
CANDLE_RGB = (0.850, 0.820, 0.740)
CANVAS_RGB = (0.230, 0.180, 0.150)   # the R1 placeholder; the atlas lands in R2
CARPET_RGB = (0.260, 0.048, 0.062)
PARQUET_LIGHT_RGB = (0.420, 0.280, 0.150)
PARQUET_DARK_RGB = (0.240, 0.150, 0.085)
PARQUET_LINE_RGB = (0.180, 0.115, 0.065)
FLOOR_UV_REPEAT = 1.0                 # one 0..1 sweep; repeat is the runtime's law (R3)

PARQUET_CHECKS = 8
PARQUET_DIAMOND_INSET = 0.15
PARQUET_LINE_W = 0.06

COLLECTION_NAME = 'MilitaryGallery'


def to_b(p):
    """World/glTF (X, Y-up, Z) -> Blender (x, -Z, Y). Proper rotation, winding preserved."""
    return (p[0], -p[2], p[1])


def _wm(gx, gy, gz):
    return Vector(to_b((gx, gy, gz)))


def stage_dir():
    """INT: the stage handoff, canary-parity with the sibling rooms."""
    argv = sys.argv
    for flag in ('--out', '--stage'):
        if flag in argv:
            return os.path.abspath(argv[argv.index(flag) + 1])
    for arg in argv:
        if arg.startswith('--out=') or arg.startswith('--stage='):
            return os.path.abspath(arg.split('=', 1)[1])
    if len(sys.argv) > sys.argv.index('--') + 2:
        return os.path.abspath(sys.argv[sys.argv.index('--') + 2])
    env = os.environ.get('ZIMNY_STAGE_DIR')
    if env:
        return os.path.abspath(env)
    return os.path.join(os.getcwd(), 'node_modules', '.cache', 'zimny-asset-stage', ROOM_ID)


def hall_span():
    return (WALL_X_EAST - WALL_X_WEST, WALL_Z_SOUTH - WALL_Z_NORTH)


def hall_mid_x():
    return (WALL_X_WEST + WALL_X_EAST) * 0.5


def reset_scene():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    scene = bpy.context.scene
    scene.unit_settings.system = 'METRIC'
    scene.unit_settings.scale_length = 1.0
    collection = bpy.data.collections.new(COLLECTION_NAME)
    scene.collection.children.link(collection)
    return collection


def make_materials():
    flats = (
        ('crimson', CRIMSON_RGB), ('plaster', PLASTER_RGB), ('vault', VAULT_RGB),
        ('gilt', GILT_RGB), ('stone', STONE_RGB), ('glass', GLASS_RGB),
        ('door', DOOR_RGB), ('upholstery', UPHOLSTERY_RGB),
        ('candle', CANDLE_RGB), ('canvas', CANVAS_RGB),
        ('carpet', CARPET_RGB), ('parquet', (0.4, 0.4, 0.4)),
    )
    made = {}
    for name, rgb in flats:
        mat = bpy.data.materials.new('MG_' + name)
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes['Principled BSDF']
        bsdf.inputs['Base Color'].default_value = (rgb[0], rgb[1], rgb[2], 1.0)
        made[name] = mat
    return made


def _new_part(collection, name):
    mesh = bpy.data.meshes.new(name)
    obj = bpy.data.objects.new(name, mesh)
    collection.objects.link(obj)
    return obj, bmesh.new()


def _finish(obj, bm, shade_flat):
    if shade_flat:
        for face in bm.faces:
            face.smooth = False
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(obj.data)
    bm.free()
    return obj


def _layers(bm):
    return bm.loops.layers.uv.new('uv'), bm.loops.layers.uv.new('lm')


def add_box(bm, centre, half):
    """Axis-aligned box in WORLD coordinates (converted at the vertices)."""
    cx, cy, cz = centre
    hx, hy, hz = half
    coords = []
    for sy in (-hy, hy):
        for sx, sz in ((-hx, -hz), (hx, -hz), (hx, hz), (-hx, hz)):
            coords.append(_wm(cx + sx, cy + sy, cz + sz))
    verts = [bm.verts.new(c) for c in coords]
    quads = ((0, 1, 2, 3), (7, 6, 5, 4), (0, 4, 5, 1),
             (1, 5, 6, 2), (2, 6, 7, 3), (3, 7, 4, 0))
    return [bm.faces.new([verts[i] for i in q]) for q in quads]


def add_prism(bm, centre, radius, height, sides, taper=1.0):
    """Vertical n-gon prism, flat caps; sides from a constant."""
    cx, cy, cz = centre
    lower = []
    upper = []
    for i in range(sides):
        a = 2.0 * math.pi * i / float(sides)
        dx = math.cos(a)
        dz = math.sin(a)
        lower.append(bm.verts.new(_wm(cx + dx * radius, cy, cz + dz * radius)))
        upper.append(bm.verts.new(_wm(cx + dx * radius * taper, cy + height,
                                      cz + dz * radius * taper)))
    faces = []
    for i in range(sides):
        j = (i + 1) % sides
        faces.append(bm.faces.new((lower[i], lower[j], upper[j], upper[i])))
    faces.append(bm.faces.new(tuple(reversed(lower))))
    faces.append(bm.faces.new(tuple(upper)))
    return faces


def read_metrics():
    return frames_kit.read_layout(SCRIPT_DIR)['metrics']


def bay_centres(metrics):
    centres = metrics['bayCentresZ']
    assert len(centres) == 11, 'the layout law carries eleven bay centres'
    return tuple(float(z) for z in centres)


def pier_centres(metrics):
    """Twelve pier positions per long wall: the bay-pitch midpoints, extended
    half a pitch at both ends so the run closes against the end walls."""
    centres = bay_centres(metrics)
    pitch = float(metrics['bayPitchZ'])
    mids = [centres[0] - pitch * 0.5]
    for i in range(len(centres) - 1):
        mids.append((centres[i] + centres[i + 1]) * 0.5)
    mids.append(centres[-1] + pitch * 0.5)
    assert len(mids) == PIERS_PER_WALL, 'the bay law must close at twelve piers'
    return tuple(mids)


def lantern_overlaps():
    """The kit-chart of vault columns to skip under the lantern footprints:
    the crown stays bare where a lantern kerb lands (the specialist's catch)."""
    half_l = LANTERN_LEN * 0.5 + COFFER_MARGIN
    return tuple((z - half_l, z + half_l) for z in LANTERN_Z)


def write_parquet_texture(stage):
    """Deterministic checker-diamond tile, math-only, square PNG."""
    tex_dir = os.path.join(stage, 'tex')
    os.makedirs(tex_dir, exist_ok=True)
    size = TEX_SIZE
    image = bpy.data.images.new(PARQUET_TEX_NAME, width=size, height=size,
                                alpha=False, float_buffer=False)
    checks = PARQUET_CHECKS
    cell = size / float(checks)
    pixels = [0.0] * (size * size * 4)
    for py in range(size):
        for px in range(size):
            u = (px + 0.5) / cell
            v = (py + 0.5) / cell
            cu = u - math.floor(u)
            cv = v - math.floor(v)
            parity = (int(math.floor(u)) + int(math.floor(v))) % 2
            base = PARQUET_LIGHT_RGB if parity == 0 else PARQUET_DARK_RGB
            other = PARQUET_DARK_RGB if parity == 0 else PARQUET_LIGHT_RGB
            d = abs(2.0 * cu - 1.0) + abs(2.0 * cv - 1.0)
            rgb = other if d <= (1.0 - PARQUET_DIAMOND_INSET) else base
            if (cu < PARQUET_LINE_W or cu > 1.0 - PARQUET_LINE_W
                    or cv < PARQUET_LINE_W or cv > 1.0 - PARQUET_LINE_W):
                rgb = PARQUET_LINE_RGB
            o = (py * size + px) * 4
            pixels[o] = rgb[0]
            pixels[o + 1] = rgb[1]
            pixels[o + 2] = rgb[2]
            pixels[o + 3] = 1.0
    image.pixels = pixels
    image.filepath_raw = os.path.join(tex_dir, PARQUET_TEX_NAME)
    image.file_format = 'PNG'
    image.save()
    return image


def wire_parquet(materials, image):
    mat = materials['parquet']
    tree = mat.node_tree
    tex = tree.nodes.new('ShaderNodeTexImage')
    tex.image = image
    tex.interpolation = 'Closest'
    tex.location = (-400.0, 0.0)
    bsdf = tree.nodes['Principled BSDF']
    tree.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])


def build_floor(collection, materials):
    obj, bm = _new_part(collection, 'floor')
    uv, _ = _layers(bm)
    mid_x = hall_mid_x()
    half_x = hall_span()[0] * 0.5
    repeats = FLOOR_UV_REPEAT
    a = Vector((mid_x - half_x, FLOOR_Y, WALL_Z_NORTH))
    b = Vector((mid_x + half_x, FLOOR_Y, WALL_Z_NORTH))
    c = Vector((mid_x + half_x, FLOOR_Y, WALL_Z_SOUTH))
    d = Vector((mid_x - half_x, FLOOR_Y, WALL_Z_SOUTH))
    face = bm.faces.new([bm.verts.new(_wm(p.x, p.y, p.z)) for p in (a, b, c, d)])
    uvs = ((0.0, 0.0), (repeats, 0.0), (repeats, repeats), (0.0, repeats))
    for i, loop in enumerate(face.loops):
        loop[uv].uv = uvs[i]
    obj.data.materials.append(materials['parquet'])
    return _finish(obj, bm, True)


def build_walls(collection, materials):
    """Crimson portrait fields on the long walls below the cornice band;
    plaster above and on both end walls."""
    half_x = hall_span()[0] * 0.5
    half_z = hall_span()[1] * 0.5
    mid_x = hall_mid_x()
    band_y = SPRING_Y - 0.9           # the portrait fields run floor..band
    crimson, bm_c = _new_part(collection, 'wall_crimson')
    _, _ = _layers(bm_c)
    for wall_x, nx in ((WALL_X_WEST, 1.0), (WALL_X_EAST, -1.0)):
        a, b, c, d = (Vector((wall_x, FLOOR_Y, WALL_Z_NORTH)),
                      Vector((wall_x, FLOOR_Y, WALL_Z_SOUTH)),
                      Vector((wall_x, band_y, WALL_Z_SOUTH)),
                      Vector((wall_x, band_y, WALL_Z_NORTH)))
        order = (a, b, c, d) if nx > 0.0 else (b, a, d, c)
        bm_c.faces.new([bm_c.verts.new(_wm(p.x, p.y, p.z)) for p in order])
    obj = _finish(crimson, bm_c, True)
    obj.data.materials.append(materials['crimson'])
    plaster, bm_p = _new_part(collection, 'wall_plaster')
    _, _ = _layers(bm_p)
    for wall_x, nx in ((WALL_X_WEST, 1.0), (WALL_X_EAST, -1.0)):
        a, b, c, d = (Vector((wall_x, band_y, WALL_Z_NORTH)),
                      Vector((wall_x, band_y, WALL_Z_SOUTH)),
                      Vector((wall_x, SPRING_Y, WALL_Z_SOUTH)),
                      Vector((wall_x, SPRING_Y, WALL_Z_NORTH)))
        order = (a, b, c, d) if nx > 0.0 else (b, a, d, c)
        bm_p.faces.new([bm_p.verts.new(_wm(p.x, p.y, p.z)) for p in order])
    for wall_z, nz in ((WALL_Z_NORTH, 1.0), (WALL_Z_SOUTH, -1.0)):
        a, b, c, d = (Vector((mid_x - half_x, FLOOR_Y, wall_z)),
                      Vector((mid_x + half_x, FLOOR_Y, wall_z)),
                      Vector((mid_x + half_x, SPRING_Y, wall_z)),
                      Vector((mid_x - half_x, SPRING_Y, wall_z)))
        order = (a, b, c, d) if nz > 0.0 else (b, a, d, c)
        bm_p.faces.new([bm_p.verts.new(_wm(p.x, p.y, p.z)) for p in order])
    obj2 = _finish(plaster, bm_p, True)
    obj2.data.materials.append(materials['plaster'])
    return [obj, obj2]


def vault_profile():
    """The barrel arc across X: springing -> crown -> springing (semicircle)."""
    half = hall_span()[0] * 0.5
    mid = hall_mid_x()
    pts = []
    for i in range(VAULT_SEGMENTS + 1):
        t = i / float(VAULT_SEGMENTS)
        a = math.pi * t
        pts.append((mid - half * math.cos(a), SPRING_Y + VAULT_RISE * math.sin(a)))
    return tuple(pts)


def build_vault(collection, materials):
    """Barrel soffit with a coffer grid; columns under the lantern footprints
    stay bare (the kit-chart skip the specialist caught in its challenge)."""
    obj, bm = _new_part(collection, 'vault')
    uv, _ = _layers(bm)
    profile = vault_profile()
    overlaps = lantern_overlaps()
    col_step = (WALL_Z_SOUTH - WALL_Z_NORTH) / float(COFFER_COLS)
    row_step = VAULT_SEGMENTS / float(COFFER_ROWS)
    mid = hall_mid_x()
    for ci in range(COFFER_COLS):
        za = WALL_Z_NORTH + col_step * ci + COFFER_MARGIN
        zb = WALL_Z_NORTH + col_step * (ci + 1) - COFFER_MARGIN
        zc = (za + zb) * 0.5
        if any(lo <= zc <= hi for lo, hi in overlaps):
            continue
        for ri in range(COFFER_ROWS):
            i0 = int(round(row_step * ri))
            i1 = int(round(row_step * (ri + 1)))
            xa, ya = profile[i0]
            xb, yb = profile[i1]
            pans = []
            for x, y in ((xa, ya), (xb, yb)):
                dx = x - mid
                dy = y - SPRING_Y
                length = math.hypot(dx, dy)
                k = (length - COFFER_INSET) / length if length > 0.0 else 1.0
                pans.append((mid + dx * k, SPRING_Y + dy * k))
            (pxa, pya), (pxb, pyb) = pans
            for corners in (
                    ((xa, ya, za), (xb, yb, za), (pxb, pyb, za), (pxa, pya, za)),
                    ((xa, ya, zb), (pxa, pya, zb), (pxb, pyb, zb), (xb, yb, zb)),
                    ((xa, ya, za), (pxa, pya, za), (pxa, pya, zb), (xa, ya, zb)),
                    ((pxb, pyb, za), (xb, yb, za), (xb, yb, zb), (pxb, pyb, zb))):
                pan_face = bm.faces.new([bm.verts.new(_wm(px, py, zz))
                                         for px, py, zz in corners])
                pan_face.smooth = False
            bm.faces.new([bm.verts.new(_wm(px, py, zz)) for px, py, zz in
                          ((pxa, pya, za), (pxb, pyb, za),
                           (pxb, pyb, zb), (pxa, pya, zb))])
    obj.data.materials.append(materials['vault'])
    return _finish(obj, bm, False)



# ---- lantern (one authored glazed lantern, placed three times, merged) -------
def build_lanterns(collection, materials):
    glaze, bm_g = _new_part(collection, 'lantern_glazing')
    bars, bm_b = _new_part(collection, 'lantern_bars')
    uv_g, _ = _layers(bm_g)
    _, _ = _layers(bm_b)
    mid = hall_mid_x()
    crown = SPRING_Y + VAULT_RISE
    kerb = crown + LANTERN_KERB_H
    ridge = kerb + LANTERN_PITCH_H
    half_w = LANTERN_WIDTH * 0.5
    half_l = LANTERN_LEN * 0.5
    for zc in LANTERN_Z:
        za = zc - half_l
        zb = zc + half_l
        for sx in (-1.0, 1.0):
            eave = mid + sx * half_w
            bm_g.faces.new([bm_g.verts.new(_wm(*p)) for p in
                           ((eave, kerb, za), (mid, ridge, za),
                            (mid, ridge, zb), (eave, kerb, zb))])
            bm_g.faces.new([bm_g.verts.new(_wm(*p)) for p in
                           ((eave, crown, za), (eave, kerb, za),
                            (eave, kerb, zb), (eave, crown, zb))])
            for bi in range(LANTERN_BARS):
                t = (bi + 0.5) / float(LANTERN_BARS)
                zc_bar = za + (zb - za) * t
                bx = (eave + mid) * 0.5
                by = (kerb + ridge) * 0.5
                add_box(bm_b, (bx, by, zc_bar),
                        (abs(eave - mid) * 0.5, LANTERN_BAR_D * 0.5, LANTERN_BAR_W * 0.5))
        for z_end in (za, zb):
            bm_g.faces.new([bm_g.verts.new(_wm(*p)) for p in
                           ((mid - half_w, kerb, z_end), (mid + half_w, kerb, z_end),
                            (mid, ridge, z_end))])
        add_box(bm_b, (mid, ridge, zc),
                (LANTERN_BAR_W * 0.5, half_l, LANTERN_BAR_D * 0.5))
    glaze_obj = _finish(glaze, bm_g, True)
    bars_obj = _finish(bars, bm_b, False)
    glaze_obj.data.materials.append(materials['glass'])
    bars_obj.data.materials.append(materials['gilt'])
    return [glaze_obj, bars_obj]


# ---- doors (K4: one authored double-door panel, six reuses) -------------------
def door_panel(bm_leaf, bm_case, centre, normal, swing):
    """Two leaves plus a gilt architrave; swing offsets the leaves inward."""
    cx, cy, cz = centre
    nx, _, nz = normal
    ux, uz = -nz, nx
    leaf_w = (DOOR_W - DOOR_LEAF_INSET * 2.0) * 0.5
    half_h = DOOR_H * 0.5
    for side in (-1.0, 1.0):
        off = side * (leaf_w * 0.5 + DOOR_LEAF_INSET * 0.5)
        depth = DOOR_PANEL_D * 0.5 + swing
        lx = cx + ux * off + nx * depth
        lz = cz + uz * off + nz * depth
        add_box(bm_leaf, (lx, cy + half_h, lz),
                (abs(ux) * leaf_w * 0.5 + abs(nx) * DOOR_PANEL_D * 0.5,
                 half_h,
                 abs(uz) * leaf_w * 0.5 + abs(nz) * DOOR_PANEL_D * 0.5))
    jamb_off = DOOR_W * 0.5 + DOOR_CASE_W * 0.5
    for side in (-1.0, 1.0):
        jx = cx + ux * side * jamb_off + nx * DOOR_PANEL_D * 0.5
        jz = cz + uz * side * jamb_off + nz * DOOR_PANEL_D * 0.5
        add_box(bm_case, (jx, cy + half_h + DOOR_CASE_W * 0.5, jz),
                (abs(ux) * DOOR_CASE_W * 0.5 + abs(nx) * DOOR_PANEL_D * 0.5,
                 half_h + DOOR_CASE_W * 0.5,
                 abs(uz) * DOOR_CASE_W * 0.5 + abs(nz) * DOOR_PANEL_D * 0.5))
    hx = cx + nx * DOOR_PANEL_D * 0.5
    hz = cz + nz * DOOR_PANEL_D * 0.5
    add_box(bm_case, (hx, cy + DOOR_H + DOOR_CASE_W * 0.5, hz),
            (abs(ux) * (DOOR_W * 0.5 + DOOR_CASE_W) + abs(nx) * DOOR_PANEL_D * 0.5,
             DOOR_CASE_W * 0.5,
             abs(uz) * (DOOR_W * 0.5 + DOOR_CASE_W) + abs(nz) * DOOR_PANEL_D * 0.5))


def door_stations(piers):
    """The six reuses: the north entry pair, two south flanks, four blinds."""
    mid = hall_mid_x()
    half_x = hall_span()[0] * 0.5
    stations = [((mid, FLOOR_Y, WALL_Z_NORTH), (0.0, 0.0, 1.0), NORTH_DOOR_SWING)]
    for sx in (-1.0, 1.0):
        stations.append(((mid + sx * (half_x - SOUTH_DOOR_INSET), FLOOR_Y, WALL_Z_SOUTH),
                         (0.0, 0.0, -1.0), 0.0))
    for wall_x, nx in ((WALL_X_WEST, 1.0), (WALL_X_EAST, -1.0)):
        for bay_index in BLIND_DOOR_BAYS:
            stations.append(((wall_x + nx * DOOR_PANEL_D * 0.5, FLOOR_Y, piers[bay_index]),
                             (nx, 0.0, 0.0), 0.0))
    return tuple(stations)


def build_doors(collection, materials, metrics):
    leaves, bm_leaf = _new_part(collection, 'door_leaves')
    cases, bm_case = _new_part(collection, 'door_cases')
    _, _ = _layers(bm_leaf)
    _, _ = _layers(bm_case)
    for centre, normal, swing in door_stations(pier_centres(metrics)):
        door_panel(bm_leaf, bm_case, centre, normal, swing)
    leaves_obj = _finish(leaves, bm_leaf, True)
    cases_obj = _finish(cases, bm_case, True)
    leaves_obj.data.materials.append(materials['door'])
    cases_obj.data.materials.append(materials['gilt'])
    return [leaves_obj, cases_obj]


# ---- piers (paired pilasters + gilt capitals/bases, band, engaged columns) ----
def build_piers(collection, materials, metrics):
    shafts, bm_s = _new_part(collection, 'pier_shafts')
    gilt, bm_g = _new_part(collection, 'pier_gilt')
    columns, bm_c = _new_part(collection, 'pier_columns')
    _, _ = _layers(bm_s)
    _, _ = _layers(bm_g)
    _, _ = _layers(bm_c)
    piers = pier_centres(metrics)
    band_y = SPRING_Y - 0.9
    shaft_h = band_y - FLOOR_Y - BASE_H - CAP_H
    for wall_x, nx in ((WALL_X_WEST, 1.0), (WALL_X_EAST, -1.0)):
        for pi in range(PIERS_PER_WALL):
            z = piers[pi]
            px = wall_x + nx * PILASTER_D * 0.5
            for side in (-1.0, 1.0):
                zc = z + side * (PILASTER_PAIR_GAP + PILASTER_W) * 0.5
                add_box(bm_s, (px, FLOOR_Y + BASE_H + shaft_h * 0.5, zc),
                        (PILASTER_D * 0.5, shaft_h * 0.5, PILASTER_W * 0.5))
                add_box(bm_g, (px, FLOOR_Y + BASE_H * 0.5, zc),
                        (PILASTER_D * 0.5 + CAP_FLARE, BASE_H * 0.5,
                         PILASTER_W * 0.5 + CAP_FLARE))
                add_box(bm_g, (px, band_y - CAP_H * 0.5, zc),
                        (PILASTER_D * 0.5 + CAP_FLARE, CAP_H * 0.5,
                         PILASTER_W * 0.5 + CAP_FLARE))
            if pi % WIDE_PIER_EVERY == 0:
                add_prism(bm_c, (wall_x + nx * COLUMN_R, FLOOR_Y, z),
                          COLUMN_R, band_y - FLOOR_Y, COLUMN_SIDES)
        add_box(bm_g, (wall_x + nx * 0.45, SPRING_Y - 0.45,
                       (WALL_Z_NORTH + WALL_Z_SOUTH) * 0.5),
                (0.45, 0.45, hall_span()[1] * 0.5))
    shafts_obj = _finish(shafts, bm_s, True)
    gilt_obj = _finish(gilt, bm_g, True)
    columns_obj = _finish(columns, bm_c, False)
    shafts_obj.data.materials.append(materials['plaster'])
    gilt_obj.data.materials.append(materials['gilt'])
    columns_obj.data.materials.append(materials['stone'])
    return [shafts_obj, gilt_obj, columns_obj]


# ---- torchere candelabra (DEC-026) -------------------------------------------
def torchere_stations(piers):
    stations = []
    for wall_x, nx in ((WALL_X_WEST, 1.0), (WALL_X_EAST, -1.0)):
        for pi in piers:
            stations.append((wall_x + nx * TORCHERE_WALL_OFF, pi))
    mid = hall_mid_x()
    half_x = hall_span()[0] * 0.5
    for sx in (-1.0, 1.0):
        stations.append((mid + sx * (half_x - SOUTH_DOOR_INSET),
                         WALL_Z_SOUTH - TORCHERE_WALL_OFF))
    return tuple(stations)


def build_torcheres(collection, materials, metrics):
    body, bm_b = _new_part(collection, 'torchere_body')
    candles, bm_f = _new_part(collection, 'torchere_candles')
    _, _ = _layers(bm_b)
    _, _ = _layers(bm_f)
    stem_h = TORCHERE_H - TORCHERE_CANDLE_H
    for x, z in torchere_stations(pier_centres(metrics)):
        add_prism(bm_b, (x, FLOOR_Y, z), TORCHERE_BASE_R,
                  TORCHERE_BASE_R, TORCHERE_SIDES,
                  TORCHERE_STEM_R / TORCHERE_BASE_R)
        add_prism(bm_b, (x, FLOOR_Y + TORCHERE_BASE_R, z), TORCHERE_STEM_R,
                  stem_h - TORCHERE_BASE_R, TORCHERE_SIDES)
        add_prism(bm_b, (x, FLOOR_Y + stem_h, z), TORCHERE_RING_R,
                  TORCHERE_CANDLE_R, TORCHERE_SIDES)
        for ci in range(TORCHERE_CANDLES):
            a = 2.0 * math.pi * ci / float(TORCHERE_CANDLES)
            add_prism(bm_f,
                      (x + math.cos(a) * TORCHERE_RING_R,
                       FLOOR_Y + stem_h + TORCHERE_CANDLE_R,
                       z + math.sin(a) * TORCHERE_RING_R),
                      TORCHERE_CANDLE_R, TORCHERE_CANDLE_H, TORCHERE_SIDES)
    body_obj = _finish(body, bm_b, False)
    candle_obj = _finish(candles, bm_f, False)
    body_obj.data.materials.append(materials['gilt'])
    candle_obj.data.materials.append(materials['candle'])
    return [body_obj, candle_obj]


# ---- benches ------------------------------------------------------------------
def build_benches(collection, materials):
    obj, bm = _new_part(collection, 'bench')
    _, _ = _layers(bm)
    span_z = WALL_Z_SOUTH - WALL_Z_NORTH
    step = span_z / float(BENCHES_PER_WALL + 1)
    for wall_x, nx in ((WALL_X_WEST, 1.0), (WALL_X_EAST, -1.0)):
        for bi in range(BENCHES_PER_WALL):
            z = WALL_Z_NORTH + step * (bi + 1)
            x = wall_x + nx * (BENCH_WALL_OFF + BENCH_W * 0.5)
            add_box(bm, (x, FLOOR_Y + BENCH_H * 0.5, z),
                    (BENCH_W * 0.5, BENCH_H * 0.5, BENCH_L * 0.5))
    obj.data.materials.append(materials['upholstery'])
    return _finish(obj, bm, True)


# ---- K8 monarch portal surround (the south end wall composition) --------------
def build_portal(collection, materials):
    gilt, bm_g = _new_part(collection, 'portal_gilt')
    leaves, bm_l = _new_part(collection, 'portal_leaves')
    carpet, bm_c = _new_part(collection, 'portal_step')
    _, _ = _layers(bm_g)
    _, _ = _layers(bm_l)
    _, _ = _layers(bm_c)
    mid = hall_mid_x()
    face_z = WALL_Z_SOUTH - PORTAL_PED_D * 0.5
    add_box(bm_g, (mid, 10.0 + 4.7, face_z),
            (PORTAL_PED_W * 0.5, PORTAL_PED_H * 0.5, PORTAL_PED_D * 0.5))
    for vi in range(PORTAL_VALANCE_COUNT):
        t = (vi + 0.5) / float(PORTAL_VALANCE_COUNT)
        vx = mid + (t - 0.5) * PORTAL_PED_W
        vy = 10.0 + 4.7 - PORTAL_PED_H * 0.5 - PORTAL_VALANCE_H * 0.5
        add_box(bm_g, (vx, vy, face_z),
                (PORTAL_VALANCE_W * 0.5, PORTAL_VALANCE_H * 0.5,
                 PORTAL_PED_D * 0.5))
    add_box(bm_c, (mid, FLOOR_Y + PORTAL_STEP_H * 0.5,
                   WALL_Z_SOUTH - PORTAL_STEP_D * 0.5),
            (PORTAL_STEP_W * 0.5, PORTAL_STEP_H * 0.5, PORTAL_STEP_D * 0.5))
    for side in (-1.0, 1.0):
        add_box(bm_l, (mid + side * PORTAL_LEAF_OFF,
                       FLOOR_Y + PORTAL_LEAF_H * 0.5, face_z),
                (PORTAL_LEAF_W * 0.5, PORTAL_LEAF_H * 0.5, PORTAL_PED_D * 0.5))
    gilt_obj = _finish(gilt, bm_g, True)
    leaves_obj = _finish(leaves, bm_l, True)
    carpet_obj = _finish(carpet, bm_c, True)
    gilt_obj.data.materials.append(materials['gilt'])
    leaves_obj.data.materials.append(materials['door'])
    carpet_obj.data.materials.append(materials['carpet'])
    return [gilt_obj, leaves_obj, carpet_obj]


# ---- summary (the sibling shape: per-part triangles/instances/primitives) -----
def main():
    collection = reset_scene()
    materials = make_materials()
    metrics = read_metrics()

    parts = []
    floor = build_floor(collection, materials)
    parts.append(floor)
    parts.extend(build_walls(collection, materials))
    parts.append(build_vault(collection, materials))
    parts.extend(build_lanterns(collection, materials))
    parts.extend(build_doors(collection, materials, metrics))
    parts.extend(build_piers(collection, materials, metrics))
    parts.extend(build_torcheres(collection, materials, metrics))
    parts.append(build_benches(collection, materials))
    parts.extend(build_portal(collection, materials))
    frame_objects, frame_count = frames_kit.build_frames(collection, SCRIPT_DIR)
    for obj in frame_objects:
        if obj.name.startswith(frames_kit.CANVAS_PART_PREFIX):
            obj.data.materials.append(materials['canvas'])
        else:
            obj.data.materials.append(materials['gilt'])
    parts.extend(frame_objects)

    if BAKE:
        return

    stage = stage_dir()
    image = write_parquet_texture(stage)
    wire_parquet(materials, image)

    counts = {}
    for obj in sorted(parts, key=lambda o: o.name):
        obj.data.calc_loop_triangles()
        count = sum(max(len(p.vertices) - 2, 0) for p in obj.data.polygons)
        total = len(obj.data.loop_triangles)
        counts[obj.name] = {'triangles': total, 'polys': count}
    counts['frames'] = frame_count
    os.makedirs(stage, exist_ok=True)
    with open(os.path.join(stage, 'summary.json'), 'w', encoding='utf-8') as handle:
        json.dump(counts, handle, sort_keys=True, indent=2)
        handle.write('\n')
    glb_path = os.path.join(stage, ROOM_ID + '.raw.glb')
    bpy.ops.export_scene.gltf(
        filepath=glb_path,
        export_format='GLB',
        export_apply=True,
        export_yup=True,
        export_texcoords=True,
        export_normals=True,
        export_tangents=False,
        export_materials='EXPORT',
        export_image_format='AUTO',
        export_extras=False,
        export_cameras=False,
        export_lights=False,
        export_animations=False,
        export_skins=False,
        export_morph=False,
    )
    body = json.dumps(counts, sort_keys=True, separators=(',', ':'))
    sys.stdout.write('ZIMNY_SUMMARY %s\n' % body)


main()
