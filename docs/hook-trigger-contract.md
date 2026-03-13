# Hook-Trigger Enforcement Contract

Session 84, Phase 3 of cogarch refactor. Defines which layer owns enforcement
for each CRITICAL check: mechanical (hook) or cognitive (trigger reasoning).

**Design principle:** CRITICAL checks should have mechanical enforcement
wherever technically feasible. Cognitive enforcement becomes the safety net,
not the primary gate.

**Contract rule:** If a check has a hook, the hook is the primary enforcer.
The trigger check remains as documentation and safety net (in case the hook
fails or the agent operates in an environment without hooks). If a check
lacks a hook, the trigger is the sole enforcer and the check gets flagged
for future hook development.

---

## Current Hook Coverage of CRITICAL Checks

| Trigger | Check | CRITICAL Check Description | Hook Status | Owner |
|---|---|---|---|---|
| T1 #1 | Auto-memory health | Verify MEMORY.md exists | ✓ `session-start-orient.sh` | Hook (primary) |
| T1 #2 | Read MEMORY.md | Load active thread | ✓ `session-start-orient.sh` | Hook (primary) |
| T1 #8 | Context baseline | Orient before responding | ✓ `session-start-orient.sh` | Hook (primary) |
| T2 #1 | Context pressure | At 60%/75% thresholds | ✓ `context-pressure-gate.sh` | Hook (primary) |
| T2 #8 | AskUserQuestion | Use tool for clarification | ✗ No hook | Trigger (sole) |
| T3 #2 | Grounding | Verify dependencies | ✗ No hook | Trigger (sole) |
| T3 #3 | Process vs substance | Autonomous vs user input | ✗ No hook | Trigger (sole) |
| T3 #4 | Prerequisites | Check unfinished dependencies | ✗ No hook | Trigger (sole) |
| T3 #5 | Sycophancy check | Anti-sycophancy | ✗ No hook | Trigger (sole) |
| T3 #11 | Sub-project boundary | Cross-project contamination | ✓ `subproject-boundary.sh` | Hook (primary) |
| T4 #2 | Public visibility | No credentials in tracked files | ✓ `write-provenance.sh` (partial) | Hook (partial) + Trigger |
| T4 #8 | Novelty | Read before write | ✗ No hook | Trigger (sole) |
| T4 #11 | Reversibility | Classify write reversibility | ✗ No hook | Trigger (sole) |
| T5 #1 | Gap check | Resolve loose threads | ✗ No hook | Trigger (sole) |
| T5 #4 | Uncommitted changes | Commit before phase boundary | ✗ No hook (feasible: `session-end-check.sh`) | Trigger (sole) |
| T6 #1-4 | Pushback handling | Position, drift, evidence, anti-sycophancy | ✓ `pushback-accumulator.sh` (partial) | Hook (partial) + Trigger |
| T7 #1 | Write approved content | Persist immediately | ✗ No hook | Trigger (sole) |
| T7 #2 | Resolve open questions | Approval settles questions | ✗ No hook | Trigger (sole) |
| T7 #4 | Prior-approval contradiction | Check for conflicts | ✗ No hook | Trigger (sole) |
| T9 #1 | MEMORY line count | Silent truncation prevention | ✓ `memory-structure-validate.sh` | Hook (primary) |
| T9 #4 | No speculation as fact | False memory prevention | ✗ No hook | Trigger (sole) |
| T13 #1 | Source classification | Trust level | ✗ No hook | Trigger (sole) |
| T13 #2 | Injection scan | Prompt injection detection | ✗ No hook (candidate for parry when re-added) | Trigger (sole) |
| T13 #4 | Taint propagation | Note external sources | ✗ No hook | Trigger (sole) |
| T16 #1 | Scope + substance | External action gate | ✓ `external-action-gate.sh` | Hook (primary) |
| T16 #2 | Obligation + irreversibility | Creates commitments | ✓ `external-action-gate.sh` (partial) | Hook (partial) + Trigger |
| T16 #3 | Reversibility classification | Gate on hard-to-reverse | ✓ `external-action-gate.sh` (partial) | Hook (partial) + Trigger |
| T16 #5 | Data integrity | Read-diff-write-verify | ✗ No hook | Trigger (sole) |
| T18 #1 | Cognitive load audit | Miller's 4±1 | ✗ No hook | Trigger (sole) |
| T18 #3 | Feedback + visibility | Norman — system response | ✗ No hook | Trigger (sole) |
| T18 #6 | Accessibility | WCAG 2.1 | ✗ No hook | Trigger (sole) |

**Session 85 additions (not in original contract — new hooks):**

| Check | Description | Hook | Owner |
|-------|------------|------|-------|
| L4 graduated | Confidence claims without calibration ref | ✓ `confidence-calibration-screen.sh` | Hook (primary) |
| Mode detection | Task-type classification (mechanical/analytical/creative) | ✓ `mode-detection.sh` | Hook (primary) |
| Invariant conflict | Multiple structural invariants referenced → maqasid prompt | ✓ `invariant-conflict-detect.sh` | Hook (primary) |

---

## Coverage Summary

| Status | Count | Percentage |
|---|---|---|
| Hook (primary enforcer) | 13 | 35% |
| Hook (partial) + Trigger | 4 | 11% |
| Trigger (sole enforcer) | 20 | 54% |
| **Total CRITICAL + graduated** | **37** | |

**Current state:** 54% of CRITICAL checks have no mechanical enforcement (was 59%).
**Session 85 progress:** 3 new hooks (confidence-calibration, mode-detection,
invariant-conflict). First lesson-to-hook graduation (L4).
**Target state:** ≤30% sole-trigger enforcement.

---

## Hook Development Priorities

Checks with no hook that could feasibly gain one, ordered by impact:

### Priority 1: Feasible with existing hook events

1. **T13 #2 (Injection scan)** — re-add parry when #32596 fix verified.
   Hook event: PreToolUse on WebFetch/Read for untrusted paths.

2. **T5 #4 (Uncommitted changes)** — extend `session-end-check.sh` to
   also fire at phase boundaries (or create `phase-boundary-check.sh`).
   Hook event: could fire on TaskCompleted or as a periodic Notification hook.

3. **T4 #2 (Public visibility) full coverage** — extend `write-provenance.sh`
   to scan written content for credential patterns (API keys, tokens, passwords).
   Hook event: already on PostToolUse Write|Edit. Enhancement to existing script.

4. **T16 #5 (Data integrity)** — create `transport-integrity-check.sh` that
   validates transport messages on PostToolUse Write to `transport/**/*.json`.
   Hook event: PostToolUse Write|Edit with path matcher.

### Priority 2: Feasible but requires new hook logic

5. **T4 #8 (Novelty/read before write)** — hook that warns when Write targets
   a file not recently Read. Requires tracking Read tool calls in session state.

6. **T9 #4 (No speculation as fact)** — extremely difficult to enforce
   mechanically. Requires NLP analysis of written content. Defer.

### Priority 3: Not feasible as hooks (must remain trigger-only)

7. **T3 #2-5 (Grounding, process/substance, prerequisites, sycophancy)** —
   these require semantic understanding of the conversation context. No
   mechanical enforcement possible. Trigger-only enforcement is appropriate.

8. **T7 #1-4 (Approval handling)** — approval detection requires conversation
   semantic analysis. Trigger-only enforcement is appropriate.

9. **T18 #1,3,6 (UX checks)** — design evaluation requires visual/structural
   analysis. Trigger-only enforcement is appropriate.

---

## Inline Hook Fix: Convert to Script File

The PostToolUse inline command (settings.json line 40) should become a
script file for consistency and version control:

**Current:** Inline bash case statement in settings.json
**Target:** `.claude/hooks/critical-file-modified.sh`

---

## Context-Pressure Hook Optimization (E-20)

`context-pressure-gate.sh` currently fires on ALL PreToolUse events (no matcher).
Add a matcher to scope to tool calls that consume significant context:

**Current:** No matcher (fires on Read, Glob, Grep, Write, Edit, Bash, Agent...)
**Target:** Matcher for `Read|Write|Edit|Bash|Agent|WebFetch` (skip Glob, Grep)
