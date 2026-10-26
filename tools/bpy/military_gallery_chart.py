# tools/bpy/military_gallery_chart.py — Phase 3 R4 Slice A: the 1812 architecture lightmap chart.
# Imported by tools/bpy/military-gallery.py. design-gallery.md §3.7 as amended by R4 D-10/D-11:
# the architecture rides its own ARCH_CHART_RES² chart; the frame kit keeps the 1024² strip grid
# of tools/gallery/layout.mjs (frames + canvases, incl. the K8 portal block).
#
# Patch law: every architecture face is authored as part of a DEVELOPABLE patch — a flat metres
# rectangle (w_m x h_m) with a metres->(s, t) map the builder supplies per loop. Planes map
# directly (one patch per face, D-10's per-face law); prisms unroll as a lateral strip plus two
# caps (prism_net — a tight net: width = perimeter + two cap diameters); the vault's coffer
# bottoms share one (arc-length, z-band) patch while each coffer pan is its own patch.
# NOT adopted from the relay draft: the box net. A box unrolled into ONE patch has a bounding
# rectangle whose waste explodes on elongated boxes (the 55 m cornice band's net alone demanded
# ~8.1M px — more than the whole chart), and D-10's law says one patch per face. Boxes bind
# per face through the builder's face_patch() helper instead.
#
# Sizing: ARCH_DENSITY_PX_PER_M per metre, clamped to [MIN_PATCH_PX, res - 2*pad].
# Packing: shelf packer over patches sorted (height desc, width desc, name); ARCH_CHART_PAD_PX
# empty texels around every patch (neighbours sit 2*pad apart so Cycles' EXTEND margins never
# meet); overflow raises. The emitted arch-chart.json (sorted keys) is the contract bake.py
# (pane paint), tools/gltf/military-gallery.mjs (UV2 gate, committed copy) and the tests read.
#
# UV convention (the kit chart's committed law, layout.json chartRect): patch x/y are IMAGE
# pixels (y from the top); uv() returns (u, v) with v0 = 1 - (y + h)/res — the Blender-side
# 'lm' value; Blender's glTF exporter flips v once (v_gltf = 1 - v_bpy), and the KTX2 runtime
# samples v_gltf = y/res — the same image-top-left mapping the kit chart verified in 17b.
#
# Pure bookkeeping: no bpy, no randomness, integer sizes from named constants.

import json
import math

ARCH_CHART_FILE = 'arch-chart.json'
ARCH_CHART_RES = 2048
ARCH_CHART_PAD_PX = 2  # the adopted Block 2 LM_PAD_PX (both charts); jordan's committed 2 @ 2k margin
# D-10's FILL, resolved against the real pack: the draft's 36 px/m demanded 4,132,894 px2
# of 4,194,304 (98.5% — the shelf packer overflowed at the 60th patch of 1898); 32 px/m
# (2048/64) demands ~3.27M (78%) and keeps one density across the whole chart (D-10).
ARCH_DENSITY_PX_PER_M = 32.0
MIN_PATCH_PX = 8


def _px(metres, min_px, max_px):
    return int(min(max(math.floor(metres * ARCH_DENSITY_PX_PER_M + 0.5), min_px), max_px))


class Patch:
    __slots__ = ('name', 'part', 'w_m', 'h_m', 'w', 'h', 'x', 'y', 'res')

    def __init__(self, name, part, w_m, h_m, w, h):
        self.name = name
        self.part = part
        self.w_m = w_m
        self.h_m = h_m
        self.w = w
        self.h = h
        self.x = None
        self.y = None
        self.res = None

    def uv(self, s, t):
        """Metres inside the patch -> chart UV (u right, v up; chart y runs top-down)."""
        if self.x is None:
            raise RuntimeError('patch %s read before pack()' % self.name)
        fs = 0.0 if self.w_m <= 0.0 else min(max(s / self.w_m, 0.0), 1.0)
        ft = 0.0 if self.h_m <= 0.0 else min(max(t / self.h_m, 0.0), 1.0)
        return ((self.x + fs * self.w) / self.res, 1.0 - (self.y + ft * self.h) / self.res)

    def to_dict(self):
        return {'h': self.h,
                'hM': round(self.h_m, 5),
                'part': self.part,
                'w': self.w,
                'wM': round(self.w_m, 5),
                'x': self.x,
                'y': self.y}


class ArchChart:
    def __init__(self, res=ARCH_CHART_RES, pad=ARCH_CHART_PAD_PX, min_px=MIN_PATCH_PX):
        self.res = int(res)
        self.pad = int(pad)
        self.min_px = int(min_px)
        self.max_px = self.res - 2 * self.pad
        self.patches = {}
        self._counters = {}
        self.packed = False

    def add(self, part, w_m, h_m, label=None):
        if self.packed:
            raise RuntimeError('ArchChart.add() after pack()')
        if label is None:
            n = self._counters.get(part, 0)
            self._counters[part] = n + 1
            label = '%04d' % n
        name = '%s.%s' % (part, label)
        if name in self.patches:
            raise ValueError('duplicate patch %s' % name)
        patch = Patch(name, part, float(w_m), float(h_m),
                      _px(w_m, self.min_px, self.max_px),
                      _px(h_m, self.min_px, self.max_px))
        self.patches[name] = patch
        return patch

    def pack(self):
        pad, res = self.pad, self.res
        order = sorted(self.patches.values(), key=lambda p: (-p.h, -p.w, p.name))
        demand = sum((p.w + 2 * pad) * (p.h + 2 * pad) for p in order)
        if demand > res * res:
            raise ValueError('arch chart over capacity: %d px2 demanded of %d at %.1f px/m'
                             % (demand, res * res, ARCH_DENSITY_PX_PER_M))
        # Guillotine first-fit: every placement splits its free rect into the RIGHT strip
        # (the rect's full height) and the BOTTOM strip (the slot's width); patches iterate
        # height-descending, so shorter patches fill the strips the tall patches leave.
        # The naive single-band shelf packer wasted every tall band's leftover height and
        # overflowed at ~81% demand; this packs the same demand at ~90%+.
        free = [{'x': pad, 'y': pad, 'w': res - 2 * pad, 'h': res - 2 * pad}]
        for index, p in enumerate(order):
            placed = False
            for fi, rect in enumerate(free):
                if p.w + 2 * pad > rect['w'] or p.h + 2 * pad > rect['h']:
                    continue
                p.x = rect['x'] + pad
                p.y = rect['y'] + pad
                p.res = res
                # Split rule: the RIGHT strip sits beside the slot at the SLOT's height; the
                # BOTTOM strip runs the rect's FULL width under it — so a full-width slab
                # (the floor, the crimson fields) always finds its band.
                slot_w = p.w + 2 * pad
                slot_h = p.h + 2 * pad
                right = {'x': rect['x'] + slot_w, 'y': rect['y'],
                         'w': rect['w'] - slot_w, 'h': slot_h}
                bottom = {'x': rect['x'], 'y': rect['y'] + slot_h,
                          'w': rect['w'], 'h': rect['h'] - slot_h}
                free[fi:fi + 1] = [r for r in (right, bottom)
                                   if r['w'] > 0 and r['h'] > 0]
                placed = True
                break
            if placed:
                continue
            raise ValueError('arch chart overflow at %s (%dx%d): packed %d of %d patches, '
                             '%d px2 demanded of %d — lower ARCH_DENSITY_PX_PER_M'
                             % (p.name, p.w, p.h, index, len(order), demand, res * res))
        self.packed = True
        return self

    def to_dict(self):
        return {'densityPxPerM': ARCH_DENSITY_PX_PER_M,
                'minPx': self.min_px,
                'pad': self.pad,
                'patches': {name: self.patches[name].to_dict() for name in sorted(self.patches)},
                'res': self.res}

    def write_json(self, path):
        with open(path, 'w', encoding='utf-8') as handle:
            json.dump(self.to_dict(), handle, sort_keys=True, indent=2)
            handle.write('\n')


def prism_net(radius, height, sides):
    """(patch_w, patch_h, chord, perimeter): sides unrolled, then two 2r caps."""
    chord = 2.0 * radius * math.sin(math.pi / sides)
    perim = chord * sides
    return perim + 4.0 * radius, max(height, 2.0 * radius), chord, perim


def prism_side_st(i, chord, height):
    return ((i * chord, 0.0),
            ((i + 1) * chord, 0.0),
            ((i + 1) * chord, height),
            (i * chord, height))


def prism_cap_st(angles, radius, offset):
    return tuple((offset + radius + math.cos(a) * radius,
                  radius + math.sin(a) * radius) for a in angles)
