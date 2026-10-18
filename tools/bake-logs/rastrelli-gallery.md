# Bake log — rastrelli-gallery

Rewritten by `node tools/bake.mjs <room> <state|all>` (design §3.2). Wall seconds are
measured by the driver around the Blender subprocess; everything else is deterministic.
The committed ktx2 bytes + sha256 below are the byte-identity gate (`--verify`).

| state | command | Blender | res | samples | denoiser | white point | peak | clipped | wall s |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| day | `node tools/bake.mjs rastrelli-gallery day` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 4 | 0.202 | 0 | 726.9 |
| dusk | `node tools/bake.mjs rastrelli-gallery dusk` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 4 | 9.0536 | 0.0141 | 1562.7 |
| nightChandeliers | `node tools/bake.mjs rastrelli-gallery nightChandeliers` | Blender 4.2.23 LTS | 1024 | 128 | OPENIMAGEDENOISE | 4 | 9.1816 | 0.0141 | 1716.9 |

## Artifacts

| state | file | bytes | sha256 |
| --- | --- | --- | --- |
| day | lm/day.ktx2 | 1370 | 3225e529b66fea8be262a21f716d03a43e15ef320f99c4bb34965ab5cafed3dd |
| dusk | lm/dusk.ktx2 | 12626 | 3fc406a826f91f839108cbd86f393fa18aab866c271d13c71ed5c8757a2d4a76 |
| dusk | probe/dusk.ktx2 | 866 | 34d70cabd6efe58ee9f39d027103bb3ad18e0758b2dcd5ae4ab661f379590603 |
| nightChandeliers | lm/night.ktx2 | 12942 | 6573ebbaf80bfd6c9c9dafcf44ededb31992b1a63910a3a74ff2bddc66ae23cc |

## Borrowed-hardware menu

No state exceeded the ~45 min/state threshold here.
