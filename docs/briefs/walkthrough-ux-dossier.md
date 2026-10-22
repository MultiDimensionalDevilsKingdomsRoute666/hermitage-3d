# RELAY BRIEF — the walkthrough UX pass (phase-2 rooms + the airlock seams)

**FACTS DOSSIER.** Everything below is facts, verdicts, and capabilities-with-costs. It
deletes nothing and pre-decides nothing: no direction, no device list, no preferred
mechanism. You decide the design completely. The owner's report at §5 is the brief's
spine; the code facts at §3–§4 are what the shipping build does and was measured to do.
Read the dossier as facts, not as a baseline to preserve and not as an enemy to avoid.

You are the specialist of a relay. You have no tools, no repo access and no prior
context; the orchestrator integrates your reply into the repository and validates it.
Work in English.

## 1. The task — the outcome to decide

The owner walked the live site and reported four experience problems (§5, verbatim).
The outcome wanted from you: **a walkthrough that reads as an intentional museum
visit** — how one is invited in, what the entrance and the arrival views look like,
what the pauses communicate, how the dim room reads, how movement along the stair
surveys the hall — every resolution consistent with the project's own design language
(chrome nearly absent, light is the feature, composed frames, URL-is-the-state).

Your deliverable is the diagnosis + the design direction + the disposition list (see
the output contract, §11). The orchestrator implements and validates; you do not need
to write code. The verbatim code of every module named in §8 rides the dossier in
§§9–10: read it as the current truth of every mechanism the prose states.

## 2. Project facts

- **Zimny** — a stylized, fully procedural 3D recreation of the Winter Palace
  (Hermitage, Saint Petersburg) for the browser. A pure solver builds the facade kit;
  the sky renders the real Petersburg sun by clock time; interiors are baked-light
  rooms; a camera rail composes every frame. Live route today: Palace Square →
  through the arch into the **Rastrelli Gallery** (a narrow long ground-floor room,
  the "corridor" beat) → into the **Jordan Staircase** (two flights up to the first
  landing). A third room (the Military Gallery of 1812) is built at asset level and
  waits for its runtime wiring; its experience machinery will reuse whatever the
  airlock/choreography decide now.
- The single reference device is the owner's own MacBook Pro 2017 (2-core i5, Iris
  Plus 640, macOS 13.7); the owner also tests on it. Four agent sessions can run in
  this repo in parallel; frame-rate numbers measured against each other are
  explicitly not device truth in this project (a recorded methodology law).
- Four principles bind every decision (project README): the room is the unit;
  procedural where architecture repeats; **light is the feature, UI is nearly
  absent**; the least machinery a senior reviewer would respect.
- Owner quality law, in the owner's words, binding: **organica** — nothing bolted-on,
  nothing jumps, state changes continuous; consistent on every surface and state.

## 3. Mechanism facts (code-verified against the shipping build)

**The movement shell.**
- A camera **on a spline rail** with named stops; eye height ~1.7 m. Each stop has a
  committed position and yaw/pitch look limits by which free look is clamped. Free
  look = drag (viewport-height-normalized sensitivity, exponential damping; touch
  runs slightly hotter by an owner-tuned factor). Forward/backward travel = scroll
  (continuous; a ~0.3 s glide tail after the last wheel event; total travel slowed
  by an owner law) and arrow keys (stop-to-step glides, ~1.4 s each; at a rail end
  the next arrow fires the room boundary's airlock). `prefers-reduced-motion` turns
  glides into cuts.
- **Gaze law**: at every stop the pose is bit-identical to committed data; BETWEEN
  stops the gaze is angle-blended toward «the next stop» (shortest arc), and the rail
  spline is centripetal Catmull-Rom through the stop positions with end phantoms
  ONLY — a build-round adjudication explicitly rejected mid-segment helper points
  (cusp-freedom was its rationale). The corridor has THREE stops over its ~44 m
  (arch mouth / mid / east door); the staircase has FIVE (under-stair entry / mid
  first flight / mezzanine turn / upper flight / landing) — the flight-and-turn
  geometry between them is not represented by stops.
- The spline's terminal parameter on each end corresponds to the door stops: every
  airlock sits at a rail end.

**The room-boundary flow (the «airlock»).**
- An airlock is a neighbor-edge seam: it owns a portal box in each room and a
  **hold**: the FSM is hold → exit. During the hold the CURRENT view freezes exactly
  (the camera does not move; no dimming, no crossfade, no overlay appears in the
  human-entered path; only the bottom caption may swap its text (240 ms fade law));
  then the destination mounts (details below) by a hard teleport cut.
- Declared holds: ~1.5 s entering the gallery through the arch; ~1.5 s gallery →
  staircase; ~0.6 s the staircase's dead-end landing (a phase-3 placeholder; the far
  end currently dead-ends silently). The hold never ends before the destination's
  data is ready — so the experienced pause is max(declared hold, load time).
- **Loading policy: there is none ahead of need.** A declared design table says the
  neighbor's assets should be prefetched ahead of the visitor (manifest at boot;
  glb + textures keyed by rail position; GPU upload hidden in the hold) — it was
  never implemented. The shipping build starts fetching the destination room (lazy
  code chunk + glb + lightmap textures + GLB parse + GPU upload + a compile pass +
  a one-off environment-probe bake) **at the moment the transit begins** (this
  wiring has been the build's behavior since the phase-2 runtime round). Cold-cache
  waits beyond the declared hold are therefore a designed-in property of the
  current build.
- Reference-device measurement of the same FSM path (recorded docs numbers, quiet
  machine, deep-link entry): first frame ~1.7–1.9 s unthrottled; ~2.9 s under a
  10 Mbps + 40 ms network profile — the declared hold dominates locally, the fetch
  bursts dominate remotely. The project's budget law defines «a hold > 2 s on the
  device» as a budget failure **to fix, not to hide**.
- The charter law: **no spinner, ever** (a recorded decision pins "dark caption
  card, never a spinner" for cold deep links; progress bars were rejected there).
  The dark card exists only for cold DEEP LINKS (nothing mounted yet); the
  human-entered transit path shows no card today.

**The entry affordances (shipped yesterday as a hotfix for a separate reachability
report; a prior decision DEC-031).**
- Two roads into a room: (a) a small chrome **text button** on the free bottom-center
  axis — RU «Прокрутите дальше — войдёте» / EN "Keep scrolling to enter" (a real
  clickable <button>; the copy invites SCROLLING while the button's actuation is a
  CLICK; hover/focus underline is the only affordance state; ~12 px text at ~55%
  white like the rest of the chrome); visible ONLY while the camera is fully
  settled exactly at a rail end whose far side is a door — invisible mid-room, mid
  motion, during every transit. (b) a **sustained deliberate wheel** past the rail
  end, with three declared anti-momentum thresholds (an accumulated scroll budget,
  a per-event speed gate, and a sustain window) so a trackpad's momentum burst
  cannot fire it.
- Since yesterday, the room's URL is written into the hash at each transit's
  completion (the URL-is-the-state law now holds for human transits; stale stop
  pinning dropped).
- The same prompt appears immediately after EVERY arrival settled at the new room's
  entry stop, inviting the way BACK (the boundary law is directional; the entry
  stop of a room is its u=0 rail end). Captures show it visible in the very first
  arrival frame, under the destination's caption.
- The one-shot **travel hint** (bottom-right / centered on desktop by an owner law)
  shows once at the square's entry stop: RU «Потяните, чтобы подойти ближе» / EN
  "Drag to move closer"; it names DRAG, while drag only rotates the view — the
  forward travel mechanism is scroll (the hint dismisses on the FIRST travel intent
  of any kind, including the first wheel event). Its copy is a recorded owner-ruled
  inventory from an earlier discoverability report.
- There are no icons, arrows, or other UI anywhere in the chrome; the rest is the
  caption (bottom-right), a "How it's built" link (bottom-left), a lang toggle
  (top-right), an optional dev HUD (off by default).

## 4. The view-composition facts (frames captured by the orchestrator, plus the
committed pixel baselines; all verified)

- **The arch-approach stop (the square's far end, where one waits at the door):** the
  visitor stands among the gate pavilion's giant columns, ~1 column-height away. The
  columns fill most of the frame with flat untextured gray; the arch openings read
  as flat BLACK holes (the facade kit's recesses at close range; there is no modeled
  interior behind the arch plane — the card model's void). In the day-instant
  capture ~40% of the frame is below luminance 10/255. The stop's caption says «the
  arch opens» / RU «арка раскрывается».
- **The arrival inside the arch (the corridor's entry stop):** effectively all black
  — in the deterministic day-instant capture **98.9% of the frame is below
  luminance 10/255** (the vault is barely discernible). The caption says «dark; the
  square behind» / RU «темно; площадь позади».
- **The corridor at its mid stop:** the committed day golden (a pinned, owner-seen
  baseline) is near-total black with just the sconce lamp glyphs; night renders MORE
  readable than day (floor tiling visible). Code fact behind it: the day bake's
  indirect light at the walls is nearly absent in the bake bytes (a recorded bisect
  verdict); each room loads three baked states (day / dusk / night-chandeliers)
  which are restored in a declared tuning flow (per-state white points in each
  manifest + per-room per-state look gains in one small constants module). The
  corridor's DAY restore comes out far below the dusk/night restores in absolute
  terms. A look-representation fact: the modeled room IS a classical corridor
  (pilasters along a straight axis), but at the mid stop in day state one cannot
  read walls from it.
- **The staircase arrival stop:** the destination portal is the declared
  "under-stair vestibule" — the ground-floor bay beneath the first flight. The
  arrival frame at the deterministic day instant shows the vestibule's inner wall
  filling ~90% of the frame (dark reddish-brown dithered texture — the baked shell),
  with the lit stair hall + its window row clipping only the bottom-right corner.
  The arrival caption says «looking up, to the light» / RU «взгляд вверх, к свету».
- **The staircase mid-flight view:** bright and legible (a windowed wall of the
  well-lit hall, mean luminance ~3× the corridor). The hall reads as a museum at
  that stop; the reported movement complaint is about the motion law on the rail,
  not about this static frame.

## 5. The owner's report (verbatim, from today's live-site session; unverified by
the orchestrator)

1. "it is counter intuitive. there's no indication that you should click arrow to
   enter. which isn't good. but it should be consistent with overall design."
2. "when you click and the field of view comes close it doesn't look good. the
   arc/doors are too big and black and it seems not thought-out. which isn't good."
3. "there's a waiting period when entering and when you go from arc/door to
   corridor. and from corridor to stairs. each time it takes 2-3 seconds and it
   seems like a bug. if it is unavoidable there should be an indication of loading
   or something. but it should be consistent with overall design."
4. "corridor is almost total black with only lanterns. it doesn't seem like a
   museum. rather like a cave with lanterns. when you enter the stairs it is buggy.
   first you seem stuck on doorway and its walls block the view of stairs. and also
   movement seems not so good on corridor. movement on stairs is really bad. it is
   like random flying movement which doesn't really show the museum. i don't how to
   put it but it should be worked on. maybe change the mechanism. current mechanism
   seems like random flying without intention of sightseeing the museum"

## 6. Recorded verdicts and constraints (authority; each amendment is a decision
the owner disposes, never a quiet change)

- **DEC-031** — the boundary affordance (the two prompt/wheel-through roads above)
  was itself yesterday's hotfix for the previous reachability report ("only scrolling
  up and down… reaches the door and turns around"). Its rejection list names a
  persistent minimap/sidebar as rejected (UI-nearly-absent law).
- **DEC-017** — cold loads open on a dark caption card, never a spinner; progress
  bars rejected; the "hold > 2 s on the device" clause is a fix-not-hide budget
  item. An added loading indication must rewrite this DEC properly.
- The **§1.3 prefetch table** and the **§2.3 doorway-fade choreography** (fade-to-
  dark completing before the camera crosses the arch plane; both rooms keep true
  coordinates; only the connecting path is compressed) are DESIGN-DOCUMENT
  commitments whose shipping status is "not implemented" — the current transit is
  freeze + hard cut, not the declared choreography. This divergence is offered as
  fact; whether the declared choreography is still the right design is yours to
  assess.
- The corridor beat was DESIGNED as «compression — low, dim, long» (a theatre-set
  rule: the real walk is ~200 m and is deliberately compressed to one dim room; the
  three bakes were declared to "differ little… timeless"). The r17 owner acceptance
  recorded J0's dark entry as parked. The current day state renders far darker than
  the declared intent ("differences small" once happened between day and dark).
- The camera promise (README/architecture): a "museum visitor" camera on rails with
  free look — *free FPS roam was explicitly rejected* (collision, full surface
  coverage, uncomposed frames). Any change of the movement MECHANISM amends this
  recorded position: the owner disposes it.
- Camera speed laws are owner-tuned inventory (travel slowed, drag response twice
  adjusted, touch factor) — treat as budgets of feel already spent.
- Budgets are CI contracts (fixed by art or tier, never loosened quietly): JS total
  ≈ 259 KB gzip of 350 KB; the shared basis-transcoder row is nearly full (nothing
  may be added to it); each room's payload/tris/draws carry their own caps; the
  frame-time gate is the device itself. New chrome bytes are cheap (CSS is not in
  the JS gate; the RU dictionary rides its own small ceiling).
- Assets are code: every committed binary regenerates from a committed script. The
  lightmap re-render chain exists in two sizes: re-encode existing bakes with new
  white points/look gains (fast, byte-deterministic) vs. re-BAKE (slow, logged
  process). Either path ships.
- Determinism/goldens: pixel baselines pin committed stop views (9 scene goldens +
  16 layout fixtures; 471 unit tests; e2e walks the graph incl. yesterday's wheel
  walk). Changes that alter a pinned view re-baseline that one golden (a normal,
  recorded process); changes that preserve stop poses leave them untouched.
- Reduced motion and the deterministic mode are first-class: any new beat, fade or
  indication must have its cut path and survive det.
- The landing "to be continued" placeholder was retired by DEC-025: the staircase's
  far boundary now plans to retarget into the 1812 room once its runtime lands.

## 7. Assumptions and open questions (label yours accordingly)

- **Assumed:** the «arrow» in the owner's item 1 refers to the bottom-center chrome
  prompt (the only enter affordance in the chrome) — but it may refer to the travel
  hint or to the arrow keys; confirm with the owner only if your design hinges on it.
- **Assumed:** the 2–3 s pauses = the declared hold plus the on-demand load beyond
  it (no prefetch). The exact split per transition was not measured on the owner's
  network.
- **Open:** the corridor's day-darker-than-night inversion: re-tune the declared
  white points/look gains (fast path), re-bake for more baked wall light (slow
  path), or re-art-direct the state's look — an art call with cost tiers; the
  declared "timeless compression" intent is on the table too (design-vs-shipped).
- **Open:** what carries the invite to enter (copy, affordance shape, both roads,
  timing of appearance) — the current copy/actuation mismatch and the
  prompt-after-arrival (invite-to-go-back) behavior are both live choices.
- **Open:** the loading pause: which combination of (declared beat shortening /
  real prefetch that was never built / an in-design indication / choreography
  change) reads right — under DEC-017's amendment rules.
- **Open:** the stair movement: stop set, gaze law, limits, or something else
  entirely — what turns «flying» into «a visitor shown the space»; any change that
  re-opens the mid-path-helpers adjudication or the on-rails promise is an owner
  disposition; changing pinned stop views re-baselines their goldens.
- **Open:** the arch-approach and arrival framings: today's compositions were never
  a pin; authored per-stop gaze targets exist in the data model (the square uses
  them) and the rooms don't.

## 8. Verbatim material — how to read it

- §§9–10 carry the committed source of every module that produces the reported
  experience, verbatim (the shipping build; complete files unless marked "slice" —
  slices quote the exact committed line ranges). Cite mechanisms by path + the
  module's own identifiers, not by line number (your copy may carry masked numerals
  and shifted line anchors).
- Do NOT paste files back. The reply budget (~450 lines) is for analysis; the
  orchestrator owns the tree and can supply any missing file on demand: if a file or
  a section you need is absent, emit a line `NEED: <path or question>` instead of
  assuming its contents.
- The transport can MASK numerals in verbatim material (garbled/dash sequences).
  Where a masked numeral matters to your reasoning, emit
  `MASKED-IN-BRIEF: keep the <name> value`; the orchestrator restores it against the
  committed tree. Constants that matter for FEEL (glide durations, thresholds,
  intensities) are named exports in the files below.

## 9. Full files (verbatim, the shipping build)

**src/camera/rail.ts (complete, 316 lines) — the rail path, gaze law, glides, intents:**

```ts
/**
 * Camera rail — pure core.
 * Implements design-staircase §6 «Cinematography — the rail», §6.1 (path, look limits, inputs,
 * reduced motion, boundary intents) and the seed half of §1.2 (?stop= / ?cam= precedence).
 *
 * Laws:
 * - u ∈ [0, 1] spans the ACTIVE node's stop list; stop i sits at u = i / (n - 1); a single-stop
 *   node is the point u = 0. A parameter within STOP_EPS of a stop snaps to it, so stops are
 *   bit-identical to the committed data.
 * - Path: centripetal Catmull-Rom through the stop positions. The only synthesised control
 *   points are the two end phantoms (mirror of the neighbour through the end stop).
 * - Default gaze = committed pose law: stop i looks at stop i + 1, the last stop looks back at
 *   the previous one. Between stops the committed yaw/pitch of the bounding stops blend with the
 *   smootherstep law (yaw by shortest arc; a half-turn tie turns positive). An optional per-stop
 *   gaze override (the square's authored framing, golden-pinned) replaces the law where given.
 * - Look limits blend linearly between the bounding stops; user offsets are re-clamped on every
 *   transition. Offsets are degrees: yaw > 0 turns right, pitch > 0 looks up.
 * - Motion: a glide is (from, to, durationMs, elapsedMs) eased by smootherstep; advance() is
 *   pure, takes a finite non-negative deltaMs and throws RangeError otherwise. A key step in
 *   flight retargets from the current u; a scroll in flight extends the scroll glide's `to`.
 *   Reduced motion turns every glide into a cut. Scroll clamps at the rail ends; only key steps
 *   past an end surface a boundary intent (the host turns it into an airlock transit).
 * - DEC-031 boundary (the owner's reachability report, 2026-10-21): the rail's clamp
 *   silence stranded trackpad visitors at every door. The INPUT law gains one deliberate
 *   gesture — a sustained, slow, sustained-scroll pass past a rail end also surfaces a
 *   boundary intent (src/camera/wheel-edge.ts: three declared thresholds; a momentum burst
 *   restarts the pass) — and the host shows a keyed chrome prompt at a settled rail end
 *   (src/ui/edge-prompt.ts; chrome.edgePrompt); activating it travels through the same
 *   boundary chain the arrows use. Stop data, look limits and glide durations untouched.
 * - Seed precedence on node entry: ?stop= (known id) > ?cam= (finite, clamped) > entry (u = 0).
 * - r21 look response: target/current split; the sensitivity and damping laws live in look.ts
 *   (§6.1; §10 row r21). drag() accumulates the clamped TARGET, advance() eases the CURRENT
 *   every frame; settle() re-clamps both; at rest the eased look hands back the same object, so
 *   the never-dragged poses stay bit-identical.
 */

import type { Rail, Stop, Vec3 } from '../world/registry';
import type { LookLimits, LookOffset, PointerTypeName } from './look';
import { clampLook, dragLook, easeLook, NO_LOOK, settleLook } from './look';

export type { LookLimits, LookOffset } from './look';
export type GlideKind = 'step' | 'scroll';
export type Glide = Readonly<{
  kind: GlideKind;
  from: number;
  to: number;
  durationMs: number;
  elapsedMs: number;
}>;
export type RailState = Readonly<{
  u: number;
  glide: Glide | null;
  look: LookOffset;
  lookTarget: LookOffset;
}>;
export type Boundary = 'forward' | 'backward';
export type StepResult = Readonly<{ state: RailState; boundary: Boundary | null }>;
export type Pose = Readonly<{
  position: Vec3;
  target: Vec3;
  limits: LookLimits;
  look: LookOffset;
}>;
export type SeedInput = Readonly<{ stop: string | null; cam: number | null }>;
export type SeedSource = 'stop' | 'cam' | 'entry';
export type SeedResult = Readonly<{ state: RailState; source: SeedSource }>;

export const STEP_GLIDE_MS = 1400;
export const SCROLL_GLIDE_MS = 320;
/** Declared tuning target (the r26.1 owner report: «scrolling in is too fast — around 25%
 * slower»): wheel pixels per rail segment. 900 → 1200 = the same gesture travels 75% of the
 * distance it used to. */
export const SCROLL_PX_PER_SEGMENT = 1200;

const STOP_EPS = 1e-9;
const KNOT_EPS = 1e-6;
const TAU = Math.PI * 2;
type Angles = Readonly<{ yaw: number; pitch: number }>;
type Place = Readonly<{ i: number; t: number }>;

const clamp = (x: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, x));
const lerp = (a: number, b: number, w: number): number => a + (b - a) * w;
const lerp3 = (a: Vec3, b: Vec3, w: number): Vec3 => [
  lerp(a[0], b[0], w),
  lerp(a[1], b[1], w),
  lerp(a[2], b[2], w),
];
const mirror = (a: Vec3, b: Vec3): Vec3 => [2 * a[0] - b[0], 2 * a[1] - b[1], 2 * a[2] - b[2]];
const dist = (a: Vec3, b: Vec3): number => Math.hypot(a[0] - b[0], a[1] - b[1], a[2] - b[2]);
const smootherstep = (x: number): number => {
  const t = clamp(x, 0, 1);
  return t * t * t * (t * (t * 6 - 15) + 10);
};
const wrapArc = (d: number): number => {
  const r = d % TAU;
  if (r > Math.PI) return r - TAU;
  if (r <= -Math.PI) return r + TAU;
  return r;
};

function stopAt(rail: Rail, index: number): Stop {
  const stop = rail.stops[index];
  if (stop === undefined) throw new RangeError(`rail has no stop ${index}`);
  return stop;
}

export const stopCount = (rail: Rail): number => rail.stops.length;

export function stopParameter(rail: Rail, index: number): number {
  const n = stopCount(rail);
  if (!Number.isInteger(index) || index < 0 || index >= n) {
    throw new RangeError(`stop index ${index} outside 0..${n - 1}`);
  }
  return n === 1 ? 0 : index / (n - 1);
}

export function nearestStopIndex(rail: Rail, u: number): number {
  const n = stopCount(rail);
  return n === 1 ? 0 : Math.round(clamp(u, 0, 1) * (n - 1));
}

export const restingAt = (u: number): RailState => ({
  u,
  glide: null,
  look: NO_LOOK,
  lookTarget: NO_LOOK,
});

function locate(rail: Rail, u: number): Place {
  const n = stopCount(rail);
  if (n < 2) return { i: 0, t: 0 };
  const k = clamp(u, 0, 1) * (n - 1);
  const near = Math.round(k);
  const snapped = Math.abs(k - near) < STOP_EPS ? near : k;
  if (snapped >= n - 1) return { i: n - 2, t: 1 };
  const i = Math.floor(snapped);
  return { i, t: snapped - i };
}

function control(rail: Rail, index: number): Vec3 {
  const n = stopCount(rail);
  if (index < 0) return mirror(stopAt(rail, 0).position, stopAt(rail, 1).position);
  if (index >= n) return mirror(stopAt(rail, n - 1).position, stopAt(rail, n - 2).position);
  return stopAt(rail, index).position;
}

function catmullRom(p0: Vec3, p1: Vec3, p2: Vec3, p3: Vec3, t: number): Vec3 {
  const t0 = 0;
  const t1 = t0 + Math.max(KNOT_EPS, Math.sqrt(dist(p0, p1)));
  const t2 = t1 + Math.max(KNOT_EPS, Math.sqrt(dist(p1, p2)));
  const t3 = t2 + Math.max(KNOT_EPS, Math.sqrt(dist(p2, p3)));
  const s = lerp(t1, t2, t);
  const a1 = lerp3(p0, p1, (s - t0) / (t1 - t0));
  const a2 = lerp3(p1, p2, (s - t1) / (t2 - t1));
  const a3 = lerp3(p2, p3, (s - t2) / (t3 - t2));
  const b1 = lerp3(a1, a2, (s - t0) / (t2 - t0));
  const b2 = lerp3(a2, a3, (s - t1) / (t3 - t1));
  return lerp3(b1, b2, (s - t1) / (t2 - t1));
}

export function samplePosition(rail: Rail, u: number): Vec3 {
  const { i, t } = locate(rail, u);
  if (t === 0) return stopAt(rail, i).position;
  if (t === 1) return stopAt(rail, i + 1).position;
  return catmullRom(
    control(rail, i - 1),
    control(rail, i),
    control(rail, i + 1),
    control(rail, i + 2),
    t,
  );
}

function committedTarget(rail: Rail, index: number, gaze?: readonly Vec3[]): Vec3 {
  const pinned = gaze?.[index];
  if (pinned !== undefined) return pinned;
  const n = stopCount(rail);
  const p = stopAt(rail, index).position;
  if (n < 2) return [p[0], p[1], p[2] - 1];
  return stopAt(rail, index === n - 1 ? index - 1 : index + 1).position;
}

function anglesTo(from: Vec3, to: Vec3): Angles {
  const dx = to[0] - from[0];
  const dy = to[1] - from[1];
  const dz = to[2] - from[2];
  return { yaw: Math.atan2(dx, -dz), pitch: Math.atan2(dy, Math.hypot(dx, dz)) };
}

function forward(a: Angles): Vec3 {
  const c = Math.cos(a.pitch);
  return [Math.sin(a.yaw) * c, Math.sin(a.pitch), -Math.cos(a.yaw) * c];
}

export function sampleLimits(rail: Rail, u: number): LookLimits {
  const { i, t } = locate(rail, u);
  const a = stopAt(rail, i).look;
  if (t === 0) return a;
  const b = stopAt(rail, i + 1).look;
  if (t === 1) return b;
  return {
    yaw: lerp(a.yaw, b.yaw, t),
    pitchUp: lerp(a.pitchUp, b.pitchUp, t),
    pitchDown: lerp(a.pitchDown, b.pitchDown, t),
  };
}

const settle = (rail: Rail, s: RailState): RailState => ({
  ...s,
  ...settleLook(s, sampleLimits(rail, s.u)),
});

export function samplePose(rail: Rail, state: RailState, gaze?: readonly Vec3[]): Pose {
  const { i, t } = locate(rail, state.u);
  const position = samplePosition(rail, state.u);
  const limits = sampleLimits(rail, state.u);
  const look = clampLook(state.look, limits);
  if (t === 0) return { position, target: committedTarget(rail, i, gaze), limits, look };
  if (t === 1) return { position, target: committedTarget(rail, i + 1, gaze), limits, look };
  const a = anglesTo(stopAt(rail, i).position, committedTarget(rail, i, gaze));
  const b = anglesTo(stopAt(rail, i + 1).position, committedTarget(rail, i + 1, gaze));
  const w = smootherstep(t);
  const d = forward({ yaw: a.yaw + wrapArc(b.yaw - a.yaw) * w, pitch: lerp(a.pitch, b.pitch, w) });
  const target: Vec3 = [position[0] + d[0], position[1] + d[1], position[2] + d[2]];
  return { position, target, limits, look };
}

export function seedState(rail: Rail, seed: SeedInput): SeedResult {
  stopAt(rail, 0);
  if (seed.stop !== null) {
    const index = rail.stops.findIndex((s) => s.id === seed.stop);
    if (index >= 0) return { state: restingAt(stopParameter(rail, index)), source: 'stop' };
  }
  if (seed.cam !== null && Number.isFinite(seed.cam)) {
    return { state: restingAt(clamp(seed.cam, 0, 1)), source: 'cam' };
  }
  return { state: restingAt(0), source: 'entry' };
}

export function advance(rail: Rail, state: RailState, deltaMs: number): RailState {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError(`deltaMs must be finite and non-negative, got ${deltaMs}`);
  }
  // Damping runs every frame, glide or not. At rest easeLook hands back state.look itself, so
  // the never-dragged state returns unchanged by reference and the golden poses stay bit-equal.
  const look = easeLook(state.look, state.lookTarget, deltaMs);
  const g = state.glide;
  if (g === null) return look === state.look ? state : { ...state, look };
  const { lookTarget } = state;
  const elapsedMs = g.elapsedMs + deltaMs;
  if (elapsedMs >= g.durationMs) {
    return settle(rail, { u: g.to, glide: null, look, lookTarget });
  }
  const u = lerp(g.from, g.to, smootherstep(elapsedMs / g.durationMs));
  return settle(rail, { u, glide: { ...g, elapsedMs }, look, lookTarget });
}

function glideTo(
  rail: Rail,
  state: RailState,
  to: number,
  kind: GlideKind,
  reducedMotion: boolean,
): RailState {
  if (reducedMotion || to === state.u) {
    return settle(rail, { u: to, glide: null, look: state.look, lookTarget: state.lookTarget });
  }
  const durationMs = kind === 'step' ? STEP_GLIDE_MS : SCROLL_GLIDE_MS;
  return { ...state, glide: { kind, from: state.u, to, durationMs, elapsedMs: 0 } };
}

export function stepStop(
  rail: Rail,
  state: RailState,
  direction: 1 | -1,
  reducedMotion: boolean,
): StepResult {
  const n = stopCount(rail);
  const k = (state.glide === null ? state.u : state.glide.to) * (n - 1);
  const near = Math.round(k);
  const atStop = Math.abs(k - near) < STOP_EPS;
  const index = atStop ? near + direction : direction > 0 ? Math.ceil(k) : Math.floor(k);
  if (index < 0) return { state, boundary: 'backward' };
  if (index > n - 1) return { state, boundary: 'forward' };
  const to = stopParameter(rail, index);
  return { state: glideTo(rail, state, to, 'step', reducedMotion), boundary: null };
}

export function scroll(
  rail: Rail,
  state: RailState,
  deltaPx: number,
  reducedMotion: boolean,
): RailState {
  if (!Number.isFinite(deltaPx)) throw new RangeError(`deltaPx must be finite, got ${deltaPx}`);
  const n = stopCount(rail);
  if (n < 2 || deltaPx === 0) return state;
  const g = state.glide;
  const base = g === null ? state.u : g.to;
  const to = clamp(base + deltaPx / (SCROLL_PX_PER_SEGMENT * (n - 1)), 0, 1);
  if (g !== null && g.kind === 'scroll' && !reducedMotion) return { ...state, glide: { ...g, to } };
  return glideTo(rail, state, to, 'scroll', reducedMotion);
}

/** Accumulates the drag onto `lookTarget`; the rendered `look` eases toward it in advance(). */
export function drag(
  rail: Rail,
  state: RailState,
  dxPx: number,
  dyPx: number,
  viewportHeightPx: number,
  pointerType: PointerTypeName,
): RailState {
  const unclamped = dragLook(state.lookTarget, dxPx, dyPx, viewportHeightPx, pointerType);
  return { ...state, lookTarget: clampLook(unclamped, sampleLimits(rail, state.u)) };
}
```

**src/camera/look.ts (complete, 120 lines) — the drag/look response law:**

```ts
/**
 * Look response law — how the camera's free look answers a drag.
 *
 * Implements design-staircase.md §6.1 (look offsets and limits — the rendering law and the limit
 * values are frozen and stay in rail.ts) and the r21 owner report ("dragging turns the view very
 * fast — almost nauseating"); §10 row r21.
 *
 * Pure: three-free, DOM-free. Two laws, each a declared tuning target for the owner's device:
 *
 * sensitivity deg/px = DRAG_SPAN_DEG / viewportHeightPx
 *   A drag spanning the whole viewport height turns DRAG_SPAN_DEG degrees, so the
 *   same viewport FRACTION of drag yields the same degrees on every screen, mouse or
 *   finger alike. One scalar for both axes, so diagonal drags stay isotropic.
 *
 * damping current += (target - current) * (1 - exp(-dtMs / LOOK_TAU_MS))
 *   Frame-rate-independent exponential ease of the rendered look toward the drag
 *   target; self-similar, so one 100 ms step equals ten 10 ms steps.
 *
 * rail.ts splits the look state: drag() accumulates the clamped TARGET (`lookTarget`), advance()
 * eases the CURRENT (`look`) toward it every frame, settle() re-clamps both to the limits in
 * force. The damping stays under reduced motion: it only shapes user-initiated direct
 * manipulation downward and never adds motion of its own.
 */
export type LookOffset = Readonly<{ yaw: number; pitch: number }>;
export type LookLimits = Readonly<{ yaw: number; pitchUp: number; pitchDown: number }>;
/** The look fields RailState carries, by the same names: eased CURRENT and drag TARGET. */
export type LookState = Readonly<{ look: LookOffset; lookTarget: LookOffset }>;
export const NO_LOOK = { yaw: 0, pitch: 0 } satisfies LookOffset;
/**
 * Declared tuning target. Degrees of look a drag spanning the full viewport height traverses.
 * 35 was calibrated to the §6.1 yaw limit (a half-height drag covered about half of it); the
 * r26.1 owner report («looking around via click and moving mouse is a bit fast — around 15%
 * slower») lowers it to 30: a half-height drag now covers ~43% of the yaw limit.
 */
export const DRAG_SPAN_DEG = 30;
/**
 * Declared tuning target. Damping time constant: 63% of the remaining offset closes per TAU and
 * the ease is visually settled after ~5 TAU. Shorter is snappier, longer floatier (80–200 ms).
 */
export const LOOK_TAU_MS = 100;
/**
 * Numerical: below this remaining offset the ease lands on the target exactly, so lookSettled()
 * becomes true (pure exponential decay never arrives). Far sub-pixel at any §6.1 field of view.
 */
export const LOOK_SNAP_DEG = 1e-3;
const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));
/** §6.1 limits, verbatim from rail.ts: yaw symmetric, pitch asymmetric (down is negative). */
export const clampLook = (look: LookOffset, lim: LookLimits): LookOffset => ({
  yaw: clamp(look.yaw, -lim.yaw, lim.yaw),
  pitch: clamp(look.pitch, -lim.pitchDown, lim.pitchUp),
});
/** Re-clamp BOTH fields to the limits in force; they blend per frame along a glide. */
export const settleLook = (s: LookState, lim: LookLimits): LookState => ({
  look: clampLook(s.look, lim),
  lookTarget: clampLook(s.lookTarget, lim),
});
/**
 * Declared tuning target. The touch pointer's span multiplier (the owner's r21.1 report: after
 * the viewport normalization the desktop felt right but touch felt too slow — a thumb swipe is
 * a shorter physical gesture than a mouse drag, so touch runs ~15% hotter; r21.1 says «around
 * 15% faster»). Mouse and pen stay at 1.
 */
export const TOUCH_SPAN_FACTOR = 1.15;
export type PointerTypeName = 'mouse' | 'touch' | 'pen';
/** Viewport-normalized sensitivity: degrees of look per CSS pixel of drag. */
export const dragDegPerPx = (viewportHeightPx: number, pointerType: PointerTypeName): number => {
  if (!Number.isFinite(viewportHeightPx) || viewportHeightPx <= 0) {
    throw new RangeError(`viewport height must be finite and positive, got ${viewportHeightPx}`);
  }
  const span = DRAG_SPAN_DEG * (pointerType === 'touch' ? TOUCH_SPAN_FACTOR : 1);
  return span / viewportHeightPx;
};
/**
 * Total guard over the DOM's `pointerType: string` (lib.dom types it wider than the union):
 * known kinds pass, anything future defaults to 'mouse' — the un-tuned baseline.
 */
export const toPointerType = (s: string): PointerTypeName =>
  s === 'touch' || s === 'pen' ? s : 'mouse';
/**
 * Accumulate one drag delta onto the target. Unclamped: the caller clamps with the limits at its
 * u. Signs are the host's grab-the-world law (it passes -dx, +dy); this law adds them as given.
 */
export const dragLook = (
  target: LookOffset,
  dxPx: number,
  dyPx: number,
  viewportHeightPx: number,
  pointerType: PointerTypeName,
): LookOffset => {
  if (!Number.isFinite(dxPx) || !Number.isFinite(dyPx)) {
    throw new RangeError('drag deltas must be finite');
  }
  const k = dragDegPerPx(viewportHeightPx, pointerType);
  return { yaw: target.yaw + dxPx * k, pitch: target.pitch + dyPx * k };
};
/** Fraction of the remaining offset one step of dtMs closes: 1 - exp(-dt / TAU). */
export const dampingAlpha = (dtMs: number): number => {
  if (!Number.isFinite(dtMs) || dtMs < 0) {
    throw new RangeError(`dtMs must be finite and non-negative, got ${dtMs}`);
  }
  return 1 - Math.exp(-dtMs / LOOK_TAU_MS);
};
export const lookSettled = (current: LookOffset, target: LookOffset): boolean =>
  current.yaw === target.yaw && current.pitch === target.pitch;
const easeAxis = (current: number, target: number, alpha: number): number => {
  const next = current + (target - current) * alpha;
  return Math.abs(target - next) <= LOOK_SNAP_DEG ? target : next;
};
/**
 * One frame of damping. Returns `current` ITSELF when already settled, so a caller at rest can
 * keep its whole state by reference — the never-dragged golden scenes stay bit-identical.
 */
export const easeLook = (current: LookOffset, target: LookOffset, dtMs: number): LookOffset => {
  if (lookSettled(current, target)) return current;
  const alpha = dampingAlpha(dtMs);
  return {
    yaw: easeAxis(current.yaw, target.yaw, alpha),
    pitch: easeAxis(current.pitch, target.pitch, alpha),
  };
};
```

**src/camera/square-rail.ts (complete, 32 lines) — the square's stops + the authored gaze:**

```ts
// src/camera/square-rail.ts
/**
 * The square's rail (design-staircase §6.1 — S0 «the facade and the hour», S1 «the arch
 * approach»). The square is a resident without a contract, so its stop data lives here; the
 * values are the §6.1 declared ones, ids follow the design's stop naming (S0/S1 like J0/J4).
 *
 * The square's default gaze is NOT the room pose law: S0's authored framing — level with the
 * boot camera, up at the cornice line — is what the noon and white-night goldens pin, so it is
 * carried here as SQUARE_S0_GAZE and fed to samplePose by the host. S1 gazes into the arch:
 * the host resolves that target to the gallery's entry stop at runtime (no room data lives here).
 */
import type { Rail, Vec3 } from '../world/registry';

export const SQUARE_RAIL = {
  stops: [
    {
      id: 'S0',
      position: [0, 1.7, 230],
      look: { yaw: 35, pitchUp: 35, pitchDown: 35 },
      caption: 'caption.s0',
    },
    {
      id: 'S1',
      position: [0, 1.7, 100],
      look: { yaw: 25, pitchUp: 20, pitchDown: 10 },
      caption: 'caption.s1',
    },
  ],
} satisfies Rail;

/** The authored S0 gaze target (§6.1 «exists today»): the boot pose the goldens pin. */
export const SQUARE_S0_GAZE: Vec3 = [0, 11, 0];
```

**src/camera/wheel-edge.ts (complete, 71 lines) — the sustained-wheel boundary gesture:**

```ts
// src/camera/wheel-edge.ts
/**
 * The wheel-boundary law (design-gallery-fork: the owner's reachability report,
 * 2026-10-21): the rail's own wheel is travel-only (§6.1 — a wheel at a rail end
 * clamps), so a trackpad visitor reaches a door and stalls. The law adds ONE
 * deliberate gesture: sustained scrolling PAST a rail end fires that end's
 * airlock. A trackpad's momentum burst must NOT fire it — the law demands all
 * three of: accumulated |delta| >= EDGE_BUDGET_PX, no single event >=
 * EDGE_MAX_EVENT_PX (a deliberate press resumes slowly; a momentum burst starts
 * fast), and a sustained stream for >= EDGE_SUSTAIN_MS (a momentum tail dies
 * before the window opens). The host owns the DOM and calls feed(); the law is
 * pure and DOM-free. Thresholds are declared tuning constants (DEC-031).
 */

/* The deliberate-overshoot budget past the clamp, px. */
export const EDGE_BUDGET_PX = 650;
/* A momentum burst is fast by construction; a deliberate resume is not. px/event. */
export const EDGE_MAX_EVENT_PX = 120;
/* The momentum impulse decays inside this window; crossing it proves intent. ms. */
export const EDGE_SUSTAIN_MS = 420;

export type WheelEdgeInput = Readonly<{
  /** True while settled exactly at a rail end whose airlock side is next. */
  pastBoundary: boolean;
  /** The signed wheel delta, px (the rail's own sign law). */
  deltaPx: number;
  /** The DOM event clock, ms (Date.now; the law is pure over given values). */
  nowMs: number;
}>;

export type WheelEdgeState = Readonly<{
  /** The accumulated |delta| since the first past-boundary event, px. */
  budget: number;
  /** The first past-boundary event's timestamp, ms; null outside a pass. */
  sinceMs: number | null;
  /** The largest single |delta| seen in the current pass, px. */
  peakPx: number;
}>;

export const WHEEL_EDGE_START: WheelEdgeState = { budget: 0, sinceMs: null, peakPx: 0 };

export interface WheelEdgeStep {
  readonly state: WheelEdgeState;
  /** Fire the boundary's airlock this frame. */
  readonly fire: boolean;
}

export function wheelEdge(current: WheelEdgeState, input: WheelEdgeInput): WheelEdgeStep {
  if (!Number.isFinite(input.nowMs)) {
    throw new RangeError(`nowMs must be finite, got ${input.nowMs}`);
  }
  if (!Number.isFinite(input.deltaPx)) {
    throw new RangeError(`deltaPx must be finite, got ${input.deltaPx}`);
  }
  if (!input.pastBoundary || input.deltaPx === 0) {
    return { state: WHEEL_EDGE_START, fire: false };
  }
  const magnitude = Math.abs(input.deltaPx);
  if (magnitude >= EDGE_MAX_EVENT_PX) {
    // A fast burst: no deliberate press reads this fast — the pass restarts.
    return { state: WHEEL_EDGE_START, fire: false };
  }
  const sinceMs = current.sinceMs ?? input.nowMs;
  const state: WheelEdgeState = {
    budget: current.budget + magnitude,
    sinceMs,
    peakPx: Math.max(current.peakPx, magnitude),
  };
  const sustained = input.nowMs - sinceMs >= EDGE_SUSTAIN_MS;
  return { state, fire: sustained && state.budget >= EDGE_BUDGET_PX };
}
```

**src/world/airlock.ts (complete, 83 lines) — the transit FSM (hold → exit):**

```ts
// src/world/airlock.ts
/**
 * Airlock transit FSM — docs/design-staircase.md §2.4, DEC-014, §8.2–§8.4.
 *
 * Pure: no three, no DOM, no clock; the host feeds deltaMs and dataReady.
 * Laws: a transit is hold → exit → idle; 'upload-swap' fires exactly once, on the first
 * ready frame; 'dispose-from' fires exactly once, on exit, only when something was mounted;
 * the hold never ends before data is ready (dark-card dwell), so elapsed-at-exit ≥ holdMs;
 * reduced motion forces a 'cut' with a zero hold; fetch starts at beginTransit this round.
 */
import type { AirlockDef, AirlockId, AirlockTransit, NodeHandle } from './registry';

type TransitFields = Readonly<{
  airlockId: AirlockId;
  from: NodeHandle | null;
  to: NodeHandle | null;
  transit: AirlockTransit;
  holdMs: number;
  elapsedMs: number;
}>;
export type HoldState = Readonly<
  TransitFields & { phase: 'hold'; dataReady: boolean; uploaded: boolean }
>;
export type ExitState = Readonly<TransitFields & { phase: 'exit' }>;
export type TransitState = Readonly<{ phase: 'idle' }> | HoldState | ExitState;
export type TransitEvent = 'upload-swap' | 'dispose-from';
const IDLE = { phase: 'idle' } as const satisfies TransitState;
export function beginTransit(
  input: Readonly<{ airlock: AirlockDef; from: NodeHandle | null; reducedMotion: boolean }>,
): HoldState {
  const { airlock, from } = input;
  const transit: AirlockTransit = input.reducedMotion ? 'cut' : airlock.transit;
  // One def serves both directions: `to` is derived relative to `from`; a cold entry
  // (from: null) lands on the def's `to`.
  const to = from !== null && from === airlock.to ? airlock.from : airlock.to;
  return {
    phase: 'hold',
    airlockId: airlock.id,
    from,
    to,
    transit,
    holdMs: transit === 'cut' ? 0 : airlock.holdMs,
    elapsedMs: 0,
    dataReady: false,
    uploaded: false,
  };
}
export function advanceTransit(
  state: TransitState,
  deltaMs: number,
  dataReady: boolean,
): Readonly<{ state: TransitState; events: readonly TransitEvent[] }> {
  if (!Number.isFinite(deltaMs) || deltaMs < 0) {
    throw new RangeError(`advanceTransit: deltaMs must be finite and ≥ 0, got ${deltaMs}`);
  }
  if (state.phase !== 'hold') return { state, events: [] };
  const events: TransitEvent[] = [];
  const ready = state.dataReady || dataReady;
  let uploaded = state.uploaded;
  if (ready && !uploaded) {
    uploaded = true;
    events.push('upload-swap');
  }
  const elapsedMs = state.elapsedMs + deltaMs;
  if (ready && elapsedMs >= state.holdMs) {
    if (state.from !== null) events.push('dispose-from');
    const exit: TransitState = {
      phase: 'exit',
      airlockId: state.airlockId,
      from: state.from,
      to: state.to,
      transit: state.transit,
      holdMs: state.holdMs,
      elapsedMs,
    };
    return { state: exit, events };
  }
  return { state: { ...state, elapsedMs, dataReady: ready, uploaded }, events };
}
export function finishTransit(state: TransitState): TransitState {
  if (state.phase === 'hold') throw new Error('finishTransit: a hold is never torn down silently');
  return IDLE;
}
```

**src/ui/edge-prompt.ts (complete, 30 lines) — the boundary prompt view law:**

```ts
// src/ui/edge-prompt.ts
/**
 * The boundary prompt law (the owner's reachability report, 2026-10-21): a rail
 * end whose airlock side is next is invisible today — a trackpad visitor stalls
 * at a door. The prompt names the door's affordance: one chrome line, keyed by
 * the language law (chrome.edgePrompt), visible while settled at a rail end
 * with an airlock side to enter, gone everywhere else and during every transit.
 * Pure over the host's per-frame facts; the host owns the node, the timer-less
 * fade (the chrome's exit is the caption's 240 ms law) and the click:
 * activating it travels through the same boundary step the arrows use.
 * UI-nearly-absent law: it never shows mid-room, never stacks a second line,
 * and it is hidden from the golden fixtures with the other chrome overlays.
 * The railBoundary() contract main.ts feeds already codes "an airlock side
 * exists there" into a non-null boundary — no separate target boolean.
 */

export interface EdgePromptInput {
  /** The arrival beats own the pre-settle frames; a transit owns the camera. */
  readonly settled: boolean;
  /** The rail end passed: 'forward' (the deeper hall) or 'backward' (home). */
  readonly boundary: 'backward' | 'forward' | null;
}

export interface EdgePromptView {
  readonly visible: boolean;
}

export function edgePromptView(input: EdgePromptInput): EdgePromptView {
  return { visible: Boolean(input.settled && input.boundary !== null) };
}
```

**src/ui/hint.ts (complete, 102 lines) — the one-shot travel hint law:**

```ts
// src/ui/hint.ts
/**
 * Travel-hint law (design-i18n-notes.md §9), in the shape of src/ui/captions.ts: events
 * come in, a view comes out; the host owns the DOM node, the timers and the text (t()).
 *
 * State law, stated once:
 * - eligible ⇔ main page ∧ the load's initial stop is S0 ∧ not det. Anything else boots
 *   straight into 'gone' with dismissed 'none': data-visible is never true and no timer is
 *   ever requested (det/golden pixels stay frozen; deep links never see the hint).
 * - armed → shown only at the arrival-settle beat, and only if nothing dismissed the hint
 *   first: travel before the beat wins and the hint never flashes.
 * - shown → gone on the first travel intent of any kind (wheel, pointer drag start of any
 *   pointer type, arrow step, boundary step that fires an airlock — one definition, the
 *   rail's own travel-intent entry point) or when the hold timer fires; the cause is kept
 *   for data-dismissed.
 * - gone is absorbing: no event brings the hint back for the page lifetime. Time scrubbing
 *   and the language toggle are not events of this law — the host swaps the text in place
 *   and leaves the timers alone.
 * - timers: the host schedules a single hold timer of HINT_HOLD_MS when a step says
 *   'schedule-hold' and clears it on 'cancel-hold'; a late hold tick is absorbed by gone.
 * - motion: exitMs is HINT_DISMISS_MS after travel (answers a user action — the caption's
 *   fade), HINT_FADE_MS after the hold (nothing happened to cause it), 0 under reduced
 *   motion (appear with the settle, cut at the hold, cut on travel). Appearance follows the
 *   notes link's reveal on the host side and has no duration here.
 */

export const HINT_HOLD_MS = 6000;
export const HINT_FADE_MS = 1200;
export const HINT_DISMISS_MS = 240;

export type HintDismissal = 'none' | 'travel' | 'timeout';
export type HintPhase = 'armed' | 'shown' | 'gone';
export type HintTimer = 'schedule-hold' | 'cancel-hold' | null;

export interface HintBoot {
  readonly mainPage: boolean;
  readonly initialStopIsStart: boolean;
  readonly det: boolean;
  readonly reducedMotion: boolean;
}

export interface HintState {
  readonly eligible: boolean;
  readonly phase: HintPhase;
  readonly dismissed: HintDismissal;
  readonly reducedMotion: boolean;
}

export interface HintStep {
  readonly state: HintState;
  readonly timer: HintTimer;
}

export interface HintView {
  readonly visible: boolean;
  readonly dismissed: HintDismissal;
  readonly exitMs: number;
}

const EXIT_MS: Readonly<Record<HintDismissal, number>> = {
  none: 0,
  travel: HINT_DISMISS_MS,
  timeout: HINT_FADE_MS,
};

export function createHintState(boot: HintBoot): HintState {
  const eligible = boot.mainPage && boot.initialStopIsStart && !boot.det;
  return {
    eligible,
    phase: eligible ? 'armed' : 'gone',
    dismissed: 'none',
    reducedMotion: boot.reducedMotion,
  };
}

export function hintSettled(state: HintState): HintStep {
  if (state.phase !== 'armed') return { state, timer: null };
  return { state: { ...state, phase: 'shown' }, timer: 'schedule-hold' };
}

export function hintTravelIntent(state: HintState): HintStep {
  if (state.phase === 'gone') return { state, timer: null };
  const timer: HintTimer = state.phase === 'shown' ? 'cancel-hold' : null;
  return { state: { ...state, phase: 'gone', dismissed: 'travel' }, timer };
}

export function hintHoldElapsed(state: HintState): HintStep {
  if (state.phase !== 'shown') return { state, timer: null };
  return { state: { ...state, phase: 'gone', dismissed: 'timeout' }, timer: null };
}

export function hintReducedMotion(state: HintState, reducedMotion: boolean): HintState {
  return state.reducedMotion === reducedMotion ? state : { ...state, reducedMotion };
}

export function hintView(state: HintState): HintView {
  return {
    visible: state.phase === 'shown',
    dismissed: state.dismissed,
    exitMs: state.reducedMotion ? 0 : EXIT_MS[state.dismissed],
  };
}
```

**src/ui/captions.ts (complete, 102 lines) — the caption presentation law (incl. the dwell):**

```ts
/**
 * Caption presentation core.
 * Implements design-staircase §6.1 (caption beat: rest and glide), §8.4 + §1.2
 * (airlock dwell shows the destination's entry caption on the dark card),
 * architecture.md room contract (the caption doubles as the accessible
 * description) and the design-sky-time §9 precedent (passive overlay plus a
 * live region; no permanent panel). The §2.4 landing card is out of scope.
 *
 * Pure: DOM-free, three-free. The host feeds parsed data once per frame and
 * rewrites DOM only where `captionChanges` reports a difference.
 *
 * Laws (stated once, here):
 *  - REST: at a stop, that stop's caption is visible.
 *  - GLIDE: the overlay fades out holding the departure text; the text swaps
 *    only on landing, while still hidden, then fades back in. Requires
 *    CAPTION_FADE_MS to be shorter than the shortest glide.
 *  - DWELL: the dark card shows the destination entry caption; the frame that
 *    follows rests on that same stop, so the hand-over changes nothing.
 *  - SUPPRESSED: during the square's title beat the caption stays hidden,
 *    holding its text, so two fades never compete. A dwell outranks it.
 *  - ANNOUNCE: the live region holds `<id> · <caption>`; it is rewritten only
 *    when that string changes and hiding never clears it.
 * Precedence: dwell > suppressed > gliding > rest.
 * Committed caption data is static, so malformed input fails loud.
 */
export type CaptionStop = Readonly<{ id: string; caption: string }>;
export type CaptionInput = Readonly<{
  stops: readonly CaptionStop[];
  stopIndex: number;
  gliding: boolean;
  dwell: CaptionStop | null;
  suppressed: boolean;
}>;
export type CaptionView = Readonly<{
  text: string;
  visible: boolean;
  stopId: string | null;
  announcement: string;
}>;
export type CaptionChanges = Readonly<{
  text: boolean;
  visible: boolean;
  stopId: boolean;
  announcement: boolean;
}>;
/** Opacity transition length; the CSS rule and the rail's shortest glide must respect it. */
export const CAPTION_FADE_MS = 240;
export const ANNOUNCEMENT_SEPARATOR = ' · ';
export const EMPTY_CAPTION = {
  text: '',
  visible: false,
  stopId: null,
  announcement: '',
} as const satisfies CaptionView;
export const formatAnnouncement = (stop: CaptionStop): string =>
  `${stop.id}${ANNOUNCEMENT_SEPARATOR}${stop.caption}`;
const assertStop = (stop: CaptionStop, where: string): CaptionStop => {
  if (stop.id === '' || stop.caption === '') {
    throw new Error(`captions: ${where} has an empty id or caption`);
  }
  return stop;
};
const restStop = (input: CaptionInput): CaptionStop => {
  const { stops, stopIndex } = input;
  if (stops.length === 0) throw new Error('captions: node without stops');
  if (!Number.isInteger(stopIndex)) {
    throw new Error(`captions: stop index ${stopIndex} is not an integer`);
  }
  const stop = stops[stopIndex];
  if (stop === undefined) {
    throw new Error(`captions: stop index ${stopIndex} outside 0..${stops.length - 1}`);
  }
  return assertStop(stop, `stop ${stopIndex}`);
};
const shown = (stop: CaptionStop): CaptionView => ({
  text: stop.caption,
  visible: true,
  stopId: stop.id,
  announcement: formatAnnouncement(stop),
});
/** Hidden, holding the previous text; a first frame borrows the rest stop so it never blanks. */
const hidden = (prev: CaptionView, fallback: CaptionStop): CaptionView => {
  const fresh = prev.text === '';
  return {
    text: fresh ? fallback.caption : prev.text,
    visible: false,
    stopId: fresh ? fallback.id : prev.stopId,
    announcement: prev.announcement,
  };
};
export const presentCaption = (prev: CaptionView, input: CaptionInput): CaptionView => {
  const rest = restStop(input);
  if (input.dwell !== null) return shown(assertStop(input.dwell, 'dwell stop'));
  if (input.suppressed || input.gliding) return hidden(prev, rest);
  return shown(rest);
};
export const captionChanges = (prev: CaptionView, next: CaptionView): CaptionChanges => ({
  text: prev.text !== next.text,
  visible: prev.visible !== next.visible,
  stopId: prev.stopId !== next.stopId,
  announcement: prev.announcement !== next.announcement,
});
```

**src/world/registry.ts (verbatim slice — the data types + the airlock-chain helpers; the
validateRegistry fence omitted):**

```ts
// src/world/registry.ts
export type RoomId = 'rastrelli-gallery' | 'jordan';
export type NodeHandle = RoomId | 'square';
export type AirlockId = 'arch-portal' | 'gallery-airlock' | 'landing-airlock';
export type RouteKey = '/gallery' | '/jordan';
export type Vec3 = readonly [number, number, number];
export type Bounds = Readonly<{ min: Vec3; max: Vec3 }>;
export type StateId = 'day' | 'dusk' | 'nightChandeliers';
/** The three baked states (§4). The manifest intensity record and the look gain key on it. */
export type LightState = StateId;
/** Per-state encoding white point = per-state runtime restore scalar (one field, r17c). */
export type LightmapIntensity = Readonly<Record<LightState, number>>;
export type Stop = Readonly<{
  id: string;
  position: Vec3;
  look: Readonly<{ yaw: number; pitchUp: number; pitchDown: number }>;
  /** The caption's i18n key; the host resolves it to text at the dictionary boundary. */
  caption: CaptionKey;
}>;
export type Rail = Readonly<{ stops: readonly Stop[] }>;
export type AirlockTransit = 'doorway' | 'cut';
export type AirlockDef = Readonly<{
  id: AirlockId;
  from: NodeHandle;
  to: NodeHandle | null;
  portalFrom: Bounds;
  portalTo: Bounds | null;
  transit: AirlockTransit;
  holdMs: number;
}>;
export type RoomNeighbor = Readonly<{ to: NodeHandle | null; airlock: AirlockId }>;
export type RoomBudget = Readonly<{
  trianglesMax: number;
  drawsMax: number;
  textureBytesMax: number;
  payloadBytesMax: number;
}>;
export type RoomLighting = Readonly<{
  states: readonly StateId[];
  blend: 'lightmapBlend' | 'preBlendRT';
}>;
export type RoomFileRow = Readonly<{
  path: string;
  bytes: number;
  sha256: string;
  kind: 'glb' | 'ktx2';
}>;
export type RoomManifest = Readonly<{
  id: string;
  files: readonly RoomFileRow[];
  lightmaps: Readonly<{
    states: readonly string[];
    res: number | null;
    /** All three entries required, finite, > 0 when the record exists (manifests.ts checks). */
    intensity: LightmapIntensity | null;
  }>;
  budget: RoomBudget;
  toolchain: Readonly<Record<string, string>>;
}>;
export type RoomContract = Readonly<{
  id: RoomId;
  /** The room's display title, carried as an i18n key (stored, not rendered, in phase 2). */
  title: Key;
  bounds: Bounds;
  rail: Rail;
  lighting: RoomLighting;
  neighbors: readonly RoomNeighbor[];
  budget: RoomBudget;
}>;
export type RegistryEntry =
  | Readonly<{ kind: 'resident'; id: 'square'; route: '/'; neighbors: readonly RoomNeighbor[] }>
  | Readonly<{
      kind: 'room';
      id: RoomId;
      route: RouteKey;
      contract: RoomContract;
      thunk: () => Promise<RoomModule>;
    }>;
export type RoomEntry = Extract<RegistryEntry, { kind: 'room' }>;
export type RoomPayload = Readonly<{ glb: ArrayBuffer; ktx2: ReadonlyMap<string, ArrayBuffer> }>;
export type RoomObject = unknown;
/** A decoded runtime texture (three's Texture, opaque here — the pure core never names three). */
export type RoomTexture = unknown;
export interface RoomAssetService {
  fetchRoom(manifest: RoomManifest, signal: AbortSignal): Promise<RoomPayload>;
  mountParsed(roomId: RoomId, payload: RoomPayload): Promise<RoomObject>;
  /** §4: decode the room's lm ktx2 rows (hold-only; the caller maps paths via blend's stateOfPath). */
  decodeRoomTextures(
    roomId: RoomId,
    payload: RoomPayload,
  ): Promise<ReadonlyMap<string, RoomTexture>>;
  /** §5/ADR-0013: decode the dusk probe and bake PMREM once, inside the hold. Returns the env texture. */
  mountEnvironment(roomId: RoomId, payload: RoomPayload): Promise<RoomObject>;
  disposeEnvironment(roomId: RoomId): void;
  disposeParsed(object: RoomObject): void;
}
export interface RoomScene {
  add(object: RoomObject): void;
  remove(object: RoomObject): void;
  /** §5: the room's PMREM probe attaches to the host scene's environment; null clears it. */
  setEnvironment(object: RoomObject | null): void;
}
export interface RoomLoadContext {
  readonly assets: RoomAssetService;
  readonly scene: RoomScene;
  /** §8.3 layer 1: rooms register payload bytes in `load`, release in `unmount`. */
  readonly ledger: RoomLedger;
  /** §4.4 measurement switch (dev-only; the product runs 'a'). */
  readonly lmMode: LmMode;
  /** The host renderer, opaque here (B-RT's per-frame quad pass is the only consumer). */
  readonly renderer: RoomObject;
}
/** The lightmap technique — 'a' is the shipped blend; the others are the §4.4 measured alternatives. */
export type LmMode = 'a' | 'b-rt' | 'b-discrete';
export interface RoomModule {
  contract: RoomContract;
  load(ctx: RoomLoadContext, manifest: RoomManifest, signal: AbortSignal): Promise<void>;
  mount(ctx: RoomLoadContext): Promise<void>;
  unmount(ctx: RoomLoadContext): void;
}
/** First edge on the path from→to; breadth-first over bidirectional airlock edges. */
export function nextAirlockOnPath(
  list: readonly RegistryEntry[],
  airlocks: readonly AirlockDef[],
  from: NodeHandle,
  to: NodeHandle,
): AirlockDef | null {
  if (from === to) return null;
  const nodes = new Set<string>(list.map((entry) => entry.id));
  const edges = airlocks.filter((a) => a.to !== null && nodes.has(a.from) && nodes.has(a.to));
  const firstEdge = new Map<NodeHandle, AirlockDef>();
  const seen = new Set<NodeHandle>([from]);
  const queue: NodeHandle[] = [from];
  while (queue.length > 0) {
    const cur = queue.shift();
    if (cur === undefined) break;
    for (const edge of edges) {
      const next = edge.from === cur ? edge.to : edge.to === cur ? edge.from : null;
      if (next === null || seen.has(next)) continue;
      seen.add(next);
      firstEdge.set(next, cur === from ? edge : (firstEdge.get(cur) ?? edge));
      if (next === to) return firstEdge.get(to) ?? null;
      queue.push(next);
    }
  }
  return null;
}
/** The airlock a cold entry (deep link, nothing mounted) arrives through: the def leading to `to`. */
export function airlockEntering(
  airlocks: readonly AirlockDef[],
  to: NodeHandle,
): AirlockDef | null {
  return airlocks.find((def) => def.to === to) ?? null;
}
```

**rooms/index.ts (complete, 66 lines) — the registry list, the portal boxes, the hold beats:**

```ts
// rooms/index.ts
/**
 * The room registry list — design-staircase.md §8.1: adding a room = a folder under rooms/
 * + public/assets/<id>/ + one line here; never a change under src/engine/ or src/world/
 * (DEC-013; AGENTS.md rule 8). Contracts are static data; modules load behind their thunks
 * (lazy chunks). Portal boxes are true coordinates (§2.4); holdMs beats are
 * orchestrator-declared (docs/STATE.md live state); the landing airlock's far portal stays
 * declared until the phase-3 position portals. Verified against the rail at r18: the keyboard
 * walk observed every airlock firing through its portal box, forward and backward.
 */
import type { AirlockDef, RegistryEntry } from '../src/world/registry';
import { contract as jordanContract } from './jordan/contract';
import { contract as galleryContract } from './rastrelli-gallery/contract';

export const AIRLOCKS: readonly AirlockDef[] = [
  {
    id: 'arch-portal',
    from: 'square',
    to: 'rastrelli-gallery',
    portalFrom: { min: [-3, 0, 86.5], max: [3, 6, 88.5] },
    portalTo: { min: [-3, 0, 85.5], max: [3, 3.6, 87.5] },
    transit: 'doorway',
    holdMs: 1500,
  },
  {
    id: 'gallery-airlock',
    from: 'rastrelli-gallery',
    to: 'jordan',
    portalFrom: { min: [43, 0, 70], max: [44, 3.6, 76] },
    portalTo: { min: [78, 0, -66], max: [80, 3.6, -62] },
    transit: 'doorway',
    holdMs: 1500,
  },
  {
    id: 'landing-airlock',
    from: 'jordan',
    to: null,
    portalFrom: { min: [71.5, 10, -68], max: [74.5, 13.5, -64] },
    portalTo: null,
    transit: 'cut',
    holdMs: 600,
  },
];

export const ENTRIES: readonly RegistryEntry[] = [
  {
    kind: 'resident',
    id: 'square',
    route: '/',
    neighbors: [{ to: 'rastrelli-gallery', airlock: 'arch-portal' }],
  },
  {
    kind: 'room',
    id: 'rastrelli-gallery',
    route: '/gallery',
    contract: galleryContract,
    thunk: () => import('./rastrelli-gallery/room').then((m) => m.room),
  },
  {
    kind: 'room',
    id: 'jordan',
    route: '/jordan',
    contract: jordanContract,
    thunk: () => import('./jordan/room').then((m) => m.room),
  },
];
```

**rooms/rastrelli-gallery/contract.ts (complete, 48 lines):**

```ts
// rooms/rastrelli-gallery/contract.ts
/**
 * Rastrelli Gallery room contract — design-staircase.md §2.2 (per-room values; all declared
 * where marked), §6.1 (stops: G0 arch mouth · G1 mid · G2 east door). Budget rows mirror the
 * generated manifest (tests pin them equal).
 */
import type { RoomContract } from '../../src/world/registry';

export const contract: RoomContract = {
  id: 'rastrelli-gallery',
  title: 'data.titleGallery',
  // The whole committed model (tools/bpy/rastrelli-gallery.py): the arch passage
  // (x -4..4, z 63.5..87.5, vault peak 5.0) plus the gallery proper (x 4..44, z 70..76).
  bounds: { min: [-4, 0, 63.5], max: [44, 5, 87.5] },
  rail: {
    stops: [
      {
        id: 'G0',
        position: [0, 1.7, 86],
        look: { yaw: 20, pitchUp: 15, pitchDown: 15 },
        caption: 'caption.g0',
      },
      {
        id: 'G1',
        position: [24, 1.7, 73],
        look: { yaw: 30, pitchUp: 15, pitchDown: 15 },
        caption: 'caption.g1',
      },
      {
        id: 'G2',
        position: [42, 1.7, 73],
        look: { yaw: 15, pitchUp: 10, pitchDown: 10 },
        caption: 'caption.g2',
      },
    ],
  },
  lighting: { states: ['day', 'dusk', 'nightChandeliers'], blend: 'lightmapBlend' },
  neighbors: [
    { to: 'square', airlock: 'arch-portal' },
    { to: 'jordan', airlock: 'gallery-airlock' },
  ],
  budget: {
    trianglesMax: 110_000,
    drawsMax: 25,
    textureBytesMax: 1_000_000,
    payloadBytesMax: 2_000_000,
  },
};
```

**rooms/jordan/contract.ts (complete, 58 lines):**

```ts
// rooms/jordan/contract.ts
/**
 * Jordan Staircase room contract — design-staircase.md §2.2 (per-room values; all declared
 * where marked), §6.1 (stops: J0 ground entry · J1 mid first flight · J2 mezzanine turn ·
 * J3 upper flight · J4 landing). Budget rows mirror the generated manifest.
 */
import type { RoomContract } from '../../src/world/registry';

export const contract: RoomContract = {
  id: 'jordan',
  title: 'data.titleJordan',
  bounds: { min: [66, 0, -86], max: [92, 20, -62] },
  rail: {
    stops: [
      {
        id: 'J0',
        position: [79, 1.7, -64],
        look: { yaw: 35, pitchUp: 35, pitchDown: 10 },
        caption: 'caption.j0',
      },
      {
        id: 'J1',
        position: [79, 5.2, -70],
        look: { yaw: 35, pitchUp: 35, pitchDown: 35 },
        caption: 'caption.j1',
      },
      {
        id: 'J2',
        position: [79, 6.7, -80],
        look: { yaw: 35, pitchUp: 35, pitchDown: 35 },
        caption: 'caption.j2',
      },
      {
        id: 'J3',
        position: [73, 9.7, -76],
        look: { yaw: 35, pitchUp: 30, pitchDown: 30 },
        caption: 'caption.j3',
      },
      {
        id: 'J4',
        position: [73, 11.7, -66],
        look: { yaw: 35, pitchUp: 30, pitchDown: 30 },
        caption: 'caption.j4',
      },
    ],
  },
  lighting: { states: ['day', 'dusk', 'nightChandeliers'], blend: 'lightmapBlend' },
  neighbors: [
    { to: 'rastrelli-gallery', airlock: 'gallery-airlock' },
    { to: null, airlock: 'landing-airlock' },
  ],
  budget: {
    trianglesMax: 380_000,
    drawsMax: 60,
    textureBytesMax: 4_000_000,
    payloadBytesMax: 7_000_000,
  },
};
```

## 10. main.ts slices (verbatim; the host coordinator — DOM, renderer, frame loop)

**Slice 1 — the room streaming + the rail seed + the swap/dispose/transit machinery
(committed lines ~418–704):**

```ts
// --- Room streaming (design-staircase.md §1.1, §2.4, §8; DEC-013/DEC-014) ------------------
// The square is a resident: it is never mounted or disposed — indoors only its exterior
// group and the sky dome flip to visible=false. Rooms load lazily behind their thunks; an
// airlock transit is the only place a room mounts, uploads GPU memory or disposes.
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const ledger = createLedger(); // §8.3 layer 1: the loaders register their own GPU allocations
const assets = createLoaders(renderer, ledger);
const roomScene: RoomScene = {
  add: (object) => scene.add(object as unknown as THREE.Object3D),
  remove: (object) => scene.remove(object as unknown as THREE.Object3D),
  setEnvironment: (object) => {
    scene.environment = (object ?? null) as THREE.Texture | null;
  },
};
// The `?lm=` technique switch is ephemeral per URL (the hud pattern): parsed at boot and on
// every hashchange; rooms mounted later pick up the current mode, a mounted room keeps its
// technique until the next exit disposes it (§4.4's measurement navigates with the flag set).
let roomCtx: RoomLoadContext = {
  assets,
  scene: roomScene,
  ledger,
  lmMode: lmParams.mode,
  renderer,
};

let activeNode: NodeHandle | null = null; // null = cold entry (nothing mounted yet)
let indoor = false;
let ready = false;
let transit: Readonly<{ state: TransitState; target: NodeHandle }> | null = null;
let queuedTarget: NodeHandle | null = null;
let transitStarted = false;
const roomWork = new Map<RoomId, Promise<void>>();
const roomModules = new Map<RoomId, RoomModule>();

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

// §4.4: bakes carry brightness; indoors the renderer exposure is a per-room CONSTANT
// (declared 1.0) set in the airlock hold and restored to E(h) on exit — §7 stays an
// exterior/sky contract. Interiors are lightmap-only: the sun and the hemisphere light are
// switched off in the hold (they were leaking through walls — unshadowed glb meshes) and
// restored by applyEpoch on the way out.
const INTERIOR_EXPOSURE = 1.0;

// --- Camera rail (design-staircase.md §6.1; r18a) --------------------------------------------
// The pure rail core (src/camera/rail.ts) owns the path, the glide/cut motion, the look
// limits and the seed law; this host owns the DOM inputs (wheel/drag/arrows), the three.js
// camera and the re-seed on every node change. Seed precedence: ?stop= > ?cam= > entry;
// a backward entry (through an airlock whose home side is the node being entered) seeds the
// far stop so the journey continues in the direction of travel unless the URL pins a seed.
const railFor = (node: NodeHandle): Rail =>
  node === 'square' ? SQUARE_RAIL : roomEntryOf(node).contract.rail;

let railNode: NodeHandle = 'square';
let rail: Rail = SQUARE_RAIL;
let railState: RailState = seedState(rail, { stop: requestedStop, cam: requestedCam }).state;
let seedAtFarStop = false; // beginTransitTo sets this for backward entries

// One seed law, two consumers: seedRail applies it on a node change; dwellStop derives the
// dark-card caption from it, so the dwell hands over to the rest frame without a flash.
const seedInputs = (): Readonly<{ stop: string | null; cam: number | null }> => ({
  stop: requestedStop,
  cam: requestedCam ?? (seedAtFarStop ? 1 : null),
});

const seedRail = (node: NodeHandle): void => {
  const next = railFor(node);
  if (requestedStop !== null && !next.stops.some((s) => s.id === requestedStop)) {
    console.warn(`zimny: stop issue — ${node} has no stop ${requestedStop}`);
  }
  railNode = node;
  rail = next;
  railState = seedState(next, seedInputs()).state;
  captionStops = next.stops.map((s) => ({ id: s.id, caption: t(s.caption) }));
};

// The dark-card caption (§8.4, §1.2): while a transit dwells, the DESTINATION's seed stop —
// the stop the frame will rest on — shows its beat; the hand-over changes nothing.
const dwellStop = (): CaptionStop | null => {
  const st = transit?.state;
  if (st === undefined || st.phase !== 'hold' || st.to === null) return null;
  const dest = railFor(st.to);
  const seeded = seedState(dest, seedInputs()).state;
  const stop = dest.stops[nearestStopIndex(dest, seeded.u)];
  return stop === undefined ? null : { id: stop.id, caption: t(stop.caption) };
};

// The square's default gaze is its authored framing, not the room pose law: S0 up at the
// cornice line is what the noon and white-night goldens pin (§6.1 «exists today»), and S1
// gazes into the arch — resolved at runtime to the gallery's entry stop (no room data copied).
const galleryEntry = roomEntryOf('rastrelli-gallery').contract.rail.stops[0];
if (galleryEntry === undefined) throw new Error('zimny: gallery has no entry stop');
const SQUARE_GAZE: readonly Vec3[] = [SQUARE_S0_GAZE, galleryEntry.position];
let captionStops: readonly CaptionStop[] = rail.stops.map((s) => ({
  id: s.id,
  caption: t(s.caption),
}));
let captionView: CaptionView = EMPTY_CAPTION;

// [ELISION: the travel-hint host block sits here (committed lines ~559–618); its laws
// ride §9 verbatim in src/ui/hint.ts, and the host wiring is the standard DOM+timers
// host described in that file's header. Nothing in this elision hides a transit law.]

const UP_AXIS = new THREE.Vector3(0, 1, 0);
const RIGHT_AXIS = new THREE.Vector3(1, 0, 0);
const applyRailPose = (): void => {
  const pose = samplePose(rail, railState, railNode === 'square' ? SQUARE_GAZE : undefined);
  camera.position.set(pose.position[0], pose.position[1], pose.position[2]);
  camera.lookAt(pose.target[0], pose.target[1], pose.target[2]);
  // User look offsets compose on top of the default gaze: yaw around world up (yaw > 0 turns
  // right, a negative rotation about +Y), pitch around the camera's right (pitch > 0 up).
  if (pose.look.yaw !== 0) {
    camera.rotateOnWorldAxis(UP_AXIS, -pose.look.yaw * THREE.MathUtils.DEG2RAD);
  }
  if (pose.look.pitch !== 0) {
    camera.rotateOnAxis(RIGHT_AXIS, pose.look.pitch * THREE.MathUtils.DEG2RAD);
  }
};

const applySwap = (to: NodeHandle | null): void => {
  if (to === 'square') {
    indoor = false;
    sun.visible = true;
    hemi.visible = true;
    applyEpoch(epochMs); // restores sun/hemi intensities, colours and E(h) in one step
    rig.mesh.visible = true;
    camera.near = 0.5;
    camera.far = 2000;
    seedRail('square');
  } else if (to !== null) {
    indoor = true;
    sun.visible = false;
    hemi.visible = false; // SUB-BISECT: seam ON for this shot
    rig.mesh.visible = false;
    renderer.toneMappingExposure = INTERIOR_EXPOSURE;
    camera.near = 0.05; // §6.2 interior near/far, swapped in the hold
    camera.far = interiorFar(to);
    seedRail(to);
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
  // Entering through the airlock's home side (gallery ← jordan, square ← gallery) seeds the
  // far stop: the journey continues in the direction of travel (§6.1 seed law).
  seedAtFarStop = def.from === target;
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
```

**Slice 2 — the arrival beats + the presentation application (committed lines ~808–871):**

```ts
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
  // §9: the hint's show beat IS the settle — the chrome settles as one reveal. The step
  // fires once; a travel intent that landed before the beat already owns the dismissal
  // (the armed→gone transition makes the settled step a no-op). The beat RE-CHECKS the
  // landing too: a deep link carries ?stop=/?cam= (a shared link pins the stop — never a
  // first-timer), a room route is in transit or queued behind the tier probe (the arrival
  // can settle BEFORE beginTransitTo fires), and only the square's S0 with no pinned
  // parameters is the place a visitor lands without a shared link.
  if (
    arrival.phase === 'settled' &&
    !hintSettleFired &&
    requestedStop === null &&
    requestedCam === null &&
    transit === null &&
    railNode === 'square' &&
    nearestStopIndex(rail, railState.u) === 0
  ) {
    hintSettleFired = true;
    const step = hintSettled(hintState);
    hintState = step.state;
    applyHintStep(step.timer);
    applyHintView();
  }
  if (arrival.phase === 'settled' && resizePending) {
    resizePending = false;
    applyViewport();
  }
};
applyPresentation();
```

**Slice 3 — the input listeners + the boundary prompt wiring (committed lines ~977–1130):**

```ts
// --- Rail inputs (§6.1: scroll travels, drag looks, arrows step) -----------------------------
// The pure core owns every law; these listeners only translate DOM events into intents.
// Gates: the arrival beats own the pre-settle frames and an open airlock owns the camera
// (its swap re-seeds the rail), so inputs act only when settled and transit-free.
const railInputReady = (): boolean => arrival.phase === 'settled' && transit === null;
canvas.addEventListener(
  'wheel',
  (event) => {
    hintTravel(); // §9: the wheel IS travel — the first intent dismisses the hint
    if (!railInputReady()) {
      wheelEdgeState = WHEEL_EDGE_START;
      return;
    }
    event.preventDefault(); // the rail owns travel; no page scroll or pinch-zoom leaks through
    railState = scroll(rail, railState, event.deltaY, reducedMotion);
    // §6.1 amendment (DEC-031): a deliberate sustained scroll past a rail end fires that
    // end's airlock; a momentum burst restarts the pass (the pure law's three thresholds).
    const boundary = railPushBoundary();
    if (boundary === null) {
      wheelEdgeState = WHEEL_EDGE_START; // the pass lives only at the boundary
      return;
    }
    const direction = event.deltaY > 0 ? 'forward' : 'backward';
    if (direction !== boundary) {
      wheelEdgeState = WHEEL_EDGE_START; // one pass, one direction by intent
      return;
    }
    const step = wheelEdge(wheelEdgeState, {
      pastBoundary: true,
      deltaPx: event.deltaY,
      nowMs: performance.now(),
    });
    wheelEdgeState = step.state;
    if (step.fire) enterBoundary(direction);
  },
  { passive: false },
);
let dragAnchor: Readonly<{ pointerId: number; x: number; y: number }> | null = null;
canvas.addEventListener('pointerdown', (event) => {
  hintTravel(); // §9: a pointer drag start of ANY pointerType (touch included) is travel
  if (!railInputReady()) return;
  dragAnchor = { pointerId: event.pointerId, x: event.clientX, y: event.clientY };
  canvas.setPointerCapture(event.pointerId);
});
canvas.addEventListener('pointermove', (event) => {
  const anchor = dragAnchor;
  if (anchor === null || event.pointerId !== anchor.pointerId) return;
  // r21: tracked client deltas — PointerEvent.movementX is unreliable on touch (iOS often 0).
  const dxPx = event.clientX - anchor.x;
  const dyPx = event.clientY - anchor.y;
  dragAnchor = { pointerId: anchor.pointerId, x: event.clientX, y: event.clientY };
  const viewportHeightPx = canvas.clientHeight; // CSS px, same units as clientX/clientY
  if (viewportHeightPx <= 0) return; // not laid out yet; the law rejects a zero height
  // Grab-the-world sign law: drag right looks left, drag down looks up (§6.1 look offsets).
  // r21.1: the pointer type rides along — touch runs ~15% hotter (TOUCH_SPAN_FACTOR, the
  // owner's tuning: a thumb swipe is a shorter gesture than a mouse drag).
  railState = drag(
    rail,
    railState,
    -dxPx,
    dyPx,
    viewportHeightPx,
    toPointerType(event.pointerType),
  );
});
const endDrag = (event: PointerEvent): void => {
  if (dragAnchor === null) return;
  if (event.pointerId === dragAnchor.pointerId) dragAnchor = null;
  if (canvas.hasPointerCapture(event.pointerId)) canvas.releasePointerCapture(event.pointerId);
};
canvas.addEventListener('pointerup', endDrag);
canvas.addEventListener('pointercancel', endDrag);
// The rail graph is the linear chain of §1.1, so a boundary intent past an end stop IS the
// keyboard's airlock: forward from the square is the gallery, backward from it is the square;
// the landing's far end is inert (the dead end has no neighbor to transit to).
const RAIL_CHAIN: readonly NodeHandle[] = ['square', 'rastrelli-gallery', 'jordan'];
document.addEventListener('keydown', (event) => {
  if (event.target === scrub) return; // the scrub owns its keys
  const direction =
    event.key === 'ArrowRight' || event.key === 'ArrowUp'
      ? 1
      : event.key === 'ArrowLeft' || event.key === 'ArrowDown'
        ? -1
        : 0;
  if (direction === 0) return;
  hintTravel(); // §9: an arrow step (incl. a boundary step that fires an airlock) is travel
  if (!railInputReady()) return;
  event.preventDefault();
  const result = stepStop(rail, railState, direction, reducedMotion);
  railState = result.state;
  if (result.boundary === null) return;
  const at = RAIL_CHAIN.indexOf(railNode);
  const next = result.boundary === 'forward' ? RAIL_CHAIN[at + 1] : RAIL_CHAIN[at - 1];
  if (next !== undefined) beginTransitTo(next);
});

// --- The boundary prompt + the wheel-through (2026-10-21, DEC-031; laws in
// src/ui/edge-prompt.ts and src/camera/wheel-edge.ts). The owner's reachability
// report: a trackpad visitor scrolled to a rail end and stalled — the rail's own
// wheel is travel-only (§6.1), so the doors were arrows-only. Now a boundary has
// TWO roads into the same beginTransitTo call the arrows use: the chrome prompt
// ("Keep scrolling to enter", click to travel) and a sustained deliberate wheel
// past the clamp — the momentum-immunity thresholds are declared tuning constants.
let wheelEdgeState: WheelEdgeState = WHEEL_EDGE_START;
let edgePromptShown = false;
const EDGE_SETTLE_EPS = 1e-9; // the rail's snapped stops sit at parameters 0 and 1 exactly
const boundaryNext = (direction: 'forward' | 'backward'): NodeHandle | null => {
  const at = RAIL_CHAIN.indexOf(railNode);
  if (at < 0) return null;
  const next = direction === 'forward' ? RAIL_CHAIN[at + 1] : RAIL_CHAIN[at - 1];
  return next ?? null;
};
/** The rail end this settled state sits on, only when an airlock side exists there.
 * The prompt's road: it must show once the visitor STOPS at the door — a glide means
 * the camera is still moving and the chrome stays quiet. */
const railSettledBoundary = (): 'backward' | 'forward' | null => {
  if (railState.glide !== null) return null; // mid-flight is nowhere to prompt
  if (railState.u >= 1 - EDGE_SETTLE_EPS) {
    return boundaryNext('forward') === null ? null : 'forward';
  }
  if (railState.u <= EDGE_SETTLE_EPS) {
    return boundaryNext('backward') === null ? null : 'backward';
  }
  return null;
};
/** The rail end the wheel is pushing into, glide included: a scroll stream keeps a
 * glide alive indefinitely (every event re-creates it), so the wheel-through law reads
 * the CLAMPED scroll target, not the settled parameter — the pass must survive the stream. */
const railPushBoundary = (): 'backward' | 'forward' | null => {
  const g = railState.glide;
  const param = g !== null ? g.to : railState.u;
  if (param >= 1 - EDGE_SETTLE_EPS) {
    return boundaryNext('forward') === null ? null : 'forward';
  }
  if (param <= EDGE_SETTLE_EPS) {
    return boundaryNext('backward') === null ? null : 'backward';
  }
  return null;
};
const enterBoundary = (direction: 'forward' | 'backward'): void => {
  const next = boundaryNext(direction);
  wheelEdgeState = WHEEL_EDGE_START; // both roads clear the accumulator
  if (next === null || !railInputReady()) return;
  beginTransitTo(next);
};
edgePrompt.addEventListener('click', () => {
  // The push law, not the settled one: a click lands while the wheel's glide is still
  // finishing, and the prompt's intent is unambiguous — travel now (the transit owns
  // the camera; the arrival re-seeds the rail at the destination's entry stop).
  const boundary = railPushBoundary();
  hintTravel(); // a prompt click IS travel (§9: the one definition)
  if (boundary === null) return;
  enterBoundary(boundary);
});
```

**Slice 4 — the frame loop (committed lines ~1216–1420; every presentation law applies here):**

```ts
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

  // Interior lightmap techniques (§4.1–§4.4): the active room's baked states ride the
  // frozen §8 weights; the elevation comes from the frame's sun sample (y = sin of it).
  const blendRoomId = blendRoom();
  if (blendRoomId !== null) {
    applyWeights(blendRoomId, lightmapWeights(elevationDegOf(sample)));
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
      // The URL is the state (architecture.md): the room change lands in the hash at the
      // transit's completion — a human-entered transit (prompt/arrow/wheel) shares the
      // room from the address bar the moment it arrives. replaceState: no history spam
      // per transit; the browser's back walks the last WRITTEN URL (a deep link) and
      // the hashchange path transits home.
      writeRoomUrl(activeNode);
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

  // Camera rail (§6.1): advance the glide (a cut already settled) and apply the pose — the
  // rail owns position and gaze every frame; the inputs below mutate its state in listeners.
  railState = advance(rail, railState, deltaMs);
  applyRailPose();

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
        stop: rail.stops[nearestStopIndex(rail, railState.u)]?.id ?? '—',
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

  // Caption overlay (§6.1/§8.4): one pure presentation call per frame, DOM writes only on
  // change (the hud law). The dwell outranks: the dark card carries the destination's
  // seed-stop caption; the arrival title beat suppresses until settled.
  const captionNext = presentCaption(captionView, {
    stops: captionStops,
    stopIndex: nearestStopIndex(rail, railState.u),
    gliding: railState.glide !== null,
    dwell: dwellStop(),
    suppressed: arrival.phase !== 'settled',
  });
  const captionDiff = captionChanges(captionView, captionNext);
  if (captionDiff.text) caption.textContent = captionNext.text;
  if (captionDiff.visible) caption.dataset.visible = String(captionNext.visible);
  if (captionDiff.stopId) caption.dataset.stop = captionNext.stopId ?? '';
  if (captionDiff.announcement) captionLive.textContent = captionNext.announcement;
  captionView = captionNext;

  // The boundary prompt (DEC-031): one pure view per frame, the node written on change
  // (the caption law's harmless brother). The visibility belongs to the law; the text
  // rides the language setter.
  const edgeNext = edgePromptView({
    settled: arrival.phase === 'settled' && transit === null,
    boundary: railSettledBoundary(),
  });
  if (edgeNext.visible !== edgePromptShown) {
    edgePromptShown = edgeNext.visible;
    edgePrompt.dataset.visible = edgeNext.visible ? 'true' : 'false';
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
```

## 11. Output contract

Reply in English, ≤ 450 lines, no code. Exact numbers you NEED that this briefing
omits: emit `MASKED-IN-BRIEF: keep the <name> value` instead of guessing — the
orchestrator restores them against the committed tree. A file or fact you need that
the dossier omits: emit `NEED: <path or question>` — the orchestrator supplies it
in the continuation brief.

1. **Diagnosis** — for each owner observation (1–4), the mechanism chain in plain
   language, derived from these facts and the code; mark anything the dossier leaves
   underspecified as a question instead of filling it with assumption.
2. **The design direction per observation** — what each moment SHOULD read like,
   decisively (not option lists): the entry invitation, the door/approach view, the
   pause behavior (including your verdict on the declared-but-unshipped
   choreography and prefetch), the corridor's light story, the staircase arrival
   framing, and the movement mechanism. Name, per item, which recorded verdicts it
   touches (DEC ids as given in §6) and which need a new owner disposition.
3. **Dispositions** — explicit fork questions for the owner, each with your
   recommendation and a default-for-silence, in the project's Q&A record format.
4. **Felt-experience acceptance criteria** — per fix, checkable statements (what a
   visitor should see/feel; suitable as a reviewer script).
5. **CHALLENGES** — bullets: where your direction might fail (reference-device
   perf, budget gates, determinism/goldens, transport truncation of this reply,
   taste), and what the orchestrator should verify first.

Before answering, challenge key assumptions, consider a credible alternative, and
check likely failure cases; give the requested output with concise rationale and any
material uncertainties.
