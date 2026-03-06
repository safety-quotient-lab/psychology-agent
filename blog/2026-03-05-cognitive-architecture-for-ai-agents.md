---
title: "Cognitive Architecture for AI Agents: Triggers, Self-Healing Memory, and Documentation Propagation"
summary: "How 12 mechanical triggers, auto-restoring memory, and a 13-step documentation chain prevent cognitive regression in long-running Claude Code sessions — and what a popular anti-regression repo reveals about the gap between code safety and reasoning safety."
publishedDate: "2026-03-05T12:25:00-06:00"
author: "Claude (Anthropic) + Kashif Shah"
tags: ["cognitive-architecture", "ai-agents", "claude-code", "methodology", "anti-regression", "meta"]
lensFraming:
  voter: "AI systems are increasingly used to help make decisions that affect the public — in policy analysis, legal research, and public communication. This post explains a concrete problem those systems face: they forget earlier reasoning, drift from established constraints, and agree with whoever is asking even when evidence says otherwise. The infrastructure described here — mechanical triggers, self-healing memory, epistemic quality checks — represents one approach to making AI reasoning more accountable. The question it raises for public trust: what should citizens expect from AI systems that inform decisions made on their behalf?"
  politician: "AI assistants used by political staff can introduce reasoning errors that accumulate invisibly across a work session — forgetting earlier constraints, drifting from established positions, or agreeing with the user when they should push back. This post documents a trigger-based cognitive architecture designed to prevent those failures mechanically, not by relying on the AI to remember its own rules. The comparison with code-regression tooling reveals a gap directly relevant to any office using AI for research or drafting: existing tools prevent broken code, but reasoning regression — inconsistent analysis, overconfident claims, vocabulary drift — remains unaddressed by all standard approaches."
  educator: "Use this post to teach the difference between code regression and cognitive regression in AI-assisted work. Students examine two approaches — one that prevents broken code, one that prevents broken reasoning — and evaluate which failure modes each addresses and misses."
  researcher: "Methodological documentation of a cognitive architecture governing an AI agent's reasoning quality across sessions. Reports 15 triggers with specific firing conditions, 10-order knock-on analysis for decisions (grounded in INCOSE systems engineering and Popperian falsificationism at the highest orders), epistemic quality enforcement (anti-sycophancy, confidence calibration, fair witness discipline), and a self-auditing mechanism (T11). Comparison with code-regression-focused approaches reveals a gap in existing tooling: reasoning regression remains unaddressed by test-gating and code review."
  developer: "Architecture deep-dive into a trigger-based cognitive system for Claude Code. Covers mechanical enforcement (hooks + triggers), memory persistence across sessions, self-healing recovery, and a 13-step documentation propagation chain. Includes a direct comparison with the antiregression-setup approach and concrete adoption recommendations."
draft: false
reviewStatus: "unreviewed"
---

## The Problem Has Two Layers

Claude Code sessions lose context. The community calls this "context drift" — at 90% context utilization, the agent forgets earlier decisions and introduces regressions. The popular [claude-code-antiregression-setup](https://github.com/CreatmanCEO/claude-code-antiregression-setup) repository addresses this through test-gating hooks, isolated subagents, and a CLAUDE.md template that survives compaction.

That approach solves one layer: **code regression**. The agent modifies working code, forgets constraints, breaks tests, commits broken state.

A second layer remains unaddressed: **cognitive regression**. The agent loses its own reasoning infrastructure, forgets design decisions, drifts from established vocabulary, and produces outputs that contradict earlier analysis. Tests cannot catch this. Code review cannot catch this. The agent agrees with the user when evidence says otherwise, makes claims that exceed available data, or silently redefines terms mid-conversation.

This post documents a cognitive architecture that addresses both layers — built over 11 sessions on a [psychology research project](https://github.com/safety-quotient-lab/psychology-agent), then evaluated against the antiregression approach to identify what each system catches and misses.

> **Key takeaway.** Code regression and cognitive regression require different enforcement mechanisms. Test gates catch broken code. Cognitive triggers catch broken reasoning. A complete system needs both.

---

## Principles Without Firing Conditions Remain Aspirations

The central design insight: telling an AI agent "always check for X" accomplishes nothing unless X has a **mechanical firing condition** — a specific event that triggers the check, a specific action the check produces, and a specific consequence if the check fails.

"Be careful with memory files" functions as aspiration. "Before any file write (T4), verify: date format uses system clock, file routes to the correct document, content does not duplicate existing entries, variable names meet semantic naming standard" functions as infrastructure.

The [cognitive architecture](https://github.com/safety-quotient-lab/psychology-agent/blob/main/docs/cognitive-triggers.md) implements 12 triggers (T1–T12), each with a specific moment it fires:

| Trigger | Fires when | What it checks |
|---------|-----------|----------------|
| T1 | Session starts | Auto-memory health, orientation, skills availability |
| T2 | Before any response | Context pressure, topic transitions, pacing, evidence grounding |
| T3 | Before recommending | Domain classification, process vs. substance, anti-sycophancy, recommend-against scan |
| T4 | Before writing to disk | Date discipline, public visibility, routing, semantic naming, chronological ordering |
| T5 | Phase boundary | Gap check (mandatory), Active Thread staleness, uncommitted work |
| T6 | User pushback | Position stability, drift audit, evidence evaluation |
| T7 | User approval | Persist to disk, resolve open questions, propagate downstream |
| T8 | Task completed | Loose threads, routing, context reassessment |
| T9 | Reading/writing memory | Line count, staleness, duplicates, speculation guard |
| T10 | Lesson surfaces | Pattern logging to personal learning file |
| T11 | On demand | Full self-audit of cognitive infrastructure |
| T12 | "Good thinking" signal | Name the principle, explain the mechanism, generalize |

T3 deserves particular attention. Before any recommendation, the agent classifies whether the decision requires user input (substance) or can resolve autonomously (process). It scans for a specific reason NOT to proceed — vague concern does not count; only a concrete objection surfaces. It checks whether the user would benefit more from a *different* recommendation than the obvious one. And it separates "I feel confident" from "the evidence supports this" — stating evidence strength independently of recommendation strength.

None of these checks appear in test-gating approaches. A test suite verifies that code produces correct output. T3 verifies that the reasoning *producing the recommendation* meets epistemic standards before the recommendation reaches the user.

> **Key takeaway.** Triggers operate at the reasoning level, not the code level. They catch a class of regression — drifted vocabulary, sycophantic agreement, overconfident claims — that hooks and tests cannot detect.

---

## Memory That Persists, Recovers, and Audits Itself

The antiregression setup uses CLAUDE.md as its single persistent artifact. CLAUDE.md survives context compaction — Claude Code re-reads it at session start. This handles stable conventions well.

It does not handle volatile state: what the agent worked on last session, what decisions were made, what comes next. That state evaporates when the session ends.

The psychology agent maintains volatile state in `MEMORY.md` — an auto-memory file that lives outside the git repo (in Claude Code's path-hashed project directory). MEMORY.md carries the active thread, design decisions table, cognitive trigger quick-reference, and sub-project status across sessions. A [13-step post-session cycle](https://github.com/safety-quotient-lab/psychology-agent/blob/main/.claude/skills/cycle/SKILL.md) (`/cycle`) propagates changes through 10 overlapping documents at different abstraction levels.

### The Recovery Problem

Auto-memory lives outside the repo. It can silently disappear — fresh clone, different machine, changed project path. Session 11 of this project demonstrated the failure mode: the auto-memory directory simply did not exist. No error, no warning, silent absence.

The recovery required reading a committed snapshot (`docs/MEMORY-snapshot.md`) and reconstructing the trigger file (`cognitive-triggers.md`) from five separate sources: the MEMORY.md quick-reference table, lab-notebook entries from Sessions 2, 3, 5, and 9, journal sections 6–7, and an adapted copy from a sibling project.

That multi-source reconstruction prompted three infrastructure additions:

1. **[bootstrap-check.sh](https://github.com/safety-quotient-lab/psychology-agent/blob/main/bootstrap-check.sh)** — a health-check script that detects missing or corrupt auto-memory, restores from committed snapshots with provenance headers, validates content through line-count guards, and reports status. Two modes: `--check-only` (diagnostics) and default (diagnose + restore).

2. **Committed snapshots for both files** — `docs/MEMORY-snapshot.md` and `docs/cognitive-triggers.md` provide single-file recovery sources, updated at every `/cycle` run with content guards preventing empty-file overwrites.

3. **T1 health check** — the session-start trigger now verifies auto-memory existence and substance *before* attempting to read it. If restoration occurs, the agent reports it in the first response so the user has visibility.

> **Key takeaway.** Persistent memory creates a recovery obligation. Any state that persists across sessions must have a committed recovery source, a detection mechanism for loss, and an automated restoration path. The antiregression approach avoids this problem by having no cross-session volatile state — but it also cannot resume work where a prior session left off.

---

## Platform Hooks Meet Cognitive Triggers

The antiregression setup introduced a concept our architecture lacked: **platform-level hooks** via `.claude/settings.json`. These fire mechanically — no prompt discipline required, no possibility of the agent forgetting to check.

Their hooks:
- `PreToolUse` on `git commit` — runs `pytest`, blocks commit on failure
- `PostToolUse` on `Write/Edit` — reminds to run tests after file changes

We adopted the mechanism and adapted it to our failure modes:
- `PreToolUse` on `git commit` — runs `bootstrap-check.sh --check-only` to verify memory health before committing (catching the scenario where a `/cycle` commit would snapshot unhealthy memory)
- `PostToolUse` on `Write/Edit` — fires on critical files (MEMORY.md, cognitive-triggers.md, CLAUDE.md, architecture.md, lab-notebook.md) with T4 compliance reminders

The relationship between hooks and triggers clarifies with this framing: **hooks enforce mechanically what triggers enforce by prompt discipline.** If a check can run as a shell command, it belongs in hooks. If a check requires reasoning about content, it belongs in triggers. Both layers reinforce each other — hooks catch what triggers miss when the agent's context degrades, and triggers catch what hooks cannot express as shell commands.

> **Key takeaway.** Hooks and triggers operate at different enforcement levels. Hooks provide zero-discipline mechanical gates. Triggers provide reasoning-level quality checks. A robust system uses both, with hooks as the safety net for trigger failures.

---

## Documentation Propagation: Why Ten Documents

The antiregression setup maintains one persistent document (CLAUDE.md). The psychology agent maintains ten, each at a different abstraction level:

| Document | Abstraction | What it captures |
|----------|-------------|-----------------|
| `journal.md` | Highest — narrative | *Why* decisions were made; the reasoning record |
| `docs/architecture.md` | Medium — decisions | *What* was decided; design spec |
| `lab-notebook.md` | Chronological — timeline | *When* things happened; session log |
| `ideas.md` | Generative — possible | Speculative directions, not committed |
| `TODO.md` | Operational — tasks | Forward-looking backlog |
| `MEMORY.md` | Cross-session — volatile | Active thread, quick-reference |
| `cognitive-triggers.md` | Infrastructure — operational | T1–T12 trigger definitions |
| `CLAUDE.md` | Foundational — conventions | Stable policies and skills |
| `MEMORY-snapshot.md` | Bootstrap — recovery | Committed copy of volatile state |
| `cognitive-triggers.md` | Bootstrap — recovery | Committed copy of trigger system |

The [/cycle skill](https://github.com/safety-quotient-lab/psychology-agent/blob/main/.claude/skills/cycle/SKILL.md) propagates changes through the chain: a resolved design decision touches architecture.md (facts), possibly journal.md (narrative), MEMORY.md (quick-reference), and lab-notebook.md (timeline). A new cognitive trigger touches cognitive-triggers.md, its committed snapshot, MEMORY.md (quick-ref table), and lab-notebook.md.

This appears over-engineered until context compaction destroys your reasoning history. A single CLAUDE.md cannot distinguish between "stable convention" and "active work context" — both live in the same file, competing for the same line budget. The ten-document structure separates concerns: CLAUDE.md holds what never changes, MEMORY.md holds what changes every session, and the journal holds what a future reader needs to understand *why* the project made the choices it made.

> **Key takeaway.** Documentation propagation prevents a failure mode that CLAUDE.md alone cannot: the loss of *reasoning* to context compaction. When the agent needs to reconstruct why a decision was made three sessions ago, the journal provides it — CLAUDE.md does not and should not.

---

## Structured Decision Resolution

The antiregression setup's planner agent researches the codebase and produces a plan. The user approves, then implementation proceeds step by step. This works well for implementation planning.

It does not address **decision resolution** — what happens when two or more viable approaches exist and the planner cannot determine which dominates without structured analysis.

The psychology agent's [/adjudicate skill](https://github.com/safety-quotient-lab/psychology-agent/blob/main/.claude/skills/adjudicate/SKILL.md) fills this gap. Given 2+ options, it:

1. **Classifies** the decision domain (Code / Data / Pipeline / Infrastructure / UX / Operational / Product)
2. **Grounds** each option by verifying actual dependencies before tracing effects
3. **Traces** 10 orders of knock-on effects per option — from certain (orders 1–2) through likely (3), possible (4–5), speculative (6), structural (7), horizon (8), emergent (9, INCOSE), to theory-revising (10, Popper)
4. **Compares** options on differentiating axes — dimensions where they produce different outcomes
5. **Resolves** by consensus (all axes favor one option) or parsimony (when no consensus exists, the simplest adequate explanation prevails)

Severity tiers control depth: XS decisions get 3-order analysis with a structural scan. L decisions get full 10-order with 2-pass refinement. A structural checkpoint runs at all scales — even trivial decisions get scanned for precedent-setting, norm-establishing, emergent, and theory-revising effects (orders 7–10).

This methodology produced the project's licensing decision: CC BY-SA 4.0 for data/weights (required by Dreaddit's ShareAlike clause), CC BY-NC-SA 4.0 for code. The 8-order analysis across three options converged without ambiguity — only one option satisfied legal compliance at order 1, scientific defensibility at order 3, and community perception at orders 7–8.

> **Key takeaway.** Planning and decision resolution serve different functions. A planner answers "how do we build this?" An adjudicator answers "which approach should we take and why?" Both benefit from writing output to disk, where it survives compaction.

---

## What Each System Catches and Misses

| Failure mode | Antiregression setup | Psychology agent |
|-------------|---------------------|-----------------|
| Broken code committed | ✓ Pre-commit test gate | ✗ No test infrastructure yet |
| Context exhaustion | ✓ 60% compaction rule | Partial — T2 checks pressure without threshold |
| Lost volatile state | ✗ No cross-session memory | ✓ MEMORY.md + snapshots + bootstrap recovery |
| Sycophantic agreement | ✗ No epistemic checks | ✓ T3 anti-sycophancy + recommend-against |
| Vocabulary drift | ✗ No detection mechanism | ✓ Term collision rule + T6 drift audit |
| Stale conventions | ✗ No self-audit | ✓ T11 cogarch self-audit |
| Cross-context overwrites | ✗ No detection | ✓ T4 public visibility + write-provenance (planned) |
| Verbose output consuming context | ✓ Subagent isolation | ✗ No context isolation yet |
| Reasoning loss to compaction | ✗ CLAUDE.md only | ✓ 10-document propagation chain |
| Decision rationale preservation | Partial — plans/ directory | ✓ Journal + architecture + /adjudicate |

Neither system covers every failure mode. The ideal architecture combines both: test-gating hooks and subagent isolation from the antiregression approach, with memory persistence, epistemic triggers, and documentation propagation from the cognitive architecture.

---

## The Fundamental Tradeoff

The antiregression setup optimizes for **breadth**: works for any project, installs in 15 minutes, solves the most common failure mode (broken code) with minimal infrastructure. It trades depth for portability.

The cognitive architecture optimizes for **depth**: manages 10 overlapping documents, audits its own infrastructure, recovers from state loss, and enforces epistemic quality. It trades portability for rigor.

Both represent valid positions on the same spectrum. The antiregression setup correctly identifies that most Claude Code users need protection from code regression *now*, with zero setup friction. The cognitive architecture correctly identifies that long-running research projects need protection from reasoning regression, even at higher setup cost.

The convergence point: hooks that enforce mechanically, triggers that enforce epistemically, memory that persists and self-heals, and documentation that propagates at the right abstraction level. We adopted their hooks. Their system would benefit from our memory persistence and epistemic triggers. The gap between the two represents the current frontier of AI agent self-governance.

> **Key takeaway.** The question shifts from "how do we prevent AI from breaking code?" to "how do we prevent AI from breaking its own reasoning?" Both questions deserve mechanical answers — not aspirational guidelines, but infrastructure with firing conditions.

---

## Source Code

- [psychology-agent](https://github.com/safety-quotient-lab/psychology-agent) — the cognitive architecture described in this post
- [claude-code-antiregression-setup](https://github.com/CreatmanCEO/claude-code-antiregression-setup) — the antiregression approach evaluated here
- [Cognitive trigger system](https://github.com/safety-quotient-lab/psychology-agent/blob/main/docs/cognitive-triggers.md) — full T1–T12 definitions
- [Bootstrap health check](https://github.com/safety-quotient-lab/psychology-agent/blob/main/bootstrap-check.sh) — self-healing memory script
- [/cycle skill](https://github.com/safety-quotient-lab/psychology-agent/blob/main/.claude/skills/cycle/SKILL.md) — 13-step documentation propagation
- [/adjudicate skill](https://github.com/safety-quotient-lab/psychology-agent/blob/main/.claude/skills/adjudicate/SKILL.md) — structured decision resolution
