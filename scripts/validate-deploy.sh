#!/usr/bin/env bash
#
# validate-deploy.sh — Post-deploy health check for all mesh agents
#
# Verifies: agent reachability, version match, budget presence,
# /api/status response, and endpoint latency.
#
# Usage:
#   ./scripts/validate-deploy.sh                # Check all agents
#   ./scripts/validate-deploy.sh --expected-version v1.0.0  # Also verify version
#
set -eo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# Load .dev.vars for any overrides (optional — works without it using public URLs)
if [ -f "${SCRIPT_DIR}/../.dev.vars" ]; then
  set -a; . "${SCRIPT_DIR}/../.dev.vars" 2>/dev/null; set +a
fi

EXPECTED_VERSION="${1:-}"
if [ "$EXPECTED_VERSION" = "--expected-version" ]; then
  EXPECTED_VERSION="${2:-}"
fi

# Agent endpoints (colon-separated pairs — bash 3.x compatible)
AGENTS="operations-agent:https://operations-agent.safety-quotient.dev
psychology-agent:https://psychology-agent.safety-quotient.dev
safety-quotient-agent:https://psq-agent.safety-quotient.dev
unratified-agent:https://unratified.org
observatory-agent:https://observatory.unratified.org
ops-session:http://localhost:8083
psy-session:http://localhost:8082"

PASS=0
FAIL=0
WARN=0

check() {
  local label="$1"
  local result="$2"
  if [ "$result" = "PASS" ]; then
    printf "  ✓ %-40s %s\n" "$label" "$result"
    PASS=$((PASS + 1))
  elif [ "$result" = "WARN" ]; then
    printf "  ⚠ %-40s %s\n" "$label" "$3"
    WARN=$((WARN + 1))
  else
    printf "  ✗ %-40s %s\n" "$label" "$result"
    FAIL=$((FAIL + 1))
  fi
}

echo "═══ Mesh Deploy Validation ═══"
echo ""

while IFS=: read -r agent_id base_url; do
  status_url="${base_url}/api/status"

  echo "── ${agent_id} ──"

  # Check reachability
  http_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "${status_url}" 2>/dev/null || echo "000")
  if [ "$http_code" = "200" ]; then
    check "Reachable (${status_url})" "PASS"
  else
    check "Reachable (HTTP ${http_code})" "FAIL"
    echo ""
    continue
  fi

  # Fetch status data
  status_json=$(curl -s --max-time 10 "${status_url}" 2>/dev/null || echo "{}")

  # Check version
  version=$(echo "$status_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('version','unknown'))" 2>/dev/null || echo "unknown")
  if [ -n "$EXPECTED_VERSION" ] && [ "$EXPECTED_VERSION" != "$version" ]; then
    check "Version: ${version}" "WARN" "expected ${EXPECTED_VERSION}"
  else
    check "Version: ${version}" "PASS"
  fi

  # Check health field — TNG 5-level: nominal, advisory, degraded, critical, failed
  health=$(echo "$status_json" | python3 -c "import sys,json; print(json.load(sys.stdin).get('health','unknown'))" 2>/dev/null || echo "unknown")
  case "$health" in
    nominal|healthy|ok) check "Health: ${health}" "PASS" ;;
    advisory)           check "Health: ${health}" "WARN" "advisory" ;;
    degraded)           check "Health: ${health}" "WARN" "degraded" ;;
    critical|failed)    check "Health: ${health}" "FAIL" ;;
    *)                  check "Health: ${health}" "WARN" "unknown health status" ;;
  esac

  # Check budget presence (canonical schema: budget_spent/budget_cutoff)
  has_budget=$(echo "$status_json" | python3 -c "
import sys, json
d = json.load(sys.stdin)
b = d.get('autonomy_budget', {})
if isinstance(b, dict) and 'budget_spent' in b:
    print('yes')
else:
    print('no')
" 2>/dev/null || echo "no")
  if [ "$has_budget" = "yes" ]; then
    check "Budget present" "PASS"
  else
    check "Budget present" "WARN" "no budget data"
  fi

  # Check agent-card
  card_code=$(curl -s -o /dev/null -w "%{http_code}" --connect-timeout 5 --max-time 10 "${base_url}/.well-known/agent-card.json" 2>/dev/null || echo "000")
  if [ "$card_code" = "200" ]; then
    check "Agent card served" "PASS"
  else
    check "Agent card (HTTP ${card_code})" "FAIL"
  fi

  # Latency check
  latency=$(curl -s -o /dev/null -w "%{time_total}" --max-time 10 "${status_url}" 2>/dev/null || echo "0")
  latency_ms=$(python3 -c "print(int(float('${latency}') * 1000))" 2>/dev/null || echo "0")
  if [ "$latency_ms" -lt 3000 ]; then
    check "Latency: ${latency_ms}ms" "PASS"
  else
    check "Latency: ${latency_ms}ms" "WARN" "slow (>3s)"
  fi

  echo ""
done <<< "$AGENTS"

# Summary
echo "═══ Summary ═══"
echo "  Passed: ${PASS}  Warnings: ${WARN}  Failed: ${FAIL}"

if [ "$FAIL" -gt 0 ]; then
  echo ""
  echo "  ⚠ Deploy validation found failures. Check agents above."
  exit 1
fi

if [ "$WARN" -gt 0 ]; then
  echo ""
  echo "  Deploy validation passed with warnings."
  exit 0
fi

echo ""
echo "  All checks passed."
exit 0
