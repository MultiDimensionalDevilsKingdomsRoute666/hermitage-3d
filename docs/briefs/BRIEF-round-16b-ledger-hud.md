# BRIEF round 16b — disposal ledger + HUD rows (specialist)

ROLE: You are the specialist of a relay. You have no tools, no repo access and no prior context;
the orchestrator integrates your reply into the repository and validates it.

Project: Zimny (github.com/vasyapym/hermitage-3d) — TypeScript strict, three.js 0.186.1, Vitest
node tests, Biome (single quotes, space indent, 100-col lines). Round 16a is integrated: a pure
room registry (`src/world/registry.ts`), an airlock transit FSM (`src/world/airlock.ts`), a
three-bound loader service (`src/assets/loaders.ts`), room scaffolds behind lazy thunks
(`rooms/<id>/`), and coordinator wiring in `src/main.ts`. 237 tests green; 235,960 gzip of the
350,000 cap. The Palace Square (`#/`) is a static resident; `/gallery` and `/jordan` are lazy
rooms reached through airlock transits (hold dwells until data is ready; dispose happens in
exit, never mid-transit).

TASK (round 16b, specialist half): write two complete files and two complete test files:

1. `src/engine/ledger.ts` — the pure disposal ledger (design §8.3 layer 1).
2. `src/ui/hud.ts` — EXTENDED in full (the current file is quoted below; you emit the whole
   extended file, keeping every existing export and behavior unchanged).
3. `tests/engine-ledger.test.ts`
4. `tests/hud-rows.test.ts`

Everything else — the `RoomLoadContext` interface gaining `ledger` in src/world/registry.ts,
rooms/<id> registering/releasing, main.ts wiring, the renderer.info.memory dev assertion, the
e2e smoke graph walk, ROUNDS/docs sync — is the ORCHESTRATOR's, done in the integration pass.
Do not write those, do not import main.ts or rooms/*; test only against fixtures you define.

DESIGN CONTRACT (docs/design-staircase.md; quotes lightly abridged):

§8.3 Disposal ledger (asserted): "Registers: geometries, materials, textures (compressed, with
VRAM bytes from format×mips), render targets — per scope: `RoomId | 'engine'`. Disposes:
`unmount` on airlock `onExit` — the room being left, after the hold, never mid-transit.
Assertion, three layers: (1) a pure ledger module (no three import) node-tested:
register/release/snapshot/bytesByScope; (2) dev assertion after every transit: the departing
scope is empty and renderer.info.memory returns to its post-boot baseline (±0
geometries/textures); (3) CI smoke walks #/ → gallery → jordan → gallery → #/ and asserts the
HUD metadata ledger rows equal the boot values with a clean console."

§8.4 / DEC-018: "the HUD exposes `data-hold-ms` so goldens and smoke can see it" (the declared
hold of the transit in progress; a hold >2 s on the device is a budget failure to fix, not to
hide). §9 gates: "the HUD `data-*` contract (extended with room, ledger and hold amounts)".

ROUND-16 ADJUDICATION (pinned; challenge if wrong): in round 16 the ledger registers PAYLOAD
bytes only — the glb ArrayBuffer and each ktx2 ArrayBuffer a room fetched, labelled by the
manifest row path — registered in the room's `load`, released in the room's `unmount`. Full
VRAM fidelity (format×mips) and render-target registers land with round 17's lightmaps, as
additive kinds. The renderer.info.memory counts are the dev-assertion layer (orchestrator),
not ledger rows.

REQUIRED SEMANTICS — src/engine/ledger.ts. Pure by the house standard: no three (not even
type-only imports), no DOM, no node imports, no clock, no storage, no timers, no randomness.
It imports only `type RoomId` from '../world/registry'. Pin these names and shapes:

- `export type LedgerScope = RoomId | 'engine'`
- `export type LedgerKind = 'glb' | 'ktx2' | 'texture' | 'material' | 'geometry' | 'renderTarget'`
- `export type LedgerRow = Readonly<{ scope: LedgerScope; kind: LedgerKind; bytes: number; label: string }>`
- `export type LedgerSnapshot = Readonly<{ rows: readonly LedgerRow[]; total: number }>`
- `export interface RoomLedger { register(scope, kind, bytes, label): void; release(scope): void; bytesByScope(scope): number; snapshot(): LedgerSnapshot }`
  (parameter types from the unions above)
- `export function createLedger(): RoomLedger` — a stateful closure; no module-level state.

Laws (state them in the header comment once, plain declarative style):
- `register` appends/overwrites one row per (scope, kind, label): registering the same triple
  again REPLACES the row (idempotent re-load, never a double count). Throws RangeError when
  bytes is non-finite or negative, or label is empty.
- `release(scope)` removes every row of that scope and is a NO-OP on an unknown/empty scope —
  rooms unmount idempotently, so a second release must not throw.
- `bytesByScope(scope)` sums the scope's rows; unknown scope → 0.
- `snapshot()` returns rows sorted deterministically (scope, then kind, then label — plain
  string comparison) and `total` = sum of all bytes; the snapshot is a fresh array (the caller
  cannot mutate the ledger through it).

REQUIRED SEMANTICS — src/ui/hud.ts. The current file (QUOTED IN FULL — extend it, change
nothing else):

```ts
/**
 * Debug HUD — pure core: `?hud=` parsing, the rolling frame-interval buffer and its
 * median, and the human lines / machine-readable data-* attributes of the overlay.
 *
 * architecture.md — runtime diagram ("DOM overlay: … · debug HUD") and delivery rules
 * ("strict CSP, no inline scripts · no third-party scripts; the debug HUD is
 * client-only"). Budget table rows this instruments: "Draw calls ≤ 250 — HUD +
 * Playwright assertion" and "Triangles ≤ 1.0 M — same". The round-11 assertions read
 * the buildHudAttrs() keys (data-tier, data-draws, data-tris, data-frame-ms), never
 * the prose lines.
 *
 * Host contract (main.ts, not this module): renderer.info.autoReset is false and
 * info.reset() runs once per frame, so calls/triangles are whole-frame aggregates
 * including the shadow pass (§11); the overlay is re-bound at most every 500 ms.
 * No DOM, no three.js, no clock, no storage here — node-testable by construction.
 */
export type HudIssue = 'invalid-hud';
export type HudState = Readonly<{
  tierLabel: string;
  frameDrawCalls: number;
  frameTriangles: number;
  medianFrameMs: number;
}>;
/** Length of the rolling frame-interval buffer (about half a second at 60 Hz). */
export const HUD_FRAME_WINDOW = 32 as const;
const PARAM = 'hud';
/**
 * Parse `?hud=` from the hash query (the same URLSearchParams that parseTime and the
 * tier module read). Mirrors the tier module's `q` handling: absent or empty → off, no
 * issues; '1' → on; '0' → off; any other value → off plus `invalid-hud`; duplicates →
 * last value wins plus `invalid-hud`. A single issue kind keeps the union honest: the
 * host only needs "the param was malformed", not which way. Deliberately not
 * persisted — the HUD is ephemeral by design and is re-enabled per URL.
 */
export function parseHudParam(
  params: URLSearchParams,
): Readonly<{ enabled: boolean; issues: readonly HudIssue[] }> {
  const values = params.getAll(PARAM);
  const issues: HudIssue[] = values.length > 1 ? ['invalid-hud'] : [];
  const last = values[values.length - 1];
  if (last === undefined || last === '') return { enabled: false, issues };
  if (last === '1') return { enabled: true, issues };
  if (last === '0') return { enabled: false, issues };
  if (issues.length === 0) issues.push('invalid-hud');
  return { enabled: false, issues };
}
/**
 * Append one frame interval and keep only the newest HUD_FRAME_WINDOW. Deltas that are
 * not a finite positive number are ignored (the first rAF tick after a tab restore
 * reports 0 — a baseline, not an interval); the input array is then returned as is.
 * The input is never mutated.
 */
export function pushFrameInterval(prev: readonly number[], deltaMs: number): readonly number[] {
  if (!Number.isFinite(deltaMs) || deltaMs <= 0) return prev;
  const next = [...prev, deltaMs];
  return next.length > HUD_FRAME_WINDOW ? next.slice(next.length - HUD_FRAME_WINDOW) : next;
}
/** Lower median of the buffer — no averaging of the middle pair, no rounding. Empty → 0. */
export function rollingMedianFrameMs(intervals: readonly number[]): number {
  if (intervals.length === 0) return 0;
  const sorted = [...intervals].sort((a, b) => a - b);
  return sorted[Math.floor((sorted.length - 1) / 2)] ?? 0;
}
function integerText(n: number): string {
  return String(Math.trunc(n));
}
/** Two decimals, same rule for the attribute and the prose line: 16.666 → '16.67'. */
function frameMsText(ms: number): string {
  return String(Math.round(ms * 100) / 100);
}
/** Integer digit grouping with plain spaces, like the /notes view: 132264 → '132 264'. */
function grouped(n: number): string {
  const digits = String(Math.trunc(Math.abs(n)));
  const body = digits.replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return n < 0 ? `-${body}` : body;
}
/**
 * Stable machine-readable attributes — the Playwright assertions query these. The keys
 * are the contract: data-tier, data-draws, data-tris, data-frame-ms. Numbers are plain
 * ungrouped integers; the median keeps two decimals.
 */
export function buildHudAttrs(state: HudState): Readonly<Record<string, string>> {
  return {
    'data-tier': state.tierLabel,
    'data-draws': integerText(state.frameDrawCalls),
    'data-tris': integerText(state.frameTriangles),
    'data-frame-ms': frameMsText(state.medianFrameMs),
  };
}
/**
 * Exactly three human lines: tier label, grouped draws/tris, fps + median ms. fps is
 * derived from the median and reads '—' while no interval has been measured — a frozen
 * or hidden frame must not fake a rate.
 */
export function buildHudLines(state: HudState): readonly string[] {
  const { medianFrameMs } = state;
  const fps = medianFrameMs > 0 ? String(Math.round(1000 / medianFrameMs)) : '—';
  return [
    state.tierLabel,
    `draws ${grouped(state.frameDrawCalls)} · tris ${grouped(state.frameTriangles)}`,
    `fps ${fps} · ${frameMsText(medianFrameMs)} ms`,
  ];
}
```

Your extension (the ONLY changes):
- `HudState` gains three fields: `room: string` (the active registry node id — 'square' or a
  RoomId; the host feeds it, hud stays free of world imports), `holdMs: number` (the EFFECTIVE
  declared hold of the transit in progress — a reduced-motion cut is 0; 0 when idle), and
  `ledgerBytes: number` (the ledger's total registered bytes).
- `buildHudAttrs` adds exactly: `'data-room': state.room` (string as-is), `'data-hold-ms': integerText(state.holdMs)`, `'data-ledger-bytes': integerText(state.ledgerBytes)`. The four
  existing keys and their formatting rules are UNCHANGED (the round-11 Playwright assertions
  read them; plain ungrouped integers — the smoke compares boot values for equality).
- `buildHudLines` keeps its three existing lines and appends a fourth:
  `room ${state.room} · hold ${integerText(state.holdMs)} ms · ledger ${grouped(state.ledgerBytes)} B`.
  Update the two doc comments that say "the keys are the contract" / "exactly three human
  lines" to describe the extended contract, citing §8.3/§8.4 and DEC-018.

TESTS (Vitest node style: describe/it/expect, no jsdom, no three import anywhere):

- tests/engine-ledger.test.ts — createLedger: rows accumulate across kinds and scopes;
  re-registering the same (scope, kind, label) replaces instead of accumulating; register
  throws on non-finite bytes, negative bytes, and empty label; release clears the scope and
  is a no-op twice; bytesByScope sums and returns 0 for an unknown scope; snapshot rows are
  sorted deterministically and total is their sum; the returned snapshot cannot mutate the
  ledger (mutating the rows array must not change bytesByScope). Fixture scopes: 'engine' and
  both RoomIds. Fixture numbers you invent freely. End with the purity regex scan of
  src/engine/ledger.ts (house pattern: strip block comments, line comments and string
  literals, then assert no /from\s+['"]three/, no node:, and no
  \b(document|window|localStorage|performance|Date|setTimeout)\b, no Math.random).
- tests/hud-rows.test.ts — buildHudAttrs: with a fixture HudState, the four legacy keys keep
  their exact legacy values/formatting; data-room passes the string through; data-hold-ms and
  data-ledger-bytes are plain ungrouped integers (no grouping, no decimals). buildHudLines:
  the three legacy lines are unchanged for the fixture; the fourth line contains the room id,
  the hold as a plain integer and the grouped ledger bytes. No purity scan needed here (the
  existing tests/hud.test.ts keeps gating hud.ts) — do NOT touch tests/hud.test.ts.

HOUSE STYLE (binds every file): leading block comment citing the design sections implemented;
named exports only, no default exports; no enums; `satisfies` over `as` where a literal object
is typed; `import type` for type-only imports; strict TS — noUncheckedIndexedAccess (index
access yields T | undefined — handle it), exactOptionalPropertyTypes (use `| null`, never
optional-undefined), noUnusedLocals/Parameters; biome single quotes, space indent, lines ≤ 100
chars; tests live in tests/ (never beside modules), Vitest node style; pure modules are
three-free and DOM-free (regex-scannable); state laws in comments once, plain declarative
style. The ledger is a closure over its own private state — that is the manifests.ts pattern
(module-private mutable map, pure by the purity gate), not a violation.

NUMBERS UNDER TRANSPORT: the relay may mask numeric literals you see in this brief. Never
guess a masked number: where your code must reproduce one, emit a line
`MASKED-IN-BRIEF: keep the <name> value` in place of the literal. (Nothing in these four files
needs a number from this brief; fixture numbers you invent may be stated freely.)

FORBIDDEN (round fence): any change to src/world/* (the orchestrator adds the
RoomLoadContext.ledger field in the integration pass), rooms/*, src/main.ts, src/assets/*,
src/engine/tier.ts semantics, src/sky/*, the URL-grammar keys at/cam/q/det, tests/hud.test.ts,
e2e specs.

OUTPUT CONTRACT — reply with exactly this structure, nothing else between blocks except one
rationale line per file:
1. fenced ts block: src/engine/ledger.ts
2. fenced ts block: src/ui/hud.ts (complete extended file)
3. fenced ts block: tests/engine-ledger.test.ts
4. fenced ts block: tests/hud-rows.test.ts
5. CHALLENGES — 2–6 bullets: assumptions challenged, one credible alternative considered,
   likely failure cases.
Keep the whole reply under ~450 lines; if you must cut, cut at a file boundary and end with
`TRUNCATED-HERE: <next file>`.

Before answering, challenge key assumptions, consider a credible alternative, and check
likely failure cases; give the requested output with concise rationale and any material
uncertainties.
