"""Zimny phase-2 - jordan (Jordan Staircase), part 1: ENVELOPE.

Deterministic bpy authoring for Blender 4.2 LTS. Everything is authored in glTF world axes
(+X east, +Z south / Palace Square, -Z north / Neva, +Y up); Blender = (x, -z, y).
Part 2 adds NEW meshes only: 'shell' and 'pane' (geometry, UVs, lm cells) are frozen here.
No randomness, no noise, no tangents. Two UV layers per mesh: 'uv' (box, metres / UV_TILE_M)
and 'lm' (per-face padded cell in a FIXED 64 x 64 grid over LM_RES).

Orchestrator adjudication vs the specialist draft: stage_dir() binds to the asset.mjs driver
convention (`-- --room <id> --out <stage>`; `--stage`, a bare positional path, and ZIMNY_STAGE
are also accepted) - the draft's bare argv[0] would have consumed the literal '--room' flag.
"""
import json
import math
import os
import sys
from pathlib import Path

import bpy
import numpy as np

ROOM_ID = 'jordan'
STAGE = 'envelope'

# ---- declared envelope (metres, glTF world) ------------------------------------------------
X_W, X_E = 66.0, 92.0  # 26 m wide
Z_N, Z_S = -86.0, -62.0  # 24 m deep; north wall (Z -86) = Neva front, window tiers
Y_FLOOR = 0.0
VAULT_SPRING_Y = 18.0
Y_CROWN = 20.0  # hall height (declared)
LANDING_Y = 10.0  # part-2 first-floor slab (reserved constant)
HALL_REF = ((X_W + X_E) / 2, 9.0, (Z_N + Z_S) / 2)

VAULT_NZ = 8  # facets across the span (segmental barrel, axis along X)
VAULT_NX = 8  # coffer columns along X
COFFER_INSET = 0.18  # fraction of facet edge
COFFER_DEPTH = 0.35
FLOOR_DIV = (10, 10)
END_WALL_DIV = (4, 3)

WIN_BAYS = 6
WIN_PITCH = 3.9
WIN_W = 2.2
WIN_RECESS = 0.6
WIN_TIERS = ((3.0, 6.5), (13.0, 16.5))  # (sill, head)

PORT_R = 1.0
PORT_SQ = 1.3  # half-size of the square cut that carries the ring
PORT_DEPTH = 0.3
PORT_SEG = 16
PORT_Y = (4.75, 14.75)  # one porthole per window bay per tier, south wall

VEST_X = (78.0, 84.0)
VEST_Z = (-68.0, -62.0)
VEST_H = 3.0
DOOR_X = (79.5, 82.5)
DOOR_H = 2.6
DOOR_RECESS = 0.4

UV_TILE_M = 2.0
LM_RES = 2048
LM_PAD_PX = 2
LM_GRID = 64  # 32 px cells, 28 px inner; fixed so part 2 cannot shift envelope cells
LM_PART2_FIRST_CELL = 1536
PANE_EMISSION = 6.0
PANE_EMISSION_RGB = (1.0, 0.82, 0.58)

TEXTURES = (('marble_floor', 512), ('plaster_warm', 512), ('granite_grey', 256), ('gilt', 256))
MAT_PLASTER, MAT_MARBLE = 0, 1


# ---- vector helpers (glTF space) -----------------------------------------------------------
def v_sub(a, b):
    return (a[0] - b[0], a[1] - b[1], a[2] - b[2])


def v_add(a, b):
    return (a[0] + b[0], a[1] + b[1], a[2] + b[2])


def v_scale(a, s):
    return (a[0] * s, a[1] * s, a[2] * s)


def v_dot(a, b):
    return a[0] * b[0] + a[1] * b[1] + a[2] * b[2]


def lerp(a, b, t):
    return v_add(v_scale(a, 1.0 - t), v_scale(b, t))


def bilerp(p00, p10, p11, p01, s, t):
    return lerp(lerp(p00, p10, s), lerp(p01, p11, s), t)


def newell(pts):
    nx = ny = nz = 0.0
    for i, (x0, y0, z0) in enumerate(pts):
        x1, y1, z1 = pts[(i + 1) % len(pts)]
        nx += (y0 - y1) * (z0 + z1)
        ny += (z0 - z1) * (x0 + x1)
        nz += (x0 - x1) * (y0 + y1)
    return (nx, ny, nz)


def unit(n):
    m = math.sqrt(v_dot(n, n)) or 1.0
    return v_scale(n, 1.0 / m)


def to_b(p):
    return (p[0], -p[2], p[1])


def r6(vals):
    return tuple(round(v, 6) for v in vals)


def edges(vals):
    return sorted(set(round(v, 6) for v in vals))


def box_uv(p, n):
    ax, ay, az = abs(n[0]), abs(n[1]), abs(n[2])
    if ax >= ay and ax >= az:
        return (p[2], p[1])
    if ay >= az:
        return (p[0], p[2])
    return (p[0], p[1])


class MeshBuilder:
    def __init__(self, name):
        self.name = name
        self.verts = []
        self.faces = []  # (vertex index tuple, material slot)

    def add(self, pts, mat, ref):
        """Planar face; winding flipped so the normal faces `ref` (the viewing side)."""
        if v_dot(newell(pts), v_sub(ref, pts[0])) < 0:
            pts = pts[::-1]
        base = len(self.verts)
        self.verts.extend(pts)
        self.faces.append((tuple(range(base, base + len(pts))), mat))

    def triangles(self):
        return sum(len(f) - 2 for f, _ in self.faces)


# ---- procedural textures (periodic trig sums, no noise) ------------------------------------
def _grid(n):
    t = (np.arange(n, dtype=np.float64) + 0.5) / n
    v, u = np.meshgrid(t, t, indexing='ij')
    return u, v


def _wave(u, v, a, b, phase=0.0):
    return np.sin(2.0 * math.pi * (a * u + b * v) + phase)


def tex_marble_floor(n):
    u, v = _grid(n)
    w1 = np.sin(2 * math.pi * (3 * u + 2 * v) + 1.5 * _wave(u, v, 2, -3) + 0.8 * _wave(u, v, 5, 1))
    w2 = np.sin(2 * math.pi * (u - 4 * v) + 1.1 * _wave(u, v, 3, 1) + 0.5 * _wave(u, v, -2, 6))
    vein, vein2 = np.exp(-4.0 * np.abs(w1)), np.exp(-7.0 * np.abs(w2))
    base = 0.90 - 0.03 * _wave(u, v, 1, 1)
    r = base - 0.26 * vein - 0.12 * vein2
    g = base - 0.01 - 0.28 * vein - 0.14 * vein2
    b = base - 0.04 - 0.30 * vein - 0.16 * vein2
    return r, g, b


def tex_plaster_warm(n):
    u, v = _grid(n)
    m = 0.025 * _wave(u, v, 7, 3) + 0.02 * _wave(u, v, 2, 11, 1.0)
    m = m + 0.015 * _wave(u, v, 13, 5) * _wave(u, v, 3, -9)
    return 0.86 + m, 0.78 + 0.9 * m, 0.66 + 0.7 * m


def tex_granite_grey(n):
    u, v = _grid(n)
    s = _wave(u, v, 37, 23) * _wave(u, v, 29, -41) * _wave(u, v, 17, 53)
    spark = np.clip((s - 0.55) * 4.0, 0.0, 1.0)
    dark = np.clip((-s - 0.6) * 4.0, 0.0, 1.0)
    grey = 0.50 + 0.06 * _wave(u, v, 3, 5) + 0.04 * s
    f = 0.25 * spark - 0.22 * dark
    return grey + f, grey + 0.01 + f, grey + 0.02 + f


def tex_gilt(n):
    u, v = _grid(n)
    sheen = 0.5 + 0.5 * _wave(u, v, 2, 3) * _wave(u, v, -1, 5)
    return 0.78 + 0.14 * sheen, 0.58 + 0.14 * sheen, 0.22 + 0.08 * sheen


TEX_FN = {
    'marble_floor': tex_marble_floor,
    'plaster_warm': tex_plaster_warm,
    'granite_grey': tex_granite_grey,
    'gilt': tex_gilt,
}


def write_texture(name, size, tex_dir):
    r, g, b = TEX_FN[name](size)
    rgba = np.stack([r, g, b, np.ones_like(r)], axis=-1).clip(0.0, 1.0).astype(np.float32)
    path = tex_dir / f'{name}.png'
    tmp = bpy.data.images.new(name, size, size, alpha=False)
    tmp.colorspace_settings.name = 'sRGB'
    tmp.pixels.foreach_set(rgba.ravel())
    tmp.filepath_raw = str(path)
    tmp.file_format = 'PNG'
    tmp.save()
    bpy.data.images.remove(tmp)
    img = bpy.data.images.load(str(path))
    img.name = name  # exporter keeps this as the glTF image name (mapped by name in jordan.mjs)
    img.colorspace_settings.name = 'sRGB'
    return img


def make_material(name, image, roughness, emission=None):
    mat = bpy.data.materials.new(name)
    mat.use_nodes = True
    nt = mat.node_tree
    bsdf = nt.nodes['Principled BSDF']
    tex = nt.nodes.new('ShaderNodeTexImage')
    tex.image = image
    tex.interpolation = 'Linear'
    uvn = nt.nodes.new('ShaderNodeUVMap')
    uvn.uv_map = 'uv'
    nt.links.new(uvn.outputs['UV'], tex.inputs['Vector'])
    nt.links.new(tex.outputs['Color'], bsdf.inputs['Base Color'])
    bsdf.inputs['Roughness'].default_value = roughness
    bsdf.inputs['Metallic'].default_value = 0.0
    if emission is not None:
        rgb, strength = emission
        bsdf.inputs['Emission Color'].default_value = (*rgb, 1.0)
        bsdf.inputs['Emission Strength'].default_value = strength
    return mat


# ---- geometry ------------------------------------------------------------------------------
def window_bays():
    cx0 = (X_W + X_E) / 2 - (WIN_BAYS - 1) / 2 * WIN_PITCH
    return [cx0 + i * WIN_PITCH for i in range(WIN_BAYS)]


def plane_point(axis, u, v, c):
    return (u, v, c) if axis == 'z' else (c, v, u)


def wall_grid(b, axis, const, u_edges, v_edges, holes, mat, ref):
    for i in range(len(u_edges) - 1):
        for j in range(len(v_edges) - 1):
            u0, u1, v0, v1 = u_edges[i], u_edges[i + 1], v_edges[j], v_edges[j + 1]
            if any(h[0] <= u0 and u1 <= h[1] and h[2] <= v0 and v1 <= h[3] for h in holes):
                continue
            P = plane_point
            b.add([P(axis, u0, v0, const), P(axis, u1, v0, const), P(axis, u1, v1, const),
                   P(axis, u0, v1, const)], mat, ref)


def add_reveals(b, axis, c0, c1, u0, u1, v0, v1, mat):
    def P(u, v, c):  # noqa: E731
        return plane_point(axis, u, v, c)

    ref = P((u0 + u1) / 2, (v0 + v1) / 2, (c0 + c1) / 2)
    b.add([P(u0, v0, c0), P(u0, v1, c0), P(u0, v1, c1), P(u0, v0, c1)], mat, ref)
    b.add([P(u1, v0, c0), P(u1, v1, c0), P(u1, v1, c1), P(u1, v0, c1)], mat, ref)
    b.add([P(u0, v0, c0), P(u1, v0, c0), P(u1, v0, c1), P(u0, v0, c1)], mat, ref)
    b.add([P(u0, v1, c0), P(u1, v1, c0), P(u1, v1, c1), P(u0, v1, c1)], mat, ref)


def build_floor(b):
    nx, nz = FLOOR_DIV
    xs = [X_W + (X_E - X_W) * i / nx for i in range(nx + 1)]
    zs = [Z_N + (Z_S - Z_N) * j / nz for j in range(nz + 1)]
    for i in range(nx):
        for j in range(nz):
            b.add([(xs[i], 0.0, zs[j]), (xs[i + 1], 0.0, zs[j]), (xs[i + 1], 0.0, zs[j + 1]),
                   (xs[i], 0.0, zs[j + 1])], MAT_MARBLE, HALL_REF)


def build_north_wall(shell, pane):
    holes = [r6((cx - WIN_W / 2, cx + WIN_W / 2, sill, head))
             for cx in window_bays() for sill, head in WIN_TIERS]
    u_edges = edges([X_W, X_E] + [h[0] for h in holes] + [h[1] for h in holes])
    v_edges = edges([Y_FLOOR, VAULT_SPRING_Y] + [h[2] for h in holes] + [h[3] for h in holes])
    wall_grid(shell, 'z', Z_N, u_edges, v_edges, holes, MAT_PLASTER, HALL_REF)
    zb = Z_N - WIN_RECESS
    for u0, u1, v0, v1 in holes:
        add_reveals(shell, 'z', Z_N, zb, u0, u1, v0, v1, MAT_PLASTER)
        pane.add([(u0, v0, zb), (u1, v0, zb), (u1, v1, zb), (u0, v1, zb)], 0, HALL_REF)


def add_porthole(b, cx, cy):
    z0, z1 = Z_S, Z_S + PORT_DEPTH
    ring, sq = [], []
    for k in range(PORT_SEG):
        a = 2.0 * math.pi * k / PORT_SEG
        c, s = math.cos(a), math.sin(a)
        ring.append((cx + PORT_R * c, cy + PORT_R * s))
        m = PORT_SQ / max(abs(c), abs(s))
        sq.append((cx + m * c, cy + m * s))
    centre = (cx, cy, (z0 + z1) / 2)
    for k in range(PORT_SEG):
        j = (k + 1) % PORT_SEG
        b.add([(*sq[k], z0), (*sq[j], z0), (*ring[j], z0), (*ring[k], z0)], MAT_PLASTER, HALL_REF)
        b.add([(*ring[k], z0), (*ring[j], z0), (*ring[j], z1), (*ring[k], z1)], MAT_PLASTER, centre)
        b.add([(cx, cy, z1), (*ring[k], z1), (*ring[j], z1)], MAT_PLASTER, HALL_REF)


def build_south_wall(b):
    ports = [(cx, cy) for cx in window_bays() for cy in PORT_Y]
    holes = [r6((cx - PORT_SQ, cx + PORT_SQ, cy - PORT_SQ, cy + PORT_SQ)) for cx, cy in ports]
    door = r6((DOOR_X[0], DOOR_X[1], Y_FLOOR, DOOR_H))
    holes.append(door)
    u_edges = edges([X_W, X_E] + [h[0] for h in holes] + [h[1] for h in holes])
    v_edges = edges([Y_FLOOR, VAULT_SPRING_Y] + [h[2] for h in holes] + [h[3] for h in holes])
    wall_grid(b, 'z', Z_S, u_edges, v_edges, holes, MAT_PLASTER, HALL_REF)
    zb = Z_S + DOOR_RECESS
    add_reveals(b, 'z', Z_S, zb, *door, MAT_PLASTER)
    b.add([(door[0], door[2], zb), (door[1], door[2], zb), (door[1], door[3], zb),
           (door[0], door[3], zb)], MAT_PLASTER, HALL_REF)
    for cx, cy in ports:
        add_porthole(b, cx, cy)


def vault_profile():
    half = (Z_S - Z_N) / 2
    rise = Y_CROWN - VAULT_SPRING_Y
    radius = (half * half + rise * rise) / (2 * rise)
    zc, yc = (Z_N + Z_S) / 2, Y_CROWN - radius
    th = math.asin(half / radius)
    pts = []
    for k in range(VAULT_NZ + 1):
        a = -th + 2 * th * k / VAULT_NZ
        pts.append((yc + radius * math.cos(a), zc + radius * math.sin(a)))  # (y, z)
    pts[0], pts[-1] = (VAULT_SPRING_Y, Z_N), (VAULT_SPRING_Y, Z_S)  # exact seams with the walls
    return pts


def build_end_walls(b):
    prof = vault_profile()
    zc = (Z_N + Z_S) / 2
    nu, nv = END_WALL_DIV
    u_edges = edges([Z_N + (Z_S - Z_N) * i / nu for i in range(nu + 1)])
    v_edges = edges([Y_FLOOR + (VAULT_SPRING_Y - Y_FLOOR) * j / nv for j in range(nv + 1)])
    for x in (X_W, X_E):
        wall_grid(b, 'x', x, u_edges, v_edges, [], MAT_PLASTER, HALL_REF)
        for k in range(VAULT_NZ):
            b.add([(x, VAULT_SPRING_Y, zc), (x, prof[k][0], prof[k][1]),
                   (x, prof[k + 1][0], prof[k + 1][1])], MAT_PLASTER, HALL_REF)


def build_vault(b):
    prof = vault_profile()
    xs = [X_W + (X_E - X_W) * i / VAULT_NX for i in range(VAULT_NX + 1)]
    t = COFFER_INSET
    for i in range(VAULT_NX):
        for k in range(VAULT_NZ):
            (ya, za), (yb, zb) = prof[k], prof[k + 1]
            p00, p10 = (xs[i], ya, za), (xs[i + 1], ya, za)
            p11, p01 = (xs[i + 1], yb, zb), (xs[i], yb, zb)
            n = unit(newell([p00, p10, p11, p01]))
            if v_dot(n, v_sub(HALL_REF, p00)) > 0:
                n = v_scale(n, -1.0)  # outward (away from the hall)
            q00 = bilerp(p00, p10, p11, p01, t, t)
            q10 = bilerp(p00, p10, p11, p01, 1 - t, t)
            q11 = bilerp(p00, p10, p11, p01, 1 - t, 1 - t)
            q01 = bilerp(p00, p10, p11, p01, t, 1 - t)
            r00, r10, r11, r01 = (v_add(q, v_scale(n, COFFER_DEPTH)) for q in (q00, q10, q11, q01))
            rc = v_add(bilerp(p00, p10, p11, p01, 0.5, 0.5), v_scale(n, COFFER_DEPTH / 2))
            for quad in ([p00, p10, q10, q00], [p10, p11, q11, q10], [p11, p01, q01, q11],
                         [p01, p00, q00, q01]):
                b.add(quad, MAT_PLASTER, HALL_REF)
            for quad in ([q00, q10, r10, r00], [q10, q11, r11, r10], [q11, q01, r01, r11],
                         [q01, q00, r00, r01]):
                b.add(quad, MAT_PLASTER, rc)
            b.add([r00, r10, r11, r01], MAT_PLASTER, HALL_REF)


def build_vestibule(b):
    (x0, x1), (z0, z1), h = VEST_X, VEST_Z, VEST_H
    xm, zm = (x0 + x1) / 2, (z0 + z1) / 2
    for x in (x0, x1):
        quad = [(x, 0.0, z0), (x, 0.0, z1), (x, h, z1), (x, h, z0)]
        b.add(quad, MAT_PLASTER, (x - 1.0, 1.5, zm))
        b.add(quad, MAT_PLASTER, (x + 1.0, 1.5, zm))
    opening = [r6((DOOR_X[0], DOOR_X[1], Y_FLOOR, DOOR_H))]
    u_edges = edges([x0, x1, DOOR_X[0], DOOR_X[1]])
    v_edges = edges([Y_FLOOR, DOOR_H, h])
    wall_grid(b, 'z', z0, u_edges, v_edges, opening, MAT_PLASTER, (xm, 1.5, z0 - 1.0))
    wall_grid(b, 'z', z0, u_edges, v_edges, opening, MAT_PLASTER, (xm, 1.5, z0 + 1.0))
    soffit = [(x0, h, z0), (x1, h, z0), (x1, h, z1), (x0, h, z1)]
    b.add(soffit, MAT_PLASTER, (xm, 1.5, zm))
    b.add(soffit, MAT_PLASTER, (xm, h + 1.0, zm))


# ---- realisation ---------------------------------------------------------------------------
def realize(b, material_names, first_cell):
    me = bpy.data.meshes.new(b.name)
    me.from_pydata([to_b(p) for p in b.verts], [], [list(f) for f, _ in b.faces])
    me.update()
    for mn in material_names:
        me.materials.append(bpy.data.materials[mn])
    uv = me.uv_layers.new(name='uv')
    lm = me.uv_layers.new(name='lm')
    cell = LM_RES / LM_GRID
    inner = cell - 2 * LM_PAD_PX
    for pi, poly in enumerate(me.polygons):
        f, mat = b.faces[pi]
        poly.material_index = mat
        pts = [b.verts[i] for i in f]
        proj = [box_uv(p, newell(pts)) for p in pts]
        us, vs = [p[0] for p in proj], [p[1] for p in proj]
        u0, v0 = min(us), min(vs)
        du, dv = (max(us) - u0) or 1.0, (max(vs) - v0) or 1.0
        c = first_cell + pi
        cx, cy = c % LM_GRID, c // LM_GRID
        for li, loop in enumerate(poly.loop_indices):
            pu, pv = proj[li]
            uv.data[loop].uv = (pu / UV_TILE_M, pv / UV_TILE_M)
            fu, fv = (pu - u0) / du, (pv - v0) / dv
            lm.data[loop].uv = ((cx * cell + LM_PAD_PX + fu * inner) / LM_RES,
                                (cy * cell + LM_PAD_PX + fv * inner) / LM_RES)
    me.update()
    ob = bpy.data.objects.new(b.name, me)
    bpy.context.scene.collection.objects.link(ob)
    return len({mat for _, mat in b.faces})


def export_glb(path):
    bpy.ops.export_scene.gltf(
        filepath=str(path), export_format='GLB', export_apply=True, export_tangents=False,
        export_texcoords=True, export_normals=True, export_materials='EXPORT',
        export_image_format='AUTO', export_yup=True, export_animations=False, export_skins=False,
        export_morph=False, export_cameras=False, export_lights=False, export_extras=False,
        use_selection=False)


def stage_dir():
    argv = sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else []
    for flag in ('--out', '--stage'):
        if flag in argv:
            return Path(argv[argv.index(flag) + 1]).resolve()
    if argv and not argv[0].startswith('-'):
        return Path(argv[0]).resolve()
    env = os.environ.get('ZIMNY_STAGE')
    if env:
        return Path(env).resolve()
    return Path(os.getcwd(), 'node_modules', '.cache', 'zimny-asset-stage', ROOM_ID)


def main():
    stage = stage_dir()
    tex_dir = stage / 'tex'
    tex_dir.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.read_factory_settings(use_empty=True)

    images = {name: write_texture(name, size, tex_dir) for name, size in TEXTURES}
    make_material('plaster_warm', images['plaster_warm'], 0.85)
    make_material('marble_floor', images['marble_floor'], 0.35)
    make_material('pane', images['plaster_warm'], 0.6, (PANE_EMISSION_RGB, PANE_EMISSION))

    shell, pane = MeshBuilder('shell'), MeshBuilder('pane')
    build_floor(shell)
    build_north_wall(shell, pane)
    build_south_wall(shell)
    build_end_walls(shell)
    build_vault(shell)
    build_vestibule(shell)

    meshes, cells, drawn, draws = {}, 0, 0, 0
    for b, mats in ((shell, ['plaster_warm', 'marble_floor']), (pane, ['pane'])):
        prims = realize(b, mats, cells)
        meshes[b.name] = {'triangles': b.triangles(), 'instances': 1, 'materials': mats,
                          'lmFirstCell': cells, 'faces': len(b.faces)}
        cells += len(b.faces)
        drawn += b.triangles()
        draws += prims
    if cells > LM_PART2_FIRST_CELL:
        raise RuntimeError(f'envelope lm cells {cells} exceed LM_PART2_FIRST_CELL')

    export_glb(stage / f'{ROOM_ID}.glb')

    summary = {
        'room': ROOM_ID, 'stage': STAGE, 'meshes': meshes, 'trianglesDrawn': drawn,
        'draws': draws, 'budget': {'trianglesMax': 380000},
        'textures': [{'name': n, 'size': s} for n, s in TEXTURES],
        'declared': {
            'bounds': {'x': [X_W, X_E], 'y': [Y_FLOOR, Y_CROWN], 'z': [Z_N, Z_S]},
            'orientation': {'windowWall': 'north Z-86 Neva/Palace Embankment',
                            'portholeWall': 'south Z-62 Palace Square'},
            'windowTiers': {'bays': WIN_BAYS, 'pitchM': WIN_PITCH, 'widthM': WIN_W,
                            'recessM': WIN_RECESS, 'bayCentresX': window_bays(),
                            'tiers': [{'sill': s, 'head': h} for s, h in WIN_TIERS]},
            'portholes': {'radiusM': PORT_R, 'depthM': PORT_DEPTH, 'y': list(PORT_Y),
                          'segments': PORT_SEG},
            'vault': {'springY': VAULT_SPRING_Y, 'crownY': Y_CROWN, 'facets': VAULT_NZ,
                      'coffers': [VAULT_NX, VAULT_NZ], 'cofferDepthM': COFFER_DEPTH},
            'vestibule': {'x': list(VEST_X), 'z': list(VEST_Z), 'ceilingY': VEST_H,
                          'door': {'x': list(DOOR_X), 'head': DOOR_H}},
            'landingY': LANDING_Y,
            'lm': {'res': LM_RES, 'padPx': LM_PAD_PX, 'grid': LM_GRID, 'envelopeCells': cells,
                   'part2FirstCell': LM_PART2_FIRST_CELL},
            'uvTileM': UV_TILE_M,
            'paneEmissionStrength': PANE_EMISSION,
            'textures': [n for n, _ in TEXTURES],
        },
    }
    (stage / 'summary.json').write_text(json.dumps(summary, sort_keys=True, indent=2) + '\n')
    print('ZIMNY_SUMMARY ' + json.dumps(summary, sort_keys=True, separators=(',', ':')))


main()
