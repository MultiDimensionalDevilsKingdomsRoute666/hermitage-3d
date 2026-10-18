# Bake log — jordan

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| nightChandeliers | `node tools/bake.mjs jordan nightChandeliers` | Blender 4.2.23 LTS | 2048 | 128 | OPENIMAGEDENOISE | 6 | 20.0613 | 0.0003 | 3578.8 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| nightChandeliers | lm/night.ktx2 | 111306 | 7d9603cef234e6a3f204f3384829539e4c5aa3af4ac99f9eea5bca83d6773655 |

## Borrowed-hardware menu

- nightChandeliers: 59.6 min wall at 0.15 Msamples/s on this CPU; the full room (3 states) projects to ~178.9 min at this rate — borrowed hardware recommended (§3.2); this never blocks.
