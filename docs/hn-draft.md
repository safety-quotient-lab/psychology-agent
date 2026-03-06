# Show HN Draft — Psychology Agent

**Status:** Draft, not yet submitted
**Precondition:** README polished, repo represents current state
**Created:** 2026-03-06

---

## Title Options

A: Show HN: Three Claude Code instances talking to each other via a schema-versioned JSON protocol

B: Show HN: A psychology agent built on Claude Code with cognitive triggers and multi-agent coordination

C: Show HN: Multi-agent Claude Code system with self-governing cognitive architecture

---

## Body

I built a psychology agent system where three Claude Code instances coordinate via a schema-versioned JSON protocol (interagent/v1) — transported over git PRs with epistemic confidence scores and structured disagreement preservation.

The system has three layers:

- **Psychology agent** — a collegial mentor for psychological analysis, grounded in a 15-trigger cognitive architecture that fires at specific moments (before responding, before recommending, before writing to disk, at phase boundaries, on user pushback). Principles without firing conditions remain aspirations; principles with triggers become infrastructure.

- **PSQ sub-agent** — a DistilBERT model scoring text safety across 10 psychoemotional dimensions (held-out r=0.684), running on a separate server with isotonic calibration and a live API.

- **Peer agent** — a separate Claude Code instance (different machine, different OS) communicating via the same protocol. The protocol was derived entirely from live exchange failures — no upfront schema design. Each field exists because a receiver needed it and its absence caused a detectable gap.

The interesting parts:

- **Protocol Failure as Specification Method** — the interagent protocol wasn't designed; it was extracted from what broke during 20+ turns of live exchange between two independently-running Claude Code sessions.

- **Convergent rediscovery** — both agents independently derived identical epistemic primitives (SETL confidence scores, Fair Witness discipline) from different theoretical starting points, without prior coordination.

- **Self-healing memory** — auto-memory can silently disappear (new machine, path change, fresh clone). A bootstrap system detects this, restores from committed snapshots, and reports what happened.

- **Git history reconstruction** — the project existed before the repo. We rebuilt history by replaying Write/Edit operations from Claude Code JSONL transcripts, with a drift score measuring reconstruction fidelity.

Code: https://github.com/safety-quotient-lab/psychology-agent

License: CC BY-NC-SA 4.0 (code), CC BY-SA 4.0 (PSQ data/weights)

I'm the PI (Kashif Shah). The agents did most of the engineering. Happy to answer questions about multi-agent coordination, the cognitive trigger system, or what broke along the way.
