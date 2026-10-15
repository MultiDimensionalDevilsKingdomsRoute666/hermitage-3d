# Relay rounds

How design happens here: the orchestrator (working session) sends one self-contained brief at a time to a specialist chat model (no tools, no repo access), then salvages the reply into this repository and validates it. Briefs live in `docs/briefs/` **only while open** — deleted once their outcome is integrated; the text survives in the source chat, the outcome survives in this log and in the docs.

| Round | Date | Topic | Outcome | Integrated in |
|---|---|---|---|---|
| 1 | 2026-10-15 | Architecture, stack, asset strategy, signature feature, phased roadmap | Accepted core. Orchestrator corrections: Phase 0 may split into 0a/0b; CI golden-frames flagged unproven (fallback: local goldens + CI smoke); Blender excluded from CI (budgets from committed artifacts); reference device corrected to the owner's 2017 MacBook; "assets as code" adopted (agentic bpy scripts); palette, hosting, openness resolved from owner inputs | README.md, ROADMAP.md, docs/architecture.md, docs/decisions.md, docs/charter.md, docs/artistic-license.md, docs/parking-lot.md |
