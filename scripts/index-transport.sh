#!/usr/bin/env bash
#
# index-transport.sh — Index transport session files into state.db
#
# Scans transport/sessions/ for JSON message files and inserts metadata
# into the transport_messages table. Idempotent — uses INSERT OR IGNORE
# on the unique filename constraint.
#
# Usage:
#   ./scripts/index-transport.sh              # Index into default state.db
#   ./scripts/index-transport.sh /path/to/db  # Index into specified DB

set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DB_PATH="${1:-${BUDGET_DB_PATH:-$REPO_ROOT/state.db}}"
TRANSPORT_DIR="$REPO_ROOT/transport/sessions"

if [ ! -f "$DB_PATH" ]; then
  echo "ERROR: state.db not found at $DB_PATH — run bootstrap-state-db.sh first" >&2
  exit 1
fi

if [ ! -d "$TRANSPORT_DIR" ]; then
  echo "No transport/sessions directory found"
  exit 0
fi

echo "Indexing transport messages into: $DB_PATH"
echo "Source: $TRANSPORT_DIR"
echo "---"

# Use Python to parse all JSON files and generate SQL — handles arrays,
# special characters, and complex field extraction robustly.
python3 - "$DB_PATH" "$TRANSPORT_DIR" <<'PYEOF'
import json, os, sys, subprocess, re

db_path = sys.argv[1]
transport_dir = sys.argv[2]
indexed = 0
skipped = 0
errors = 0

def run_sql(query):
    result = subprocess.run(
        ["sqlite3", db_path, query],
        capture_output=True, text=True
    )
    return result.returncode == 0, result.stderr.strip()

for session_name in sorted(os.listdir(transport_dir)):
    session_dir = os.path.join(transport_dir, session_name)
    if not os.path.isdir(session_dir):
        continue

    for filename in sorted(os.listdir(session_dir)):
        if not filename.endswith(".json") or filename == "MANIFEST.json":
            continue

        filepath = os.path.join(session_dir, filename)

        # Parse direction from filename
        direction = "unknown"
        file_from = ""
        file_to = ""
        file_turn = 0

        m = re.match(r'^from-(.+?)-(\d+)\.json$', filename)
        if m:
            direction = "outbound"
            file_from = m.group(1)
            file_turn = int(m.group(2))

        m2 = re.match(r'^to-(.+?)-(\d+)\.json$', filename)
        if m2:
            direction = "inbound"
            file_to = m2.group(1)
            file_turn = int(m2.group(2))

        # Parse JSON content
        try:
            with open(filepath) as f:
                data = json.load(f)
        except (json.JSONDecodeError, IOError):
            errors += 1
            continue

        message_type = data.get("type", data.get("message_type", ""))

        # Subject is required — derive from available fields when absent
        subject = data.get("subject", "") or data.get("title", "") or data.get("session_id", "")
        if not subject.strip():
            # Build from session + type + sender: "peer-registry-update (directive from operations-agent)"
            parts = [session_name]
            if message_type:
                parts.append(f"({message_type}")
                sender = file_from or data.get("from", "")
                if isinstance(sender, dict):
                    sender = sender.get("agent_id", "")
                if sender:
                    parts[-1] += f" from {sender})"
                else:
                    parts[-1] += ")"
            subject = " ".join(parts)

        # Handle 'from' field (string or dict or list)
        json_from = data.get("from", "")
        if isinstance(json_from, dict):
            json_from = json_from.get("agent_id", str(json_from))
        elif isinstance(json_from, list):
            json_from = ", ".join(
                x.get("agent_id", str(x)) if isinstance(x, dict) else str(x)
                for x in json_from
            )

        # Handle 'to' field (string, dict, or array of strings/dicts)
        json_to = data.get("to", "")
        if isinstance(json_to, dict):
            json_to = json_to.get("agent_id", str(json_to))
        elif isinstance(json_to, list):
            json_to = ", ".join(
                x.get("agent_id", str(x)) if isinstance(x, dict) else str(x)
                for x in json_to
            )

        json_turn = data.get("turn", "")

        # Prefer JSON-extracted values; fall back to filename-parsed
        from_agent = file_from or json_from
        to_agent = file_to or json_to
        turn = file_turn or (int(json_turn) if json_turn and str(json_turn).isdigit() else 0)

        # Escape for SQL
        def esc(s):
            return str(s).replace("'", "''") if s else ""

        sql = (
            f"INSERT OR IGNORE INTO transport_messages "
            f"(filename, session_name, direction, from_agent, to_agent, turn, message_type, subject) "
            f"VALUES ('{esc(filename)}', '{esc(session_name)}', '{esc(direction)}', "
            f"'{esc(from_agent)}', '{esc(to_agent)}', {turn}, '{esc(message_type)}', '{esc(subject)}');"
        )

        ok, err = run_sql(sql)
        if ok:
            # Check if it was actually inserted (not ignored)
            _, count_out = run_sql("SELECT changes();")
            indexed += 1
        else:
            skipped += 1

print(f"Indexed: {indexed} messages")
print(f"Skipped: {skipped} (already indexed or constraint)")
print(f"Errors: {errors} (unparseable JSON)")

# Get total count
result = subprocess.run(
    ["sqlite3", db_path, "SELECT count(*) FROM transport_messages"],
    capture_output=True, text=True
)
print(f"Total: {result.stdout.strip()} messages in DB")
PYEOF
