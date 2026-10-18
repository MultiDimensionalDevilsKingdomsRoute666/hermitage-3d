"""Zimny phase-2 - jordan (Jordan Staircase) — the complete kit (envelope + ascent).

Deterministic bpy authoring for Blender 4.2 LTS. Everything is authored in glTF world axes
(+X east, +Z south / Palace Square, -Z north / Neva, +Y up); Blender = (x, -z, y).
The envelope ('shell' and 'pane': geometry, UVs, lm cells) is frozen; the ascent adds NEW
meshes only: 'stairs', 'rail', 'baluster' (instanced), 'column' (x2), 'portal' (with vase
niches), 'chandelier' and 'sconce' (instanced). Kit lm cells start at LM_PART2_FIRST_CELL;
instanced props share their template's cells (ADR-0013 probe).
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

# Round 17a: tools/bpy/bake.py exec's this builder with ZIMNY_BAKE=1 — build the scene,
# skip the export + summary (the bake owns stdout and never writes the glb).
BAKE = os.environ.get('ZIMNY_BAKE') == '1'

ROOM_ID = 'jordan'
STAGE = 'full'

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

# ---- PART 2: the ascent (new constants; everything above is the frozen envelope) -----------
KIT_BASE, KIT_GLOW = 0, 1  # per-mesh material slots for the two-slot kit meshes (sconce, chandelier)
KIT_GLOW_RGB = (1.0, 0.86, 0.62)
KIT_GLOW_EMISSION = 6.0
LM_CAPACITY = LM_GRID * LM_GRID  # 4096 cells

RISERS = 35  # per flight; the 35th riser is the slab edge of the level above
TREADS = RISERS - 1
RISE = 5.0 / RISERS  # 0.142857 m (both flights climb 5 m)
GOING = 0.32
RUN = TREADS * GOING  # 10.88 m plan run per flight
STRINGER_T = 0.45  # vertical thickness of the stringer/soffit slab under the nose line
SLAB_T = 0.5

MEZZ_Y = 5.0
F1_X = (X_W, X_W + 1.6)  # flight 1 hugs the west wall and climbs northward
F1_TOP_Z = -79.0  # mezzanine edge (top nose) of flight 1
F1_Z0 = F1_TOP_Z + RUN  # -68.12, first riser, 2 m north of the vestibule
MEZZ_Z = (-84.4, F1_TOP_Z)
F2_TOP_X = 80.0  # landing edge (top nose) of flight 2
F2_X0 = F2_TOP_X - RUN  # 69.12
MEZZ_X = (X_W, F2_X0)
F2_Z = (-84.4, -82.8)  # flight 2 runs east along the window wall, 1.6 m clear of it
LAND_X = (F2_TOP_X, X_E)
LAND_Z = (-84.4, -64.0)

FLIGHTS = (
    {'name': 'flight1', 'axis': 'z', 'a0': F1_Z0, 'd': -1.0, 'band': F1_X,
     'y': (Y_FLOOR, MEZZ_Y), 'open': (F1_X[1],)},
    {'name': 'flight2', 'axis': 'x', 'a0': F2_X0, 'd': 1.0, 'band': F2_Z,
     'y': (MEZZ_Y, LANDING_Y), 'open': F2_Z},
)

RAIL_INSET = 0.1  # rail / baluster centre line inboard of the open edge
RAIL_TOP = 1.0  # rail top above the flight datum (nose line - one rise) and the slab edges
RAIL_PROFILE = (0.12, 0.08)  # (width, height) of the rectangular handrail section
RAIL_RUNS = (
    ((F1_X[1] - RAIL_INSET, Y_FLOOR, F1_Z0),
     (F1_X[1] - RAIL_INSET, MEZZ_Y, MEZZ_Z[1] - RAIL_INSET),
     (MEZZ_X[1] - RAIL_INSET, MEZZ_Y, MEZZ_Z[1] - RAIL_INSET),
     (MEZZ_X[1] - RAIL_INSET, MEZZ_Y, F2_Z[1] + RAIL_INSET),
     (LAND_X[0] + RAIL_INSET, LANDING_Y, F2_Z[1] + RAIL_INSET),
     (LAND_X[0] + RAIL_INSET, LANDING_Y, LAND_Z[1] - RAIL_INSET),
     (LAND_X[1] - RAIL_INSET, LANDING_Y, LAND_Z[1] - RAIL_INSET)),
    ((X_W + 0.15, MEZZ_Y, MEZZ_Z[0] + RAIL_INSET),
     (F2_X0, MEZZ_Y, MEZZ_Z[0] + RAIL_INSET),
     (LAND_X[0] + RAIL_INSET, LANDING_Y, MEZZ_Z[0] + RAIL_INSET),
     (LAND_X[1] - RAIL_INSET, LANDING_Y, MEZZ_Z[0] + RAIL_INSET)),
)

BALUSTER_PITCH = 0.55  # count per segment = int(horizontal length / pitch + 0.5) -> N = 151
BALUSTER_SEG = 6
BALUSTER_RINGS = ((0.05, -2 * RISE), (0.07, 0.03), (0.03, 0.14), (0.06, 0.42), (0.03, 0.72),
                  (0.05, 0.95))  # (radius, y above datum); root sunk two rises into the step

COLUMN_XZ = ((91.0, -76.6), (91.0, -71.4))  # twin granite columns flanking the portal
COLUMN_SEG = 12
COLUMN_PLINTH = (0.65, 0.3)  # half-width, height
COLUMN_SHAFT = ((0.5, 0.3), (0.42, 8.9))  # (radius, local y) bottom -> top
COLUMN_CAP = (0.6, 8.9, 9.5)  # half-width, y0, y1 (top at Y 19.5, under the vault)

PORTAL_Z = -74.0
PORTAL_HALF_W = 1.5
PORTAL_H = 6.0
PORTAL_JAMB = 0.5
PORTAL_DEPTH = 0.25  # proud of the east wall
PORTAL_ENTAB = (16.5, 17.3, 2.6)  # y0, y1, half-width
NICHE_DZ = 5.5  # niche bays either side of the portal axis
NICHE_OUTER = (0.75, 10.8, 14.4)  # half-width, y0, y1 of the aedicule
NICHE_OPEN = (0.5, 11.1, 14.0)  # half-width, sill, head of the recess
NICHE_DEPTH = 0.45  # frame face proud of the wall
NICHE_CAVITY = 0.35
PEDESTAL = (0.2, 0.25)  # half-width, height
VASE_SEG = 6
VASE_RINGS = ((0.07, 0.0), (0.13, 0.2), (0.17, 0.55), (0.09, 1.0), (0.07, 1.15), (0.12, 1.27))

CHAND_C = (86.0, -74.0)  # over the landing centre
CHAND_RING_Y = 15.0
CHAND_R = (1.45, 1.6)  # inner, outer radius of the gilt ring
CHAND_BAND = 0.2
CHAND_SEG = 10
CHAND_ROD = 0.06
CHAND_ROD_TOP = 19.9
CHAND_DROP = (0.12, 0.3, 0.12)  # pendant octahedron half-extents
CHAND_DROP_R = 1.5
CHAND_DROP_Y = 14.5
CHAND_CORE = (0.4, 0.8, 0.4)
CHAND_CORE_Y = 14.2

SCONCE_ABOVE = 1.8  # above the flight datum
SCONCE_WEST_Z = (-69.5, -71.5, -73.5, -75.5, -77.5)  # flight 1, west wall, pitch 2.0
SCONCE_NORTH_X = (71.2, 75.1, 79.0)  # flight 2, window piers between bays 1-2, 2-3, 3-4
SCONCE_EAST = ((-82.0, 12.4), (-66.0, 12.4))  # (z, y) on the east wall flanking the portal
SCONCE_BRACKET = (0.35, 0.05)  # depth, half-size
SCONCE_GLOW_BOX = ((0.22, 0.48), (0.05, 0.45), (-0.13, 0.13))  # (depth, height, width) mount offsets


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


# ---- PART 2: builders and placement (frozen envelope above) --------------------------------
def kit_centre(pts):
    return tuple(sum(p[i] for p in pts) / len(pts) for i in range(3))


def kit_solid(b, faces, mat=KIT_BASE):
    centre = kit_centre([p for face in faces for p in face])
    for face in faces:
        ref = v_sub(v_scale(kit_centre(face), 2), centre)
        b.add(face, mat, ref)


def kit_loft(b, a, c, mat=KIT_BASE):
    faces = [a, c]
    for i in range(len(a)):
        j = (i + 1) % len(a)
        faces.append([a[i], a[j], c[j], c[i]])
    kit_solid(b, faces, mat)


def kit_box(b, x, y, z, mat=KIT_BASE):
    rings = [[(x[0], h, z[0]), (x[1], h, z[0]), (x[1], h, z[1]), (x[0], h, z[1])] for h in y]
    kit_loft(b, *rings, mat)


def kit_circle(cx, cz, radius, y, segments):
    return [(cx + radius * math.cos(2 * math.pi * k / segments), y,
             cz + radius * math.sin(2 * math.pi * k / segments)) for k in range(segments)]


def kit_lathe(b, rings, segments, cx=0.0, cz=0.0, mat=KIT_BASE):
    circles = [kit_circle(cx, cz, r, y, segments) for r, y in rings]
    for a, c in zip(circles, circles[1:]):
        centre = (cx, (a[0][1] + c[0][1]) / 2, cz)
        for i in range(segments):
            j = (i + 1) % segments
            face = [a[i], a[j], c[j], c[i]]
            b.add(face, mat, v_sub(v_scale(kit_centre(face), 2), centre))
    height = rings[-1][1] - rings[0][1]
    b.add(circles[0], mat, (cx, rings[0][1] - height, cz))
    b.add(circles[-1], mat, (cx, rings[-1][1] + height, cz))


def kit_beam(b, a, c, width, height, mat=KIT_BASE):
    side = v_scale(unit((a[2] - c[2], 0.0, c[0] - a[0])), width / 2)
    rings = [[(p[0] + s * side[0], p[1] + h * height / 2, p[2] + s * side[2])
              for s, h in ((-1, -1), (1, -1), (1, 1), (-1, 1))] for p in (a, c)]
    kit_loft(b, *rings, mat)


def kit_octahedron(b, centre, half, mat):
    x, y, z = half
    ring = [v_add(centre, p) for p in ((x, 0, 0), (0, 0, z), (-x, 0, 0), (0, 0, -z))]
    faces = [[v_add(centre, (0, h, 0)), ring[i], ring[(i + 1) % len(ring)]]
             for h in (-y, y) for i in range(len(ring))]
    kit_solid(b, faces, mat)


def rail_flight(a, c):
    return next(f for f in FLIGHTS if f['y'] == (a[1], c[1]))


def flight_datum(f, coordinate):
    distance = (coordinate - f['a0']) * f['d']
    if distance >= RUN:
        return f['y'][1]
    return f['y'][0] + max(0.0, distance) * RISE / GOING


def stringer_band(f):
    axis = 2 if f['axis'] == 'x' else 0
    centres = [a[axis] for run in RAIL_RUNS for a, c in zip(run, run[1:]) if (a[1], c[1]) == f['y']]
    radius = max(r for r, _ in BALUSTER_RINGS)
    return (min([f['band'][0]] + [c - radius for c in centres]),
            max([f['band'][1]] + [c + radius for c in centres]))


def build_stairs(b):
    # MAT_MARBLE is shell slot 1; this single-material mesh uses local slot KIT_BASE.
    for f in FLIGHTS:
        for i in range(TREADS):
            a = f['a0'] + f['d'] * i * GOING
            span = sorted((a, a + f['d'] * GOING))
            y = (f['y'][0] + i * RISE, f['y'][0] + (i + 1) * RISE)
            x, z = (span, f['band']) if f['axis'] == 'x' else (f['band'], span)
            kit_box(b, x, y, z)
        band = stringer_band(f)
        rings = []
        for a, y in ((f['a0'], f['y'][0]), (f['a0'] + f['d'] * RUN, f['y'][1] - RISE)):
            rings.append([plane_point(f['axis'], u, h, a) for u, h in
                          ((band[0], y), (band[1], y), (band[1], y - STRINGER_T),
                           (band[0], y - STRINGER_T))])
        kit_loft(b, *rings)
    for x, y, z in ((MEZZ_X, MEZZ_Y, MEZZ_Z), (LAND_X, LANDING_Y, LAND_Z)):
        kit_box(b, x, (y - SLAB_T, y), z)


def rail_path(run):
    path = [run[0]]
    for a, c in zip(run, run[1:]):
        if a[1] == c[1]:
            path.append(c)
            continue
        f = rail_flight(a, c)
        axis = 0 if f['axis'] == 'x' else 2
        start, end = list(a), list(c)
        start[axis], start[1] = f['a0'], f['y'][0]
        end[axis], end[1] = f['a0'] + f['d'] * RUN, f['y'][1] - RISE
        upper = (end[0], f['y'][1], end[2])
        for p in (tuple(start), tuple(end), upper, c):
            if p != path[-1]:
                path.append(p)
    return path


def rail_side(path, i):
    p = path[i]

    def heading(a, c):
        return unit((c[0] - a[0], 0.0, c[2] - a[2]))

    before = next((heading(q, p) for q in reversed(path[:i]) if (q[0], q[2]) != (p[0], p[2])), None)
    after = next((heading(p, q) for q in path[i + 1:] if (q[0], q[2]) != (p[0], p[2])), None)
    before, after = before or after, after or before
    denominator = 1 + v_dot(before, after)
    if denominator <= 0:
        raise ValueError('rail cannot miter a reversing segment')
    direction = v_add(before, after)
    return v_scale((-direction[2], 0.0, direction[0]), RAIL_PROFILE[0] / (2 * denominator))


def build_rail(b):
    height = RAIL_PROFILE[1]
    for run in RAIL_RUNS:
        path = rail_path(run)
        sides = [rail_side(path, i) for i in range(len(path))]
        rings = [[(p[0] + s * side[0], p[1] + y, p[2] + s * side[2])
                  for s, y in ((-1, RAIL_TOP - height), (1, RAIL_TOP - height),
                               (1, RAIL_TOP), (-1, RAIL_TOP))]
                 for p, side in zip(path, sides)]
        for i, (a, c) in enumerate(zip(path, path[1:])):
            if (a[0], a[2]) != (c[0], c[2]):
                kit_loft(b, rings[i], rings[i + 1])
                continue
            # A vertical sweep of a vertical section degenerates; use a solid return instead.
            side = sides[i]
            along = v_scale(unit((side[2], 0.0, -side[0])), height / 2)
            corners = [v_add(a, v_add(v_scale(side, s), v_scale(along, t)))
                       for s, t in ((-1, -1), (1, -1), (1, 1), (-1, 1))]
            lower = [(p[0], a[1] + RAIL_TOP - height, p[2]) for p in corners]
            upper = [(p[0], c[1] + RAIL_TOP, p[2]) for p in corners]
            kit_loft(b, lower, upper)


def build_baluster(b):
    kit_lathe(b, BALUSTER_RINGS, BALUSTER_SEG)


def build_column(b):
    half, height = COLUMN_PLINTH
    kit_box(b, (-half, half), (0.0, height), (-half, half))
    kit_lathe(b, COLUMN_SHAFT, COLUMN_SEG)
    half, bottom, top = COLUMN_CAP
    kit_box(b, (-half, half), (bottom, top), (-half, half))


def build_portal(b):
    x = (X_E - PORTAL_DEPTH, X_E)
    head = LANDING_Y + PORTAL_H
    for sign in (-1, 1):
        z = sorted((PORTAL_Z + sign * PORTAL_HALF_W, PORTAL_Z + sign * (PORTAL_HALF_W + PORTAL_JAMB)))
        kit_box(b, x, (LANDING_Y, head), z)
    half = PORTAL_HALF_W + PORTAL_JAMB
    kit_box(b, x, (head, head + PORTAL_JAMB), (PORTAL_Z - half, PORTAL_Z + half))
    bottom, top, half = PORTAL_ENTAB
    kit_box(b, x, (bottom, top), (PORTAL_Z - half, PORTAL_Z + half))
    face, back = X_E - NICHE_DEPTH, X_E - NICHE_DEPTH + NICHE_CAVITY
    for cz in (PORTAL_Z - NICHE_DZ, PORTAL_Z + NICHE_DZ):
        outer_w, y0, y1 = NICHE_OUTER
        inner_w, sill, head = NICHE_OPEN
        outer = [(face, y0, cz - outer_w), (face, y0, cz + outer_w),
                 (face, y1, cz + outer_w), (face, y1, cz - outer_w)]
        inner = [(face, sill, cz - inner_w), (face, sill, cz + inner_w),
                 (face, head, cz + inner_w), (face, head, cz - inner_w)]
        centre = ((face + X_E) / 2, (y0 + y1) / 2, cz)
        for i in range(len(outer)):
            j = (i + 1) % len(outer)
            b.add([outer[i], outer[j], inner[j], inner[i]], KIT_BASE, HALL_REF)
            quad = [outer[i], outer[j], (X_E, outer[j][1], outer[j][2]),
                    (X_E, outer[i][1], outer[i][2])]
            b.add(quad, KIT_BASE, v_sub(v_scale(kit_centre(quad), 2), centre))
        add_reveals(b, 'x', face, back, cz - inner_w, cz + inner_w, sill, head, KIT_BASE)
        b.add([(back, p[1], p[2]) for p in inner], KIT_BASE, HALL_REF)
        cx, (half, height) = (face + back) / 2, PEDESTAL
        kit_box(b, (cx - half, cx + half), (sill, sill + height), (cz - half, cz + half))
        kit_lathe(b, [(r, sill + height + y) for r, y in VASE_RINGS], VASE_SEG, cx, cz)


def build_chandelier(b):
    cx, cz = CHAND_C
    low, high = CHAND_RING_Y - CHAND_BAND / 2, CHAND_RING_Y + CHAND_BAND / 2
    il, ih = [kit_circle(cx, cz, CHAND_R[0], y, CHAND_SEG) for y in (low, high)]
    ol, oh = [kit_circle(cx, cz, CHAND_R[1], y, CHAND_SEG) for y in (low, high)]
    centre = (cx, CHAND_RING_Y, cz)
    for i in range(CHAND_SEG):
        j = (i + 1) % CHAND_SEG
        outer = [ol[i], ol[j], oh[j], oh[i]]
        b.add(outer, KIT_BASE, v_sub(v_scale(kit_centre(outer), 2), centre))
        b.add([il[i], il[j], ih[j], ih[i]], KIT_BASE, centre)
        b.add([oh[i], oh[j], ih[j], ih[i]], KIT_BASE, (cx, high + CHAND_BAND, cz))
        b.add([ol[i], ol[j], il[j], il[i]], KIT_BASE, (cx, low - CHAND_BAND, cz))
    half = CHAND_ROD / 2
    kit_box(b, (cx - half, cx + half), (low, CHAND_ROD_TOP), (cz - half, cz + half))
    count = min(CHAND_SEG, 8)
    for x, _, z in kit_circle(cx, cz, CHAND_DROP_R, CHAND_DROP_Y, count):
        kit_beam(b, centre, (x, CHAND_RING_Y, z), CHAND_ROD, CHAND_ROD)
        kit_box(b, (x - half, x + half), (CHAND_DROP_Y + CHAND_DROP[1], low), (z - half, z + half))
        kit_octahedron(b, (x, CHAND_DROP_Y, z), CHAND_DROP, KIT_GLOW)
    kit_octahedron(b, (cx, CHAND_CORE_Y, cz), CHAND_CORE, KIT_GLOW)


def build_sconce(b):
    depth, half = SCONCE_BRACKET
    kit_box(b, (-half, half), (-half, half), (-depth, 0.0), KIT_BASE)
    depth, height, width = SCONCE_GLOW_BOX
    kit_box(b, width, height, (-depth[1], -depth[0]), KIT_GLOW)


def place(name, me, location, rot_y=0.0):
    ob = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(ob)
    ob.location = to_b(location)
    ob.rotation_euler = (0.0, 0.0, rot_y)
    return ob


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
    make_material('sconce_glow', images['plaster_warm'], 0.85, (KIT_GLOW_RGB, KIT_GLOW_EMISSION))
    make_material('chandelier_glow', images['gilt'], 0.35, (KIT_GLOW_RGB, KIT_GLOW_EMISSION))
    make_material('granite_grey', images['granite_grey'], 0.6)
    make_material('gilt', images['gilt'], 0.35)

    shell, pane = MeshBuilder('shell'), MeshBuilder('pane')
    build_floor(shell)
    build_north_wall(shell, pane)
    build_south_wall(shell)
    build_end_walls(shell)
    build_vault(shell)
    build_vestibule(shell)

    runners = [(shell, ['plaster_warm', 'marble_floor']), (pane, ['pane'])]
    for name, builder, mats in (
        ('stairs', build_stairs, ['marble_floor']),
        ('rail', build_rail, ['gilt']),
        ('baluster', build_baluster, ['gilt']),
        ('column', build_column, ['granite_grey']),
        ('portal', build_portal, ['gilt']),
        ('chandelier', build_chandelier, ['gilt', 'chandelier_glow']),
        ('sconce', build_sconce, ['plaster_warm', 'sconce_glow']),
    ):
        b = MeshBuilder(name)
        builder(b)
        runners.append((b, mats))

    meshes, cells, drawn, draws = {}, 0, 0, 0
    templates, primitives, envelope_cells = {}, {}, 0
    for b, mats in runners:
        name = b.name
        if name == 'stairs':
            cells = LM_PART2_FIRST_CELL
        first_cell = cells
        cells += len(b.faces)
        if cells > LM_CAPACITY:
            raise RuntimeError(
                f'lm cells {cells} exceed LM_CAPACITY ({LM_CAPACITY}); overflow mesh: {name}')
        prims = realize(b, mats, first_cell)
        meshes[name] = {'triangles': b.triangles(), 'instances': 1, 'materials': mats,
                        'lmFirstCell': first_cell, 'faces': len(b.faces)}
        primitives[name] = prims
        draws += prims
        if name == 'pane':
            envelope_cells = cells
        if name in ('baluster', 'column', 'sconce'):
            ob = bpy.data.objects[name]
            templates[name] = ob.data
            bpy.data.objects.remove(ob, do_unlink=True)
            meshes[name]['instances'] = 0

    def put(name, location, rot_y=0.0):
        place(name, templates[name], location, rot_y)
        meshes[name]['instances'] += 1

    segment_counts = []
    for run in RAIL_RUNS:
        counts = []
        for a, c in zip(run, run[1:]):
            dx, dz = c[0] - a[0], c[2] - a[2]
            length = math.hypot(dx, dz)
            count = int(length / BALUSTER_PITCH + 0.5)
            counts.append(count)
            for i in range(count):
                p = lerp(a, c, (i + 0.5) / count)
                y = a[1]
                if a[1] != c[1]:
                    f = rail_flight(a, c)
                    y = flight_datum(f, p[0] if f['axis'] == 'x' else p[2])
                put('baluster', (p[0], y, p[2]), math.atan2(-dz, dx))
        segment_counts.append(counts)
    for x, z in COLUMN_XZ:
        put('column', (x, LANDING_Y, z))
    for z in SCONCE_WEST_Z:
        put('sconce', (X_W, flight_datum(FLIGHTS[0], z) + SCONCE_ABOVE, z), -math.pi / 2)
    for x in SCONCE_NORTH_X:
        put('sconce', (x, flight_datum(FLIGHTS[1], x) + SCONCE_ABOVE, Z_N), math.pi)
    for z, y in SCONCE_EAST:
        put('sconce', (X_E, y, z), math.pi / 2)

    drawn = sum(row['triangles'] * row['instances'] for row in meshes.values())
    draws_naive = sum(primitives[name] * row['instances'] for name, row in meshes.items())

    if BAKE:
        return
    export_glb(stage / f'{ROOM_ID}.glb')

    summary = {
        'room': ROOM_ID, 'stage': STAGE, 'meshes': meshes, 'trianglesDrawn': drawn,
        'draws': draws, 'drawsNaive': draws_naive, 'budget': {'trianglesMax': 380000},
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
            'lm': {'res': LM_RES, 'padPx': LM_PAD_PX, 'grid': LM_GRID, 'envelopeCells': envelope_cells,
                   'part2FirstCell': LM_PART2_FIRST_CELL, 'part2Cells': cells - LM_PART2_FIRST_CELL,
                   'totalCells': cells, 'capacity': LM_CAPACITY},
            'uvTileM': UV_TILE_M,
            'paneEmissionStrength': PANE_EMISSION,
            'textures': [n for n, _ in TEXTURES],
            'flights': [dict(f, top=f['a0'] + f['d'] * RUN, risers=RISERS, treads=TREADS,
                             riseM=RISE, goingM=GOING, runM=RUN,
                             treadBlockM=[f['band'][1] - f['band'][0], RISE, GOING],
                             topRiser='slab edge', stringerThicknessM=STRINGER_T,
                             stringerBand=stringer_band(f)) for f in FLIGHTS],
            'slabs': {'thicknessM': SLAB_T,
                      'mezzanine': {'x': MEZZ_X, 'y': MEZZ_Y, 'z': MEZZ_Z},
                      'landing': {'x': LAND_X, 'y': LANDING_Y, 'z': LAND_Z},
                      'soffitReturnM': abs(STRINGER_T + RISE - SLAB_T)},
            'rail': {'profileM': RAIL_PROFILE, 'topAboveDatumM': RAIL_TOP, 'runs': RAIL_RUNS,
                     'datum': 'nose line minus one rise; slab top on landings',
                     'topReturnsM': RISE, 'returnPlanDepthM': RAIL_PROFILE[1],
                     'joins': 'mitered closed spans and overlapping solid vertical returns',
                     'flight2SouthSupportM': round(stringer_band(FLIGHTS[1])[1] - F2_Z[1], 6)},
            'balusters': {'pitchM': BALUSTER_PITCH, 'N': meshes['baluster']['instances'],
                          'segmentCounts': segment_counts, 'segments': BALUSTER_SEG,
                          'rings': BALUSTER_RINGS, 'placement': 'equal-bin midpoints per segment',
                          'datum': 'same continuous nose-minus-rise datum as the rail'},
            'columns': {'count': meshes['column']['instances'], 'xz': COLUMN_XZ,
                        'baseY': LANDING_Y, 'plinth': COLUMN_PLINTH, 'shaft': COLUMN_SHAFT,
                        'cap': COLUMN_CAP, 'segments': COLUMN_SEG, 'capLoweredM': 0.0,
                        'capTopY': LANDING_Y + COLUMN_CAP[2]},
            'portal': {'z': PORTAL_Z, 'baseY': LANDING_Y, 'halfWidthM': PORTAL_HALF_W,
                       'heightM': PORTAL_H, 'jambM': PORTAL_JAMB, 'depthM': PORTAL_DEPTH,
                       'entablature': PORTAL_ENTAB, 'opening': 'wall-backed; frozen shell uncut',
                       'nichesZ': [PORTAL_Z - NICHE_DZ, PORTAL_Z + NICHE_DZ],
                       'nicheOuter': NICHE_OUTER, 'nicheOpen': NICHE_OPEN,
                       'nicheFaceDepthM': NICHE_DEPTH, 'nicheCavityM': NICHE_CAVITY,
                       'pedestal': PEDESTAL,
                       'vases': {'count': 2, 'segments': VASE_SEG, 'rings': VASE_RINGS,
                                 'mesh': 'portal'}},
            'chandelier': {'xz': CHAND_C, 'ringY': CHAND_RING_Y, 'radiiM': CHAND_R,
                           'bandM': CHAND_BAND, 'segments': CHAND_SEG, 'rodWidthM': CHAND_ROD,
                           'rodTopY': CHAND_ROD_TOP, 'pendants': min(CHAND_SEG, 8),
                           'spokes': min(CHAND_SEG, 8), 'dropHalfExtentsM': CHAND_DROP,
                           'dropRadiusM': CHAND_DROP_R, 'dropY': CHAND_DROP_Y,
                           'coreHalfExtentsM': CHAND_CORE, 'coreY': CHAND_CORE_Y,
                           'emissionStrength': KIT_GLOW_EMISSION},
            'sconces': {'M': meshes['sconce']['instances'], 'aboveDatumM': SCONCE_ABOVE,
                        'westZ': SCONCE_WEST_Z, 'northX': SCONCE_NORTH_X, 'eastZY': SCONCE_EAST,
                        'westPitchM': abs(SCONCE_WEST_Z[1] - SCONCE_WEST_Z[0]),
                        'northPitchM': round(SCONCE_NORTH_X[1] - SCONCE_NORTH_X[0], 6),
                        'templateFront': '-Z', 'northWorldFront': '+Z into hall',
                        'rotYRadians': {'west': -math.pi / 2, 'north': math.pi,
                                        'east': math.pi / 2},
                        'bracket': SCONCE_BRACKET, 'glowBox': SCONCE_GLOW_BOX,
                        'emissionStrength': KIT_GLOW_EMISSION},
            'kitRefs': 'solids: twice face centroid minus interior centroid; lathe sides: '
                       'radially outward; caps: beyond ends; ring inner: centre; niche faces: '
                       'HALL_REF; niche reveals: cavity centre; frame returns: radially outward',
            'lmInstancePolicy': 'instanced props share their template\'s \'lm\' cells; '
                                'the r17 lighting policy for props is the ADR-0013 static '
                                'environment probe (architecture + stairs get the lightmap '
                                'bake, props get probe + emissive fixtures).',
        },
    }
    (stage / 'summary.json').write_text(json.dumps(summary, sort_keys=True, indent=2) + '\n')
    print('ZIMNY_SUMMARY ' + json.dumps(summary, sort_keys=True, separators=(',', ':')))


main()
