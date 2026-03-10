# SQLite State Layer Conventions

## File Location

- Database: `state.db` in project root (gitignored)
- Schema: `scripts/schema.sql` (committed — canonical schema definition)
- Bootstrap: `scripts/bootstrap_state_db.py` (committed — rebuilds DB from files)
- Dual-write: `scripts/dual_write.py` (committed — incremental upserts for /sync and /cycle)

## Phase 1 Protocol (current)

Markdown remains source of truth. The DB serves as a queryable index.

- **Dual-write:** Every state change writes to both markdown AND SQLite.
  Write markdown first, then DB. If DB write fails, markdown stands alone.
- **Recovery:** If `state.db` missing or corrupt, run `bootstrap_state_db.py`
  to rebuild from markdown + transport JSON files.
- **Conflict resolution:** Markdown wins. If DB and markdown disagree, the
  bootstrap script resolves by regenerating the DB from files.

## Query Patterns

Prefer SQL queries over file reads when looking up specific information:

```python
# Instead of reading all transport files to find unprocessed messages:
SELECT filename, turn, subject FROM transport_messages WHERE processed = FALSE;

# Instead of reading architecture.md to find one decision:
SELECT * FROM decision_chain WHERE decision_key = 'psq-structural-model';

# Instead of reading all topic files to find stale entries:
SELECT * FROM memory_entries WHERE last_confirmed < date('now', '-5 days');
```

## Dual-Write Examples

When /sync processes a transport message:
1. Read the JSON file (for full content review)
2. INSERT into `transport_messages` (metadata index)
3. UPDATE `processed = TRUE, processed_at = datetime('now')` after review

When /cycle updates memory files:
1. Edit the markdown topic file (source of truth)
2. INSERT OR REPLACE into `memory_entries` (queryable index)
3. UPDATE `last_confirmed` on entries confirmed this session

When a design decision resolves:
1. Edit architecture.md (human-readable record)
2. INSERT into `decision_chain` with `derives_from` backreference

## Naming Conventions

- Table names: snake_case, plural (`transport_messages`, not `transport_message`)
- Column names: snake_case
- `created_at`: auto-populated timestamp on every table
- `*_at` suffix: all timestamp columns (consistent with `created_at` pattern)
- Boolean columns: use INTEGER (0/1) — SQLite convention

## Schema Changes

- Increment `schema_version` table on every migration
- Add new columns with defaults (backward compatible)
- Never drop columns in Phase 1 — append only
- Migration scripts: `scripts/migrate_v{N}.sql`

## Deterministic Keys

Every queryable entity has a computable address — a key derivable from its
source data without search. This eliminates ambiguous lookups and enables
cross-table references by convention.

| Table | Key column | Derivation rule | Example |
|-------|-----------|-----------------|---------|
| `transport_messages` | `filename` | File basename (unique per session dir) | `from-psq-sub-agent-021.json` |
| `decision_chain` | `decision_key` | Kebab-case of decision name from architecture.md | `psq-structural-model` |
| `memory_entries` | `(topic, entry_key)` | Topic from filename; entry_key from bold-prefix or table row key | `('psq-status', 'model-version')` |
| `psq_status` | `entry_key` | Kebab-case of bold-prefix key from psq-status.md | `'model-version'` |
| `entry_facets` | `(entry_id, facet_type, facet_value)` | Entry FK + facet type + derived value | `(12, 'domain', 'psychometrics')` |
| `trigger_state` | `trigger_id` | `T{N}` from docs/cognitive-triggers.md heading | `T3` |
| `session_log` | `id` | Session number from lab-notebook heading | `47` |
| `claims` | `(transport_msg, claim_id)` | Parent message FK + claim_id from JSON | `(42, 'c1')` |

**Convention:** When inserting, compute the key from the source material. When
querying, compute the key from the same rule — never search by free text when
a deterministic key exists. If a new entity type lacks an obvious deterministic
key, define one in this table before creating the schema.

## Universal Facets (Schema v12)

`universal_facets` replaces the `entry_facets` FK-bound pattern with polymorphic
entity tagging. Any table row can carry any facet — no FK constraint (SQLite
cannot enforce polymorphic FKs; integrity by application convention).

Plan 9 insight: disciplines are namespaces composed at query time, not directories
navigated at storage time.

Two vocabularies classify every entity:

| Facet type | Values | Derivation |
|-----------|--------|------------|
| `psh` | 11 L1 categories: `psychology`, `law`, `computer-technology`, `information-science`, `systems-theory`, `philosophy`, `sociology`, `mathematics`, `communications`, `pedagogy`, `ai-systems` (PL-001) | Keyword heuristic via `bootstrap_facets.py` |
| `schema_type` | `schema:Message`, `schema:Claim`, `schema:ChooseAction`, `schema:Event`, `schema:DefinedTerm`, `schema:LearningResource`, `schema:HowToStep`, `schema:Action`, `schema:SuspendAction` | Static per entity table |
| `domain` | `psychometrics`, `cognitive-architecture`, `design`, `operations` | Topic filename (migrated from `entry_facets`) |
| `work_stream` | `psq-scoring/b3`, `psq-scoring/b5`, etc. | Entry key prefix |
| `agent` | `psychology-agent`, `psq-sub-agent`, `unratified-agent` | Producer/owner |

PSH categories use standard codes where available (PSH9194, PSH8808, etc.).
Project-local extensions use `PL-NNN` codes for domains PSH cannot cover
(PSH last updated ~2015, predates multi-agent AI). L2 sub-categories use
slash-separated values (e.g., `psychology/psychometrics`) and earn inclusion
through literary warrant — `--discover` mode surfaces candidates.

**Write pattern:**
```bash
python scripts/dual_write.py facet \
  --entity-type transport_messages --entity-id 42 \
  --facet-type psh --facet-value psychology
```

**Query pattern:**
```sql
-- All law-related decisions
SELECT dc.* FROM decision_chain dc
  JOIN universal_facets uf ON uf.entity_type = 'decision_chain'
    AND uf.entity_id = dc.id
  WHERE uf.facet_type = 'psh' AND uf.facet_value = 'law';

-- All claims (by schema.org type)
SELECT * FROM universal_facets
  WHERE facet_type = 'schema_type' AND facet_value = 'schema:Claim';
```

**Domain discovery:** `bootstrap_facets.py --discover` surfaces candidate L1/L2
terms from unclassified entities via literary warrant (Hulme, 1911). Also runs
a PSH staleness analysis — identifies domains where PSH vocabulary gaps prevent
classification (e.g., AI/ML systems, distributed systems). Re-run the bootstrap
after adding keywords to reclassify.

**Legacy:** `entry_facets` table retained for backward compatibility. `pje_domain`
facets retired (replaced by `psh`). New code should use `universal_facets`.

## Topic-Specific Tables

When a topic has enough structured, frequently-queried fields to justify
dedicated columns, create a topic-specific table alongside `memory_entries`.

Current topic tables:
- `psq_status` — model version, calibration ID, endpoint URL, status markers

Other topics remain in the generic `memory_entries` table. Promote to a
dedicated table only when free-text `value` parsing becomes a query bottleneck.

## Gitignore

`state.db` and `state.db-wal` and `state.db-shm` are gitignored.
The schema and bootstrap script are committed — the DB rebuilds from those.
