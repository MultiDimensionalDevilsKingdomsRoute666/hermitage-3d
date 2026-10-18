// Phase 0 coordinator — design-sky-time.md §9, §10, §11. Owns the DOM, the renderer and
// the frame loop; every time or appearance rule itself lives in the pure sky modules.
// §10 arrival order is immutable: sky frame → title frame → massing fade → settled.
import './style.css';
import * as THREE from 'three';
import { AIRLOCKS, ENTRIES } from '../rooms/index';
import { applyWeights } from './assets/blend-gl';
import { createLoaders } from './assets/loaders';
import { fetchManifest } from './assets/manifests';
import { SOUTH_FACADE, WINDOW_ROWS } from './content/facade-spec';
import { TIME } from './content/sky-time';
import { createLedger } from './engine/ledger';
import {
  BENCHMARK,
  classifyProbe,
  DEFAULT_TIER_ID,
  type ProbeResult,
  parseQualityUpdate,
  type QualityTier,
  type QualityTierId,
  resolveQualityScale,
  TIERS,
} from './engine/tier';
import { buildFacade } from './procedural/facade-builder';
import { solveSouthFacade } from './procedural/facade-solver';
import { type SkySample, sampleSky } from './sky/appearance';
import type { ArrivalState } from './sky/arrival';
import { advanceArrival, initialArrival, presentationForArrival } from './sky/arrival';
import { lightmapWeights } from './sky/lightmap-weights';
import { createSkyRig } from './sky/rig';
import {
  canonicalAt,
  formatPetersburg,
  parseTime,
  queryOf,
  scrubEpoch,
  type TimeState,
} from './sky/time';
import {
  buildHudAttrs,
  buildHudLines,
  type HudState,
  parseHudParam,
  pushFrameInterval,
  rollingMedianFrameMs,
} from './ui/hud';
import { advanceTransit, beginTransit, finishTransit, type TransitState } from './world/airlock';
import { blendPayload } from './world/blend';
import {
  airlockEntering,
  type NodeHandle,
  nextAirlockOnPath,
  type RoomEntry,
  type RoomId,
  type RoomModule,
  type RoomScene,
  resolveRoute,
} from './world/registry';

const SUN_DISTANCE = 1000;
const TIER_STORAGE_KEY = 'zimny:tier';

const canvas = document.querySelector('#scene');
if (!(canvas instanceof HTMLCanvasElement)) throw new Error('#scene canvas missing');
const title = document.querySelector('#title');
if (!(title instanceof HTMLElement)) throw new Error('#title missing');
const clock = document.querySelector('#clock');
if (!(clock instanceof HTMLTimeElement)) throw new Error('#clock missing');
const clockDate = document.querySelector('#clock-date');
if (!(clockDate instanceof HTMLElement)) throw new Error('#clock-date missing');
const scrub = document.querySelector('#scrub');
if (!(scrub instanceof HTMLInputElement)) throw new Error('#scrub missing');
const hud = document.querySelector('#hud');
if (!(hud instanceof HTMLElement)) throw new Error('#hud missing');
const notesLink = document.querySelector('#notes-link');
if (!(notesLink instanceof HTMLAnchorElement)) throw new Error('#notes-link missing');

const isDeterministic = (state: TimeState): boolean =>
  state.mode === 'fixed' ? state.deterministic : false;

// §9: capture the wall clock once — the initial sky and the title label share this snapshot.
const bootEpochMs = Date.now();
const parsed = parseTime(location.hash, bootEpochMs);
for (const issue of parsed.issues) console.warn(`zimny: time issue — ${issue}`); // diagnostics only

let timeState: TimeState = parsed.state;
let epochMs = parsed.initialEpochMs;
let sample: SkySample = sampleSky(epochMs);

const renderer = new THREE.WebGLRenderer({ canvas, antialias: false }); // §11: no MSAA
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.AgXToneMapping;
renderer.toneMappingExposure = sample.exposure;
// §11 runtime counting: one reset per frame, every render in that frame aggregates.
renderer.info.autoReset = false;

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(55, 1, 0.5, 2000);
camera.position.set(0, 1.7, 230); // eye height mid-square; framing fits the 227 m south front
camera.lookAt(0, 11, 0);

// Card-model massing at true scale — the Phase 0 "architect's card model" (ships-list).
// Sources (ATTRIBUTIONS.md): quadrangle ~210 × 175 m, ~22 m to the cornice, roofline with
// statuary to ~30 m (modelled as a 2 m band to ~24 m); SE/SW risalits and the central gate
// pavilion protrude beyond the south facade line. Courtyard proportions are a declared
// approximation (docs/artistic-license.md). +X east, +Z south (toward Palace Square).
const PALACE = {
  halfWidth: 105, // E-W, outer
  halfDepth: 87.5, // N-S, outer
  wingDepth: 24,
  cornice: 22,
  roof: 24,
  protrude: 6,
} as const;

// Phase 1 facade: solve the frozen spec, then build the instanced relief kit.
// The solved sections also own the south massing front below — the kit mounts
// exactly on its fronts (docs/design-facade-grammar.md).
const solvedFacade = solveSouthFacade(SOUTH_FACADE, WINDOW_ROWS);
if (!solvedFacade.ok) {
  throw new Error(`facade spec invalid: ${solvedFacade.issues.map((i) => i.message).join('; ')}`);
}
const facadeBuild = buildFacade(solvedFacade.value);

const palace = new THREE.Group();
palace.name = 'PalaceMassing';
const massingMaterial = new THREE.MeshLambertMaterial({
  color: 0x7dab93, // Phase 1 palette: pale green walls (owner decision); dressings white via the kit
  transparent: true,
  opacity: 0,
});

const block = (
  width: number,
  depth: number,
  x: number,
  z: number,
  height: number = PALACE.cornice,
  y: number = height / 2,
): THREE.Mesh => {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(width, height, depth), massingMaterial);
  mesh.position.set(x, y, z);
  return mesh;
};

const innerZ = PALACE.halfDepth - PALACE.wingDepth / 2; // 75.5 — wing centres
const innerX = PALACE.halfWidth - PALACE.wingDepth / 2; // 93
const wingLength = PALACE.halfDepth * 2 - PALACE.wingDepth * 2; // 127 — E/W wings between N/S
// South protrusions: 30 m deep, outer face reaching halfDepth + protrude (risalits / gate).
const southFrontDepth = PALACE.wingDepth + PALACE.protrude; // 30
const protrusionZ = PALACE.halfDepth + PALACE.protrude - southFrontDepth / 2; // 78.5
// South front rebuilt from the solved facade sections so the kit mounts exactly
// on its fronts: stretches 24 m deep on the main line, risalits/portal 30 m deep
// (outer face at halfDepth + protrude). The old card-model x-positions were
// approximate and did not match the spec's axis layout.
let sectionPrefixAxes = 0;
const southWings = SOUTH_FACADE.sections.map((section) => {
  const deep = section.declaredProtrusionM > 0;
  const centreX =
    -PALACE.halfWidth + (sectionPrefixAxes + section.declaredAxes / 2) * solvedFacade.value.pitchM;
  sectionPrefixAxes += section.declaredAxes;
  return block(
    section.declaredAxes * solvedFacade.value.pitchM,
    deep ? PALACE.wingDepth + PALACE.protrude : PALACE.wingDepth,
    centreX,
    deep ? protrusionZ : innerZ,
  );
});
const northWings = [block(PALACE.halfWidth * 2, PALACE.wingDepth, 0, -innerZ)];
const sideWings = [
  block(PALACE.wingDepth, wingLength, innerX, 0),
  block(PALACE.wingDepth, wingLength, -innerX, 0),
];
// Cornice/balustrade band: one slab per wing, set back 1 m, cornice → roof height.
const band = { height: PALACE.roof - PALACE.cornice, y: (PALACE.roof + PALACE.cornice) / 2 };
const bands = [
  block(PALACE.halfWidth * 2 - 2, PALACE.wingDepth - 2, 0, innerZ, band.height, band.y),
  block(PALACE.halfWidth * 2 - 2, PALACE.wingDepth - 2, 0, -innerZ, band.height, band.y),
  block(PALACE.wingDepth - 2, wingLength - 2, innerX, 0, band.height, band.y),
  block(PALACE.wingDepth - 2, wingLength - 2, -innerX, 0, band.height, band.y),
];

const groundMaterial = new THREE.MeshLambertMaterial({
  color: 0x3f3f3f, // dark square asphalt — AgX pulls diffuse whites down; the ground must not compete
  transparent: true,
  opacity: 0,
});
const ground = new THREE.Mesh(new THREE.PlaneGeometry(600, 600), groundMaterial);
ground.rotation.x = -Math.PI / 2;
palace.add(ground, ...southWings, ...northWings, ...sideWings, ...bands, facadeBuild.group);
// Shadows return with the facade kit (architecture.md): every solid casts and receives.
ground.receiveShadow = true;
for (const child of palace.children) {
  if (child instanceof THREE.Mesh && child !== ground) {
    child.castShadow = true;
    child.receiveShadow = true;
  }
}
palace.visible = false; // §10: the first rendered frame is the procedural sky alone
scene.add(palace);

const sun = new THREE.DirectionalLight(0xffffff, 0); // intensity driven by the sample
sun.castShadow = true;
sun.shadow.mapSize.set(1024, 1024); // T1 default until quality tiers land
sun.shadow.camera.left = -130;
sun.shadow.camera.right = 130;
sun.shadow.camera.top = 130;
sun.shadow.camera.bottom = -130;
sun.shadow.camera.near = 100;
sun.shadow.camera.far = 2200;
sun.shadow.bias = -0.0001;
sun.shadow.normalBias = 0.25;
scene.add(sun);
const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1); // colours driven by the sample
scene.add(hemi);

// Debug HUD — ?hud=1 shares the hash query with time/tier (parseHudParam never persists;
// H toggles at runtime). Re-bound at most every 500 ms from the whole-frame aggregates.
let hudOpen = false;
let hudIntervals: readonly number[] = [];
let hudBoundAtMs = -1;
let hudLastLines = '';
const hudParams = parseHudParam(new URLSearchParams(queryOf(location.hash)));
for (const issue of hudParams.issues) console.warn(`zimny: hud issue — ${issue}`);
const applyHudBinding = (): void => {
  hud.hidden = !hudOpen;
  if (!hudOpen) return;
  hud.textContent = ''; // stale lines from a previous open are not diagnostics
  hudLastLines = '';
  hudBoundAtMs = -1;
};
const toggleHud = (value: boolean): void => {
  if (hudOpen === value) return;
  hudOpen = value;
  applyHudBinding();
};
toggleHud(hudParams.enabled);
document.addEventListener('keydown', (event) => {
  if (event.key !== 'h' || event.metaKey || event.ctrlKey || event.altKey) return;
  if (event.target === scrub) return; // the scrub owns its keys; no hidden toggles from inside
  event.preventDefault();
  toggleHud(!hudOpen);
});

const rig = createSkyRig(scene, camera);

const applyEpoch = (nextEpochMs: number): void => {
  epochMs = nextEpochMs;
  sample = sampleSky(nextEpochMs);
  rig.apply(sample);
  renderer.toneMappingExposure = sample.exposure;
  const { atmosphere } = sample;
  sun.intensity = atmosphere.sunIntensity;
  sun.position.set(
    sample.sunDirection[0] * SUN_DISTANCE,
    sample.sunDirection[1] * SUN_DISTANCE,
    sample.sunDirection[2] * SUN_DISTANCE,
  );
  const { zenithRgb: z, horizonRgb: h } = atmosphere;
  hemi.color.setRGB(
    0.25 * z[0] + 0.75 * h[0],
    0.25 * z[1] + 0.75 * h[1],
    0.25 * z[2] + 0.75 * h[2],
  );
  hemi.groundColor.setRGB(0.25 * h[0], 0.25 * h[1], 0.25 * h[2]);
  // Label churn guard: the DOM text only changes when the minute actually changes.
  if (nextEpochMs !== lastLabelEpochMs) {
    lastLabelEpochMs = nextEpochMs;
    const formatted = formatPetersburg(nextEpochMs);
    clock.textContent = formatted.time;
    clock.dateTime = `${formatted.date}T${formatted.time}:00+03:00`;
    clockDate.textContent = formatted.date;
    scrub.setAttribute(
      'aria-valuetext',
      `${formatted.date} ${formatted.time} (${formatted.offset})`,
    );
  }
};
applyEpoch(epochMs);

// --- Room streaming (design-staircase.md §1.1, §2.4, §8; DEC-013/DEC-014) ------------------
// The square is a resident: it is never mounted or disposed — indoors only its exterior
// group and the sky dome flip to visible=false. Rooms load lazily behind their thunks; an
// airlock transit is the only place a room mounts, uploads GPU memory or disposes.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const assets = createLoaders(renderer);
const ledger = createLedger(); // §8.3 layer 1: rooms register payload bytes, release on unmount
const roomScene: RoomScene = {
  add: (object) => scene.add(object as unknown as THREE.Object3D),
  remove: (object) => scene.remove(object as unknown as THREE.Object3D),
};
const roomCtx = { assets, scene: roomScene, ledger };

let activeNode: NodeHandle | null = null; // null = cold entry (nothing mounted yet)
let indoor = false;
let ready = false;
let transit: Readonly<{ state: TransitState; target: NodeHandle }> | null = null;
let queuedTarget: NodeHandle | null = null;
let transitStarted = false;
const roomWork = new Map<RoomId, Promise<void>>();
const roomModules = new Map<RoomId, RoomModule>();
const intensityByRoom = new Map<RoomId, number>(); // §4: the manifest's lightmap scalar

// The room whose baked light applies this frame: the node being entered during a transit,
// otherwise the active node. The square owns none; unregistered rooms no-op in blend-gl.
const blendRoom = (): RoomId | null => {
  const st = transit?.state;
  if (st !== undefined && st.phase !== 'idle') {
    return st.to !== null && st.to !== 'square' ? st.to : null;
  }
  return activeNode !== null && activeNode !== 'square' ? activeNode : null;
};

const roomEntryOf = (id: RoomId): RoomEntry => {
  const hit = ENTRIES.find((e): e is RoomEntry => e.kind === 'room' && e.id === id);
  if (!hit) throw new Error(`zimny: no registry entry for room ${id}`);
  return hit;
};

const ensureRoom = (id: RoomId): Promise<void> => {
  const existing = roomWork.get(id);
  if (existing) return existing;
  const promise = (async () => {
    // r16 interim: no external abort source exists until the rail prefetch lands (r18).
    const controller = new AbortController();
    const manifest = await fetchManifest(id, controller.signal);
    const lmIntensity = manifest.lightmaps.intensity;
    if (lmIntensity === null || !Number.isFinite(lmIntensity) || lmIntensity <= 0) {
      throw new Error(`zimny: room ${id} manifest has no usable lightmap intensity`);
    }
    intensityByRoom.set(id, lmIntensity);
    const module = await roomEntryOf(id).thunk();
    roomModules.set(id, module); // disposeFrom needs the module synchronously at exit
    await module.load(roomCtx, manifest, controller.signal);
    await module.mount(roomCtx);
    await renderer.compileAsync(scene, camera);
  })();
  roomWork.set(id, promise);
  void promise.catch((error: unknown) => {
    console.error(`zimny: room ${id} failed`, error); // the transit dwells on the dark card
    roomWork.delete(id); // a later entry may start the chain again
  });
  return promise;
};

const interiorFar = (id: RoomId): number => {
  const b = roomEntryOf(id).contract.bounds;
  const dx = b.max[0] - b.min[0];
  const dy = b.max[1] - b.min[1];
  const dz = b.max[2] - b.min[2];
  return Math.ceil(Math.sqrt(dx * dx + dy * dy + dz * dz)) + 20; // §6.2: diagonal + margin
};

const applySwap = (to: NodeHandle | null): void => {
  if (to === 'square') {
    indoor = false;
    rig.mesh.visible = true;
    camera.near = 0.5;
    camera.far = 2000;
    camera.position.set(0, 1.7, 230); // S0 — the r16 stopgap snap (rail is r18)
    camera.lookAt(0, 11, 0);
    renderer.toneMappingExposure = sample.exposure; // E(h) restored; the room constant lands r17
  } else if (to !== null) {
    indoor = true;
    rig.mesh.visible = false;
    camera.near = 0.05; // §6.2 interior near/far, swapped in the hold
    camera.far = interiorFar(to);
    const stop = roomEntryOf(to).contract.rail.stops[0];
    if (stop === undefined) throw new Error(`zimny: room ${to} has no entry stop`);
    camera.position.set(...stop.position);
    const next = roomEntryOf(to).contract.rail.stops[1];
    if (next) camera.lookAt(next.position[0], next.position[1], next.position[2]);
  }
};

const disposeFrom = (from: NodeHandle | null): void => {
  if (from === null || from === 'square') return; // residents are never disposed (DEC-013)
  // Synchronous on purpose: the hold completed, so the module is resolved and cached; the
  // same tick may chain the next transit, and a chained entry into the room being left
  // must see roomWork cleared (a stale cached promise would mount a room this unmount
  // then disposes). §8.3: the departing room disposes exactly once, in exit, never mid-hold.
  const module = roomModules.get(from);
  if (module === undefined) return; // never mounted — nothing to dispose
  module.unmount(roomCtx);
  roomModules.delete(from);
  roomWork.delete(from); // the next entry re-runs load+mount
};

const beginTransitTo = (target: NodeHandle): void => {
  const def =
    activeNode === null
      ? airlockEntering(AIRLOCKS, target)
      : nextAirlockOnPath(ENTRIES, AIRLOCKS, activeNode, target);
  if (def === null) {
    activeNode = target; // already there
    transit = null;
    return;
  }
  const state = beginTransit({ airlock: def, from: activeNode, reducedMotion });
  transit = { state, target };
  ready = state.to === 'square'; // the resident is always ready
  if (state.to !== null && state.to !== 'square') {
    void ensureRoom(state.to).then(() => {
      ready = true;
    });
  }
};

// HUD room row (§8.4 / DEC-018): during a transit it names the node being entered; the
// active node owns it between transits; null (cold, pre-first-transit) reads 'square'.
const hudRoom = (): string => {
  const st = transit?.state;
  if (st === undefined || st.phase === 'idle') return activeNode ?? 'square';
  return st.to ?? activeNode ?? 'square';
};
const hudHoldMs = (): number => {
  const st = transit?.state;
  return st !== undefined && st.phase !== 'idle' ? st.holdMs : 0;
};

// §8.3 layer 2, dev-only: after every completed transit the departing scope is empty and,
// on exits back to the resident, the renderer's object counts return to the post-boot
// baseline. The baseline is captured at the massing prewarm only when no room is mounted
// (a deep link boots a room early — its ledger rows are still asserted, the GPU counts
// are not). Warnings are diagnostics; the CI smoke (layer 3) asserts the HUD ledger rows.
let memoryBaseline: Readonly<{ geometries: number; textures: number }> | null = null;
const assertDisposal = (departing: NodeHandle | null, arrivedAt: NodeHandle | null): void => {
  if (!import.meta.env.DEV) return;
  if (departing !== null && departing !== 'square' && ledger.bytesByScope(departing) !== 0) {
    console.warn(`zimny: disposal ledger — scope ${departing} not empty at exit`);
  }
  if (arrivedAt !== 'square' || memoryBaseline === null) return;
  const { geometries, textures } = renderer.info.memory;
  if (geometries !== memoryBaseline.geometries || textures !== memoryBaseline.textures) {
    console.warn(
      'zimny: disposal ledger — renderer memory off baseline' +
        ` (geometries ${geometries} of ${memoryBaseline.geometries},` +
        ` textures ${textures} of ${memoryBaseline.textures})`,
    );
  }
};

// Quality tier. The surfaces (render scale, drawing buffer, sun shadow size) apply BEFORE
// the massing fade: §11 forbids resizing targets mid-fade, so the auto tier settles once
// during the sky-only beats via a ~0.85 s probe (architecture.md → Tiers).
let tier: QualityTier = TIERS[DEFAULT_TIER_ID];
let tierSettled = false;
let probeActive = false;
let probeStartAtMs: number | null = null;
const probeIntervals: number[] = [];

const persistTier = (value: QualityTierId | 'auto'): void => {
  try {
    if (value === 'auto') localStorage.removeItem(TIER_STORAGE_KEY);
    else localStorage.setItem(TIER_STORAGE_KEY, value);
  } catch {
    // Storage can be unavailable (private mode, quota) — the tier simply stays boot-local.
  }
};

const settleTier = (next: QualityTier): void => {
  tier = next;
  tierSettled = true;
  probeActive = false;
  // The shadow map materializes lazily at the next shadow pass; re-arm its size now.
  sun.shadow.mapSize.set(next.shadowMapSize, next.shadowMapSize);
  if (sun.shadow.map !== null) {
    sun.shadow.map.dispose(); // next pass reallocates at the tier's map size
    sun.shadow.map = null;
  }
  applyViewport();
};

const capabilities = (): { deviceMemoryGiB: number | null } => ({
  deviceMemoryGiB:
    // Device Memory API: Chromium-only, `unknown` in the DOM lib until it ships.
    (navigator as Navigator & { deviceMemory?: number }).deviceMemory ?? null,
});

const finishProbe = (result: ProbeResult): void => {
  settleTier(TIERS[result.tier]);
};

// Boot resolution order — override → persisted override → T1 in det (probe skipped, the
// golden-frame boot must not depend on wall-clock timing) → probe at T2 surfaces.
const quality = parseQualityUpdate(new URLSearchParams(queryOf(location.hash)));
if (quality.tier !== 'auto') {
  settleTier(TIERS[quality.tier]);
  persistTier(quality.tier);
} else {
  let stored: QualityTierId | null = null;
  try {
    const raw = localStorage.getItem(TIER_STORAGE_KEY);
    if (raw === 't0' || raw === 't1' || raw === 't2') stored = raw;
  } catch {
    // No storage → default auto behavior.
  }
  if (stored !== null) {
    settleTier(TIERS[stored]);
  } else if (isDeterministic(timeState)) {
    settleTier(TIERS[DEFAULT_TIER_ID]);
  } else {
    // Probe posture: T2 surfaces arm the greatest pre-arrival load the scene can pose.
    tier = TIERS.t2;
    probeActive = true;
  }
}

// Hoisted (function declaration) so the boot-resolution block above may call it — §11's
// fit must exist before the first frame is presented.
function applyViewport(): void {
  const width = window.innerWidth;
  const height = window.innerHeight;
  if (width <= 0 || height <= 0) return; // nothing renderable — skip silently this frame
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  // §11 fit generalized per tier: scale = min(dprCap, sqrt(bufferPixelsCap / (w·h))).
  renderer.setPixelRatio(resolveQualityScale(tier, width, height));
  renderer.setSize(width, height, false);
}
applyViewport();

let arrival: ArrivalState = initialArrival();
let massingReady = false;
let compileStarted = false;
let lastFrameTime: number | undefined;
let lastLiveSampleAt = performance.now();
let lastLabelEpochMs = -1;
let resizePending = false;
let titleShown = false;

// §12 instrument: opt-in at build time — `VITE_PERF_LOG=1 pnpm build && pnpm preview`.
// Console-only readout for the device-gate report; absent from normal builds, never UI.
const perfLog = import.meta.env.VITE_PERF_LOG === '1';
let perfWindowStart: number | null = null;
let perfFrames = 0;
let perfSumDeltaMs = 0;
let perfMaxDeltaMs = 0;
let firstSkyLogged = false;

const applyPresentation = (): void => {
  const presentation = presentationForArrival(arrival, isDeterministic(timeState));
  if (presentation.titleVisible !== titleShown) {
    title.hidden = !presentation.titleVisible;
    titleShown = presentation.titleVisible;
  }
  const visible = presentation.massingOpacity > 0;
  palace.visible = visible && !indoor;
  if (visible) {
    massingMaterial.opacity = presentation.massingOpacity;
    groundMaterial.opacity = presentation.massingOpacity;
    const kitMaterial = facadeBuild.material;
    kitMaterial.opacity = presentation.massingOpacity;
    // Opaque once settled: depth-write rendering without the transparency pass.
    kitMaterial.transparent = presentation.massingOpacity < 1;
  }
  scrub.hidden = arrival.phase !== 'settled';
  notesLink.hidden = arrival.phase !== 'settled'; // DEC-004's in-app route to /notes
  if (arrival.phase === 'settled' && resizePending) {
    resizePending = false;
    applyViewport();
  }
};
applyPresentation();

window.addEventListener('resize', () => {
  // §10: never resize targets during the massing fade — defer to the next settled frame.
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  if (arrival.phase === 'massing') {
    resizePending = true;
    return;
  }
  applyViewport();
});

// --- Scrub transaction (§9) -------------------------------------------------------------
type Gesture = Readonly<{ anchorMs: number; restore: TimeState }>;
let gesture: Gesture | null = null;
let pendingEpochMs: number | null = null;

const writeTimeUrl = (fixedEpochMs?: number): void => {
  const hash = location.hash.startsWith('#') ? location.hash.slice(1) : location.hash;
  const mark = hash.indexOf('?');
  const route = mark === -1 ? hash : hash.slice(0, mark);
  const query = new URLSearchParams(mark === -1 ? '' : hash.slice(mark + 1));
  if (fixedEpochMs === undefined) query.delete('at');
  else query.set('at', canonicalAt(fixedEpochMs));
  const search = query.toString();
  history.replaceState(null, '', `#${route || '/'}${search ? `?${search}` : ''}`);
};

const cancelGesture = (): void => {
  if (gesture === null) return;
  pendingEpochMs = null;
  scrub.valueAsNumber = 0;
  const restore = gesture.restore;
  gesture = null;
  timeState = restore;
  // A restored live mode samples current now, not the old anchor (§9).
  applyEpoch(restore.mode === 'live' ? Date.now() : restore.epochMs);
};

const commitGesture = (): void => {
  if (gesture === null) return;
  const offset = scrub.valueAsNumber;
  if (offset === 0) {
    cancelGesture(); // nothing was chosen: a tap must not freeze live time as a side effect
    return;
  }
  const committed = scrubEpoch(gesture.anchorMs, offset);
  pendingEpochMs = null;
  gesture = null;
  timeState = { mode: 'fixed', deterministic: isDeterministic(timeState), epochMs: committed };
  applyEpoch(committed);
  writeTimeUrl(committed); // one replaceState per commit; det and other params preserved (§9)
};

const startGesture = (): void => {
  if (gesture !== null) return;
  gesture = { anchorMs: epochMs, restore: timeState };
};

scrub.addEventListener('pointerdown', startGesture);
scrub.addEventListener('focus', startGesture);
scrub.addEventListener('input', () => {
  startGesture();
  if (gesture === null) return;
  // Retain only the newest request; the frame loop applies at most one sample per frame (§9).
  pendingEpochMs = scrubEpoch(gesture.anchorMs, scrub.valueAsNumber);
});
scrub.addEventListener('change', commitGesture);
scrub.addEventListener('dblclick', returnToNow);
scrub.addEventListener('keydown', (event) => {
  if (event.key === 'PageUp' || event.key === 'PageDown') {
    event.preventDefault();
    const stepped = scrub.valueAsNumber + (event.key === 'PageUp' ? 60 : -60);
    scrub.valueAsNumber = Math.min(1440, Math.max(-1440, stepped));
    commitGesture(); // keyboard: each press is a commit
  } else if (event.key === 'Escape') {
    event.preventDefault();
    cancelGesture();
  } else if (event.key === 'n' || event.key === 'N') {
    event.preventDefault();
    returnToNow();
  }
});
scrub.addEventListener('focusout', cancelGesture);

function returnToNow(): void {
  cancelGesture();
  const now = Date.now();
  if (isDeterministic(timeState)) {
    // det stays set: capture a new instant and freeze it; never silently remove det (§9).
    timeState = { mode: 'fixed', deterministic: true, epochMs: now };
    writeTimeUrl(now);
    applyEpoch(now);
  } else {
    timeState = { mode: 'live', deterministic: false };
    writeTimeUrl();
    applyEpoch(now);
  }
}

window.addEventListener('hashchange', () => {
  // An external URL navigation cancels the gesture and takes precedence (§9).
  cancelGesture();
  const now = Date.now();
  const next = parseTime(location.hash, now);
  for (const issue of next.issues) console.warn(`zimny: time issue — ${issue}`);
  timeState = next.state;
  applyEpoch(next.initialEpochMs);
  // A redirect-style navigation carrying ?q= re-applies (and persists) the tier; ?q=auto
  // clears the override and keeps the current auto choice (no re-probe after settle).
  const quality = parseQualityUpdate(new URLSearchParams(queryOf(location.hash)));
  persistTier(quality.tier);
  if (quality.tier !== 'auto') settleTier(TIERS[quality.tier]);
  // The HUD is ephemeral URL state: a navigation that drops ?hud=1 closes it, one that
  // carries it re-opens (data-* values re-bound on the next ≤ 500 ms tick).
  const hudNext = parseHudParam(new URLSearchParams(queryOf(location.hash)));
  for (const issue of hudNext.issues) console.warn(`zimny: hud issue — ${issue}`);
  toggleHud(hudNext.enabled);
  // Room route: adjacent-or-cold target transits start once the tier settled; mid-transit
  // navigation re-targets after the current transit completes (the departing room always
  // disposes first — §2.4).
  const target = resolveRoute(ENTRIES, location.hash).node;
  if (tierSettled) {
    if (transit === null) {
      if (target !== activeNode) beginTransitTo(target);
      queuedTarget = null;
    } else {
      queuedTarget = target;
    }
  } else {
    queuedTarget = target; // picked up by the settle hook
  }
  // A probe still running when an explicit tier lands is cancelled by settleTier above;
  // an auto navigation leaves an open probe running to its own window end.
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    cancelGesture(); // hiding the document cancels an incomplete gesture (§9)
    lastFrameTime = undefined; // restart the arrival delta baseline on restoration (§10)
    return;
  }
  lastFrameTime = undefined;
  if (timeState.mode === 'live') applyEpoch(Date.now()); // one sample, no catch-up replay (§9)
});

const tick = (timeMs: number): void => {
  if (document.hidden) return; // suspend all render/update work (§11)
  const deltaMs = lastFrameTime === undefined ? 0 : timeMs - lastFrameTime;
  lastFrameTime = timeMs;
  renderer.info.reset(); // whole-frame accounting starts here (§11)

  // Boot probe: sky-only beats sample rAF cadence for ~0.85 s at T2 surfaces, then the
  // classifier settles the tier. Pre-arrival only — §11 forbids resizing during the fade.
  if (probeActive) {
    if (probeStartAtMs === null) {
      probeStartAtMs = timeMs;
    } else if (deltaMs > 0) {
      probeIntervals.push(deltaMs);
      if (timeMs - probeStartAtMs >= BENCHMARK.windowMs) {
        finishProbe(classifyProbe(probeIntervals, capabilities()));
        probeStartAtMs = null;
      }
    }
  }

  // Room route settle hook: the arrival beats own the pre-settle frames (§11); the first
  // settled frame starts the queued-or-boot room transit — a boot deep link resolves here
  // as a cold entry (from = null; the sky renders until the room is ready, r16 interim).
  if (!transitStarted && tierSettled) {
    transitStarted = true;
    const target = queuedTarget ?? resolveRoute(ENTRIES, location.hash).node;
    queuedTarget = null;
    if (target !== 'square') beginTransitTo(target);
  }

  // Presentation of the CURRENT state, drawn first (§10: state machine rules).
  applyPresentation();

  // Coalesced scrub preview: newest request only, one sample per frame (§9).
  if (pendingEpochMs !== null && pendingEpochMs !== epochMs) applyEpoch(pendingEpochMs);
  pendingEpochMs = null;

  // Interior lightmap blend (§4.1): the active room's baked states ride the frozen §8
  // weights; the elevation comes from the frame's sun sample (y = sin of the elevation).
  const blendRoomId = blendRoom();
  if (blendRoomId !== null) {
    const roomIntensity = intensityByRoom.get(blendRoomId);
    if (roomIntensity !== undefined) {
      const elevationDeg =
        (Math.asin(Math.max(-1, Math.min(1, sample.sunDirection[1]))) * 180) / Math.PI;
      applyWeights(blendRoomId, blendPayload(lightmapWeights(elevationDeg)), roomIntensity);
    }
  }

  // Airlock transit: one FSM beat per frame; events swap/mount/dispose (§2.4).
  if (transit !== null) {
    const advanced = advanceTransit(transit.state, deltaMs, ready);
    transit = { ...transit, state: advanced.state };
    for (const event of advanced.events) {
      // Events imply a hold/exit state — the FSM never fires from idle.
      if (advanced.state.phase === 'idle') break;
      if (event === 'upload-swap') applySwap(advanced.state.to);
      else disposeFrom(advanced.state.from);
    }
    if (advanced.state.phase === 'exit') {
      const { target } = transit;
      activeNode = advanced.state.to;
      finishTransit(advanced.state);
      transit = null;
      assertDisposal(advanced.state.from, activeNode);
      const next = queuedTarget ?? target;
      queuedTarget = null;
      if (activeNode !== next) beginTransitTo(next); // next hop of the chain
    }
  }

  // Live mode samples the wall clock at most once per second (§9); fixed modes stay frozen.
  // During an open scrub gesture the anchor is frozen: no live resample may fight the preview.
  if (
    gesture === null &&
    timeState.mode === 'live' &&
    timeMs - lastLiveSampleAt >= TIME.liveSamplePeriodMs
  ) {
    lastLiveSampleAt = timeMs;
    applyEpoch(Date.now());
  }

  // §11 permits camera-ray uniforms per visible frame; cheap and rotation-correct.
  rig.updateCamera(camera);
  renderer.render(scene, camera);
  // HUD binding: whole-frame aggregates (renderer.info) + the live tier label + the
  // rolling median of pushed intervals. At most every 500 ms; text replaced only on change.
  if (hudOpen) {
    if (deltaMs > 0) hudIntervals = pushFrameInterval(hudIntervals, deltaMs);
    if (hudBoundAtMs === -1 || timeMs - hudBoundAtMs >= 500) {
      hudBoundAtMs = timeMs;
      const hudState: HudState = {
        tierLabel: tier.label,
        frameDrawCalls: renderer.info.render.calls,
        frameTriangles: renderer.info.render.triangles,
        medianFrameMs: rollingMedianFrameMs(hudIntervals),
        room: hudRoom(),
        holdMs: hudHoldMs(),
        ledgerBytes: ledger.snapshot().total,
      };
      for (const [key, value] of Object.entries(buildHudAttrs(hudState))) {
        hud.setAttribute(key, value); // round-11 Playwright asserts the data-* contract
      }
      const lines = buildHudLines(hudState);
      const text = lines.join('\n');
      if (text !== hudLastLines) {
        hudLastLines = text;
        hud.replaceChildren(
          ...lines.map((line) => {
            const div = document.createElement('div');
            div.textContent = line;
            return div;
          }),
        );
      }
    }
  }
  if (perfLog) {
    if (!firstSkyLogged) {
      firstSkyLogged = true;
      console.log(
        `zimny: first sky frame at ${performance.now().toFixed(0)} ms · buffer ` +
          `${renderer.domElement.width}×${renderer.domElement.height} · css ` +
          `${window.innerWidth}×${window.innerHeight}`,
      );
    }
    if (perfWindowStart === null) perfWindowStart = timeMs;
    perfFrames += 1;
    perfSumDeltaMs += deltaMs;
    perfMaxDeltaMs = Math.max(perfMaxDeltaMs, deltaMs);
    if (timeMs - perfWindowStart >= 5000) {
      console.log(
        `zimny: ${perfFrames} frames · avg ${(perfSumDeltaMs / perfFrames).toFixed(1)} ms · ` +
          `max ${perfMaxDeltaMs.toFixed(1)} ms · draws ${renderer.info.render.calls} · ` +
          `tris ${renderer.info.render.triangles}`,
      );
      perfWindowStart = timeMs;
      perfFrames = 0;
      perfSumDeltaMs = 0;
      perfMaxDeltaMs = 0;
    }
  }

  // Prewarm the massing variant after the tier settles (§10): one compile at the final
  // shadow map size and render scale, no re-compile when the probe flips surfaces.
  if (!compileStarted && tierSettled) {
    compileStarted = true;
    renderer
      .compileAsync(scene, camera)
      .then(() => {
        massingReady = true;
        // §8.3 layer 2 baseline: the post-boot object counts, only when no room is mounted.
        if (ledger.snapshot().total === 0) {
          memoryBaseline = {
            geometries: renderer.info.memory.geometries,
            textures: renderer.info.memory.textures,
          };
        }
      })
      .catch((error: unknown) => {
        console.error('zimny: massing prewarm failed', error); // sky and title are retained
      });
  }

  // Advance for the NEXT callback; the label and DOM above were applied before this draw.
  arrival = advanceArrival(arrival, deltaMs, massingReady, isDeterministic(timeState));
};

renderer.setAnimationLoop(tick);
