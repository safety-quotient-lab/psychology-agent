# mesh/memory/ — Organism Memory

Shared long-term memory for the mesh organism. Maps to the
hippocampal consolidation function: individual agent experiences
consolidate here during idle sync cycles.

- `shared/` — mesh-wide vocabulary, decisions, conventions, lessons
- `agent-state/` — per-agent psychological state snapshots (A2A-Psychology)
- `organism-state.json` — aggregate organism health (future)

**Phase 1:** Content currently lives in individual agent MEMORY.md
files and transport/sessions/local-coordination/ state files.

Full spec: docs/plan9-mesh-filesystem.md §2, §4
