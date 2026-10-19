# Round 21 brief — the free-look response (slower, organic)

ROLE
You are the specialist of a relay. You have no tools, no repo access and no prior context; the
orchestrator integrates your reply into the repository and validates it.

TASK — the camera's free-look response. The owner's report: dragging with a mouse on desktop
or with a finger on mobile turns the view very fast — almost nauseating. It must feel slower
and organic. You deliver the look-response LAW as a new pure module + its tests, plus surgical
patch specs for the two committed files (the orchestrator applies them). The committed stop
data, the pose law and the look limits (design §6.1) are frozen.

CONTEXT — the committed interfaces (import; quote back only what the patches need):

1) src/camera/rail.ts — pure, three-free, ~286 lines. The look machinery as it stands:
     export const DRAG_DEG_PER_PX = 0.16;
     export type LookOffset = Readonly<{ yaw: number; pitch: number }>;
     export type LookLimits = Readonly<{ yaw: number; pitchUp: number; pitchDown: number }>;
     export type RailState = Readonly<{ u: number; glide: Glide | null; look: LookOffset }>;
     const clampLook = (look: LookOffset, lim: LookLimits): LookOffset => ({
       yaw: clamp(look.yaw, -lim.yaw, lim.yaw),
       pitch: clamp(look.pitch, -lim.pitchDown, lim.pitchUp),
     });
     const settle = (rail: Rail, s: RailState): RailState => ({
       ...s,
       look: clampLook(s.look, sampleLimits(rail, s.u)),
     });
     export function advance(rail: Rail, state: RailState, deltaMs: number): RailState {
       if (!Number.isFinite(deltaMs) || deltaMs < 0) {
         throw new RangeError(`deltaMs must be finite and non-negative, got ${deltaMs}`);
       }
       const g = state.glide;
       if (g === null) return state;
       const elapsedMs = g.elapsedMs + deltaMs;
       if (elapsedMs >= g.durationMs) return settle(rail, { u: g.to, glide: null, look: state.look });
       const u = lerp(g.from, g.to, smootherstep(elapsedMs / g.durationMs));
       return settle(rail, { u, glide: { ...g, elapsedMs }, look: state.look });
     }
     export function drag(rail: Rail, state: RailState, dxPx: number, dyPx: number): RailState {
       if (!Number.isFinite(dxPx) || !Number.isFinite(dyPx)) {
         throw new RangeError('drag deltas must be finite');
       }
       const yaw = state.look.yaw + dxPx * DRAG_DEG_PER_PX;
       const pitch = state.look.pitch + dyPx * DRAG_DEG_PER_PX;
       return { ...state, look: clampLook({ yaw, pitch }, sampleLimits(rail, state.u)) };
     }
   Other internals you may rely on: `sampleLimits(rail, u)` blends the bounding stops' limits
   linearly along the segment; `restingAt(u)` returns `{ u, glide: null, look: NO_LOOK }`;
   `glideTo`/`stepStop`/`scroll` keep `state.look` unchanged through glides; `seedState` builds
   via restingAt; `samplePose` reads `state.look` (clamped again inside) — its rendering law and
   `committedTarget` are frozen.

2) The host (src/main.ts — the ORCHESTRATOR wires it): pointerdown/pointermove/pointerup with
   setPointerCapture on the canvas; today the move handler runs
   `railState = drag(rail, railState, -event.movementX, event.movementY)` (grab-the-world: drag
   right looks left, drag down looks up — the sign law is frozen); the frame loop calls
   `advance(rail, railState, deltaMs)` every frame, then applies `samplePose(rail, railState)`.
   NOTE: `PointerEvent.movementX` is UNRELIABLE on touch (iOS Safari often reports 0). The host
   will switch to tracked clientX/clientY deltas — your law must not depend on movementX.

DESIGN DECISIONS (adjudicated; follow them):
- Split the look state into TARGET and CURRENT. `drag()` accumulates the clamped TARGET only;
  the rendered `look` (CURRENT) eases toward the target every frame. RailState gains the target
  field (suggest the name `lookTarget`); every constructor in rail.ts (restingAt, settle,
  glideTo, advance, seedState via restingAt) must carry it consistently.
- The damping folds into `advance()` — it already receives the frame delta and runs every
  frame; no new host call. Damping is frame-rate-independent exponential:
  `current += (target − current) × (1 − exp(−dtMs / TAU))`, TAU a declared tuning target
  (~100 ms ballpark; the owner tunes the feel on the device). During glides the damping
  continues (limits blend per frame through settle — re-clamp BOTH target and current there).
- At rest (no drag ever) target === current === 0 and the damped advance must leave the state
  bit-identical to today — the det golden scenes never drag, and their rendered poses must stay
  bit-identical (the goldens gate on it).
- Sensitivity: LOWER and viewport-normalized. Goal: a drag spanning roughly half the viewport
  height traverses a comfortable fraction of the look limit (about half), so mouse and touch
  feel the same RELATIVE across screen sizes; the exact span constant is a declared tuning
  target. Decide the clean signature — e.g. drag() taking the viewport height as an argument
  (the host has the canvas box) — and state it in the patch spec.
- Reduced motion: the damping STAYS (it shapes user-initiated direct manipulation downward; it
  never adds motion). Glides already cut under reduced motion — unchanged.
- The sign law (grab-the-world) is the host's concern and stays as is.
- Wheel/scroll travel, arrow steps, glide durations, captions, a11y, the HUD contract: all
  untouched.

HOUSE STYLE (binds every file): leading block comment citing the design sections implemented
(design-staircase.md §6.1 look offsets/limits + the r21 owner report; the r21 row of §10);
named exports only, no default exports; no enums; `satisfies` over `as` where a literal object
is typed; `import type` for type-only imports; strict TS — noUncheckedIndexedAccess (index
access yields T | undefined — handle it), exactOptionalPropertyTypes (use `| null`, never
optional-undefined), noUnusedLocals/Parameters; biome single quotes, space indent, lines
≤ 100; tests live in tests/ (never beside modules), Vitest node style describe/it/expect, no
jsdom; pure modules are three-free and DOM-free (regex-scannable); state laws in comments
once, plain declarative style.

NUMBERS UNDER TRANSPORT: numbers in your reply may be MASKED by the transport. Never guess a
masked value — emit `MASKED-IN-BRIEF: keep the <name> value` and the orchestrator restores it
against the committed tree (the values quoted above — DRAG_DEG_PER_PX, the limit shapes — can
always be restored from the tree). Your NEW constants are declared tuning targets and carry no
restoration risk.

FORBIDDEN (must not touch): the committed stop data, the committed pose law and look limits
(§6.1); glide durations; the wheel/scroll/arrow semantics; captions/a11y; the HUD contract;
the golden scenes; any file beyond the output contract (main.ts is the ORCHESTRATOR's, guided
by your patch spec).

OUTPUT CONTRACT (numbered fenced blocks, a one-line rationale above each; then CHALLENGES
bullets; the reply budget is ~450 lines — stay within it; if you must cut, cut at a file
boundary and end with `TRUNCATED-HERE: <next file>`):
1. src/camera/look.ts — the NEW pure module: the sensitivity law (viewport-normalized
   degrees-per-pixel, declared span constant), the damping law (frame-rate-independent,
   declared TAU), any helpers the patches need; every constant named and commented as a
   declared tuning target.
2. tests/look.test.ts — the law's gates: damping convergence with injected dt; frame-rate
   independence (one 100 ms step vs ten 10 ms steps settle to the same state within float
   tolerance — exponential damping has exactly that self-similarity, pin it); the sensitivity
   normalization (the same viewport FRACTION of drag yields the same degrees at any viewport
   size); the clamp interplay (an oversized drag clamps the target; the eased current never
   crosses the limits and converges to the clamped target; a limit shrink re-clamps both on
   settle); the at-rest bit-identity (advance at rest returns the state unchanged exactly);
   reduced-motion behavior (damping unchanged).
3. PATCH SPEC rail.ts — exact replace-this-with-that amendments: the RailState type (the new
   target field), drag() (accumulate the clamped target; the new sensitivity signature),
   advance() (the damped advance folding into the existing per-frame call, including the
   at-rest fast path), settle() (re-clamp both), restingAt() (both zero) — each with its
   before/after snippet and a one-line why.
4. PATCH SPEC main.ts — the drag handler switched to tracked clientX/clientY deltas (the
   pointerdown anchor, the move handler computing deltas, the sign law preserved, the viewport
   height passed through) — exact before/after snippets.

CHALLENGES: before answering, challenge key assumptions, consider a credible alternative, and
check likely failure cases; give the requested output with concise rationale and any material
uncertainties.
