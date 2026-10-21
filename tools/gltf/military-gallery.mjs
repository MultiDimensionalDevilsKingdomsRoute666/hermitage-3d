// Zimny phase-3 R1b — military-gallery: gltf step (the sibling contract).
// One chained end: .glb on purpose (the repackBin lesson from r15a; see the sibling
// header). The frame kit's 670 unique-UV meshes ride the meshopt pass as-is; the
// RUNTIME merges them per wall (innerHTML nothing here — the room module, R3).
// The lightmap rows land with r-R4's bake (the manifest's lightmaps row arrives then).
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  ChainError,
  GLTF_TRANSFORM,
  geometrySummary,
  parseGlb,
  repackBin,
  run,
  sha256,
  writeGlb,
} from '../common.mjs';

export const ROOM = {
  id: 'military-gallery',
  budget: {
    trianglesMax: 60_000,
    drawsMax: 19,
    textureBytesMax: 1_000_000,
    payloadBytesMax: 4_000_000,
  },
  // r-R4's bake fills the row (three states, the kit/arch resolution split, white
  // points); until then the empty shape keeps the all-or-nothing law honest.
  lightmaps: { states: [], res: null, intensity: null },
};

const TEXTURES = ['military-gallery-parquet'];
const ATLAS_BYTES_MAX = 400_000;
const FRAME_PART_PREFIX = 'frame_';
const CANVAS_PART_PREFIX = 'canvas_';
const FRAME_COUNT = 335;
const FRAME_TRIS = 48; // four mitred bars, six quads each — the landed kit
const CANVAS_TRIS = 2;
const ARCH_PARTS = [
  'bench',
  'door_cases',
  'door_leaves',
  'floor',
  'lantern_bars',
  'lantern_glazing',
  'pier_columns',
  'pier_gilt',
  'pier_shafts',
  'portal_gilt',
  'portal_leaves',
  'portal_step',
  'torchere_body',
  'torchere_candles',
  'vault',
  'wall_crimson',
  'wall_plaster',
];
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

function fail(message) {
  throw new ChainError(`[${ROOM.id}] ${message}`);
}

function addExtension(json, key, name) {
  const list = json[key] ?? [];
  if (!list.includes(name)) list.push(name);
  json[key] = list;
}

function encodeTextures(stage, texOut) {
  const bytes = {};
  for (const name of TEXTURES) {
    const png = join(stage, 'tex', `${name}.png`);
    const ktx = join(texOut, `${name}.ktx2`);
    if (!existsSync(png)) fail(`missing bpy texture ${png}`);
    run('toktx', [...TOKTX_ARGS, ktx, png]);
    bytes[name] = statSync(ktx).size;
  }
  const total = Object.values(bytes).reduce((sum, n) => sum + n, 0);
  if (total > ATLAS_BYTES_MAX) {
    fail(`albedo atlas ${total} B exceeds ${ATLAS_BYTES_MAX} B`);
  }
  return bytes;
}

function compress(stage, raw) {
  const stageFile = (n, ext = 'glb') => join(stage, `s${n}.${ext}`);
  const gt = (args) => run(GLTF_TRANSFORM.cmd, [...GLTF_TRANSFORM.args, ...args]);
  gt(['dedup', raw, stageFile(1)]);
  gt(['prune', stageFile(1), stageFile(2), '--keep-attributes', 'TEXCOORD_1']);
  gt(['weld', stageFile(2), stageFile(3)]);
  gt(['quantize', stageFile(3), stageFile(4)]);
  gt(['meshopt', stageFile(4), stageFile(5)]);
  return stageFile(5);
}

function rewriteImages(json) {
  const images = json.images ?? [];
  if (images.length !== TEXTURES.length) {
    fail(`expected ${TEXTURES.length} images, got ${images.length}`);
  }
  json.images = images.map((image, i) => {
    const name =
      TEXTURES.find((t) => image.name === t || (image.uri ?? '').includes(t)) ?? TEXTURES[i];
    return { uri: `tex/${name}.ktx2`, mimeType: 'image/ktx2' };
  });
  for (const texture of json.textures ?? []) {
    if (texture.source === undefined) fail('texture without source');
    texture.extensions = { ...texture.extensions, KHR_texture_basisu: { source: texture.source } };
    delete texture.source;
  }
  addExtension(json, 'extensionsUsed', 'KHR_texture_basisu');
  addExtension(json, 'extensionsRequired', 'KHR_texture_basisu');
}

function gateConventions(json) {
  const required = json.extensionsRequired ?? [];
  const used = json.extensionsUsed ?? [];
  if (!required.includes('EXT_meshopt_compression')) fail('meshopt is required');
  if ([...required, ...used].includes('KHR_draco_mesh_compression')) fail('draco is forbidden');
  for (const mesh of json.meshes ?? []) {
    for (const prim of mesh.primitives) {
      const attributes = prim.attributes ?? {};
      if (!('TEXCOORD_0' in attributes) || !('TEXCOORD_1' in attributes)) {
        fail(`mesh ${mesh.name}: TEXCOORD_0 + TEXCOORD_1 required on every primitive`);
      }
      if ('TANGENT' in attributes) fail(`mesh ${mesh.name}: TANGENT forbidden`);
    }
  }
}

function gateGeometry(json, summary) {
  const geo = geometrySummary(json);
  const byName = new Map();
  let frames = 0;
  let canvases = 0;
  for (const m of geo.meshes) {
    if (m.name.startsWith(FRAME_PART_PREFIX)) {
      if (m.triangles !== FRAME_TRIS)
        fail(`${m.name}: ${m.triangles} tris vs the ${FRAME_TRIS} law`);
      frames += 1;
    } else if (m.name.startsWith(CANVAS_PART_PREFIX)) {
      if (m.triangles !== CANVAS_TRIS)
        fail(`${m.name}: ${m.triangles} tris vs the ${CANVAS_TRIS} law`);
      canvases += 1;
    } else if (!ARCH_PARTS.includes(m.name)) {
      fail(`unexpected mesh ${m.name}`);
    }
    byName.set(m.name, m);
  }
  if (frames !== FRAME_COUNT) fail(`frames ${frames} !== ${FRAME_COUNT}`);
  if (canvases !== FRAME_COUNT) fail(`canvases ${canvases} !== ${FRAME_COUNT}`);
  for (const name of ARCH_PARTS) {
    if (!byName.has(name)) fail(`arch part ${name} missing`);
  }
  if (geo.trianglesDrawn > ROOM.budget.trianglesMax) {
    fail(`${geo.trianglesDrawn} triangles exceed ${ROOM.budget.trianglesMax}`);
  }
  const declared = summary['frames'];
  if (declared !== FRAME_COUNT) fail(`bpy summary frames ${declared} !== ${FRAME_COUNT}`);
  return byName;
}

export function optimise({ roomId, stage, out }) {
  const texOut = join(out, 'tex');
  mkdirSync(texOut, { recursive: true });
  const raw = join(stage, `${roomId}.raw.glb`);
  const summaryPath = join(stage, 'summary.json');
  if (!existsSync(raw)) fail(`missing ${raw}; run the bpy step first`);
  if (!existsSync(summaryPath)) fail(`missing ${summaryPath}; run the bpy step first`);
  const summary = JSON.parse(readFileSync(summaryPath, 'utf8'));
  const textureBytes = encodeTextures(stage, texOut);
  const finalGlbPath = compress(stage, raw);
  const { json, bin } = parseGlb(readFileSync(finalGlbPath));
  if (!json.buffers?.length || json.buffers[0].uri) {
    fail(
      `meshopt .glb must carry the implicit GLB buffer at index 0, got ${JSON.stringify(json.buffers)}`,
    );
  }
  rewriteImages(json);
  gateConventions(json);
  const byName = gateGeometry(json, summary);
  const bin2 = repackBin(json, bin);
  const glb = writeGlb(json, bin2);
  const glbPath = join(out, `${roomId}.glb`);
  writeFileSync(glbPath, glb);
  console.log(`gltf: ${glbPath} ${glb.length} B sha256 ${sha256(glb)}`);
  for (const name of TEXTURES) console.log(`gltf: tex/${name}.ktx2 ${textureBytes[name]} B`);
  console.log(`gltf: frames ${FRAME_COUNT}x${FRAME_TRIS} arch ${byName.size - 2 * FRAME_COUNT}`);
}
