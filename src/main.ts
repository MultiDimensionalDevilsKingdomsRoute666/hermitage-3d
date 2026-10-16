// Phase 0 coordinator — design-sky-time.md §9, §10, §11. Owns the DOM, the renderer and
// the frame loop; every time or appearance rule itself lives in the pure sky modules.
// §10 arrival order is immutable: sky frame → title frame → massing fade → settled.
import './style.css';
import * as THREE from 'three';
import { TIME } from './content/sky-time';
import { type SkySample, sampleSky } from './sky/appearance';
import type { ArrivalState } from './sky/arrival';
import { advanceArrival, initialArrival, presentationForArrival } from './sky/arrival';
import { createSkyRig } from './sky/rig';
import { canonicalAt, formatPetersburg, parseTime, scrubEpoch, type TimeState } from './sky/time';

const MAX_BUFFER_PIXELS = 1048576; // §11 designated-device gate: ≤ 1 048 576 drawing-buffer px
const SUN_DISTANCE = 1000;

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

const palace = new THREE.Group();
palace.name = 'PalaceMassing';
const massingMaterial = new THREE.MeshLambertMaterial({
  color: 0xffffff,
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
const southWings = [
  block(PALACE.halfWidth * 2, PALACE.wingDepth, 0, innerZ),
  block(30, southFrontDepth, -80, protrusionZ), // SW risalit
  block(35, southFrontDepth, 0, protrusionZ), // gate pavilion
  block(30, southFrontDepth, 80, protrusionZ), // SE risalit
];
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
palace.add(ground, ...southWings, ...northWings, ...sideWings, ...bands);
palace.visible = false; // §10: the first rendered frame is the procedural sky alone
scene.add(palace);

const sun = new THREE.DirectionalLight(0xffffff, 0); // intensity driven by the sample
scene.add(sun);
const hemi = new THREE.HemisphereLight(0xffffff, 0x000000, 1); // colours driven by the sample
scene.add(hemi);

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

const applyViewport = (): void => {
  const width = window.innerWidth;
  const height = window.innerHeight;
  camera.aspect = width / height;
  camera.updateProjectionMatrix();
  const scale = Math.min(1, Math.sqrt(MAX_BUFFER_PIXELS / (width * height)));
  renderer.setPixelRatio(scale);
  renderer.setSize(width, height, false);
};
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
  palace.visible = visible;
  if (visible) {
    massingMaterial.opacity = presentation.massingOpacity;
    groundMaterial.opacity = presentation.massingOpacity;
  }
  scrub.hidden = arrival.phase !== 'settled';
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

  // Presentation of the CURRENT state, drawn first (§10: state machine rules).
  applyPresentation();

  // Coalesced scrub preview: newest request only, one sample per frame (§9).
  if (pendingEpochMs !== null && pendingEpochMs !== epochMs) applyEpoch(pendingEpochMs);
  pendingEpochMs = null;

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

  // Prewarm the massing variant after the first sky opportunity (§10).
  if (!compileStarted) {
    compileStarted = true;
    renderer
      .compileAsync(scene, camera)
      .then(() => {
        massingReady = true;
      })
      .catch((error: unknown) => {
        console.error('zimny: massing prewarm failed', error); // sky and title are retained
      });
  }

  // Advance for the NEXT callback; the label and DOM above were applied before this draw.
  arrival = advanceArrival(arrival, deltaMs, massingReady, isDeterministic(timeState));
};

renderer.setAnimationLoop(tick);
