# Zimny phase-2 r15b - rastrelli-gallery kit (Blender 4.2 LTS, headless).
# Run by tools/asset.mjs `bpy rastrelli-gallery` (stem = room id verbatim).
# Deterministic: no randomness, every dimension is a constant below. World axes are glTF axes:
# +X east, +Z south (Palace Square side), -Z north, +Y up. Geometry is authored in world
# coordinates and converted to Blender space at vertex creation so export_yup gives them back.
# Writes:  <stage>/rastrelli-gallery.raw.glb
#          <stage>/tex/stone_flags.png, <stage>/tex/plaster_dark.png   (math-only, 512x512)
#          <stage>/summary.json  and one `ZIMNY_SUMMARY <json sorted-keys>` stdout line.
# REAL COUNTS (triangles, per datablock -> instanced):
#   shell    768 x 1  =  768   (doc projected 60k)
#   pilaster  30 x 24 =  720   (doc projected "columns" 20k)
#   sconce    42 x 14 =  588   (doc projected 30k)
#   portal    30 x 1  =   30
#   total unique 870, instanced 2 106  (cap 110 000). Low on purpose: the beat is compression.
#   draws: 6 unique primitives (shell 2, sconce 2, pilaster 1, portal 1); naive node draws 55.
import json
import math
import os
import sys

import bmesh
import bpy
from mathutils import Vector

# Round 17a: tools/bpy/bake.py exec's this builder with ZIMNY_BAKE=1 — build the scene,
# skip the export + summary (the bake owns stdout and never writes the glb).
BAKE = os.environ.get('ZIMNY_BAKE') == '1'

ROOM_ID = 'rastrelli-gallery'
TAU = math.tau

# ---- textures (two tileable 512^2 albedos, procedural, sRGB-encoded values) -----------------
TEX_RES = 512
UV_TILE_M = 2.0  # one tile covers 2 m x 2 m ('uv' layer, box projection, world metres)
LM_RES = 1024  # r17 bake resolution the 'lm' per-face atlas grid is padded for
LM_PAD_PX = 2.0
FLAGS_PER_TILE = 4
FLAG_PX = TEX_RES // FLAGS_PER_TILE
MORTAR_PX = 6
STONE_RGB = (0.46, 0.42, 0.37)
MORTAR_RGB = (0.24, 0.21, 0.18)
PLASTER_RGB = (0.38, 0.29, 0.22)

# ---- gallery proper (east of the arch passage), metres -------------------------------------
G_X0, G_X1 = 4.0, 44.0  # 40 m long; X 4.0..4.8 is the straight-soffit reveal into the passage
G_Z0, G_Z1 = 70.0, 76.0  # 6 m wide
G_ZC = 73.0
G_SPRING = 3.0  # wall springing line
G_PEAK = 3.6  # shallow vault crown = room Y bound
G_REVEAL = 0.8
G_LEN_SEGS = 10  # ~3.9 m lightmap cells along the gallery
G_ARC_SEGS = 8
XS_G = [G_X0, G_X0 + G_REVEAL] + [
    G_X0 + G_REVEAL + (G_X1 - G_X0 - G_REVEAL) * k / G_LEN_SEGS for k in range(1, G_LEN_SEGS + 1)
]
XS_GI = XS_G[1:]  # interior proper, from the tympanum at X = 4.8

# ---- arch passage (part of this room's model) ----------------------------------------------
P_X0, P_X1 = -4.0, 4.0  # 8 m opening
P_Z0, P_Z1 = 63.5, 87.5  # 24 m through-walk; Z 87.5 = facade arch plane (left OPEN)
P_SPRING = 3.0
P_PEAK = 5.0  # semi-ellipse: rise 2.0 over half-span 4.0 (flattened, no semicircle)
P_ARC_SEGS = 12
P_Z_NODES = (63.5, 66.75, 70.0, 73.0, 76.0, 79.8333, 83.6667, 87.5)
PASSAGE_VAULT = {'spanM': 8.0, 'springY': P_SPRING, 'peakY': P_PEAK, 'profile': 'semi-ellipse'}
GALLERY_VAULT = {'spanM': 6.0, 'springY': G_SPRING, 'peakY': G_PEAK, 'profile': 'semi-ellipse'}

# ---- trim profiles (d = protrusion into the room, y) - shell geometry, not a hero ---------------
CORNICE = ((0.0, 2.70), (0.07, 2.70), (0.07, 2.84), (0.13, 2.84), (0.13, G_SPRING))
SKIRTING = ((0.09, 0.0), (0.09, 0.11), (0.0, 0.14))

# ---- pilasters: facade pitch, 11 per side + 2 corner returns on the east end wall -----------
BAY_PITCH = 3.387
PILASTERS_PER_SIDE = 11
PILASTER_X = tuple(G_X1 - BAY_PITCH * k for k in range(1, PILASTERS_PER_SIDE + 1))
CORNER_RETURN_Z = (70.45, 75.55)
PILASTER_COUNT = PILASTERS_PER_SIDE * 2 + len(CORNER_RETURN_Z)  # 24

# ---- sconces: 7 per side, uniform 5.6 m pitch, offsets clear every pilaster by >= 0.35 m ----
SCONCE_PITCH = 5.6
SCONCE_X = tuple(42.0 - SCONCE_PITCH * j for j in range(7))  # 42.0 .. 8.4
SCONCE_Y = 2.1  # mount centre; plate spans Y 1.78..2.48, shade rim at 2.48 (0.70 m total)
SCONCE_COUNT = len(SCONCE_X) * 2  # 14
SCONCE_EMISSION = 6.0
SCONCE_GLOW_RGB = (1.0, 0.72, 0.42)
SCONCE_SEGS = 8

# ---- portal frame (gallery-airlock portalFrom), X 43.2..44 -----------------------------------
PORTAL_X0, PORTAL_X1 = 43.2, 44.0
PORTAL_Z0, PORTAL_Z1 = 72.2, 73.8  # 1.6 m clear opening, centred on Z = 73
PORTAL_H = 2.4
PORTAL_JAMB = 0.2
PORTAL_HEAD = 0.2


# ---- INT: stage-dir handoff. asset.mjs invokes `... -P <py> -- --room <id> --out <stage>`;
# also accepted: `--stage <dir>`, a bare positional path, or ZIMNY_STAGE_DIR (canary parity).
def stage_dir():
    argv = sys.argv
    if '--' in argv:
        rest = argv[argv.index('--') + 1 :]
        for flag in ('--out', '--stage'):
            if flag in rest:
                return rest[rest.index(flag) + 1]
        if rest and not rest[0].startswith('-'):
            return rest[0]
    env = os.environ.get('ZIMNY_STAGE_DIR')
    if env:
        return env
    return os.path.join(os.getcwd(), 'node_modules', '.cache', 'zimny-asset-stage', ROOM_ID)


def to_b(p):
    """World/glTF (X, Y-up, Z) -> Blender (x, -Z, Y). Proper rotation, winding preserved."""
    return (p[0], -p[2], p[1])


def arc(c, half, spring, peak, segs):
    """Semi-elliptical profile as (across, up) pairs, spring -> peak -> spring."""
    out = []
    for i in range(segs + 1):
        a = math.pi * i / segs
        out.append((c - half * math.cos(a), spring + (peak - spring) * math.sin(a)))
    return out


G_ARC = arc(G_ZC, 3.0, G_SPRING, G_PEAK, G_ARC_SEGS)  # (z, y)
P_ARC = arc(0.0, 4.0, P_SPRING, P_PEAK, P_ARC_SEGS)  # (x, y)


class Builder:
    """bmesh builder with shared verts and explicit normal orientation toward/away a point."""

    def __init__(self):
        self.bm = bmesh.new()
        self.cache = {}

    def vert(self, p):
        key = (round(p[0], 4), round(p[1], 4), round(p[2], 4))
        v = self.cache.get(key)
        if v is None:
            v = self.bm.verts.new(to_b(key))
            self.cache[key] = v
        return v

    def face(self, pts, mat, ref, away=False):
        verts = []
        for p in pts:
            v = self.vert(p)
            if not verts or v is not verts[-1]:
                verts.append(v)
        if len(verts) > 1 and verts[0] is verts[-1]:
            verts.pop()
        if len(verts) < 3:
            return None
        n = Vector((0.0, 0.0, 0.0))
        for i, v in enumerate(verts):
            a, b = v.co, verts[(i + 1) % len(verts)].co
            n.x += (a.y - b.y) * (a.z + b.z)
            n.y += (a.z - b.z) * (a.x + b.x)
            n.z += (a.x - b.x) * (a.y + b.y)
        centre = sum((v.co for v in verts), Vector()) / len(verts)
        toward = Vector(to_b(ref)) - centre
        if (n.dot(toward) < 0.0) != away:
            verts.reverse()
        try:
            f = self.bm.faces.new(verts)
        except ValueError:
            return None
        f.material_index = mat
        return f

    def rows(self, rows, mat, ref_fn, away=False):
        for ra, rb in zip(rows, rows[1:]):
            for i in range(len(ra) - 1):
                pts = [ra[i], ra[i + 1], rb[i + 1], rb[i]]
                self.face(pts, mat, ref_fn(pts), away)

    def box(self, x0, x1, y0, y1, z0, z1, mat, skip=()):
        c = ((x0 + x1) / 2, (y0 + y1) / 2, (z0 + z1) / 2)
        sides = {
            '-x': ((x0, y0, z0), (x0, y1, z0), (x0, y1, z1), (x0, y0, z1)),
            '+x': ((x1, y0, z0), (x1, y1, z0), (x1, y1, z1), (x1, y0, z1)),
            '-y': ((x0, y0, z0), (x1, y0, z0), (x1, y0, z1), (x0, y0, z1)),
            '+y': ((x0, y1, z0), (x1, y1, z0), (x1, y1, z1), (x0, y1, z1)),
            '-z': ((x0, y0, z0), (x1, y0, z0), (x1, y1, z0), (x0, y1, z0)),
            '+z': ((x0, y0, z1), (x1, y0, z1), (x1, y1, z1), (x0, y1, z1)),
        }
        for name, pts in sides.items():
            if name not in skip:
                self.face(pts, mat, c, away=True)

    def cone(self, cx, cz, y0, r0, y1, r1, segs, mat):
        def ring(y, r):
            return [
                (cx + r * math.cos(TAU * i / segs), y, cz + r * math.sin(TAU * i / segs))
                for i in range(segs + 1)
            ]

        axis = (cx, (y0 + y1) / 2, cz)
        self.rows([ring(y0, r0), ring(y1, r1)], mat, lambda pts: axis, away=True)
        self.face(ring(y0, r0)[:-1], mat, (cx, y1, cz), away=True)  # bottom cap; top open


def project(normal, co):
    ax, ay, az = abs(normal.x), abs(normal.y), abs(normal.z)
    if ax >= ay and ax >= az:
        return (co.z, co.y)
    if ay >= az:
        return (co.x, co.z)
    return (co.x, co.y)


def finish(name, builder, materials):
    """Two UV layers: 'uv' box-projected (metres / UV_TILE_M), 'lm' per-face padded atlas cells."""
    bm = builder.bm
    bm.normal_update()
    uv_lay = bm.loops.layers.uv.new('uv')
    lm_lay = bm.loops.layers.uv.new('lm')
    faces = list(bm.faces)
    n = max(1, math.ceil(math.sqrt(len(faces))))
    cell = 1.0 / n
    pad = LM_PAD_PX / LM_RES
    inner = max(cell - 2.0 * pad, cell * 0.5)
    for idx, f in enumerate(faces):
        planar = [project(f.normal, loop.vert.co) for loop in f.loops]
        us = [p[0] for p in planar]
        vs = [p[1] for p in planar]
        u0, v0 = min(us), min(vs)
        du = (max(us) - u0) or 1.0
        dv = (max(vs) - v0) or 1.0
        ox = (idx % n) * cell + pad
        oy = (idx // n) * cell + pad
        for loop, (pu, pv) in zip(f.loops, planar):
            loop[uv_lay].uv = (pu / UV_TILE_M, pv / UV_TILE_M)
            loop[lm_lay].uv = (ox + inner * (pu - u0) / du, oy + inner * (pv - v0) / dv)
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    for m in materials:
        me.materials.append(m)
    tris = sum(len(p.vertices) - 2 for p in me.polygons)
    return me, tris


# ---- procedural textures --------------------------------------------------------------------
def _per(k, p):
    return TAU * k * p / TEX_RES


def stone_flags_px(x, y):
    fy = y / FLAG_PX
    row = int(fy)
    fx = x / FLAG_PX + (0.5 if row % 2 else 0.0)  # running bond
    col = int(fx)
    u, v = fx - col, fy - row
    m = MORTAR_PX / FLAG_PX
    grain = 0.03 * math.sin(_per(5, x)) * math.cos(_per(7, y)) + 0.02 * math.sin(_per(3, x + y))
    if u < m or v < m:
        return tuple(c * (1.0 + grain) for c in MORTAR_RGB)
    ci, ri = col % FLAGS_PER_TILE, row % FLAGS_PER_TILE
    shade = 0.82 + 0.07 * math.sin(2.3 * ci + 1.7 * ri) + 0.05 * math.cos(0.9 * ci - 2.6 * ri)
    edge = min(u - m, v - m, 1.0 - u, 1.0 - v) / (1.0 - m)
    wear = 0.86 + 0.14 * min(1.0, edge * 8.0)
    k = shade * wear * (1.0 + grain)
    return tuple(c * k for c in STONE_RGB)


def plaster_dark_px(x, y):
    mottle = (
        0.06 * math.sin(_per(3, x) + 1.0) * math.sin(_per(2, y))
        + 0.04 * math.cos(_per(5, x) - _per(7, y))
        + 0.03 * math.sin(_per(11, x - y))
        + 0.02 * math.sin(_per(2, y))
    )
    return tuple(c * (1.0 + mottle) for c in PLASTER_RGB)


def write_texture(name, fn, tex_dir):
    img = bpy.data.images.new(name, TEX_RES, TEX_RES, alpha=False)
    buf = [1.0] * (TEX_RES * TEX_RES * 4)
    for y in range(TEX_RES):
        for x in range(TEX_RES):
            r, g, b = fn(x, y)
            i = 4 * (y * TEX_RES + x)
            buf[i] = min(1.0, max(0.0, r))
            buf[i + 1] = min(1.0, max(0.0, g))
            buf[i + 2] = min(1.0, max(0.0, b))
    img.pixels.foreach_set(buf)
    path = os.path.join(tex_dir, f'{name}.png')
    img.filepath_raw = path
    img.file_format = 'PNG'
    img.save()
    return img, path


def material(name, image, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = image
    uvn = nt.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = 'uv'
    nt.links.new(uvn.outputs['UV'], tex.inputs['Vector'])
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = 0.92
    bsdf.inputs['Specular IOR Level'].default_value = 0.3
    if emission is not None:
        bsdf.inputs['Emission Color'].default_value = (*emission, 1.0)
        bsdf.inputs['Emission Strength'].default_value = SCONCE_EMISSION
    return mat


# ---- kit parts ------------------------------------------------------------------------------
def build_shell(mat_plaster, mat_stone):
    b = Builder()
    pl, st = 0, 1

    def g_ref(pts):  # interior point of the gallery, pulled off the end planes
        mx = sum(p[0] for p in pts) / len(pts)
        return (min(max(mx, XS_GI[0] + 0.5), G_X1 - 0.5), 1.0, G_ZC)

    def p_ref(pts):  # interior point of the passage
        mz = sum(p[2] for p in pts) / len(pts)
        return (0.0, 1.0, min(max(mz, P_Z0 + 0.5), P_Z1 - 0.5))

    # gallery floor, side walls (incl. the 0.8 m jambs), straight soffit over the reveal
    b.rows([[(x, 0.0, z) for z in (G_Z0, G_ZC, G_Z1)] for x in XS_G], st, g_ref)
    for z in (G_Z0, G_Z1):
        b.rows([[(x, y, z) for y in (0.0, G_SPRING)] for x in XS_G], pl, g_ref)
    b.rows([[(x, G_SPRING, z) for z in (G_Z0, G_Z1)] for x in (G_X0, G_X0 + G_REVEAL)], pl, g_ref)
    # shallow vault + tympana at both ends
    b.rows([[(x, y, z) for (z, y) in G_ARC] for x in XS_GI], pl, g_ref)
    for x in (XS_GI[0], G_X1):
        base = [(x, G_SPRING, z) for (z, _y) in G_ARC]
        crown = [(x, y, z) for (z, y) in G_ARC]
        b.rows([base, crown], pl, g_ref)
    # east end wall around the portal opening (opening itself left open for the airlock)
    pieces = (
        (G_Z0, PORTAL_Z0, 0.0),
        (PORTAL_Z1, G_Z1, 0.0),
        (PORTAL_Z0, PORTAL_Z1, PORTAL_H + PORTAL_HEAD),
    )
    for za, zb, ya in pieces:
        b.rows([[(G_X1, y, z) for y in (ya, G_SPRING)] for z in (za, zb)], pl, g_ref)
    # trim: cornice + skirting profiles extruded along both gallery walls
    for z, s in ((G_Z0, 1.0), (G_Z1, -1.0)):
        b.rows([[(x, y, z + s * d) for (d, y) in CORNICE] for x in XS_GI], pl, g_ref)
        b.rows([[(x, y, z + s * d) for (d, y) in SKIRTING] for x in XS_GI], pl, g_ref)
    # passage: floor, west wall, east wall minus the gallery mouth (Z 70..76), vault, north end
    b.rows([[(x, 0.0, z) for x in (P_X0, 0.0, P_X1)] for z in P_Z_NODES], st, p_ref)
    b.rows([[(P_X0, y, z) for y in (0.0, P_SPRING)] for z in P_Z_NODES], pl, p_ref)
    for zs in (P_Z_NODES[:3], P_Z_NODES[4:]):
        b.rows([[(P_X1, y, z) for y in (0.0, P_SPRING)] for z in zs], pl, p_ref)
    b.rows([[(x, y, z) for (x, y) in P_ARC] for z in P_Z_NODES], pl, p_ref)
    b.rows([[(x, y, P_Z0) for y in (0.0, P_SPRING)] for x in (P_X0, P_X1)], pl, p_ref)
    base = [(x, P_SPRING, P_Z0) for (x, _y) in P_ARC]
    crown = [(x, y, P_Z0) for (x, y) in P_ARC]
    b.rows([base, crown], pl, p_ref)
    return finish('shell', b, [mat_plaster, mat_stone])


def build_pilaster(mat):
    """Local frame: wall plane at z = 0, protrusion +z, width x, height y (floor to cornice)."""
    b = Builder()
    b.box(-0.28, 0.28, 0.0, 0.15, 0.0, 0.16, 0, skip=('-z', '-y'))  # plinth
    b.box(-0.25, 0.25, 0.15, 0.30, 0.0, 0.13, 0, skip=('-z', '-y'))  # base
    b.box(-0.20, 0.20, 0.30, 2.45, 0.0, 0.10, 0, skip=('-z', '-y', '+y'))  # shaft
    b.box(-0.28, 0.28, 2.45, 2.70, 0.0, 0.16, 0, skip=('-z', '+y'))  # capital under cornice
    return finish('pilaster', b, [mat])


def build_sconce(mat_iron, mat_glow):
    """Local frame as pilaster. Back plate + arm (iron) + open-top shade (glow, emission 6.0)."""
    b = Builder()
    b.box(-0.06, 0.06, -0.32, 0.18, 0.0, 0.03, 0, skip=('-z',))  # back plate
    b.box(-0.03, 0.03, 0.02, 0.10, 0.03, 0.24, 0, skip=('-z',))  # bracket arm
    b.cone(0.0, 0.22, 0.10, 0.06, 0.38, 0.11, SCONCE_SEGS, 1)  # shade
    return finish('sconce', b, [mat_iron, mat_glow])


def build_portal(mat):
    """World coordinates; stands against the east end wall (faces at X = 44 omitted)."""
    b = Builder()
    top = PORTAL_H + PORTAL_HEAD
    jamb = ('+x', '-y')
    b.box(PORTAL_X0, PORTAL_X1, 0.0, top, PORTAL_Z0 - PORTAL_JAMB, PORTAL_Z0, 0, jamb)
    b.box(PORTAL_X0, PORTAL_X1, 0.0, top, PORTAL_Z1, PORTAL_Z1 + PORTAL_JAMB, 0, jamb)
    b.box(PORTAL_X0, PORTAL_X1, PORTAL_H, top, PORTAL_Z0, PORTAL_Z1, 0, ('+x', '-z', '+z'))
    b.box(
        PORTAL_X0 - 0.1,
        PORTAL_X1,
        top,
        top + 0.12,
        PORTAL_Z0 - PORTAL_JAMB - 0.1,
        PORTAL_Z1 + PORTAL_JAMB + 0.1,
        0,
        ('+x', '+y'),
    )
    return finish('portal', b, [mat])


def instance(name, me, location, rot_y=0.0):
    """location/rot_y in world terms (rotation about world +Y == Blender +Z)."""
    ob = bpy.data.objects.new(name, me)
    ob.location = to_b(location)
    ob.rotation_euler = (0.0, 0.0, rot_y)
    bpy.context.scene.collection.objects.link(ob)
    return ob


def main():
    stage = stage_dir()
    tex_dir = os.path.join(stage, 'tex')
    os.makedirs(tex_dir, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    img_stone, png_stone = write_texture('stone_flags', stone_flags_px, tex_dir)
    img_plaster, png_plaster = write_texture('plaster_dark', plaster_dark_px, tex_dir)
    mat_stone = material('stone_flags', img_stone)
    mat_plaster = material('plaster_dark', img_plaster)
    mat_glow = material('sconce_glow', img_plaster, emission=SCONCE_GLOW_RGB)
    me_shell, t_shell = build_shell(mat_plaster, mat_stone)
    me_pilaster, t_pilaster = build_pilaster(mat_plaster)
    me_sconce, t_sconce = build_sconce(mat_plaster, mat_glow)
    me_portal, t_portal = build_portal(mat_stone)
    instance('shell', me_shell, (0.0, 0.0, 0.0))
    instance('portal', me_portal, (0.0, 0.0, 0.0))
    for x in PILASTER_X:
        instance('pilaster', me_pilaster, (x, 0.0, G_Z0))
        instance('pilaster', me_pilaster, (x, 0.0, G_Z1), math.pi)
    for z in CORNER_RETURN_Z:
        instance('pilaster', me_pilaster, (G_X1, 0.0, z), -math.pi / 2)
    for x in SCONCE_X:
        instance('sconce', me_sconce, (x, SCONCE_Y, G_Z0))
        instance('sconce', me_sconce, (x, SCONCE_Y, G_Z1), math.pi)
    if BAKE:
        return
    glb_path = os.path.join(stage, f'{ROOM_ID}.raw.glb')
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
    meshes = {
        'shell': {'triangles': t_shell, 'instances': 1, 'primitives': 2},
        'pilaster': {'triangles': t_pilaster, 'instances': PILASTER_COUNT, 'primitives': 1},
        'sconce': {'triangles': t_sconce, 'instances': SCONCE_COUNT, 'primitives': 2},
        'portal': {'triangles': t_portal, 'instances': 1, 'primitives': 1},
    }
    summary = {
        'room': ROOM_ID,
        'glb': glb_path,
        'textures': {'stone_flags': png_stone, 'plaster_dark': png_plaster},
        'meshes': meshes,
        'triangles': sum(m['triangles'] * m['instances'] for m in meshes.values()),
        'trianglesUnique': sum(m['triangles'] for m in meshes.values()),
        'drawsNaive': sum(m['primitives'] * m['instances'] for m in meshes.values()),
        'drawsUniquePrimitives': sum(m['primitives'] for m in meshes.values()),
        'declared': {
            'bayPitchM': BAY_PITCH,
            'pilasters': PILASTER_COUNT,
            'sconces': SCONCE_COUNT,
            'sconcePitchM': SCONCE_PITCH,
            'sconceEmission': SCONCE_EMISSION,
            'passageVault': PASSAGE_VAULT,
            'galleryVault': GALLERY_VAULT,
            'uvTileM': UV_TILE_M,
            'lmRes': LM_RES,
        },
    }
    with open(os.path.join(stage, 'summary.json'), 'w', encoding='utf-8') as fh:
        json.dump(summary, fh, sort_keys=True, indent=2)
    print('ZIMNY_SUMMARY ' + json.dumps(summary, sort_keys=True, separators=(',', ':')), flush=True)


main()
