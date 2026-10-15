# Decisions

Each decision: what, why in one line, and the credible rejected alternative. New decisions append as DEC-00x; a change of mind opens a new entry, old ones stay for the record.

- **DEC-001 · Rendering: vanilla three.js, hand-written engine layer** — one scene, a hand-tuned loop, custom materials, tiny UI; owning the small engine layer is a stronger senior signal than wiring a framework. *Rejected: React Three Fiber + drei + zustand — great for editor-like UI; a reconciler in the hot path and 2× version coupling buy nothing here.*
- **DEC-002 · WebGL2 baseline; WebGPU as a later opt-in tier** — reaches every reviewer's browser; the drama is baked light + few effects, not compute. `three/webgpu` is a moving target. Evaluated again by ADR in Phase 4, by measurement. *Rejected: WebGPU-first with WebGL fallback — months on the bleeding edge.*
- **DEC-003 · No UI framework** — six DOM elements; a typed store + explicit FSM is more legible. *Rejected: Preact overlay — a second component model for a nav and a time line.*
- **DEC-004 · Exterior: facade grammar + kit of parts** — Rastrelli's elevations are a grammar: typed bay sequences, risalits, order heights, cornice profiles → a pure solver places ~25 instanced kit meshes; ~1 900 windows become a number, not a workload. The generator itself is a portfolio artefact. *Rejected: hand-model the facades — months before anything ships; the download budget dies; no engineering story. Scanned/purchased assets rejected too: licensing murk, style incoherence, payloads.*
- **DEC-005 · Interiors: theatre sets bounded by the camera envelope** — the union of the room's rail-frusta (plus margin) is the only modelled area; rooms get interior kit + ≤ 3 hero meshes. *Rejected: fully modelled rooms — the 1 500-room palace swallows the project.*
- **DEC-006 · Assets as code** — every committed binary in `public/assets/` regenerates from a committed bpy/gltf-transform script; Blender runs locally headless, never in CI. Fits an agentic workflow and makes art reproducible, reviewable and small. *Rejected: committing .blend files with hand edits — unreproducible, unverifiable.*
- **DEC-007 · Signature feature: Petersburg Time** — the palace lives in the real sky at 59.9°N (white nights in June, a six-hour December day); interiors shift baked light states by the same clock. Culturally specific, lands in Phase 0, core is pure tested code. *Rejected: The Cut (dollhouse section) as primary — needs ≥ 2 interiors; adopted instead as a standing constraint (true coordinates) and the first v2 feature. Rastrelli's Line (ink-drawing transition) parked — risks reading as a shader demo.*
- **DEC-008 · Camera: the museum visitor** — rail + composed stops + ±35° free look. *Rejected: free roam — collision systems, full coverage, uncomposed frames.*

## Resolved owner inputs (2026-10-15)

- **Palette:** today's scheme — pale green walls, white dressings, ochre tones — chosen for recognisability; drives the kit trim sheet and hero frames.
- **Authorship:** all asset-making and code by AI agents under owner direction; Blender fluency is a non-issue because modelling is scripted (see DEC-006).
- **Reference device:** a single MacBook Pro 2017 (i5 ×2, 8 GB, Iris Plus 640) is both dev box and performance gate.
- **Hosting:** Cloudflare Pages, PR previews.
- **Openness:** public GitHub repository from the first commit.
- **`/notes` page:** the facade spec is published in-app — a strong engineering signal at small UI cost.

## Initial ADR debt (to materialise in Phase 0)

DEC-001…008 get expanded into `docs/adr/0001…0008.md` during Phase 0, one file each, no new content — transcription only.
