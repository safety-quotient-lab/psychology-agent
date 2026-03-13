#!/usr/bin/env bash
#
# usage-report.sh — Aggregate Claude API spend from instrumented session logs
#
# Usage:
#   ./scripts/usage-report.sh              # All agents, today
#   ./scripts/usage-report.sh --all        # All agents, all time
#   ./scripts/usage-report.sh --agent psq  # Filter by agent

set -eo pipefail

# shellcheck source=agents.conf.sh
source "$(dirname "$0")/agents.conf.sh"

FILTER_AGENT=""
DATE_FILTER="today"

while [ $# -gt 0 ]; do
  case "$1" in
    --all) DATE_FILTER="all"; shift ;;
    --agent) FILTER_AGENT="$2"; shift 2 ;;
    *) echo "Usage: usage-report.sh [--all] [--agent NAME]" >&2; exit 1 ;;
  esac
done

TODAY=$(date -u +"%Y-%m-%d")

ssh "${SSH_HOST}" '
DATE_FILTER="'"${DATE_FILTER}"'"
FILTER_AGENT="'"${FILTER_AGENT}"'"
TODAY="'"${TODAY}"'"

python3 -c "
import json, glob, sys

date_filter = \"'"${DATE_FILTER}"'\"
filter_agent = \"'"${FILTER_AGENT}"'\"
today = \"'"${TODAY}"'\"

logs = glob.glob(\"/tmp/claude-usage-*.jsonl\")
agents = {}

for log_path in logs:
    try:
        with open(log_path) as f:
            for line in f:
                line = line.strip()
                if not line:
                    continue
                try:
                    rec = json.loads(line)
                except:
                    continue

                agent = rec.get(\"agent_id\", \"unknown\")
                if filter_agent and filter_agent not in agent:
                    continue

                ts = rec.get(\"timestamp\", \"\")
                if date_filter == \"today\" and not ts.startswith(today):
                    continue

                if agent not in agents:
                    agents[agent] = {
                        \"sessions\": 0,
                        \"cost_usd\": 0.0,
                        \"input_tokens\": 0,
                        \"output_tokens\": 0,
                        \"cache_read\": 0,
                        \"duration_ms\": 0,
                    }

                a = agents[agent]
                a[\"sessions\"] += 1
                a[\"cost_usd\"] += rec.get(\"cost_usd\", 0)
                a[\"input_tokens\"] += rec.get(\"input_tokens\", 0)
                a[\"output_tokens\"] += rec.get(\"output_tokens\", 0)
                a[\"cache_read\"] += rec.get(\"cache_read_tokens\", 0)
                a[\"duration_ms\"] += rec.get(\"duration_ms\", 0)
    except Exception as e:
        print(f\"Error reading {log_path}: {e}\", file=sys.stderr)

if not agents:
    period = \"today\" if date_filter == \"today\" else \"all time\"
    print(f\"No usage data found ({period})\")
    sys.exit(0)

# Header
print(f\"{\"AGENT\":<22} {\"SESSIONS\":>8} {\"COST\":>10} {\"IN_TOK\":>10} {\"OUT_TOK\":>10} {\"CACHE%\":>7} {\"TIME\":>8}\")
print(f\"{\"-----\":<22} {\"--------\":>8} {\"------\":>10} {\"------\":>10} {\"-------\":>10} {\"------\":>7} {\"----\":>8}\")

total_cost = 0
total_sessions = 0

for agent in sorted(agents.keys()):
    a = agents[agent]
    total_in = a[\"input_tokens\"] + a[\"cache_read\"]
    cache_pct = (a[\"cache_read\"] / total_in * 100) if total_in > 0 else 0
    duration_min = a[\"duration_ms\"] / 60000

    print(f\"{agent:<22} {a[\"sessions\"]:>8} {a[\"cost_usd\"]:>9.2f}$ {a[\"input_tokens\"]:>10,} {a[\"output_tokens\"]:>10,} {cache_pct:>6.1f}% {duration_min:>7.1f}m\")

    total_cost += a[\"cost_usd\"]
    total_sessions += a[\"sessions\"]

print(f\"{\"\":->82}\")
print(f\"{\"TOTAL\":<22} {total_sessions:>8} {total_cost:>9.2f}$\")
"
'
