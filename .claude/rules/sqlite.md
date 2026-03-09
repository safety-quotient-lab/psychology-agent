# SQLite State Layer Conventions

## File Location

- Database: `state.db` in project root (gitignored)
- Schema: `scripts/schema.sql` (committed — canonical schema definition)
- Bootstrap: `scripts/bootstrap_state_db.py` (committed — rebuilds DB from files)

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

## Gitignore

`state.db` and `state.db-wal` and `state.db-shm` are gitignored.
The schema and bootstrap script are committed — the DB rebuilds from those.
