# Bake log — military-gallery

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs military-gallery day` | Blender 4.2.23 LTS | 2048+1024 | 128 | OPENIMAGEDENOISE | 0.5 | 3.7817 | 0.1333 | 1280.8 |
| dusk | `node tools/bake.mjs military-gallery dusk` | Blender 4.2.23 LTS | 2048+1024 | 128 | OPENIMAGEDENOISE | 0.15 | 0.2875 | 0.0024 | 2051.6 |
| nightChandeliers | `node tools/bake.mjs military-gallery nightChandeliers` | Blender 4.2.23 LTS | 2048+1024 | 128 | OPENIMAGEDENOISE | 0.3 | 97.9824 | 0.0195 | 2224.2 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 219544 | ae4ac0e26788e430fa5ed24c489ea4fe9f70e0caf0d204e4310f520fcd3fd550 |
| day | lm/kit-day.ktx2 | 64074 | cf57fddda17ff164cc41421e2de7f734a45bfc4e3e4e76fba79e5795ab8ad22b |
| dusk | lm/dusk.ktx2 | 165240 | 9a99c9bff31073bdfd3b4f47c972eb84e250fe111e834927a7f32e099fe92733 |
| dusk | lm/kit-dusk.ktx2 | 30452 | 93f19f829125fdf974211c812e2206593674560f6e9fc0ce68a1b87fa2a528a9 |
| dusk | probe/dusk.ktx2 | 8119 | 1cfd73acd2c5ccfa0b099dc5cb7c877058168656cf1f87e0bb4016e4254717b2 |
| nightChandeliers | lm/night.ktx2 | 171733 | 5df195ddfc43089de67f5b93e987ea9b4f660e8e419ec51eaea3567f582d9057 |
| nightChandeliers | lm/kit-night.ktx2 | 67843 | 673ff6ad7d737ef925a9193e426b609c21c5ccf78a4a0529c4d6dca796ea2fe8 |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.
