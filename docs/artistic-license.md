# Artistic license register

A stylized recreation, not a survey. Every deliberate deviation from the real palace lands here, one line each, when it is introduced.

- **Route compression:** the visitor route (Palace Square → portal → compressed Rastrelli Gallery → Jordan Staircase → dark airlock → Military Gallery) is a stage designer's compression; in reality the Jordan Staircase is reached from the Neva embankment and the Palace Square arches lead to the courtyard.
- **Statue archetypes:** roof figures are abstracted silhouettes, no faces.
- **Portrait atlas:** the Military Gallery cycles a few dozen public-domain 1820s portrait scans at low resolution; the rest read as paint and gilt at distance.
- **Shared ornament vocabulary:** one gilt-ornament kit stands in for the palace's real variety.
- **Mirrored symmetry** where Rastrelli was symmetrical anyway.
- **Dimension approximations:** footprint ~210 × 175 m, principal facade ~215 m (risalit projections make the crease line longer than the plan), 22 m to the cornice — sourced in `ATTRIBUTIONS.md`; the roof band (~24 m total) and courtyard proportions are declared targets, checked against sources during Phase 1 and corrected here if the record differs.
- **Facade axis counts (Phase 1 spec):** per-section window-axis counts in `src/content/facade-spec.ts` (south 7 + 20 + 8 + 20 + 7, bay pitch ~3.4 m) are photo-derived working targets, ±1 axis per section; the section structure (three risalits, triple-arch central gateway, paired columns, corner bunches, 3 window-width modules) is sourced. Counts to be checked against the measured elevation drawings during Phase 1 and corrected here and in the spec if the record differs.
- **Window/decor catalogue:** the 12 window types, 22 surrounds, 32 decor types, 5 capital varieties are catalogued but modelled as a smaller stylized set (one capital archetype, a few surround families) — the grammar reproduces the module system and rhythm, not the one-for-one catalogue.
- **Relief windows:** Phase 1 exterior window recesses are dark relief panels with surrounds on opaque massing — no traversable openings or deep reveals; a real opening is Phase 2 interior-pipeline territory (design-facade-grammar.md §7.4).
- **Roof ornament allocation:** the sourced ~176 roof figures are read as statues and vases for the whole palace combined; the south facade carries a declared allocation of 48 (24 + 24) at its slots, none over the pediment (design-facade-grammar.md §7.3).
- **Budget allowance (Phase 1 /notes):** the /notes package projection declares the rest-of-frame cost as working estimates, not measurements — 1 shadow pass, 16 other frame draw calls, 146 massing triangles (the Round 7 massing: 12 boxes + ground plane), 4 096 sky triangles; JS gzip arrives as a CI measurement. Replaced by a real device measurement at the Phase 1 exit gate.

New rooms add their own line(s) to this file in the same phase that introduces them.
