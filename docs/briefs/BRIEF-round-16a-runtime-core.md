# Relay round 16a — runtime core (registry + airlock FSM + loaders)

Copy-paste brief for the specialist chat. Open while round 16a is not integrated; delete after.

---

ROLE: You are the specialist of a relay. You have no tools, no repo access and no prior context; the orchestrator integrates your reply into the repository and validates it. Project: Zimny (github.com/vasyapym/hermitage-3d) — a TypeScript strict / three.js 0.186.1 recreation of the Winter Palace, Vitest node tests, Biome (single quotes, space indent, 100-col lines). Repo state: 204 tests green, initial JS 165,175 gzip bytes of a 350,000 cap; a coordinator `src/main.ts` owns the DOM, renderer and frame loop; pure modules live under src/sky, src/engine, src/ui, src/procedural. There is NO src/world, NO src/assets, NO rooms/ yet — this round starts them. Phase 2 ("The Staircase") adds two lazy interior rooms streamed by "airlock" seams; the Palace Square (route `#/`) is today's shipped exterior.

TASK (round 16a, first half of round 16): write three complete files and two complete test files:

1. `src/world/registry.ts` — pure room-registry core (types + route parsing + graph helpers).
2. `src/world/airlock.ts` — pure airlock transit FSM.
3. `src/assets/loaders.ts` — three-bound loader service (GLTFLoader + MeshoptDecoder + KTX2Loader).
4. `tests/world-registry.test.ts`
5. `tests/world-airlock.test.ts`

Everything else — the registry LIST (rooms/index.ts), room module scaffolds (rooms/<id>/), manifest fetching glue, main.ts wiring, the disposal ledger, HUD rows, e2e smoke — is the ORCHESTRATOR's, delivered in the integration pass and in round 16b. Do not write those, do not import them; test only against fixtures you define in your test files.

DESIGN CONTRACT (docs/design-staircase.md, adopted; the owner accepted every default; quotes lightly abridged):

Registry graph (§1.1) — three nodes; route key = the hash path:
- `square` — kind "resident", route `/`: procedural exterior that exists today. NOT a room: no manifest, no disposal scope, never unloaded. When a room is active the coordinator hides the exterior group; that visibility flip is host wiring, not registry logic.
- `rastrelli-gallery` — lazy room, route `/gallery`.
- `jordan` — lazy room, route `/jordan`.
- Landing → ∅: phase-3 placeholder, NOT registered — no node, no route.

Edges (bidirectional): `square →[arch-portal]→ rastrelli-gallery →[gallery-airlock]→ jordan →[landing-airlock]→ ∅` (dead end). The graph is a linear chain in phase 2.

Room module (§8.1) — rooms implement this interface; the coordinator drives it. Orchestrator adjudication: `mount` is ASYNC because parse + GPU upload live inside the airlock hold (see loaders below):
```ts
interface RoomModule {
  contract: RoomContract;
  load(ctx: RoomLoadContext, manifest: RoomManifest, signal: AbortSignal): Promise<void>;
  mount(ctx: RoomLoadContext): Promise<void>;
  unmount(ctx: RoomLoadContext): void;
}
```

Airlock (§2.4, DEC-014) — a neighbor-edge seam, not a room: owns no assets, has no route key, is never a camera destination. Its hooks are the ONLY legal lifecycle points: `onApproach` → prefetch; `onHold` → GPU upload + swap (environment/exposure/post/near-far may change only here); `onExit` → dispose of the room being left — after the hold, never mid-transit (§8.3). Disposal of the departing room happens exactly once per completed transit, in exit.

Streaming laws (§8.2/§8.4): fetch + worker decode run off the render path; GLTFLoader.parse and GPU upload run only inside an airlock hold; nothing allocates GPU memory in the frame loop. Every fetch is triggered ahead of need; if a hold begins before data is ready, the transit dwells on a dark card (a beat, never a spinner); the hold's real duration is therefore elapsed-at-exit ≥ declared holdMs.

URL (frozen grammar — you must not change any existing key semantics): the hash is `#<route>?<query>`; keys `at/cam/q/det/hud` belong to existing parsers that already leave the route untouched. Your code reads ONLY the route path (before the first '?'). A deep link `#/jordan?at=…` cold-loads jordan directly with NO previously mounted node (from = null).

REQUIRED SEMANTICS — src/world/registry.ts. Pure by the house standard: no three.js (not even type-only imports — a regex purity gate scans the source), no DOM, no node imports, no clock, no storage, no timers, no randomness. Pin these type names (shapes are fixed; internal details may be refined only where noted):

- `type RoomId = 'rastrelli-gallery' | 'jordan'`
- `type NodeHandle = RoomId | 'square'`
- `type AirlockId = 'arch-portal' | 'gallery-airlock' | 'landing-airlock'`
- `type RouteKey = '/gallery' | '/jordan'`
- `type Vec3 = readonly [number, number, number]`
- `type Bounds = Readonly<{ min: Vec3; max: Vec3 }>`
- `type StateId = 'day' | 'dusk' | 'nightChandeliers'`
- `type Stop = Readonly<{ id: string; position: Vec3; look: Readonly<{ yaw: number; pitchUp: number; pitchDown: number }>; caption: string }>` — degrees; yaw is ±limit, pitch up/down separate.
- `type Rail = Readonly<{ stops: readonly Stop[] }>` — spline/helper data lands in round 18 as additive fields only.
- `type AirlockTransit = 'doorway' | 'cut'`
- `type AirlockDef = Readonly<{ id: AirlockId; from: NodeHandle; to: NodeHandle | null; portalFrom: Bounds; portalTo: Bounds | null; transit: AirlockTransit; holdMs: number }>` — `to: null` is the landing dead end; `portalTo` must then be null too.
- `type RoomNeighbor = Readonly<{ to: NodeHandle | null; airlock: AirlockId }>`
- `type RoomBudget = Readonly<{ trianglesMax: number; drawsMax: number; textureBytesMax: number; payloadBytesMax: number }>`
- `type RoomLighting = Readonly<{ states: readonly StateId[]; blend: 'lightmapBlend' | 'preBlendRT' }>`
- `type RoomFileRow = Readonly<{ path: string; bytes: number; sha256: string; kind: 'glb' | 'ktx2' }>`
- `type RoomManifest = Readonly<{ id: string; files: readonly RoomFileRow[]; lightmaps: Readonly<{ states: readonly string[]; res: number | null; intensity: number | null }>; budget: RoomBudget; toolchain: Readonly<Record<string, string>> }>` — the geometry row is toolchain-side; runtime never needs it.
- `type RoomContract = Readonly<{ id: RoomId; title: string; bounds: Bounds; rail: Rail; lighting: RoomLighting; neighbors: readonly RoomNeighbor[]; budget: RoomBudget }>`
- `type RegistryEntry = | Readonly<{ kind: 'resident'; id: 'square'; route: '/'; neighbors: readonly RoomNeighbor[] }> | Readonly<{ kind: 'room'; id: RoomId; route: RouteKey; thunk: () => Promise<RoomModule> }>`
- `type RoomPayload = Readonly<{ glb: ArrayBuffer; ktx2: ReadonlyMap<string, ArrayBuffer> }>` — ktx2 keyed by the manifest row path (`tex/gilt.ktx2` form).
- `type RoomObject = unknown` — opaque parsed root; the coordinator casts to its scene type.
- `interface RoomAssetService { fetchRoom(manifest: RoomManifest, signal: AbortSignal): Promise<RoomPayload>; mountParsed(roomId: RoomId, payload: RoomPayload): Promise<RoomObject>; disposeParsed(object: RoomObject): void }` — declared here, implemented by src/assets/loaders.ts. `mountParsed` is hold-only.
- `interface RoomScene { add(object: RoomObject): void; remove(object: RoomObject): void }` — host adapter over its scene.
- `interface RoomLoadContext { readonly assets: RoomAssetService; readonly scene: RoomScene }`
- `interface RoomModule` as quoted above.
- Issue unions: `type RouteIssue = 'unknown-route'` (extend only if you find a second honest kind); `type RegistryIssue` — one kind per fence rule you enforce.

Functions:
- `routeKeyOf(fragment: string): Readonly<{ route: string; issues: readonly RouteIssue[] }>` — strip one leading '#', cut at the first '?', empty/'/' → '/'. (The complement of the existing `queryOf` — same stripping rule.)
- `resolveRoute(list: readonly RegistryEntry[], fragment: string): Readonly<{ node: NodeHandle; route: string; issues: readonly RouteIssue[] }>` — unknown route falls back to the square resident plus `unknown-route` (logging is the host's job).
- `validateRegistry(list: readonly RegistryEntry[], airlocks: readonly AirlockDef[]): readonly RegistryIssue[]` — fence: unique routes; unique ids; exactly one resident `square` with route '/'; every lazy entry's thunk is a function; every neighbor's airlock resolves and is bidirectional (the def's from/to match the edge); every def's from/to resolve to entries; `to: null ⇒ portalTo: null`; every lazy room has at least one stop; all look limits finite ≥ 0; holdMs finite > 0.
- `nextAirlockOnPath(list, airlocks, from: NodeHandle, to: NodeHandle): AirlockDef | null` — the FIRST edge on the path from→to (one step); null when from === to. With a validated chain list this is total; the coordinator loops transits until it arrives.

REQUIRED SEMANTICS — src/world/airlock.ts (same purity standard):

- `type TransitState = | Readonly<{ phase: 'idle' }> | Readonly<{ phase: 'hold'; airlockId: AirlockId; from: NodeHandle | null; to: NodeHandle | null; transit: AirlockTransit; holdMs: number; elapsedMs: number; dataReady: boolean; uploaded: boolean }> | Readonly<{ phase: 'exit'; …same fields minus dataReady/uploaded churn… }>`
- `type TransitEvent = 'upload-swap' | 'dispose-from'`
- `beginTransit(input: Readonly<{ airlock: AirlockDef; from: NodeHandle | null; reducedMotion: boolean }>): TransitState` — phase 'hold'; effective transit: reducedMotion forces 'cut'; effective holdMs = transit === 'cut' ? 0 : airlock.holdMs; elapsedMs 0; dataReady false; uploaded false. `from: null` = cold entry (deep link; nothing mounted to dispose).
- `advanceTransit(state, deltaMs, dataReady)` → `Readonly<{ state: TransitState; events: readonly TransitEvent[] }>` — only 'hold' advances: elapsedMs += deltaMs (throw on non-finite or negative delta). First dataReady true ⇒ event 'upload-swap' (exactly once per transit). When elapsedMs ≥ holdMs AND dataReady ⇒ phase 'exit' plus event 'dispose-from' — emitted ONLY when from !== null; both events may arrive in one call. 'exit' is terminal-in-place: advancing it returns the state unchanged, events empty, elapsed frozen.
- `finishTransit(state): TransitState` — 'exit' → 'idle'; 'idle' → 'idle'; 'hold' → throw (a hold is never torn down silently).
- Round-16 note (pinned adjudication, challenge if wrong): the design's separate `onApproach` phase collapses into the hold's begin this round — fetch starts at beginTransit; rail-driven approach arrives with round 18 and must not change this contract, because the dataReady gate already makes early or late fetch arrival safe.

Tests (name the files exactly; Vitest node style: describe/it/expect, no jsdom, no three import anywhere in these two test files):
- tests/world-registry.test.ts — routeKeyOf: '#/gallery?at=x' → '/gallery'; '#/' → '/'; '' → '/'; '#/jordan' → '/jordan'; query never leaks into the route. resolveRoute: known routes map to their nodes; unknown ('#/foo') → square + 'unknown-route'. validateRegistry: a well-formed chain fixture (square + two rooms + three airlocks incl. the landing dead end) yields zero issues; each broken mutation yields its issue (duplicate route, missing airlock, unidirectional edge mismatch, lazy room without stops, to:null with portalTo non-null). nextAirlockOnPath: square→jordan steps via arch-portal then (after the loop) gallery-airlock — assert the FIRST step plus null for from===to; reversed direction likewise. Purity regex scan of the module source (copy the house pattern: strip comments and string literals, then assert no /from\s+['"]three/, no node:, no document/window/localStorage/performance/Date/setTimeout/Math.random).
- tests/world-airlock.test.ts — begin → hold with the def's holdMs; reducedMotion ⇒ transit 'cut', holdMs 0. Advance with dataReady false: stays hold, elapsed accrues, no events. Non-finite or negative delta throws. First dataReady true: exactly ['upload-swap']; a second dataReady-true advance emits nothing. elapsed ≥ holdMs && dataReady ⇒ exit + ['dispose-from'] when from !== null; from === null ⇒ exit with NO dispose-from. Dwell: while !dataReady elapsed keeps accruing even past holdMs (the beat is measured by elapsed at exit > holdMs). finishTransit: exit → idle; finish on hold throws. Purity regex scan as above.

REQUIRED SEMANTICS — src/assets/loaders.ts (three-bound; NOT node-tested — the round-16b CI smoke exercises it; keep it thin and mechanical):

- `createLoaders(renderer: WebGLRenderer): Loaders` — one GLTFLoader with setMeshoptDecoder(MeshoptDecoder with useWorkers(1)), one KTX2Loader with setTranscoderPath('/basis/') + setWorkerLimit(1) + detectSupport(renderer) once. Returns an object implementing RoomAssetService (`fetchRoom`, `mountParsed`, `disposeParsed`) plus `dispose()` for app teardown.
- `fetchRoom` — fetch each manifest row in parallel (glb and ktx2 as ArrayBuffers keyed by the row path) honoring the signal; no renderer contact, no GPU work.
- `mountParsed` — the hold-only path: a per-call THREE.LoadingManager whose setURLModifier resolves the glb's external texture URIs ('/assets/<room>/tex/…' and relative 'tex/…' forms) against the prefetched ktx2 map via URL.createObjectURL; parse the glb bytes (GLTFLoader.parse(data, path, onLoad, onError) is callback-style in 0.186.1 — wrap in a promise); after parse, force GPU upload of every texture found in the parsed materials (renderer.initTexture), then return the parsed scene root as RoomObject. Blob URLs are revoked by disposeParsed/unmount, never per frame.
- `disposeParsed` — traverse the root; dispose every geometry, material (material arrays included) and texture.
- Verified API facts (three 0.186.1, do not re-derive): the three import paths are 'three/examples/jsm/loaders/GLTFLoader.js', 'three/examples/jsm/loaders/KTX2Loader.js', 'three/examples/jsm/libs/meshopt_decoder.module.js' (exports MeshoptDecoder with useWorkers); KTX2Loader has setTranscoderPath/setWorkerLimit/detectSupport(renderer)/parse(buffer, onLoad, onError); GLTFLoader has setMeshoptDecoder and parse(data, path, onLoad, onError) with an external-URI resource path. If you find any of these wrong in @types/three 0.186.0 as you remember it, flag it in CHALLENGES rather than deviating silently.

HOUSE STYLE (binds every file): leading block comment citing the design sections implemented; named exports only, no default exports; no enums; `satisfies` over `as` where a literal object is typed; `import type` for type-only imports; strict TS — noUncheckedIndexedAccess (index access yields T | undefined — handle it), exactOptionalPropertyTypes (use `| null`, never optional-undefined, for the nullability above), noUnusedLocals/Parameters; biome single quotes, space indent, lines ≤ 100 chars; state laws in comments once, in the repo's plain declarative style.

NUMBERS UNDER TRANSPORT: the relay may mask numeric literals you see in this brief. Never guess a masked number: where your code must reproduce one, emit a line `MASKED-IN-BRIEF: keep the <name> value` in place of the literal — the orchestrator restores it against the committed tree. (Your three files should contain no room-specific numbers at all; fixture numbers you invent for your own tests may be stated freely.)

FORBIDDEN (round fence): src/sky/lightmap-weights.ts (frozen §8 weights); URL-grammar semantics of at/cam/q/det (you read only the route path); src/engine/tier.ts (tier registry semantics); rooms/*, src/main.ts, disposal ledger, HUD, e2e (orchestrator's or round 16b).

OUTPUT CONTRACT — reply with exactly this structure, nothing else between blocks except one rationale line per file:
1. fenced ts block: src/world/registry.ts
2. fenced ts block: src/world/airlock.ts
3. fenced ts block: src/assets/loaders.ts
4. fenced ts block: tests/world-registry.test.ts
5. fenced ts block: tests/world-airlock.test.ts
6. CHALLENGES — 2–6 bullets: assumptions challenged, one credible alternative considered, likely failure cases.
Keep the whole reply under ~450 lines; if you must cut, cut at a file boundary and end with `TRUNCATED-HERE: <next file>` — the orchestrator sends a continuation brief carrying your adopted constants.

Before answering, challenge key assumptions, consider a credible alternative, and check likely failure cases; give the requested output with concise rationale and any material uncertainties.
