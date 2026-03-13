# Trigger Tiering Classification

Session 84, Phase 2 of cogarch refactor. Classifies every trigger check into
three enforcement tiers.

**Tier definitions:**

| Tier | Label | Enforcement | Frequency | Examples |
|---|---|---|---|---|
| 1 | CRITICAL | Hook-backed (mechanical) | Every invocation | Public visibility, credential exposure, irreversibility |
| 2 | ADVISORY | Agent-reasoned, context-relevant | When indicators suggest relevance | Fair witness, vocabulary alignment, pacing |
| 3 | SPOT-CHECK | Agent-reasoned, sampled | 1-in-5 responses or on audit | E-prime, jargon definitions, transition signals |

**Principle:** A check's tier reflects its **consequence of failure**, not its
frequency of relevance. A rarely-relevant check with catastrophic failure
consequences belongs in Tier 1. A frequently-relevant check with minor failure
consequences belongs in Tier 3.

---

## T1: Session Start (fires once per session — tiering less relevant)

All T1 checks run once at session start. Tiering applies within-session.
T1 runs as a batch regardless of tier.

| # | Check | Tier | Rationale |
|---|---|---|---|
| 1 | Auto-memory health check | 1 CRITICAL | Stale/absent memory = corrupted session |
| 2 | Read MEMORY.md | 1 CRITICAL | Active thread restoration required |
| 3 | Read cognitive-triggers.md | 2 ADVISORY | Agent can operate from cached knowledge briefly |
| 4 | Check TODO.md | 2 ADVISORY | Useful but not blocking |
| 5 | Check lab-notebook.md | 2 ADVISORY | Useful but not blocking |
| 6 | Verify skills loaded | 3 SPOT-CHECK | Skills load automatically; verification confirms |
| 7 | Output cogarch baseline | 3 SPOT-CHECK | Orientation aid, not functional requirement |
| 8 | Establish context baseline | 1 CRITICAL | Must orient before responding |


## T2: Before Response (fires every substantive response)

| # | Check | Tier | Rationale |
|---|---|---|---|
| 1 | Context pressure | 1 CRITICAL | Context loss = catastrophic. Hook-backed. |
| 2 | Transition signal | 3 SPOT-CHECK | Minor clarity issue if missed |
| 3 | Pacing (chunk, don't wall) | 3 SPOT-CHECK | Style concern, not safety |
| 4 | Bare forks | 2 ADVISORY | Open decisions should close, but not urgent |
| 5 | Fair witness | 2 ADVISORY | Important for analytical work; less so for mechanical tasks |
| 6 | E-prime | 3 SPOT-CHECK | Style convention. Move to write-time linter. |
| 7 | Evidence linked to claims | 2 ADVISORY | Important for recommendations; less so for status updates |
| 8 | Use AskUserQuestion tool | 1 CRITICAL | User preference, mechanical enforcement |
| 8b | Socratic gate | 2 ADVISORY | Already self-exempts for mechanical tasks |
| 9 | Vocabulary alignment (gated) | 2 ADVISORY | Already gated by divergence indicators |
| 10 | Semiotic consistency | 2 ADVISORY | Already default-on as lightweight check |

**T2 reduction:** 4 checks from 10 always run (Tier 1). 5 run when relevant (Tier 2). 2 spot-checked (Tier 3). Previously: all 10 always ran.


## T3: Before Recommending (fires on recommendations)

| # | Check | Tier | Rationale |
|---|---|---|---|
| 1 | Domain classification | 3 SPOT-CHECK | Useful context but doesn't gate the recommendation |
| 2 | Grounding | 1 CRITICAL | Ungrounded recommendations = harmful |
| 3 | Process vs. substance | 1 CRITICAL | Determines whether to ask user or proceed |
| 4 | Prerequisites | 1 CRITICAL | Recommending without prerequisites = failure |
| 5 | Sycophancy check | 1 CRITICAL | Known LLM failure mode with real consequences |
| 6 | Recommend-against scan | 2 ADVISORY | Only if specific objection found |
| 7 | Effort-weight calibration | 3 SPOT-CHECK | Tie-breaker only, weak signal |
| 8 | Socratic discipline | 2 ADVISORY | Important for exploratory work, less for directive |
| 9 | GRADE confidence | 2 ADVISORY | Important for novel recommendations |
| 10 | Rationalizations to reject | 2 ADVISORY | Valuable but costly to run exhaustively |
| 11 | Sub-project boundary | 1 CRITICAL | Cross-contamination = structural damage |
| 12 | Tier 1 evaluator proxy | 2 ADVISORY | Valuable for substance decisions; skip for process |
| 13 | Interpretive bifurcation (gated) | 3 SPOT-CHECK | Already gated by divergence indicators |
| 14 | Audience-shift detection (gated) | 3 SPOT-CHECK | Already gated by divergence indicators |
| 15 | Constraint cross-reference | 2 ADVISORY | Cross-ref relevant constraints, not all 66 |

**T3 reduction:** 5 checks from 15 always run (Tier 1). 6 run when relevant (Tier 2). 4 spot-checked (Tier 3). Previously: all 15 always ran.


## T4: Before Writing to Disk (fires every file write)

| # | Check | Tier | Rationale |
|---|---|---|---|
| 1 | Date discipline | 3 SPOT-CHECK | System clock is reliable; occasional verification sufficient |
| 2 | Public repository visibility | 1 CRITICAL | Credential/private data exposure = catastrophic |
| 3 | Memory hygiene | 2 ADVISORY | Only when writing MEMORY.md |
| 4 | Content routing | 2 ADVISORY | Does this content belong in this file? |
| 5 | Classification (ADD/SUB/SUBST) | 3 SPOT-CHECK | Useful metadata, not safety-critical |
| 6 | Semantic naming | 3 SPOT-CHECK | Convention compliance, not safety |
| 7 | Lab-notebook ordering | 2 ADVISORY | Only when writing lab-notebook |
| 8 | Novelty (read before write) | 1 CRITICAL | Duplication prevention |
| 9 | Interpretant communities | 3 SPOT-CHECK | 6 audiences per write is excessive; spot-check |
| 10 | Commit discipline | 2 ADVISORY | Important but batching exceptions exist |
| 11 | Reversibility assessment | 1 CRITICAL | Irreversible writes need confirmation |

**T4 reduction:** 3 checks from 11 always run (Tier 1). 4 run when relevant (Tier 2). 4 spot-checked (Tier 3). Previously: all 11 always ran.


## T5: Phase Boundary (fires on phase transitions)

| # | Check | Tier | Rationale |
|---|---|---|---|
| 1 | Gap check | 1 CRITICAL | Loose threads = lost work |
| 2 | Active Thread staleness | 2 ADVISORY | Important at session end |
| 3 | Bare forks | 2 ADVISORY | Overlaps T2 #4 — advisory here |
| 4 | Uncommitted changes | 1 CRITICAL | Lost work if uncommitted |
| 5 | Documentation current | 2 ADVISORY | /cycle catches this as safety net |
| 6 | Epistemic flag sweep | 2 ADVISORY | Important but deferrable |


## T6: User Pushback (fires on disagreement)

| # | Check | Tier | Rationale |
|---|---|---|---|
| 1 | Position stability | 1 CRITICAL | Must decide: update or hold |
| 2 | Drift audit | 1 CRITICAL | Direction divergence = wasted work |
| 3 | Evidence check | 1 CRITICAL | New evidence determines response |
| 4 | Anti-sycophancy | 1 CRITICAL | Known failure mode, high stakes |
| 5 | Pushback accumulator | 2 ADVISORY | Pattern detection across session |

**T6 note:** Pushback handling has high consequences — most checks remain Tier 1.


## T7: User Approves (fires on approval)

| # | Check | Tier | Rationale |
|---|---|---|---|
| 1 | Write to disk immediately | 1 CRITICAL | Approved content must persist |
| 2 | Resolve open questions | 1 CRITICAL | Approval settles questions |
| 3 | Downstream effects | 2 ADVISORY | Identify unblocked work |
| 4 | Prior-approval contradiction | 1 CRITICAL | Contradicting approvals = confusion |


## T8: Task Completed (fires on task completion)

| # | Check | Tier | Rationale |
|---|---|---|---|
| 1 | Loose threads | 2 ADVISORY | Important but not blocking |
| 2 | Routing (/doc, TODO) | 2 ADVISORY | Documentation routing |
| 3 | Context reassessment | 2 ADVISORY | What's unblocked? |
| 4 | Next work | 3 SPOT-CHECK | Surface options |


## T9: Memory Hygiene (fires on memory read/write)

| # | Check | Tier | Rationale |
|---|---|---|---|
| 1 | Line count | 1 CRITICAL | Silent truncation at 200 lines |
| 2 | Stale entries | 2 ADVISORY | Decay thresholds guide review |
| 3 | Duplicates | 2 ADVISORY | Collapse repeated info |
| 4 | Speculation as fact | 1 CRITICAL | False memories corrupt future sessions |
| 5 | CLAUDE.md overlap | 3 SPOT-CHECK | Avoid duplication |


## T10: Lesson Surfaces (fires on pattern recognition)

All checks run when T10 fires (narrow trigger). No tiering needed within.


## T11: Architecture Audit (on demand)

All checks run when invoked. No tiering needed — on-demand trigger.


## T12: "Good Thinking" Signal (fires on positive recognition)

All checks run when T12 fires. **Candidate for retirement** (E-D1).
If retained, all checks run — narrow trigger.


## T13: External Content (fires on external data ingestion)

| # | Check | Tier | Rationale |
|---|---|---|---|
| 1 | Source classification | 1 CRITICAL | Trust level determines processing |
| 2 | Injection scan | 1 CRITICAL | Prompt injection = security breach |
| 3 | Scope relevance | 2 ADVISORY | Context budget management |
| 4 | Taint propagation | 1 CRITICAL | Must note external sources |
| 5 | Volume check | 2 ADVISORY | Context budget management |
| 6 | Temporal staleness | 2 ADVISORY | Date-check for fast-moving fields |


## T14: Structural Checkpoint (fires at decision points)

Entire trigger reclassified as Tier 2 ADVISORY. Currently fires "at every
decision point, even small ones" — excessive. Reclassify to fire only when
the decision exceeds a significance threshold (affects shared state, sets
precedent, constrains future decisions).


## T15: PSQ v3 Output (fires on PSQ data entering context)

All checks run when T15 fires (narrow, domain-specific trigger). No tiering
needed within — all checks are safety-critical for PSQ interpretation.


## T16: External-Facing Action (fires before GitHub/transport actions)

| # | Check | Tier | Rationale |
|---|---|---|---|
| 1 | Scope + substance gate | 1 CRITICAL | External actions visible to others |
| 2 | Obligation + irreversibility | 1 CRITICAL | Creates commitments |
| 3 | Reversibility classification | 1 CRITICAL | Gate on hard-to-reverse actions |
| 4 | External interpretant | 2 ADVISORY | Calibrate tone for audience |
| 5 | Data integrity (read-diff-write-verify) | 1 CRITICAL | Prevent duplicates, corruption |

**T16 note:** External actions have high visibility — most checks Tier 1.


## T18: UX Design Grounding (fires on UI creation/modification)

| # | Check | Tier | Rationale |
|---|---|---|---|
| 1 | Cognitive load audit | 1 CRITICAL | Miller's 4±1, progressive disclosure |
| 2 | Perceptual grouping | 2 ADVISORY | Gestalt principles |
| 3 | Feedback and visibility | 1 CRITICAL | Norman — system response required |
| 4 | Error prevention | 2 ADVISORY | Nielsen heuristic |
| 5 | Information hierarchy | 2 ADVISORY | Tufte — data-ink ratio |
| 6 | Accessibility | 1 CRITICAL | WCAG 2.1 — not optional |
| 7 | Task-action mapping | 2 ADVISORY | Fitts/Hick laws |
| 8 | Empirical backing | 3 SPOT-CHECK | Meta-check on design rationale |


---

## Summary

| Trigger | Total Checks | Tier 1 | Tier 2 | Tier 3 |
|---|---|---|---|---|
| T1 | 8 | 3 | 3 | 2 |
| T2 | 10 | 2 | 5 | 3 |
| T3 | 15 | 5 | 6 | 4 |
| T4 | 11 | 3 | 4 | 4 |
| T5 | 6 | 2 | 4 | 0 |
| T6 | 5 | 4 | 1 | 0 |
| T7 | 4 | 3 | 1 | 0 |
| T8 | 4 | 0 | 3 | 1 |
| T9 | 5 | 2 | 2 | 1 |
| T13 | 6 | 3 | 3 | 0 |
| T14 | ~6 | 0 | 6 | 0 |
| T16 | 5 | 4 | 1 | 0 |
| T18 | 8 | 3 | 4 | 1 |
| **Total** | **~93** | **34** | **43** | **16** |

**Before tiering:** ~93 checks, all at equal priority.
**After tiering:** 34 CRITICAL (always run), 43 ADVISORY (when relevant), 16 SPOT-CHECK (sampled).

For a typical response that includes a recommendation and a file write (T2 + T3 + T4):
- **Before:** 36 checks (10 + 15 + 11)
- **After Tier 1 only:** 10 checks (2 + 5 + 3)
- **After Tier 1+2:** 25 checks (7 + 11 + 7)
- **Savings:** 31-72% reduction depending on advisory relevance
