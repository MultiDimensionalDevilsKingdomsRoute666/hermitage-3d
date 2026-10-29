# The manual season chooser — a design (R10, design-plan only)

Phase 4 · Reach, round R10 (2026-10-28). Design by the CREATIVE relay (the brief
docs/briefs/r10-season-chooser.md, retired at integration); integrated and fact-checked by
the orchestrator — the corrections are listed in §0.1. **DESIGN-PLAN ONLY per the owner: no
implementation in this round.** **RATIFIED 2026-10-28 — all nine owner calls returned with
the recommendations adopted (§11); the decision record rides DEC-034 at the implementation
round.**

## 0. Three assumptions challenged before the design

1. **«A chooser fixes the owner's problem.»** It does not, on its own. Three times the owner
stood in front of a frame where the season law was at weight 1 and the lip was rendering
(the deployment was verified) and saw no winter. The frame is illegible, not absent. A
chooser fixes *discovery* (a June visitor can reach winter at all); it cannot fix
*legibility*. This design therefore delivers the chooser as a clean, self-contained feature
and separates the look question into an explicit owner call (§7) — the chooser round must
not be judged by a verdict the look round owes.
2. **«Season = a snow switch.»** Rejected as the model. Snow under a June white-night sky
(sun at 54°, twilight at midnight) is not winter; it is a bug with a toggle. In this scene
the only coherent carrier of a season is the clock's *date*: sun path, day length, white
nights, the lattice, the interiors' blend and the snow all already derive from it. So the
chooser is a **date control at season granularity** — nothing else in the scene needs to
learn a new input.
3. **«The chooser is for the owner.»** Designed for visitors (the owner is one). A dev-only
`?snow=` would satisfy the verdict workflow but was already rejected by the owner's own
directive («manually choose season» is a visitor sentence), and the fact that the deployed
site sits outside the full-cover plateau ~77% of the year (the snow plateau is the 84 days
Dec 15 → Mar 10) is the thesis gap worth closing.

### 0.1 Integration corrections (the orchestrator, against the tree)

1. The README's winter viewing instant: the draft's `at=2026-01-15T09:30:00Z` (12:30 local,
«the day's best sun») is ~30 min early — solar noon at 30.3°E is ≈09:59Z, and the repo's
established convention (golden-dec-noon) pins 10:00Z = 13:00 local. Corrected to
**`at=2026-01-15T10:00:00Z`** throughout (§9, §8's e2e example keeps the law, not this
taste instant).
2. The commit-path uncertainty is sharpened into a measured fact: `commitGesture()`
(src/main.ts) reads `scrub.valueAsNumber` — a season commit CANNOT reuse it verbatim; R11b
either parameterizes the commit path or adds a parallel one beside it (§3.4, §10).
3. The ground material — declared «unknown to this brief» — is now a measured fact:
`groundMaterial = MeshLambertMaterial({ color: 0x3f3f3f })` over ONE
`PlaneGeometry(600, 600)` (`src/main.ts:343–364`, receiveShadow, deliberately excluded from
the kit's child iteration; the comment: «dark square asphalt — AgX pulls diffuse whites
down; the ground must not compete»). §7's uncertainty shrinks accordingly: the material is
known and is a single Lambert surface — but the plane is the WHOLE world's ground (600×600
m), not only the square's pavement, so the look round must decide the extent of any snow
term (the whole plane reads as the city's ground).
4. The supported epoch bounds are recorded: `TIME.minEpochMs` = 1901-01-01,
`maxEpochMsExclusive` = 2100-01-01 (src/content/sky-time.ts). The same-civil-year
transaction always lands inside the bounds for any supported boot instant — the refusal
path (§3.4) is defensive, not reachable through the chooser.

## 1. The direction

**The season chooser is a native `<select>` in the clock row.** It reads `Сейчас` when the
clock is live and the season's name when the clock is fixed; choosing a season moves the
scene's **date** to that season's anchor day in the same civil year, **keeps the local time
of day**, and commits through the scrub's existing transaction (fixed time, one
`replaceState` writing canonical `at=`, `det` and unrelated keys preserved). Choosing
`Сейчас` returns to the live clock (the scrub's N law).

Interaction model, in one sentence: *the hairline chooses the hour; the chooser chooses the
season; both are views of the one clock, and the date line between them is the feedback.*

Placement: the last item of `#timeline` (top-left, under the wordmark):

```text
Зимний дворец
15:00  21 декабря 2026  [Зима ▾]
Залы
```

- Register: the timeline's (sans 400, 15 px, tabular numerals), colour the chrome's 0.55
white, `#fff` + underline on hover/focus-visible — the lang toggle's law. `appearance:
none`, no border, no background, a 6 px CSS chevron (no image). The OS popup inherits
`color-scheme: dark`.
- Visibility rides `#title` (beat 2 of arrival), not the captions: it is part of the clock,
not of the stop.
- Options, in order: `Сейчас · Зима · Весна · Лето · Осень` (values
`now · winter · spring · summer · autumn` — the stable ids; labels bind from the
dictionary).
- No persistence, no new hash key, no new scene input. The URL already carries the result
(`at=`), which is exactly why a chosen winter is shareable: the link *is* the state.

Why a native select, decisively: it is the only control that gives keyboard completeness,
type-ahead, an announced name/value, a focus-free popup, and a first-class **touch** picker
(iOS wheel, Android sheet) at zero JavaScript — in a repo whose chrome is already a native
`range` and a native `dialog`. Four radio chips would need a roving-tabindex implementation
and four words of permanent chrome; a select is one word.

## 2. Alternatives considered

| | A. Snow override (`season=` key / persisted toggle driving `wSnow` only) | B. Four text chips in a row (radio group) | C. Two-state «Зима / Лето» toggle | D. Year-wide scrub (a second hairline) | **E. Season select in the clock row (chosen)** |
|---|---|---|---|---|---|
| User fit | Shows snow anywhere — including incoherent June snow | Good; always visible | Good; but «season» is the owner's word, and spring/autumn evenings are distinct | Precise but no one wants a day-of-year slider | Good: one word, where its effect is read |
| Clarity | Breaks the thesis (sky and snow disagree) | Clear | Conflates a season with a mode | Two hairlines confuse | Clear: date line changes beside it |
| Simplicity | New hash key, third writer of `wSnow`, new scene input | Roving tabindex, 4 buttons, layout at 360 px | Trivial | New range + bounds law | One pure function + one native control |
| Locality | Touches time.ts, main.ts render path, goldens | Chrome only | Chrome only | time.ts + chrome | Chrome + one pure module; render path untouched |
| Accessibility | Toggle fine | Must hand-build group semantics | Fine | Second slider = second help text | Native: name, value, popup, type-ahead, OS touch picker |
| Reversibility | Low: goldens gain a season axis | Medium | High | Medium | High: delete the control, nothing else changed |
| Verification | Every exterior golden × 2 seasons; det story for a persisted key | DOM fixtures + e2e | DOM fixtures + e2e | time.ts tests + fixtures | DOM fixtures (main page) + ~6 e2e lines + a node test file; **0 scene goldens** |
| Rulings amended | DEC-033 surface **and** URL grammar **and** persistence | DEC-033 surface, DEC-019 UI | Same as B | URL grammar? no; chrome yes | DEC-033 surface, DEC-019 UI — nothing else |

A is rejected outright: it is the one design that makes the renderer non-deterministic *with
respect to the clock* and forces the golden set to grow by a season axis. B and C are the
real contenders; C survives as a **fallback** — the chosen design degenerates to C by
deleting two rows of the anchor table with no law change (owner call §10.2). D and a native
`<input type=date>` are rejected: arbitrary dates already exist (`at=`) and visitors want
«winter», not a date.

## 3. The state law

Written in the form of design-sky-time.md §9.

### Season of an instant

- `seasonOf(epochMs) ∈ {winter, spring, summer, autumn}` by the **calendar (meteorological)
seasons in Petersburg local time (+03:00)**: winter Dec–Feb, spring Mar–May, summer Jun–Aug,
autumn Sep–Nov. This is the Russian everyday meaning of «зима»; it is *not* the snow law's
seams (Mar 5 reads «Весна» with full snow — the date line beside it is the truth; the
anchors below sit deep inside both definitions, so the mismatch never involves a chosen
season).
- Pure: integer civil-date arithmetic, no Date, no DOM (the `utcCivil` pattern already in
snow-season.ts, shifted by the fixed offset `SITE.utcOffsetMinutes`; Petersburg has no DST).

### The anchor table

```ts
// TUNING TARGET: the one day each season is shown at. Winter on the snow plateau,
// spring after meltEnd, summer/autumn on existing golden dates. Owner's taste.
export const SEASON_ANCHORS = {
  winter: { month: 1,  day: 15 },  // deep winter; noon sun ~9° (vs 6.6° at the solstice); wSnow = 1
  spring: { month: 5,  day: 15 },  // bare, bright, 17 h of day; wSnow = 0 exactly
  summer: { month: 6,  day: 21 },  // the white-night date the goldens already pin
  autumn: { month: 10, day: 15 },  // the oct-night golden's date; dark by 19:00
} as const;
```

Invariant (unit-tested): `snowWeight` is exactly 1 at every hour of the winter anchor and
exactly 0 at every hour of the other three — a chosen season never lands on a seam.

### The season transaction

- `seasonInstant(sceneEpochMs, season) → epochMs`: the anchor's calendar day **in the scene
instant's local civil year**, at the scene instant's **local time of day**
(hour:minute:second preserved). Pure; shares time.ts's UTC helpers.
- Selecting a season = a **scrub commit at `seasonInstant(...)`**: enter fixed time, apply
locally, one `history.replaceState` writing canonical `at=`, preserving `det`, `cam`,
`stop`, `q`, `lang`, `hud`, `lm` and everything else (the r25 law). No history entry. No
preview phase (a select has no drag). MEASURED CAVEAT (integration): today's
`commitGesture()` reads `scrub.valueAsNumber`, so the season commit needs its own commit
path or a parameterized one — a refactor-shaped decision for R11b, not a blocker.
- Selecting `now` = the scrub's **return-to-now** law, verbatim: live clock; under `det` it
captures a new instant and freezes it, `det` is not removed. (`returnToNow()` is a
module-level function and is callable as-is.)
- An in-progress scrub gesture is cancelled by a season change (the «external action
cancels the gesture» clause), and vice versa the scrub's commit simply re-derives the
select.
- If the resolved instant falls outside the supported epoch bounds, the selection is
refused: state unchanged, select re-synced, an issue for diagnostics — no toast (the
«validation, not a clamp» law). Integration fact: the bounds are 1901–2100, so the
same-civil-year law cannot reach them from any supported boot — the refusal is defensive.

### What the control shows (never what it stores)

- The select's value is **derived** from the committed `TimeState`: `live → now`; `fixed →
seasonOf(epochMs)`. It is re-derived on every commit and on every `hashchange` re-parse. It
is not written on scrub *preview*. There is no season state anywhere; delete the control
and the system is unchanged.
- Consequences, stated so nobody is surprised: a `det=1` boot with no `at=` is fixed, so
the select reads the season, not «Сейчас»; re-selecting the already-shown season fires no
`change` and is a no-op; a visitor on Dec 31 choosing «Зима» goes to Jan 15 of the *same*
year (11½ months back — the year is immaterial to the look and the date line shows it).

### Boot resolution order

Unchanged. `parseTime` → `TimeState` → `applyEpoch`; the select binds from that state after
`bindChrome` (labels) — the chooser adds no step.

### Persistence

None. Ratifies, not amends, DEC-033's «nothing persisted»: a persisted season would be a
snowy June on return with no visible cause, and det boots ignore storage anyway.

### Rulings this design amends (owner ratification required)

1. **DEC-033 «Mode surface: NONE … a chrome toggle (principle 3) rejected»** → amended to:
*«Mode surface: a season control in the clock row that chooses the date; the season remains
a law of the clock. Rejected unchanged: a snow override independent of the date; real
weather.»* The rationale clauses survive intact: no new URL grammar (`at=` already carries
the result), nothing persisted, the default stays the real clock (no «snowless December»
inversion).
2. **design-winter.md §4** → rewritten to the same text; its «dev-only ?snow= deferred»
line is **retired** (the chooser makes an out-of-season snow render unnecessary; the fence
can pin `at=` winter instants).
3. **DEC-019 «Must not touch: UI»** → amended to: *«the chrome gains one control, a view of
the clock; the three-state contract, the kit materials, the sky palette and the light
counts stay untouched.»* (The room-index button and the edge prompt already established
that the UI line is amendable by a ruling.)
4. **Principle 3** is touched, not broken, under this reading: the chooser is the hairline's
calendar sibling — chrome that *is* the clock, in the clock's row. If principle 3's text
forbids any control beyond the title and the hairline, this is the amendment; the owner
holds the text.

Rulings **not** amended: the URL grammar (ruling 4) — `at=` unchanged, no new key; the §8
weight law; tier semantics; budgets; the artistic-license row 21 (see §7 — proposed
separately, never assumed).

## 4. The determinism / det contract

- **Scene pixels cannot depend on the chooser**: it has no path into the renderer except
through `TimeState`, which the goldens already pin by `at=`. Two `det=1` boots at the URL
the chooser wrote are bit-identical for the same reason two boots at any `at=` are.
- Under `det=1` the chooser behaves as the scrub does: it changes the frozen instant and
freezes again; `now` captures and freezes; `det` survives the write.
- **All 16 scene goldens stay byte-stable** (the chooser lives inside `#title`, hidden with
the overlays). No re-baseline, no new scene golden for this feature.
- **The DOM layout fixtures re-baseline on the main page only** (en/ru ×
360/768/1280/1920 = 8 files; the 8 /notes fixtures are untouched — /notes has no clock).
Strict 0.0 remains.
- Golden boots keep ignoring storage and `matchMedia`; the chooser reads neither.

## 5. A11y + touch

- Element: `<select id="season">` inside `#timeline`, `aria-label` = `chrome.seasonLabel`,
`aria-describedby="season-help"` (sr-only, `chrome.seasonHelp`). The accessible name/value
pair reads «Время года сцены, Зима». The select's own value change is announced by AT; no
extra live region (the stop region stays the stop's).
- Keyboard: Tab reaches it in DOM order (canvas → season → scrub → lang toggle → …).
Space/Enter open the list; arrows move; Enter/Space commit; Escape closes without change;
first-letter type-ahead (З/В/Л/О · W/S/S/A). On platforms where arrows commit directly
(Windows/Linux), each step is one `replaceState` — the scrub's keyboard commits already
behave so; no history pollution.
- Reduced motion: nothing to reduce — the select has no transitions; a season change is a
cut exactly like a scrub commit.
- Touch: a native select opens the OS picker; it is outside the canvas, so `touch-action:
none` is irrelevant. Hit target: give the control `min-height: 24px` (vertical padding, the
row's line height is unaffected). Record for the a11y pass: the lang toggle and «Залы» are
14-px text buttons with the same target-size exposure — fix all three together there, not
here.
- Corner law at 360 px: the row `15:00 21 декабря 2026 Зима` ≈ 27 characters at 15 px
(~216 px + 24 px inset) clears the top-right toggle (~314 px). EN `15:00 21 December 2026
Autumn` ≈ 29 characters, also clears. The row is `white-space: nowrap` so `#index-open`'s
derived `top: 90px` holds; an e2e row asserts the timeline's box is one line high at 360 in
both languages (this fit is estimated, not measured — the fixtures will say).
- Interiors: the clock block stays visible indoors, so the chooser works there (the
interiors blend by the same clock; snow is exterior-only). /notes: no clock, no chooser.

## 6. The string inventory and budget

Keys under `chrome.*` (no union change beyond the key list; the literals fence is satisfied
— option values `now|winter|…` are ids, not prose).

RU (canonical; NBSP as the committed column):

```ts
'chrome.seasonLabel':  'Время года сцены',
'chrome.seasonHelp':   'Выбор времени года переносит дату сцены, сохраняя время суток; «Сейчас»\u00A0— вернуться к текущему моменту.',
'chrome.seasonNow':    'Сейчас',
'chrome.seasonWinter': 'Зима',
'chrome.seasonSpring': 'Весна',
'chrome.seasonSummer': 'Лето',
'chrome.seasonAutumn': 'Осень',
```

EN:

```ts
'chrome.seasonLabel':  'Season of the scene',
'chrome.seasonHelp':   'Choosing a season moves the scene date and keeps the time of day; “Now” returns to the current moment.',
'chrome.seasonNow':    'Now',
'chrome.seasonWinter': 'Winter',
'chrome.seasonSpring': 'Spring',
'chrome.seasonSummer': 'Summer',
'chrome.seasonAutumn': 'Autumn',
```

Also updated: `chrome.scrubHelp` is unchanged (N remains the scrub's key); the static RU
shell in `index.html` carries the pre-JS option labels. `bindChrome` rebinds the seven
strings on a language switch; the select's value (an id) survives the swap.

Budget: pure module ~0.5 KB gz (civil-year arithmetic + table + `seasonOf`), host wiring
~0.6 KB (bind, derive, change → commit path), EN strings ~0.15 KB → **≈ +1.3 KB gz JS,
declared ceiling +3,000 B → ≤ 276,031 of 350,000**. RU chunk: ~230 B raw Cyrillic → ≈
+200 B gz, ≤ 7,200 of 12,000. CSS ~0.3 KB (not in the JS budget). Payload, draws, tris,
textures, lights: +0. Frame CPU: one `seasonOf` per commit, not per frame.

## 7. The look question — an amendment proposal (owner call)

The chooser will put the owner at Jan 15, 10:00Z (13:00 local, solar noon — the repo's
golden convention), in front of a frame that differs from the one already judged «no snow»
by about two degrees of sun. The measured fact stands: 2.6 px of lip in a 1,479-pixel band
(0.16% of the frame). No chooser changes that. The proposal, for the owner's decision and a
*separate* look round:

**Amend artistic-license register row 21** from «the square stays cleared, the roof bare;
only the cornices carry the lip» to «the square carries trampled snow; the roof stays bare;
the cornices carry the lip». Reasoning: the ground is the largest surface in the S0 frame
(roughly the lower 40% from a 1.7 m eye), it is what makes any winter photograph read as
winter before the eye finds a roofline, and it is reachable by a **material term, not
geometry**: a `wSnow`-weighted blend of the square's ground material toward a packed-snow
albedo/roughness (off-white, grey-trampled toward the camera lanes), identity at 0 — the
facade slot's own discipline, 0 draws, 0 tris, no texture, ~0.3–0.5 KB. A free second
effect: the hemisphere ground colour already carries a wNight term; a snow-weighted lift of
its albedo gives the facade the bounce light a snowfield gives. MEASURED FACT (integration):
the ground is ONE shared `MeshLambertMaterial` (0x3f3f3f) over ONE 600×600 plane
(src/main.ts:343–364) — a single local injection point, but the plane is the WHOLE world's
ground, so the look round must decide the extent of the term (the whole plane reads as the
city's ground, and row 21 speaks of the SQUARE). Real Palace Square is machine-cleared,
which is why row 21 says «cleared»; the amendment trades that fidelity for the legibility
the winter mode was shipped to deliver (DEC-033's own exit gate: «December becomes legible
in daylight»). If the owner declines, the chooser stands on the licensed look and the owner
should expect the chosen winter to read as it does today.

## 8. Test / golden impact map

Byte-stable: all 16 scene goldens (4 square + 9 interior + the 3 winter DEC files —
unchanged by construction); the 8 /notes DOM fixtures; every unit test on the season law,
the time grammar, the solver.

Re-baseline: the 8 main-page DOM fixtures (en/ru × 360/768/1280/1920) — the timeline row
gains the control. Name all 8 in the DEC.

New pins:

- Node unit file for the pure module: `seasonOf` at month boundaries in local time (Feb 28
23:59 +03 → winter, Mar 1 00:00 +03 → spring, and the UTC/local straddle at 21:00Z);
`seasonInstant` pinned values — from `2026-06-21T12:00:00Z` choose winter →
`2026-01-15T12:00:00Z`; from `2026-12-21T10:00:00Z` choose summer → `2026-06-21T10:00:00Z`;
time-of-day preserved to the second; same local year; the invariant
`snowWeight(anchor + any hour) ∈ {exactly 1 for winter, exactly 0 otherwise}`; refusal
outside the epoch bounds.
- e2e (det): at a June `at=`, selecting `winter` writes exactly the pinned `at=`, keeps
`det=1&stop=S1&lang=en` intact, the date line reads «15 января 2026», the select reads
`winter`; selecting `now` returns the scrub's return-to-now state; a scrub crossing Nov 30
→ Dec 1 re-derives the select to `winter` on commit; a language switch keeps the value; the
timeline box is one line at 360 in RU and EN.
- The literals fence: no new allowlist entries.

## 9. Implementation outline (later rounds; split, never widen)

- **R11a — the law.** `src/sky/season.ts` (pure: `seasonOf`, `seasonInstant`,
`SEASON_ANCHORS`), its unit file, the seven keys in `keys.ts`/`ru.ts`/`en.ts`. No chrome
yet; bundle delta measured here.
- **R11b — the chrome.** `index.html` (the select + sr-only help), `style.css` (the
timeline-row register, chevron, 24-px target), `main.ts` (bind labels in `bindChrome`;
derive value from `TimeState` on commit and `hashchange`; `change` → the season commit /
return-to-now path, gesture cancel — including the commit-path refactor decision), the 8
fixture re-baselines, the e2e rows. DEC-034 written here: amends DEC-033 and DEC-019's UI
line, rewrites design-winter.md §4, adds the «season transaction» paragraph to
design-sky-time.md §9, updates the README's viewing links to the winter anchor instant
(`at=2026-01-15T10:00:00Z` — 13:00 local solar noon, the golden convention; not the
15:00-local trap), ROUNDS row, devlog.
- **R12 — the look (owner-gated, independent).** The ground-snow term per §7 after the
look round resolves the extent question (the plane is the whole world's ground); register
row 21 amended; re-baselines dec-noon and dec-night only.
- R11a and R11b can be one round if the mechanical relay prefers; R12 must not be folded
into either.

## 10. Open owner calls

1. Ratify the amendments: DEC-033's mode surface, design-winter §4, DEC-019's UI line, and
the reading of principle 3 (§3).
2. Four seasons (recommended — the honest unit of the clock) or the two-state «Зима /
Лето» fallback (same law, two table rows fewer).
3. The anchor dates — Jan 15 / May 15 / Jun 21 / Oct 15 — taste parameters; the only hard
constraint is the plateau/zero invariant.
4. Placement: the clock row (recommended — the effect is read beside the control) vs the
«Залы» line (layout-safest, but separates the date from its control).
5. The «Сейчас» option inside the select (recommended, so the control is a state, never a
command) vs leaving return-to-now to the scrub's N alone.
6. The same-civil-year law for the anchor (vs «nearest occurrence»).
7. The +3,000 B gzip ceiling declaration.
8. The look amendment (§7): open a look round and amend register row 21, or stand on the
licensed look knowing what the chooser will show.
9. Whether the README's «Дальше — зима» promise is now kept or should be rephrased to point
at the chooser.

Material uncertainties carried into R11: the 360-px single-line fit is estimated, not
measured; the season commit needs its own commit path or a parameterized `commitGesture`
(measured: the current function reads the scrub's value); the TIME epoch bounds are
1901–2100 and cannot be reached by the same-civil-year law from a supported boot (the
refusal path stays defensive); the ground EXTENT question for §7 (the plane is the whole
world's ground, not only the square's pavement).

## 11. The owner's ratification (2026-10-28 — all nine recommendations adopted)

1. The rule amendments are RATIFIED: DEC-033's mode surface opens (the season control in
the clock row); design-winter.md §4 is rewritten at R11b (the «?snow= deferred» line
retires); DEC-019's UI line gains the one clock control; principle 3 reads as «chrome that
is the clock».
2. Four seasons (Зима · Весна · Лето · Осень) — the two-state fallback is rejected.
3. The anchor dates as proposed: winter Jan 15 · spring May 15 · summer Jun 21 · autumn
Oct 15 (the plateau/zero invariant is the only hard law).
4. Placement: the clock row (the last item of #timeline).
5. «Сейчас» rides as the select's first option (the return-to-now law).
6. The same-civil-year law for the anchor instant.
7. The JS budget ceiling is declared at +3,000 B gzip (total ≤ 276,031 of 350,000).
8. **R12 IS OPENED**: the look round amends artistic-license row 21 and designs the
trampled-snow ground term (the material fact: one Lambert 0x3f3f3f over the 600×600 plane;
the extent question is R12's first resolution). R12 runs CREATIVE, independent, never
folded into R11.
9. The README's «Дальше — зима» promise is rephrased to point at the season chooser (the
R11b docs step).

The sequencing ruling (2026-10-28, the owner): R11 (the chooser, mechanical) → the mobile
caption-collision defect round (parking lot) → R12 (the ground-snow look) → the index-face
round (parking lot; the Rooms menu restyled to the /notes design language) → the Phase-4
queue.

R16 amendment (2026-10-29, DEC-036): the §5 «native select opens the OS picker» carrier is
amended — the native popup is retired (three Windows engines paint it from UA color
providers no gate reaches; V1) and the open face is an in-page listbox under the clock row
(the room menu's row voice and keyboard law without its modality). The closed face, the
derived-value law, the anchors and the at= transaction are untouched; the §5 hit-target and popup
records stay superseded by the listbox (the 24 px target-size note rides the a11y pass
unchanged).
