# tools/lm_compose.py
#
# R-UX4 (walkthrough-UX pass, corridor light): linear composition of denoised bake EXRs.
# Law: composite(texel) = sum_i scale_i * EXR_i(texel), linear light, float32, summed in the
# declared input order; the published day state is night lamp field + day rig daylight, both
# at 1.0 (tools/lm-recipes.mjs) — by linearity of light transport this is the bake a single
# rig with fixtures ON plus the day sun/world would produce. Alpha comes from the first input.
# White points are NEVER applied here: the output is the ONE denoised-linear EXR the committed
# single-input encode (tools/reencode-encode.py) reads; the manifest's lightmaps.intensity
# stays the only white-point source.
#
# Deterministic: no clock, no network, no randomness; fixed summation order; ZIP codec; 32-bit.
# Fail-loud: missing file, dimension/channel mismatch, non-finite input, bad scale → exit 2.
#
#   blender -b --factory-startup -noaudio -P tools/lm_compose.py -- \
#     --out <stage>/rastrelli-gallery.day.composite.exr \
#     --in <stage>/<nightChandeliers source>.exr:1 \
#     --in <stage>/<day source>.exr:1
import sys

import bpy
import numpy as np


def fail(message):
    sys.stderr.write('lm_compose: ' + message + '\n')
    sys.exit(2)


def parse_args(argv):
    if '--' not in argv:
        fail('expected "--" before script arguments')
    args = argv[argv.index('--') + 1 :]
    out_path = None
    inputs = []
    i = 0
    while i < len(args):
        flag = args[i]
        if flag == '--out':
            if i + 1 >= len(args):
                fail('--out needs a path')
            out_path = args[i + 1]
            i += 2
        elif flag == '--in':
            if i + 1 >= len(args):
                fail('--in needs <path>:<scale>')
            spec = args[i + 1]
            sep = spec.rfind(':')
            if sep <= 0 or sep == len(spec) - 1:
                fail('--in spec must be <path>:<scale>, got ' + spec)
            path = spec[:sep]
            try:
                scale = float(spec[sep + 1 :])
            except ValueError:
                fail('scale is not a number in ' + spec)
            if not np.isfinite(scale) or scale <= 0.0:
                fail('scale must be finite and > 0, got ' + repr(scale))
            inputs.append((path, scale))
            i += 2
        else:
            fail('unknown argument ' + flag)
    if out_path is None:
        fail('--out is required')
    if len(inputs) < 1:
        fail('at least one --in is required')
    return out_path, inputs


def load_linear(path):
    try:
        image = bpy.data.images.load(path, check_existing=False)
    except RuntimeError as error:
        fail('cannot load ' + path + ': ' + str(error))
    if image.channels != 4:
        fail(path + ' has ' + str(image.channels) + ' channels; expected 4')
    width, height = image.size[0], image.size[1]
    if width <= 0 or height <= 0:
        fail(path + ' has an empty size')
    buffer = np.empty(width * height * 4, dtype=np.float32)
    image.pixels.foreach_get(buffer)
    bpy.data.images.remove(image)
    pixels = buffer.reshape((height, width, 4))
    if not np.all(np.isfinite(pixels)):
        fail(path + ' contains non-finite texels')
    return pixels


def save_exr(image, path):
    image.filepath_raw = str(path)
    image.file_format = 'OPEN_EXR'
    image.save()


def main():
    out_path, inputs = parse_args(sys.argv)
    print('lm_compose: out=' + out_path)
    for path, scale in inputs:
        print('lm_compose: in=' + path + ' scale=' + repr(scale))
    first_path, first_scale = inputs[0]
    first = load_linear(first_path)
    composite = np.zeros_like(first, dtype=np.float32)
    composite[..., 0:3] = first[..., 0:3] * np.float32(first_scale)
    composite[..., 3] = first[..., 3]
    alpha_mismatch = 0
    for path, scale in inputs[1:]:
        pixels = load_linear(path)
        if pixels.shape != first.shape:
            fail(
                path
                + ' layout '
                + str(pixels.shape)
                + ' differs from '
                + first_path
                + ' layout '
                + str(first.shape)
            )
        composite[..., 0:3] += pixels[..., 0:3] * np.float32(scale)
        alpha_mismatch += int(np.count_nonzero(pixels[..., 3] != first[..., 3]))
    rgb = composite[..., 0:3]
    luminance = rgb[..., 0] * 0.2126 + rgb[..., 1] * 0.7152 + rgb[..., 2] * 0.0722
    print('lm_compose: alpha texels differing from the first input: ' + str(alpha_mismatch))
    print(
        'lm_compose: luminance mean='
        + repr(float(luminance.mean()))
        + ' max='
        + repr(float(luminance.max()))
        + ' below_0.001='
        + repr(float(np.count_nonzero(luminance < 0.001) / luminance.size))
    )
    out = bpy.data.images.new(
        'lm_composite', composite.shape[1], composite.shape[0], alpha=True, float_buffer=True
    )
    out.pixels.foreach_set(np.ascontiguousarray(composite, dtype=np.float32).ravel())
    save_exr(out, out_path)
    bpy.data.images.remove(out)
    print('lm_compose: wrote ' + out_path)


main()
