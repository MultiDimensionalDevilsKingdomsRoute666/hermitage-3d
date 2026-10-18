# Bake log — jordan

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs jordan day` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | 6 | 2.962 | 0 | 1608.7 |
| dusk | `node tools/bake.mjs jordan dusk` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | 6 | 21.3608 | 0.0003 | 2398.7 |
| nightChandeliers | `node tools/bake.mjs jordan nightChandeliers` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | 6 | 20.0613 | 0.0003 | 2058.2 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 58548 | dd8f486dba09152081407645cb9097cef2d29ad8c2cd5500309cc847bec79fb3 |
| dusk | lm/dusk.ktx2 | 51646 | fbf332d1f7fe13ddc8afc15101ac6ba66803d3991f23d35a43b4c4cc53318985 |
| dusk | probe/dusk.ktx2 | 5377 | 7409beccda1f446b244e654b3ce4b4764f8c78cef528ed63f9e0fd4f694c4398 |
| nightChandeliers | lm/night.ktx2 | 111306 | 7d9603cef234e6a3f204f3384829539e4c5aa3af4ac99f9eea5bca83d6773655 |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.
