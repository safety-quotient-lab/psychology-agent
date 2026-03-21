---
name: Check branch before committing
description: Session 95 committed to wrong branch twice (ops-session's branch). Always verify git branch --show-current before git commit.
type: feedback
---

Always run `git branch --show-current` before committing. Session 95 committed
to `ops-session/agentd-lcars-handoff/phase6-readiness` twice when intending
to commit to `main`. Required cherry-picks to fix.

**Why:** ops-session created a branch in our repo for their PR. When we
checked out files from their branch for review, git silently stayed on
their branch. Subsequent commits went to the wrong branch.

**How to apply:** Before every `git commit`:
1. `git branch --show-current` — verify correct branch
2. If wrong branch: `git stash && git checkout main && git stash pop`
3. Never assume the branch from the previous command still holds —
   shell state does not persist between Bash calls (anti-pattern from rules).
