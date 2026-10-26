# Bake log — military-gallery

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs military-gallery day` | Blender 4.2.23 LTS | 2048+1024 | 128 | OPENIMAGEDENOISE | 1.5 | 4.3686 | 0.0117 | 1979.6 |
| dusk | `node tools/bake.mjs military-gallery dusk` | Blender 4.2.23 LTS | 2048+1024 | 128 | OPENIMAGEDENOISE | 0.15 | 0.2718 | 0.0016 | 2515.4 |
| nightChandeliers | `node tools/bake.mjs military-gallery nightChandeliers` | Blender 4.2.23 LTS | 2048+1024 | 128 | OPENIMAGEDENOISE | 0.3 | 86.7738 | 0.0186 | 2607.3 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 140583 | d2147353a5c53e9ffa77d5e02b5db97bbb9638384e79c51f051e1aaa5857d2f4 |
| day | lm/kit-day.ktx2 | 24877 | 878ff1f71d6c1e5ef71d6821f85b59292c53fad3666b5c9cdd1d4ccc5da28903 |
| dusk | lm/dusk.ktx2 | 115842 | 896af9993c860dda66593f1a6f00183c41e2425c70f87fbf045c7707e0257659 |
| dusk | lm/kit-dusk.ktx2 | 18833 | 44b37db7eb361936fa94b7bb2b3f0d08b03d572a4a56fcb056fb87a7347e45ab |
| dusk | probe/dusk.ktx2 | 7549 | b83fb3d924722e84e169517b9b4e81349f0cee946f292b45e9dd4c87f4fc4a38 |
| nightChandeliers | lm/night.ktx2 | 187060 | 4c76d1fcbbda495dfe860bcea4fdbfa7cdbddf8a8d1fb87fb03330ef9c823b15 |
| nightChandeliers | lm/kit-night.ktx2 | 66324 | 931e7dfb61babd82a3483f0fa3b26b041c385e91bf18a2d4eafadff40a97ce2c |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.
