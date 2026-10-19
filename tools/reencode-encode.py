# tools/reencode-encode.py
# §5 re-encode law, Blender side: ldr = clamp(linear / whitePoint, 0, 1) → 8-bit is_data PNG.
# Mirrors bake.py's encode_ldr (foreach_get → numpy → divide → clip → foreach_set → save).
# No denoise, no bake, no clock, no network: the output depends only on the EXR and whitePoint.
#   Blender -b --factory-startup -noaudio -P tools/reencode-encode.py -- <exr> <png> <wp>
import sys

import bpy
import numpy as np


def encode_ldr(exr_path, png_path, white_point):
    src = bpy.data.images.load(exr_path, check_existing=False)
    width, height = src.size
    channels = src.channels
    linear = np.empty(width * height * channels, dtype=np.float32)
    src.pixels.foreach_get(linear)
    rgb = linear.reshape(-1, channels)[:, :3]
    ldr = np.clip(rgb / white_point, 0.0, 1.0)
    out = bpy.data.images.new(
        'reencode_ldr', width, height, alpha=False, float_buffer=False, is_data=True
    )
    rgba = np.ones((width * height, out.channels), dtype=np.float32)
    rgba[:, :3] = ldr
    out.pixels.foreach_set(rgba.ravel())
    out.file_format = 'PNG'
    out.filepath_raw = png_path
    out.save()


def main():
    argv = sys.argv[sys.argv.index('--') + 1 :]
    if len(argv) != 3:
        raise SystemExit('usage: ... -- <denoised.exr> <out.png> <whitePoint>')
    exr_path, png_path, white_point = argv[0], argv[1], float(argv[2])
    if not (white_point > 0.0) or white_point == float('inf'):
        raise SystemExit(f'whitePoint must be finite and > 0: {white_point}')
    encode_ldr(exr_path, png_path, white_point)


main()
