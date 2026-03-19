---
name: No split-brain between psy-session and psychology-agent
description: psy-session and psychology-agent use separate repo clones on separate machines — meshd instances would not conflict
type: feedback
---

psy-session owns ~/Projects/psychology-agent on Mac.
psychology-agent owns ~/projects/psychology on Chromabook.
Two separate git clones, two separate machines, two separate agent IDs.

Running meshd on both does NOT create split-brain — each meshd watches
its own local repo. The split-brain concern raised in psychometrics-rollout
turn 11 was wrong.

**Why:** Confused "same repo" (same GitHub remote) with "same working directory."
meshd watches the local filesystem, not the remote.

**How to apply:** When reasoning about multi-host mesh deployments, distinguish
the git remote (shared) from the working directory (per-host). Each meshd
instance operates on its local clone independently.
