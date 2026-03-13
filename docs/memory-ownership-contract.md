# Memory Ownership Contract

Session 84, Phase 4 of cogarch refactor. Defines ownership, authority, and
reconciliation rules for each state location.

**Design principle:** Each piece of state has exactly one authoritative source.
Other locations may cache or index that state, but the authoritative source
wins on conflict.

---

## Authority Hierarchy

| Location | Authority For | Format | Persistence | Reconciliation |
|---|---|---|---|---|
| **CLAUDE.md** | Stable conventions, skills, scope | Markdown | Committed (auto-loaded) | Canonical — never overridden |
| **docs/cognitive-triggers.md** | Trigger definitions and checks | Markdown | Committed | Canonical — never overridden |
| **docs/architecture.md** | Design decisions | Markdown | Committed | Canonical — decisions table is source of truth |
| **docs/ef1-governance.md** | Governance invariants | Markdown | Committed | Canonical — amendment procedure required |
| **MEMORY.md** (auto-memory) | Session orientation state | Markdown | Auto-memory (~60 lines) | Orientation — refreshed each session, snapshot as backup |
| **Topic files** (auto-memory) | Domain-specific detail | Markdown | Auto-memory (no limit) | Detail store — loaded on demand |
| **state.db** | Queryable index of everything | SQLite | Gitignored (project root) | Index — rebuilds from markdown sources. Markdown wins on conflict |
| **lessons.md** | Pattern errors, lessons learned | Markdown | Gitignored | Private — never shared, never committed |
| **MEMORY-snapshot.md** | Recovery copy of orientation | Markdown | Committed | Copy — overwritten each /cycle from auto-memory |
| **lab-notebook.md** | Session history (chronological) | Markdown | Committed | Append-only — never overwritten except Current State block |
| **journal.md** | Research narrative | Markdown | Committed | Append-only — new sections added, never removed |


## Data Flow Rules

```
User input / session work
       ↓
   MEMORY.md (orientation — overwrite Active Thread)
       ↓
   Topic files (detail — update relevant topics)
       ↓
   state.db (index — dual-write from markdown)
       ↓
   /cycle propagation chain:
     lab-notebook.md (session entry — append)
     journal.md (narrative — append if significant)
     docs/architecture.md (decisions — update if resolved)
     MEMORY-snapshot.md (recovery — overwrite from MEMORY.md)
```

## Conflict Resolution

When state disagrees between locations:

1. **Committed docs** (CLAUDE.md, architecture.md, ef1-governance.md) always win.
   These represent deliberate, reviewed, version-controlled decisions.

2. **Auto-memory** (MEMORY.md, topic files) reflects current session state.
   If auto-memory contradicts committed docs, auto-memory contains an error.

3. **state.db** functions as a queryable index, not a source of truth.
   If state.db contradicts markdown, rebuild state.db from markdown
   (`bootstrap_state_db.py`).

4. **lab-notebook.md** and **journal.md** function as historical records.
   They do not get corrected retroactively — errors in historical entries
   get noted in subsequent entries, not silently fixed.


## Reconciliation Protocol (new — addresses E-G3)

At session start (T1), after loading state:

1. Verify MEMORY.md Active Thread is consistent with last lab-notebook entry
2. Verify state.db session count matches lab-notebook session count
3. If discrepancy: report to user, do not auto-fix

At /cycle (end of session):

1. Dual-write all changes to both markdown and state.db
2. Snapshot MEMORY.md → MEMORY-snapshot.md
3. Verify snapshot line count matches source (T9 #1)


## CoALA Memory Type Mapping (Phase 5 preparation)

Per CoALA framework (Sumers et al., 2023), memory stores should distinguish:

| CoALA Type | Our Location | Content Examples |
|---|---|---|
| **Episodic** | lab-notebook.md, session transcripts | What happened, when, with what artifacts |
| **Semantic** | architecture.md, journal.md, topic files | Design decisions, research findings, domain knowledge |
| **Procedural** | CLAUDE.md, cognitive-triggers.md, skills/ | How to do things, conventions, trigger sequences |
| **Working** | Loaded context (system prompt + conversation) | Currently active information |

This mapping already exists implicitly — the contract makes it explicit.
Phase 5 adds formal labeling and retrieval priority (ACT-R activation equation).


## Schema.org Typed Retrieval (Phase 5 extension)

Memory entries carry schema.org types via the `universal_facets` table:

| Memory Location | Schema Type | Retrieval Query |
|---|---|---|
| lab-notebook sessions | schema:Event | `SELECT * FROM universal_facets WHERE facet_value = 'schema:Event'` |
| architecture decisions | schema:ChooseAction | `SELECT * FROM universal_facets WHERE facet_value = 'schema:ChooseAction'` |
| transport messages | schema:Message | `SELECT * FROM universal_facets WHERE facet_value = 'schema:Message'` |
| claims | schema:Claim | `SELECT * FROM universal_facets WHERE facet_value = 'schema:Claim'` |
| lessons | schema:LearningResource | `SELECT * FROM universal_facets WHERE facet_value = 'schema:LearningResource'` |
| trigger state | schema:HowToStep | `SELECT * FROM universal_facets WHERE facet_value = 'schema:HowToStep'` |

This enables CoALA-style typed retrieval: "find all decisions" queries
schema:ChooseAction rather than scanning architecture.md.
