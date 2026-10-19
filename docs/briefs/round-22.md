# Round 22 brief — the Russian voice + the /notes redesign (design relay)

ROLE
You are the specialist of a relay. You have no tools, no repo access and no prior context; the
orchestrator integrates your reply into the repository and validates it. This is a DESIGN
round: your deliverable is one design document, no code. The owner (a Russian speaker reading
this project in English) dispositions your decisions; code rounds implement afterwards.

TASK — the site's voice and face. The owner's report, close to verbatim:
1. The UI is in English; it should be in Russian — the overlay texts (the wordmark area, the
   «How it's built →» link, the stop captions such as «the facade and the hour»), and the
   ENTIRE /notes page («How the south facade is built»).
2. The typography (system-ui today) is generic; change the font — the taste to hit: a senior
   developer's minimalism that still stands out. It must carry Cyrillic properly.
3. A language-toggle button (both languages stay available).

You decide HOW: the language model, the font, the notes redesign, and the Russian copy. Draft
the Russian text with taste — idiomatic, not transliterated English; the owner's acceptance of
the copy is a gate after you.

CONTEXT — what exists (the full user-facing text inventory):

1) The main page (index.html + the runtime overlay): <title> «Winter Palace in the browser»;
   the wordmark <h1> «Winter Palace»; the clock line (numbers + a date, formatted Petersburg
   time); the notes link «How it's built →»; two sr-only help paragraphs (the scrub keys help;
   «Scroll, drag, or use the arrow keys to move along the rail from stop to stop.»); the canvas
   aria-label «Winter Palace walkthrough»; the noscript. The debug HUD (?hud=1) is a developer
   tool — it may stay English (say so if you agree).
2) The stop captions — committed CONTENT data, one caption per stop, shown as the overlay
   caption and announced to assistive tech as «<stop id> · <caption>» (the announcement format
   is code, not content). The square's two stops: «the facade and the hour», «the arch …»
   (verbatim data lives in src/camera/square-rail.ts); the gallery's and the staircase's ten
   more live in the room contracts (rooms/*/contract.ts), e.g. «looking up into light», «the
   flight», «portholes mirror the windows», «the gallery above», «arrival; the portal (landing
   airlock)». A law: committed data fails loud if malformed — static content, not runtime
   degradation. Your design must keep that law (bilingual data, still static).
3) The /notes page (notes.html + a pure view-model + hand-written DOM, no framework): the
   title «How the south facade is built»; a back link «← Palace Square»; an intro paragraph;
   sections with headings (e.g. «Shell», «Window, decor and order system»), paragraphs,
   generated NUMBER rows (each value carries a provenance chip), a kit-of-parts table, a
   budget-allowance echo table, a callout citing the crease/protrusion source hunt, and a
   links block. The page re-runs the facade solver at load; the numbers are real, not copy.
   The owner's verdict on its LOOK: «generic» — it needs a senior-minimalist hierarchy that
   stands out; you decide the layout, the type scale, the spacing, the palette (the main page
   is a light Petersburg sky scene with pale-green/white/ochre accents), and what to cut.

HARD CONSTRAINTS (the repo's laws — design within them):
- No third-party runtime: fonts are SELF-HOSTED woff2 under public/ (a Google-Fonts CDN link
  violates the delivery rules). The main page's exterior payload row is 0 of 4 MB — a latin+
  cyrillic subset woff2 is ~30–100 KB per weight; keep the weight count minimal (2–3 files).
  State the exact font(s), weights, files and the fallback stack.
- No UI framework; the DOM stays hand-written; the /notes view-model is a pure module (tested
  in node) — your redesign keeps that shape.
- The URL is the state: the language joins the hash-query grammar (?at, ?stop, ?cam, ?det,
  ?hud, ?q, ?lm exist; each documented). Decide: the default language (RU or EN — the owner's
  report implies RU-first, you confirm), the toggle's UX (its label, its placement), the
  persistence (there is a ?q= precedent: URL wins, persisted override, auto-cleared), the
  <html lang> flip, and whether navigator.language seeds anything (the det/golden scenes hide
  the overlays, so pixels are safe — but keep det deterministic anyway).
- The a11y contract: the sr-only help texts, the aria-labels, the live-region announcements and
  the captions must ALL switch language with the toggle.
- The e2e asserts the stop captions' TEXT on every walk landing (the §6.1 beat text off the
  committed data) — your language model must let the e2e pin a language (e.g. via ?lang=) —
  state the rule.
- The Russian typography: «...» quotes, — dashes, the existing thin-space number convention.

HOUSE STYLE for the design doc (the deliverable): plain Markdown, compact prose and lists, no
code listings longer than a snippet; every decision carries its rejected alternative; every
user-facing string appears in a two-column inventory (EN → RU) — complete, not samples; end
with an implementation plan split into code rounds (a file map per round, each round's exit
gate) — the implementation is NOT this round.

OUTPUT CONTRACT (two numbered fenced blocks + CHALLENGES bullets; the reply budget is ~450
lines; if the inventory is long, it wins over prose — cut prose first; if you must cut, end
with `TRUNCATED-HERE: <next file>`):
1. docs/design-i18n-notes.md — the full design document: the language model, the typography
   (fonts/weights/files/fallbacks + what applies where), the /notes redesign (layout, type
   scale, palette, what changes and what is cut), the complete EN → RU text inventory, the
   risks, and the implementation plan (rounds, file maps, exit gates).
2. CHALLENGES — the assumptions you challenged, the credible alternative you considered, the
   likely failure cases, and any material uncertainties.

CHALLENGE CLAUSE: before answering, challenge key assumptions (including the owner's — if
RU-default is wrong for the audience a portfolio site needs, argue it), consider a credible
alternative, and check likely failure cases; give the requested output with concise rationale
and any material uncertainties.

SUPPLEMENT — the verbatim EN source text (the orchestrator adds it after the first send; the
specialist translates EVERY string below into the RU column of the design doc's inventory).

Convention: `N` marks where a runtime number is interpolated at render (not a literal — the
sentence structure must survive a different number). Digits inside the static prose below may
arrive MASKED by the transport — emit `MASKED-IN-BRIEF: keep the <name> value` for them and
the orchestrator restores. File paths (ATTRIBUTIONS.md, docs/..., src/...) are paths: they do
NOT translate. Data keys rendered as text (section kinds, arrangement tokens) — you decide
translate-vs-keep; say so per string group.

A. Chrome (index.html + notes.html):
1. <title>: Winter Palace in the browser
2. meta description: A stylized 3D recreation of the Winter Palace (Hermitage, Saint
   Petersburg), lit by the real Petersburg sky.
3. wordmark h1: Winter Palace
4. notes link: How it's built →
5. scrub aria-label: Petersburg time, ±24 hours around the scene time
6. scrub-help sr-only: Arrow keys step a minute; PageUp and PageDown step an hour; Home and
   End pick the window bounds; Escape cancels; N returns to now.
7. scene-help sr-only: Scroll, drag, or use the arrow keys to move along the rail from stop
   to stop.
8. canvas aria-label: Winter Palace walkthrough
9. notes.html <title>: How the south facade is built
10. notes meta description: How the south facade of the Winter Palace is generated: the frozen
    spec, sourced and declared numbers, the kit of parts and the budget projection.
11. notes back link: ← Palace Square
12. notes noscript: Numbers need JavaScript: the page re-runs the facade solver at load.

B. Stop captions (the overlay text; announced as `<stop id> · <caption>`):
S0: the facade and the hour · S1: the arch opens
G: dark; the square behind · compression · the door (airlock)
J: looking up into light · the flight · portholes mirror the windows · the gallery above ·
   arrival; the portal (landing airlock)

C. /notes content (the view-model's emitted blocks; the numbers themselves are runtime data):
- Title: How the south facade is built
- Intro paragraph: Every number on this page is produced at load by the same pure solver the
  app runs over its frozen facade specification (decisions.md, DEC-004). It is not a survey.
  Three kinds of numbers are kept apart by the type system and labelled here:
- Intro list: Sourced — carries an attribution key into ATTRIBUTIONS.md ("No line, no use"). /
  Declared — a photo-derived working target registered in docs/artistic-license.md; checked
  against measured elevation drawings during Phase 1 and corrected in both places if the
  record differs. / Derived — solver arithmetic over sourced and declared inputs
  (docs/design-facade-grammar.md); recomputed on every load, never registered.
- Shell heading: Shell · paragraph: Quadrangle numbers as the sources give them. Where two
  sources disagree both counts are kept, each under its own key.
- Shell row labels: North (Neva) facade length · West (Admiralty) facade length · Windows,
  conservative count · Windows, generous count · Rooms, conservative count · Rooms, generous
  count · Staircases · Height to the cornice · Total height with roof band · Principal facade
  incl. roofline statuary · Corners incl. every projection · Roof statuary figures
- System heading: Window, decor and order system · paragraph: The sourced catalogue (Alekseeva
  via wiki-ru) is reproduced as a module system and a column rhythm, not one-for-one: the
  counts below are catalogued, the kit models a smaller stylized set (artistic-license
  register, "Window/decor catalogue").
- Decor row labels: Window width modules · Window types · Surround types · Sculptural decor
  types · Capital varieties · Cartouche kinds
- Order table: caption Order system; columns Fact, Value; row labels Engaged colonnade tiers ·
  Column arrangement · Capital family · Wall colour
- Rows table: caption Window rows, bottom to top; columns Row, Tier, Module, Declared head
  height
- South heading: South elevation — Palace Square, west → east
- South row labels: Main facade line · Crease line incl. risalit creases · Declared working
  bay pitch · Derived bay pitch · Derived crease line
- Sections table: caption Sections, west → east; notes verbatim from the frozen spec; columns
  Section, Kind, Declared axes, Declared protrusion, Note
- Counts row labels: Window axes · Window slots · Windows · Portal void cells · Column shafts
- Crease callout (static part): Crease line: the spec carries N m (sourced — wiki-en "principal
  facade", citing Budberg, Great Palaces: The Winter Palace, 1969; the ru tradition reads the
  same edge as 210 m); the solver derives N m from the main line and the declared risalit
  protrusions. The two sourced lengths most likely measure one street edge under different
  source conventions, not a plan line against a crease line; the declared axis rhythm (7 + 20 +
  8 + 20 + 7) and the derived figure have no digitized attestation (literature hunt closed
  2026-10-17). Settling it takes measured drawings — РГИА ф. 485, an Albertina scan, or
  Pilyavsky via НЭБ — so this warning stays live until then, with the spec and the
  artistic-license register ("Dimension approximations") corrected if the record differs.
  Dynamic tail: Solver: <solver warning message>.
- Solver warning message: derived crease length N m differs from declared N m
- Kit heading: Instanced kit · paragraph: Parts the solver placed on the south facade; kit
  slots with no placements are omitted. Triangle ceilings are per-instance kit maxima, so part
  totals are ceilings, not measured counts.
- Kit table: columns Part, Instances, Triangle ceiling per instance, Part total; total cell
  Total — N active parts
- Kit row labels: Instances · Active parts · Kit triangle ceiling
- Budget heading: Budget projection
- Budget row labels: Facade draw calls · Frame draw calls · Frustum triangles · Submitted
  triangle ceiling · JavaScript gzip · display pending CI measurement
- Budget callout: Contract ceilings enforced in CI: ≤ N draw calls per frame, ≤ N frustum
  triangles, ≤ N B JavaScript gzip. Projected: N draws (margin N), N triangles (margin N), N.
  An overrun is removed by changing art or level of detail, never the number.
- Allowance paragraph: Scene allowance — declared working estimates of what the rest of the
  frame costs (Round 7 massing: 12 boxes + ground plane; sky dome; one shadow pass; other draw
  calls). They are inputs to the projection, not measurements.
- Allowance table: caption Scene allowance; columns Allowance, Value; row labels Shadow
  passes · Other frame draw calls · Massing triangles · Sky triangles
- Siblings heading: Sibling facades — not shipped in Phase 1 · paragraph: North, west and east
  reuse the kit later. Their axis counts are declared only (artistic-license register, "Facade
  axis counts"), kept so the plan arithmetic closes in tests; main-line lengths are the shell
  numbers above.
- Siblings table: columns Facade, Sections — kind · declared axes, Declared axes, Character;
  axis cell N (±1 per section)
- Derived-formula strings (shown as the derived chips' explanation): main line + inner risalit
  creases from the declared protrusions (solver) · Σ declaredAxes over the five sections ·
  windowSlots − portalVoidCells · slots displaced by the entrance and portal arches (solver) ·
  Σ KIT.shaftCount × instances over column parts (solver) · counts.byPart ×
  KIT.triangleCeiling · Σ over placed parts · Σ counts.byPart · parts with ≥ 1 instance ·
  Σ instances × triangleCeiling · CI gzip measurement passed through
  allowance.measuredJsGzipBytes · projectBudget: instanced draws of the active parts over all
  passes · facadeDrawCalls + N other draw calls · frustumTriangles × (1 + N shadow pass)
- Chip vocabulary (the kind words + the license-line titles): sourced · declared · derived ·
  Dimension approximations · Facade axis counts (Phase 1 spec) · Window/decor catalogue ·
  Budget allowance (Phase 1 /notes)
- Failure strings (developer-facing but rendered): unregistered: <id> · displayed number <id>
  has no provenance register entry

D. Data strings rendered as text (you decide translate-vs-keep per group; say so):
- section kinds: cornerRisalit · stretch · centralPortal
- order arrangement tokens: bunch-at-corners · pair-at-portals · pair-piers-between-window-groups
- capital family: corinthian-composite (stylized, single archetype)
- wall colour note: pale green walls, white order and dressings — owner palette decision
  (decisions.md)
- facade characters: Palace Square front: three risalits, triple-arch gateway (wiki-ru,
  visit-petersburg). · Continuous colonnade to the Neva (visit-petersburg). · Country-palace
  composition toward the Admiralty (visit-petersburg). · Massive flanks around the service
  court (visit-petersburg).

E. Runtime-formatted strings (the language model must cover them):
- The clock line: the time HH:MM and the date as ISO YYYY-MM-DD (locale-neutral today — you
  decide whether RU wants a genitive-month display; the current formatter is numeric).
- The scrub's aria-valuetext: `<date> <time> (UTC+03:00)` — the template is code.
- The HUD's prose lines (?hud=1): a developer tool — English stands (confirm or reject).
