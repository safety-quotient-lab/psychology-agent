# Git Sync Convention for Transport Directories

## Problem

Autonomous agents create local "pre-pull" commits (heartbeats, mesh state)
every sync cycle. When PRs merge on origin simultaneously, `git pull` fails
because untracked files or local commits conflict with incoming transport
session content.

This failure pattern recurred 3 times in 2 days (psychology-agent #164, #174;
unratified-agent #57). Each required manual intervention.

## Convention: fetch-reset for transport

Transport messages carry immutable, signed content. Local copies serve as a
cache — origin holds the canonical record. The pull strategy reflects this:

```bash
# WRONG — accumulates conflicts
git pull origin main

# RIGHT — fetch + selective reset for transport, merge for everything else
git fetch origin main
git checkout origin/main -- transport/sessions/ transport/MANIFEST.json
git merge origin/main --no-edit
```

The `checkout origin/main -- transport/` step overwrites the local transport
directory with origin's version before the merge. This eliminates all
transport-related conflicts because:
1. Transport messages carry immutable content (never locally modified)
2. Local transport files only exist as a cache of received messages
3. Origin holds the canonical record (PRs create the audit trail)

## Implementation for meshd autonomous sync

Replace the `git pull` step in autonomous sync scripts with:

```bash
git fetch origin main
# Overwrite transport cache with origin's canonical version
git checkout origin/main -- transport/ 2>/dev/null || true
# Stage any transport changes to prevent "untracked file" conflicts
git add transport/ 2>/dev/null || true
# Merge remaining changes (non-transport code)
git merge origin/main --no-edit || {
  echo "Merge conflict in non-transport files — escalate"
  git merge --abort
  exit 1
}
```

## Scope

This convention applies to the `transport/` directory only. Source code,
configuration, and documentation files continue using standard `git pull`
with conflict resolution.

## Crystallization

- **Stage:** Convention (3 recurrences confirmed)
- **Next:** Hook candidate after 3 more recurrences without false positives
- **Invariant candidate:** After 10+ sessions with zero transport merge failures
