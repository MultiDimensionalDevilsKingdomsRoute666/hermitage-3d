# Mobile tier + touch rail — the R17 design (PROPOSED FOR RATIFICATION)

Round R17 · designed 2026-10-29 against commit `d050c18`; integrated 2026-10-30 · CREATIVE relay ×1.
Status: design only — no implementation, no ratification yet. The owner ratifies §16; then the
round map in §15 executes. §0.1 records every fact the integration corrected (the design's
claims vs the verified tree) — the numbered sections below carry the corrected text.

## §0.1 Integration corrections (fact-check record)

1. THE HINT COPY — the design's premise (inherited from the relay brief) was stale. The
   CURRENT dictionary (`src/i18n/ru.ts:28`, `en.ts:23`) already reads
   `chrome.travelHint: 'Прокрутите, чтобы идти · потяните, чтобы осмотреться'` /
   `'Scroll to walk · drag to look around'` — the verbs are truthful TODAY. The r23-freeze
   sentence the brief quoted («Потяните, чтобы подойти ближе»/"Drag to move closer") was
   retuned by later rounds (the R-UX2/D1 door-label work). The design's §6
   «corrects an inaccurate verb» is therefore MOOT: the decision reduces to an owner taste
   call — keep the current copy, or adopt the design's tweak («Прокрутите, чтобы двигаться.
   Потяните, чтобы осмотреться.» / "Scroll to move. Drag to look around."). The §13
   baseline estimate drops the «hint copy» clause if the owner keeps it.
2. THE NIGHT/DAY DEVICE EPOCHS (§10): the design proposed winter day `2026-01-15T09:00:00Z`
   (12:00 Petersburg). The committed README anchor is `at=2026-01-15T10:00:00Z` (the
   solar-noon convention — the R10 integration corrected 09:30Z → 10:00Z); the device
   matrix adopts 10:00Z. Winter night `18:00Z` (21:00 local) stands; summer epoch
   `2026-06-21T12:00:00Z` (15:00 local — the fixtures' «noon» label is a UTC-hour
   mislabel, recorded as-is) stands.
3. RASTRELLI HEADROOM (§11): today's budget measurement reads usage **238,950 B of
   2,000,000** (the payload drifted from architecture.md's r19-era 228,982 through the
   R-UX4 re-encodes) → headroom **1,761,050 B**, not 1,771,018, and not «239 KB free» —
   the brief's «239 KB» was the parking lot's usage figure mis-typed as headroom. Both
   the brief and the design's arithmetic corrected to the fresh number.
4. THE BASIS CAP (§11, resolved at integration as the design requested): `budget.mjs`
   imports `collectPayloadRows()` from `common.mjs` → the ENFORCED cap is
   `BASIS_CAP = 600_000 B` (`common.mjs:19`; today's run: `584,862 B of 600,000 B ok`).
   The `budget.mjs:51` header comment «(500 000 B)» is STALE; corrected in this commit
   (a comment-only edit, no behavior). No waiver needed anywhere.
5. THE CHROME-FACE LINE (§2): the design preserves «solo top-right «Залы», bottom-right
   language toggle» — composed against `d050c18`. The owner's R16.2 verdict (2026-10-29
   evening, validated in the working tree, golden gates pending mains — the toggle reads
   top-right again, «Залы» takes the corner stack's base) already reversed that. §2 reads
   against R16.2. The design's §13 baseline math is unchanged by it (the same ten DOM
   baselines move).
6. ARROWS/INPUT FACTS (§5, verified for the record): the existing document keydown handler
   has NO `event.repeat` gate (a held arrow repeats steps) and no pointerdown
   primary-button check (any button starts a look-drag); pointermove carries NO
   per-move `railInputReady()` recheck (a transit beginning mid-drag keeps feeding
   `drag()`). The design's §5 guards are NEW for the buttons and partially NEW for the
   canvas (the second-contact cancellation law); they do not claim otherwise. The button
   gate «no glide» is STRICTER than the arrows' existing mid-glide retarget law — arrived
   at deliberately (one tap, one command) and left as a named difference (see §5 note).
7. NEW-KEY NAMING (§6): the repo's dictionary namespace law is `chrome.*` / `notes.*` /
   content keys — the design's proposed prefixes (`touchRail.*`, `travelHint.touch`,
   `scene.*`) are renamed to `chrome.touchRailLabel`, `chrome.touchRailBack`,
   `chrome.touchRailForward`, `chrome.travelHintTouch`, `chrome.sceneUnsupported`,
   `chrome.sceneInterrupted`, `chrome.sceneReload`. RU-first + EN pairs + NBSP law
   unchanged; the literals fence applies as always.
8. TODAY'S FRESH NUMBERS (the §11/§15 references): JS gzip **274,707** of 350,000 (+1 vs
   the R16.1 gate's 274,706 — a build-artifact byte; re-verified at each gate), the RU
   chunk **6,962**, chromium cases **40** (yesterday's gates), golden **33**.

## §1 Decision and meaning of «works on a phone»

Ship a visible, two-button touch rail; retain one-finger dragging exclusively for looking.
Use T0 as the conservative automatic choice when a coarse pointer is available, or reported
memory is below 4 GiB. Do not expose those boots to the T2 probe first. This is a
capability-based safety policy, not a claim that touch implies a slow GPU. «Works» means
native-phone access to all 18 stops, both directions through all three room connections,
working look/time/season/language/index controls, and usable recovery states. «Floor met»
additionally requires the physical-device evidence in §§9–10. Neither a small viewport, a
T0 HUD label, an owner's appearance verdict, nor SwiftShader establishes it. Certification
names devices and conditions; it does not promise every phone or power mode.

## §2 Preserved contracts

- All URL keys and lifecycle laws survive: `at`, `q`, `lang`, `hud`, `cam`, `stop`, `det`.
  No new keys.
- Existing explicit-quality persistence survives. Automatic choices are not persisted.
- Unoverridden deterministic boots settle T1 without probing or consulting timing.
- Keep every `TIERS` numeric value, `BENCHMARK` threshold and pinned §11 assertion
  unchanged.
- Keep `antialias: true` at every tier. ADR-0015 supersedes stale «no MSAA» comments.
- No new geometry, LOD, material, shader slot, post-processing or asset variant.
- One TimeState remains authoritative. Input adds no independent season or clock state.
- Keep the corner stack, transparent reserved slots, opacity-only fades and the retired
  caption; the R16.2 chrome face is the current law (the language toggle top-right in
  `#controls`; «Залы» on the corner stack's base) and the clock-row season voice (§0.1-5).
- Keep the ink-and-underline focus law, including its forced-colors exception.
- No backend, telemetry, new persistence, WebGPU switch or runtime dependency.

## §3 Automatic tier policy — amendment R17-A

The host samples capabilities before presenting the first frame. Resolution order remains:

1. Explicit valid `q` override: apply and persist through the existing law.
2. Valid persisted override: apply it, including on phones.
3. Deterministic boot without either override: T1, probe skipped.
4. Otherwise apply the new automatic policy below.

Constants defined here:
`MOBILE_AUTO_TIER = 't0'; AUTO_LOW_MEMORY_GIB = 4; MOBILE_COARSE_QUERY = '(any-pointer: coarse)'`.
The memory boundary remains strictly below 4. A coarse-pointer match OR the existing
low-memory fact settles T0 without starting a probe. Otherwise run the existing T2-surface
probe and classifier unchanged. Missing memory stays `null`, not zero. Screen width, UA
strings and CPU-core count do not select a render tier. This deliberately includes touch
laptops and tablets. A user's `q` override still wins. Capability changes, rotation and
browser-bar resizing never initiate another probe or change a settled tier. Existing
redirect-style `q` handling and `q=auto` clearing/no-reprobe semantics remain verbatim; this
proposal does not rewrite boot persistence semantics.

On common phone dimensions, T0 and T1 already have identical DPR-1 buffers and 1 K shadows
(verified: at ≤ ~0.79 M css px both tiers clamp to dpr 1 before the buffer cap binds). The
immediate saving is avoiding T2 surfaces/shadows, especially during boot — not a new LOD. A
sky-only rAF median is not a measurement of room GPU cost. Calibration remains parked. Add
HUD-only selection-source/probe-count diagnostics; never invent a median for a skipped
probe.

## §4 Touch rail surface — amendment R17-B

Add one separate navigation group, `#touch-rail`, with native Back and Forward buttons. Show
it when any coarse pointer is available OR viewport width is at most 767.98 CSS px.
Visibility is independent of quality; a narrow mouse window gets controls, not forced T0.
When absent, the group is absent from layout, focus order and the accessibility tree. Place
its horizontal pair on the left, centered in the free vertical band between the
wordmark/clock/scrub block and the notes link. It is not a corner-stack member or clock row.

Constants defined here, in CSS px:
`TOUCH_BUTTON_MIN_INLINE_PX = 72; TOUCH_BUTTON_MIN_BLOCK_PX = 44; TOUCH_RAIL_GAP_PX = 8;
TOUCH_RAIL_INSET_PX = 24; TOUCH_RAIL_CLEARANCE_PX = 16; TOUCH_RAIL_MAX_WIDTH_PX = 767.98`.
Use the larger of the left inset and the applicable safe-area inset. Maintain clearance from
both existing blocks; measure layout only on layout changes, not in the render loop.
Insufficient space is a failed layout gate, not permission to hide essential navigation. Use
the existing chrome typeface, size and focus treatment: visible words, no boxes, background
panel, progress text or revived caption. Reserve the group's geometry while busy. These new
44-px targets do not resolve or retune the parked global 24-px accessibility item. Do not
move existing chrome or add `viewport-fit=cover` to accommodate this addition.

## §5 Travel and pointer laws

Each accepted button activation invokes the existing `stepStop` direction and
arrow/door boundary resolution. There is one route graph, not a second mobile graph. At a
boundary, the next deliberate activation enters the adjoining room through its existing
airlock. The square's outer end and the 1812 terminal (M4) end remain inert in their outward
directions (the committed RAIL_CHAIN law). Admission requires settled arrival, no transit,
no glide, no active canvas gesture and no menu owning input. Drop rejected activations;
never queue them across arrival or airlocks (the app's deliberate input-dropping policy —
the r7 CI record). Use `aria-disabled` with guarded handlers so focus survives temporary
unavailability. One native click is one command: no pointerup-plus-click double dispatch,
hold-repeat or swipe momentum. Suppress repeat-key activation on these buttons; keep native
Enter/Space. Reduced motion uses the existing immediate step law; two distinct taps remain
two intents.

NOTE (the integration's named difference, §0.1-6): the existing arrows admit input
mid-glide (the wheel retargets an open glide; `stepStop` steps FROM a glide's target); the
button gate above is stricter. If the owner prefers one admission law everywhere, the
design accepts that amendment without changes elsewhere.

Canvas drag remains look-only. Preserve 30°, touch ×1.15 and τ=100 ms; preserve mouse/pen
sensitivity, 1,400-ms steps, 320-ms scroll glides and the 1,200-px wheel segment budget.
Wheel-edge's 650/120/420 thresholds and existing keyboard travel are not retuned. Track
client coordinates, never `movementX/Y` (the r21 lesson). Admit one primary contact; mouse
starts require its primary button (new: today's pointerdown checks none — §0.1-6). A second
touch cancels looking and cannot replace the anchor; re-arm only after the touch sequence
ends. Recheck readiness on every move (new for the canvas — §0.1-6). Cancel/release
idempotently on pointercancel, lost capture, blur, hidden document, resize and transit
start. No cancelled contact, stale delta or resumed tab may generate travel.

## §6 Discovery, copy and hint contract — amendment R17-C

The persistent Back/Forward pair is phone onboarding; there is no new instructional overlay.
Keep the hint hidden through 767.98 px. Keep its eligibility, absorbing dismissal, timers
(6,000/1,200/240 ms), reduced-motion cuts and det exclusion unchanged. New button intents
call `hintTravel` before admission, as existing dropped intents do. Looking still dismisses
it: the existing dismissal contract is broader than literal travel.
THE CORPUS FACT (§0.1-1): the current fine-pointer hint already reads
`chrome.travelHint: 'Прокрутите, чтобы идти · потяните, чтобы осмотреться'` /
`'Scroll to walk · drag to look around'` — truthful today. The OWNER CALL is keep vs adopt
the design's tweak below; the baseline estimate in §13 drops the «hint copy» clause if
kept. Proposed (optional) fine-pointer tweak: RU «Прокрутите, чтобы двигаться. Потяните,
чтобы осмотреться.» / EN "Scroll to move. Drag to look around." At wider coarse-pointer
layouts use `chrome.travelHintTouch`.

Proposed new dictionary pairs (repo namespaces per §0.1-7; RU-first, NBSP law):

| Key | RU | EN |
| --- | --- | --- |
| chrome.touchRailLabel | Движение по маршруту | Tour navigation |
| chrome.touchRailBack | Назад | Back |
| chrome.touchRailForward | Вперёд | Forward |
| chrome.travelHintTouch | Нажмите «Назад» или «Вперёд», чтобы двигаться. | Tap Back or Forward to move. |
| chrome.sceneUnsupported | Для просмотра нужен браузер с поддержкой WebGL2. | This tour requires a browser with WebGL2 support. |
| chrome.sceneInterrupted | Сцена недоступна. Перезагрузите страницу. | The scene is unavailable. Reload the page. |
| chrome.sceneReload | Перезагрузить | Reload |

Reuse equivalent existing keys where present. Keep `#caption-live` as the stop announcement,
not a second live region announcing every animation frame. Native button names contain
their visible text.

## §7 Browser ownership and lifecycle

R17-C also changes canvas `touch-action` from `none` to `pinch-zoom`: one-finger panning
remains app-owned; browser pinch zoom remains browser-owned. No application
pinch-to-travel handler. Keep the viewport meta unrestricted. Real Safari verification is
mandatory for this change. Modal/listbox input and scrub gestures must not leak into rail
handlers or canvas capture. Rotation reapplies the existing viewport/scale law, without
reclassification. Browser zoom must not multiply renderer scale by `visualViewport.scale`.
Check browser-bar changes and safe areas natively; no silent chrome relocation or
resolution-law amendment is authorized. An accepted glide may finish under existing resume
timing; a suspended gesture cannot add one. On unavailable WebGL2 show the localized
unsupported state (no such screen exists today — new UI, §0.1-7 keys). On context loss
cancel input, announce interruption once and offer Reload of the existing URL. Do not
invent `stop=` writes or promise position restoration beyond existing URL semantics.
In-place recovery is not part of this design. An unrequested context loss during a device
gate fails that gate.

## §8 Alternatives considered

Fixed rubric: discoverability; preservation of existing laws; machinery cost; evidence
burden.

| Alternative | Discovery | Preservation | Machinery | Evidence |
| --- | --- | --- | --- | --- |
| Native step buttons, chosen | Persistent, named | Keeps drag-look | Small adapter | Existing rail + native taps |
| Vertical swipe travel | Hidden without teaching | Steals vertical look | Axis lock, thresholds, cancellation | New motor tuning |
| Two-finger travel | Poor reach/discovery | Conflicts with browser pinch | Multi-contact recognizer | Native accessibility risk |
| Door button alone | Discoverable only at ends | Unchanged | None | Cannot reach interior stops |
| Retain phone sky probe | No UI change | Existing boot | None | No room-load predictive evidence |
| Conservative auto T0, chosen | No extra UI | Preserves tier numbers | Boot branch | Still requires real devices |
| Adaptive in-tour quality | Invisible | Breaks settle-once law | Hysteresis, reallocations | Thermal/motion tuning |

Buttons trade continuous touch travel for reliable, discoverable coverage of the existing
stop-based tour. This is an explicit product choice, not a claim that swipe travel shipped.

## §9 Mobile floor and Phase-4 exit — amendment R17-D

Define `MOBILE_FRAME_WINDOW_MS = 60,000; MOBILE_FRAME_P95_MS = 33.0; MOBILE_FRAME_P99_MS =
50.0; MOBILE_LONG_TASK_MS = 50.0; MOBILE_CAPTURE_REPEATS = 3`. Use nearest-rank percentiles
of foreground rAF intervals, separately per scenario/window. Every required window must
pass; aggregate medians cannot conceal a slow room or transit. Report p50/p95/p99/max,
sample count and count above 33 ms. rAF cadence is not GPU time. A sustained 33.33-ms
cadence fails the literal 33.0 threshold; do not round it into a pass. The existing
«never break» sentence specifies no statistic. This proposal interprets the floor as
worst-window p95, with a p99 guard — not an every-frame guarantee. If «never» means
maximum, this is a relaxation requiring explicit ratification. Until then report data only.
Post-load CPU tasks over 50 ms must be zero; initial exterior settlement ends the load
exemption. Subsequent room fetch/decode/compile/transit work receives no new exemption.
Absent Long Tasks API support means unknown; obtain a native trace, never report zero.
Keep peak draws ≤250 and texture ledger ≤256 MB; apply the existing 1.0-M triangle ceiling
to T0 too. Ledger accounting must reflect actual device transcode formats. Record MSAA
samples and drawing-buffer dimensions separately; compressed payload is not GPU allocation.
Propose `MOBILE_FIRST_EXTERIOR_MS = 3,000` at 10 Mbps and 100-ms RTT, extending — not
relaxing — the reference's first-exterior target to mobile. Measure an exterior frame, not
DOM title paint. Phase-4 exit is conjunctive: mobile certificate + all existing
budgets/gates + Lighthouse accessibility ≥95 on each of four routes in RU and EN +
keyboard-only 18-stop tour + honoured reduced motion. The a11y round supplies its audits
and open-control/focus/SR checks. Revalidate affected physical-device scenarios after the
Neva facade lands; mobile's first pass cannot certify the eventual Phase-4 tree. WebGPU
evaluation is not a substitute.

## §10 Native-device certificate — amendment R17-E

Required: one named low-end Android phone and the owner's identified iPhone/Safari, plus
unchanged reference-Mac regression gates. Proposed Android sentinel: Galaxy A13 4G
SM-A135F, 4-GiB variant; **verify its actual model/SoC before adoption** (owner call). RAM
alone does not define low-end. A substitute requires owner approval of its hardware class.
No physical low-end phone means «floor pending», not an emulation-based pass. Windows
native-control checks remain an a11y rider.

Record commit/build, device model, SoC/GPU where available, RAM, OS/browser, refresh
behaviour, CSS viewport/native DPR, coarse-pointer result, memory API value, tier/source,
actual buffer, AA samples, shadow size, ledger peak, power/thermal conditions and cold/warm
cache state. Capture clean-profile auto and explicit `q=t0`. Do not use `det`; do not erase
a visitor override. Pin the existing summer epoch `2026-06-21T12:00:00Z` (15:00 Petersburg
local), **winter day `2026-01-15T10:00:00Z`** (§0.1-2 — the committed README anchor,
13:00 local) and winter night `2026-01-15T18:00:00Z` (21:00 local). For each room and epoch
collect three 60-second windows including resting, looking and stepping. Cover all 18 stops
and both directions of every airlock; record transition windows separately, including cold
room entries. Include landscape, browser-bar changes and resume. At least one capture per
scenario follows `MOBILE_SOAK_MS = 1,200,000` (20 minutes) of active touring. Keep every
planned result; a failed warm run cannot be replaced by a favourable cold run. Visibility
interruption invalidates the whole window; unexplained foreground stalls count. Use the
existing build-time `VITE_PERF_LOG` opt-in for bounded capture and explicit export. No
analytics, automatic upload or localStorage report store. Preserve raw intervals and trace
references alongside a machine-readable report; overflow invalidates a capture.

Proposed narrow power-law exception: physical phones run unplugged, normal-power mode,
50–80% battery, 20–25°C ambient, no external cooling. Record battery and thermal warnings.
The controller/reference Mac stays quiet and on mains; its gate law is unchanged. This
exception requires ratification because mains-only is current house law. Low-power mode and
untested devices remain stated riders, not certified conditions.

## §11 Budgets and accounting

Hard ceilings remain: all JS chunks together 350,000 B gzip; RU 12,000 B; exterior
4,000,000 B; rastrelli 2,000,000 B; jordan 7,000,000 B; military-gallery 4,000,000 B. No
asset increases are authorized in this build. Keep the current basis payload at 584,862 B
or less. Current JS/RU baselines are **274,707/6,962 B** (§0.1-8). §15 allocations are
ceilings, not size predictions. Diagnostics must be removable from the ordinary build;
count anything retained in every chunk.
THE BASIS DISCREPANCY IS RESOLVED (§0.1-4): 600,000 B is enforced (common.mjs — the
trajectory of `collectPayloadRows`); the stale 500,000 header comment is corrected in this
commit. AND THE HEADROOM FACT: rastrelli holds **1,761,050 B** headroom today (238,950 used
of 2,000,000 — §0.1-3), not the brief's «239 KB». No failure authorizes larger budgets,
disabled MSAA, smaller §11 numbers or new asset tiers.

## §12 Executable coverage specification

Pure Vitest tests cover the automatic-policy truth table, override/det precedence,
unavailable memory, pointer-session admission/cancellation and button locking. Existing
scale, classifier, look, wheel-edge, hint and §11 tests remain pinned. Tests stay in
`tests/`, node-only, no jsdom. Keep the existing 734-pass/1-skip baseline as history, not a
claim about this unbuilt design. Add exactly 20 Chromium test cases in `mobile-tier.spec.ts`
and `touch-rail.spec.ts`:

- Four tier cases: coarse/null-memory auto; fine-pointer real probe and low-memory branch;
  det/explicit override precedence; persisted override and redirect/`q=auto` lifecycle.
- Four room cases traverse every stop forward/back using actual button taps.
- Three connection cases exercise each airlock in both directions using the same buttons.
- Nine cases: terminal locks; rapid activation/reduced motion; look-only/multitouch;
  cancellation/resume/rotation; native keyboard/focus; menu/scrub ownership; context loss;
  RU geometry; EN geometry.

Extend the existing chromium project's `testMatch` to include both files; CI already
selects that project. Planned total: 40 existing + 20 = 60. Keep workers=1, retries and
timeouts. Use touch-enabled Chromium contexts, native DPR 3 and browser-dispatched touch
input, not only `dispatchEvent`-created PointerEvents. Retain a fine-pointer context for
the probe case. Exercise 320×568, 360×744, 744×360, 844×390 and the 767/768 width boundary
in geometry cases. Use `hud=1` for observable rail/settle/source contracts; wait on
readiness, not fixed sleeps. Assert actual buffer caps, no overflow/overlap, focus
retention and no accidental second step. These checks prove wiring and layout, never native
Safari behaviour or a hardware frame floor.

## §13 Golden and gate consequences

Existing main-page fixtures retain their fine-pointer, real-probe boots even at width 360.
Do not replace them with det or coarse-pointer contexts. New touch cases use their own
policy. Expect ten existing DOM baselines to change: eight main-page fixtures from the
controls face (and, only if the owner adopts it, §6's optional hint tweak), plus the two
360-px 1812 fixtures from controls. Notes fixtures remain unchanged. Add four DOM fixtures:
coarse 360×744 and 844×390, each RU/EN, DPR 3, fixed `at`, real auto boot. Their canvas and
HUD remain hidden. Planned golden-project total: 33 + 4 = 37. DOM comparison remains
`maxDiffPixelRatio: 0` with visual reading. Existing scene goldens must stay unchanged; new
overlay exclusion is explicit where needed, never a scene-wide mask. No scene re-baseline
is authorized. Target fixture updates narrowly; restore unintended scene baseline drift
from git. A real scene change requires its own explicit DEC and 1% discipline. Author
targeted checks before the round's full gate. Full e2e runs once per round, background,
without an imposed gate timeout, quiet and on mains; a second full run only after failure;
two consecutive failures require a flake fix. Free port 4173 afterwards. Device sampling
repetitions are protocol captures, not permission to rerun the full suite until green.
(SEQUENCING NOTE (integration): the R16.2 chrome swap riding the working tree rewrites the
same ten baselines in its own delivery first — Mobile-B must not duplicate that work.)

## §14 Implementation boundaries

- `src/engine/tier.ts`: §3 pure decision on injected capability facts; existing numbers
  intact.
- `src/camera/touch-input.ts`, if extraction is needed: §5 pure admission/session
  decisions.
- `src/main.ts`: §§3–7 host adapters, shared step dispatch, cancellation and recovery UI;
  §§9–10 diagnostic capture. DOM, capability reads and clocks belong here, not pure laws.
- `index.html` and `src/style.css`: §§4, 7 navigation placement, browser gesture ownership.
- Existing dictionaries and hint bindings: §6 copy only; hint state law stays unchanged.
- `tests/` and `tests/e2e/`: §§12–13; `playwright.config.ts` includes the new cases
  explicitly.
- Performance report schema/aggregation: §§9–10; no production service or runtime package.
- Architecture/state records: adopted policy and evidence links; never mark pending gates
  met.

Every described source/test file follows the standing protocol: leading section citation,
named exports, no enums, `satisfies`/`import type`, strict null handling, preserved law
comments, Biome style and the unchanged purity fence. Material/cache-key/GLSL agreement
remains untouched.

## §15 Implementation round map and declared ceilings

These are mobile subrounds; the orchestrator assigns relay numbers after ratification.

| Round | Deliverable | JS gzip ceiling | RU ceiling | Chromium / golden cases |
| --- | --- | ---: | ---: | ---: |
| Mobile-A | Auto policy, diagnostic facts, four policy cases | 278,707 B | 6,962 B | 44 / 33 |
| Mobile-B | Touch rail, cancellation, copy, recovery, fixtures | 284,707 B | 7,462 B | 60 / 37 |
| Mobile-C | Capture/export, native evidence, certificate | 285,707 B | 7,462 B | 60 / 37 |

(The baseline raised to §0.1-8's fresh +1.) All payload ceilings and §11 values stay fixed
throughout. Missing devices leave Mobile-C incomplete. A hardware failure produces a
measured diagnosis and another ratified amendment, not automatic quality adaptation or
ceiling relaxation. Then resume the queued a11y pass, Neva facade and WebGPU ADR; rooms
finishing remains after the whole Phase-4 queue.

## §16 Owner ratification register

- **R17-A**: conservative coarse-pointer/low-memory pre-probe T0, including touch laptops;
  explicit overrides and det precedence unchanged. This replaces universal auto probing.
- **R17-B**: «touch rail» means discrete native buttons, their left free-band placement,
  visibility rule and new-target dimensions. Continuous touch travel is not promised.
- **R17-C**: the truthful-hint CONTRACT (the existing copy already truthful — the call is
  keep vs the optional tweak), named RU/EN pairs (`chrome.*` namespaces),
  input admission/cancellation (incl. the no-glide button gate — see §5 NOTE), and canvas
  pinch-zoom ownership. No restoration of mobile hint or captions; no global target-size
  pass.
- **R17-D**: explicit percentile interpretation of 33 ms, p99/long-task gates, T0 triangle
  limit and the proposed 3-second mobile first-exterior gate. All are unmeasured proposals
  today.
- **R17-E**: named low-end sentinel (verify the Galaxy A13 4G hardware before adoption),
  identified iPhone, native capture matrix, battery-only handset exception and the limited
  certificate scope. Mains-only desktop gates survive.
- **R17-F**: round allocations, 20 new functional cases, four new fixtures and narrowly
  scoped fixture re-baselines; no scene DEC. Basis enforcement resolved (600,000 B).
  Ratification authorizes implementation, not a performance claim. This document contains
  no new measurement and cannot close either Phase-4 exit checkbox by itself.

## CHALLENGES (the specialist's, dispositioned at integration)

1. «Drag to move closer» contradicts the supplied look-only pointer wiring — the design
   corrects that copy but preserves the broader first-intent hint-dismissal contract.
   **INTEGRATION: mooted (§0.1-1) — the current copy is already truthful; the tweak is an
   optional owner taste call.**
2. A sky-only rAF probe is not room GPU timing. Its Mac-calibrated thresholds,
   refresh-rate sensitivity, cold-start behaviour and thermal predictive value remain
   unvalidated on phones.
3. T0 is not an existing mobile asset tier. On small viewports its surfaces equal T1's;
   choosing its label cannot prove a performance improvement or satisfy the hardware exit.
4. MSAA was measured free on the reference Mac, not universally. Native AA allocation,
   shader cost, KTX2 transcode format and context-loss risk remain unmeasured.
5. Missing Safari deviceMemory cannot establish low memory. Coarse-pointer selection is a
   conservative policy, not GPU detection; touch laptops are intentionally affected.
6. The proposed buttons, 1,400-ms stop cadence, left-side placement and short-landscape
   clearances lack owner/native-phone validation. Fresh corner-stack verdicts remain
   intact.
7. Native pinch zoom, pointer cancellation, browser-bar resizing, safe areas, zoomed
   layouts and VoiceOver interaction require actual Safari checks; Chromium emulation
   cannot certify them.
8. «≤33 ms, never break» has no established statistic. Worst-window p95 is an explicit
   ratification call, not equivalent to maximum frame time. Sustained 30 Hz would fail
   33.0 ms.
9. The mobile 3-second startup requirement and measurement matrix are proposed acceptance
   criteria, not results. Native trace availability, especially on the owner's iPhone, is
   unknown.
10. The proposed Android sentinel has not been supplied or measured; the iPhone model is
    unknown. Other Android GPUs, low-power modes and Windows remain outside this
    certificate.
11. Battery-powered phone capture deliberately needs a narrow exception to the mains law;
    thermal soak, ambient conditions and charging effects have no existing repo
    measurements.
12. ~~The basis header and shared constant disagree.~~ **RESOLVED at integration
    (§0.1-4: 600,000 enforced, the stale comment corrected).** Also,
    2,000,000 − 228,982 leaves 1,771,018 B, not 239 KB. **INTEGRATION: corrected to the
    fresh measurement (238,950 used → 1,761,050 free).** Neither discrepancy authorizes
    budget relaxation.
13. The fixture's «noon» epoch is 15:00 in Petersburg at +03. Its bytes remain unchanged;
    the new device matrix labels local times explicitly.
14. Lighthouse has no recorded baseline. Keyboard/SR quality is not established by its
    score, and a pre-Neva mobile pass cannot certify the final Phase-4 rendering workload.
15. All allocations, case counts and baseline changes above are prospective. No repository
    inspection, implementation, test, device measurement or gate run was performed by the
    design round (the integration's fact-checks above are the orchestrator's).
