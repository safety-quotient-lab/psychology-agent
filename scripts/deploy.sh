#!/usr/bin/env bash
#
# deploy.sh — Deploy the interagent compositor to Cloudflare Workers
#
# Usage:
#   ./scripts/deploy.sh              # Deploy to production
#   ./scripts/deploy.sh --dry-run    # Preview without deploying
#
# Requires: wrangler CLI authenticated with Cloudflare

set -eo pipefail

DRY_RUN=""
while [ $# -gt 0 ]; do
  case "$1" in
    --dry-run) DRY_RUN="--dry-run"; shift ;;
    *) echo "Usage: deploy.sh [--dry-run]" >&2; exit 1 ;;
  esac
done

WORKER_DIR="$(cd "$(dirname "$0")/../interagent" && pwd)"

echo "Deploying compositor from ${WORKER_DIR}"
echo "---"

# Pre-flight checks
if ! command -v wrangler &>/dev/null; then
  echo "Error: wrangler CLI not found. Install with: npm install -g wrangler" >&2
  exit 1
fi

if [ ! -f "${WORKER_DIR}/wrangler.toml" ] && [ ! -f "${WORKER_DIR}/wrangler.jsonc" ]; then
  echo "Error: no wrangler config found in ${WORKER_DIR}" >&2
  exit 1
fi

# Show what will deploy
echo "Worker files:"
ls -la "${WORKER_DIR}"/*.js "${WORKER_DIR}"/*.html 2>/dev/null | awk '{print "  " $NF}'
echo ""

if [ -n "$DRY_RUN" ]; then
  echo "[DRY RUN] Would deploy to Cloudflare Workers"
  cd "${WORKER_DIR}" && wrangler deploy --dry-run 2>&1
else
  echo "Deploying..."
  cd "${WORKER_DIR}" && wrangler deploy 2>&1
  echo ""
  echo "Deploy complete. Verify at: https://interagent.safety-quotient.dev"
fi
