// _check optimise step — design-staircase.md §3.2 rules 3/4: toktx ETC1S (single thread), then
// dedup → prune → weld → quantize → meshopt via the gltf-transform CLI (one subprocess per step,
// Draco forbidden), then GLB assembly with the albedo as an external KHR_texture_basisu reference.
// Imported by tools/asset.mjs; exports ROOM (budget/lightmaps for the manifest) and optimise().
import { copyFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import {
  ChainError,
  ensureDir,
  GLTF_TRANSFORM,
  geometrySummary,
  run,
  sha256,
  writeGlb,
} from '../common.mjs';

export const ROOM = {
  id: '_check',
  budget: { trianglesMax: 5000, textureBytesMax: 500_000, payloadBytesMax: 500_000 }, // canary caps
  lightmaps: { states: [], res: null, intensity: null }, // r17 fills real rooms
};

const ALBEDO_URI = 'tex/albedo.ktx2';
const TOKTX_ARGS = [
  '--t2',
  '--encode',
  'etc1s',
  '--clevel',
  '1',
  '--qlevel',
  '128',
  '--threads',
  '1',
  '--genmipmap',
  '--assign_oetf',
  'srgb',
  '--assign_primaries',
  'bt709',
];
// --keep-attributes: prune would otherwise drop TEXCOORD_1 ('lm'), which no material samples yet.
const CHAIN = [
  ['dedup'],
  ['prune', '--keep-attributes', 'TEXCOORD_1'],
  ['weld'],
  ['quantize'],
  ['meshopt'],
];

export async function optimise({ roomId, stage, out }) {
  const raw = join(stage, `${roomId}.raw.glb`);
  const png = join(stage, 'albedo.png');
  const summaryPath = join(stage, 'summary.json');
  for (const p of [raw, png, summaryPath])
    if (!existsSync(p)) throw new ChainError(`missing ${p} — run pnpm asset:bpy ${roomId} first`);
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));

  // 1. texture
  const ktx = join(stage, 'albedo.ktx2');
  run('toktx', [...TOKTX_ARGS, ktx, png]);
  ensureDir(join(out, 'tex'));
  copyFileSync(ktx, join(out, ALBEDO_URI));

  // 2. geometry chain; the last step writes .gltf so the buffer lands outside the binary
  let input = raw;
  CHAIN.forEach(([cmd, ...flags], i) => {
    const output = join(stage, `s${i + 1}.${cmd}.${i === CHAIN.length - 1 ? 'gltf' : 'glb'}`);
    run(GLTF_TRANSFORM.cmd, [...GLTF_TRANSFORM.args, cmd, input, output, ...flags]);
    input = output;
  });

  // 3. assemble: single BIN buffer, external KTX2 image, convention checks, GLB write
  const json = JSON.parse(readFileSync(input, 'utf8'));
  const external = (json.buffers ?? []).map((b, i) => (b.uri ? i : -1)).filter((i) => i >= 0);
  if (external.length !== 1 || external[0] !== 0)
    throw new ChainError(
      `expected one external buffer at index 0, got ${JSON.stringify(json.buffers)}`,
    );
  const bin = readFileSync(join(dirname(input), decodeURIComponent(json.buffers[0].uri)));
  json.buffers[0] = { byteLength: bin.length };
  if ((json.images ?? []).length !== 1 || (json.textures ?? []).length !== 1) {
    throw new ChainError(
      `_check expects exactly 1 image and 1 texture, got ${json.images?.length ?? 0}/${json.textures?.length ?? 0}`,
    );
  }
  json.images = [{ uri: ALBEDO_URI, mimeType: 'image/ktx2' }];
  const { sampler } = json.textures[0];
  json.textures = [
    {
      ...(sampler === undefined ? {} : { sampler }),
      extensions: { KHR_texture_basisu: { source: 0 } },
    },
  ];
  for (const key of ['extensionsUsed', 'extensionsRequired'])
    json[key] = [...new Set([...(json[key] ?? []), 'KHR_texture_basisu'])].sort();

  // convention gate: meshopt required, Draco forbidden, both UV sets present, no tangents
  if (!json.extensionsRequired.includes('EXT_meshopt_compression'))
    throw new ChainError('meshopt step emitted no EXT_meshopt_compression');
  if (json.extensionsUsed.includes('KHR_draco_mesh_compression'))
    throw new ChainError('Draco present (forbidden)');
  if (!json.materials?.some((mm) => mm.extensions?.KHR_materials_emissive_strength)) {
    throw new ChainError(
      'sconce emission did not survive the exporter as KHR_materials_emissive_strength',
    );
  }
  json.meshes.forEach((m, mi) => {
    m.primitives.forEach((p, pi) => {
      for (const a of ['TEXCOORD_0', 'TEXCOORD_1']) {
        if (p.attributes[a] === undefined)
          throw new ChainError(
            `mesh ${m.name ?? mi} primitive ${pi}: missing ${a} ('uv'/'lm' must both export)`,
          );
      }
      if (p.attributes.TANGENT !== undefined)
        throw new ChainError(`mesh ${m.name ?? mi}: tangents exported (forbidden)`);
    });
  });
  const geo = geometrySummary(json);
  if (geo.trianglesDrawn !== summary.triangles)
    throw new ChainError(`triangle drift: bpy ${summary.triangles} vs glb ${geo.trianglesDrawn}`);

  const glb = writeGlb(json, bin);
  const glbPath = join(out, `${roomId}.glb`);
  writeFileSync(glbPath, glb);
  console.log(`gltf: ${glbPath} ${glb.length} B sha256 ${sha256(glb)}`);
  console.log(
    `gltf: ${ALBEDO_URI} ${readFileSync(ktx).length} B sha256 ${sha256(readFileSync(ktx))}`,
  );
  console.log(
    `gltf: ${geo.meshes.map((m) => `${m.name}x${m.instances}:${m.triangles}`).join(' ')} drawn ${geo.trianglesDrawn}`,
  );
}
