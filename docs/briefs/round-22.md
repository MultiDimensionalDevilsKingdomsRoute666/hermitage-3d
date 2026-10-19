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
