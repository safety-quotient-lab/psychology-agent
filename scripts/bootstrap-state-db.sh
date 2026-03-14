#!/usr/bin/env bash
#
# bootstrap-state-db.sh — Initialize or rebuild state.db from schema + existing data
#
# Usage:
#   ./scripts/bootstrap-state-db.sh              # Build at default path (./state.db)
#   ./scripts/bootstrap-state-db.sh /path/to/db  # Build at specified path
#
# Safe to run on existing DB — all CREATE statements use IF NOT EXISTS.
# Rebuilds schema without destroying existing data.

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${1:-${BUDGET_DB_PATH:-$REPO_ROOT/state.db}}"
SCHEMA="$SCRIPT_DIR/schema.sql"

if [ ! -f "$SCHEMA" ]; then
  echo "ERROR: schema.sql not found at $SCHEMA" >&2
  exit 1
fi

echo "Bootstrapping state.db at: $DB_PATH"
echo "Schema: $SCHEMA"
echo "---"

# Apply schema
sqlite3 "$DB_PATH" < "$SCHEMA"
echo "Schema applied (version $(sqlite3 "$DB_PATH" "SELECT max(version) FROM schema_versions"))"

# Seed autonomy budget for operations-agent if missing
EXISTING=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM autonomy_budget WHERE agent_id = 'operations-agent'")
if [ "$EXISTING" = "0" ]; then
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S")
  sqlite3 "$DB_PATH" "
    INSERT INTO autonomy_budget (agent_id, budget_current, budget_max, shadow_mode, last_audit, updated_at)
    VALUES ('operations-agent', 50, 50, 0, '$TIMESTAMP', '$TIMESTAMP');
  "
  echo "Seeded: operations-agent budget 50/50"
fi

# Seed decisions from plan.md if decisions table empty
DECISION_COUNT=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM decisions")
if [ "$DECISION_COUNT" = "0" ]; then
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S")
  sqlite3 "$DB_PATH" "
    INSERT INTO decisions (decision_key, title, source, created_at) VALUES
    ('d48-compositor-ownership', 'Operations-agent owns compositor', 'human arbiter (operations-agent-standup T3)', '$TIMESTAMP'),
    ('d49-vocabulary-governance', 'Operations-agent governs shared vocabulary', 'human arbiter (operations-agent-standup T3)', '$TIMESTAMP'),
    ('d50-private-first', 'Private repo first, public after audit', 'human arbiter (operations-agent-standup T3)', '$TIMESTAMP'),
    ('d51-agent-card-discovery', '.well-known/agent-card.json for discovery', 'human arbiter (operations-agent-standup T3)', '$TIMESTAMP'),
    ('d52-dual-transport', 'Dual-channel transport (git-PR + ZeroMQ)', 'human arbiter (operations-agent-standup T3)', '$TIMESTAMP'),
    ('d53-opus-model', 'Global CLI model default: Opus', 'human arbiter (2026-03-13)', '$TIMESTAMP'),
    ('d54-infra-separation', 'Infrastructure separation: ops owns mesh infra, domain agents focus on domain', 'human arbiter (2026-03-13)', '$TIMESTAMP');
  "
  echo "Seeded: 7 decisions from plan.md"
fi

# Seed cogarch state for self
COGARCH_COUNT=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM cogarch_state WHERE agent_id = 'operations-agent'")
if [ "$COGARCH_COUNT" = "0" ]; then
  COGARCH_FILE="$REPO_ROOT/cogarch.config.json"
  if [ -f "$COGARCH_FILE" ]; then
    HASH=$(shasum -a 256 "$COGARCH_FILE" | cut -d' ' -f1)
    TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%S")
    sqlite3 "$DB_PATH" "
      INSERT INTO cogarch_state (agent_id, version, content_hash, synced_at, source, created_at, updated_at)
      VALUES ('operations-agent', '2.0.0', '$HASH', '$TIMESTAMP', 'local', '$TIMESTAMP', '$TIMESTAMP');
    "
    echo "Seeded: operations-agent cogarch state (hash: ${HASH:0:12}...)"
  fi
fi

echo "---"
echo "Tables:"
sqlite3 "$DB_PATH" ".tables"
echo ""
echo "Row counts:"
for table in autonomy_budget decisions claims trigger_state memory_entries transport_messages cogarch_state mos_scores universal_facets; do
  count=$(sqlite3 "$DB_PATH" "SELECT count(*) FROM $table" 2>/dev/null || echo "0")
  printf "  %-22s %s\n" "$table" "$count"
done
echo ""
echo "Done. Verify with: sqlite3 $DB_PATH '.schema'"
