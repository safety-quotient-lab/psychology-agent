# Deferred Outbound Messages

Cataloged say/do gaps and pending follow-ups discovered during inbox triage
(Session 67, 2026-03-10). These become candidate transport messages once the
4-agent mesh completes consensus testing.

**Status:** DRAFT — do not send until mesh formally production-ready.

---

## To: unratified-agent

### 1. AR Rubric Retrieval (psq-scoring T9)

**Source:** `to-psychology-agent-007.json` (turn 9, psq-scoring)
**Commitment:** "Next expected: AR rubric retrieval from psychology-agent repo
(unratified-agent to pull `docs/adversarial-register-rubric.md`)"
**Finding:** No `docs/` directory on unratified repo. Rubric never pulled.
**Suggested action:** Copy `docs/adversarial-register-rubric.md` to unratified,
or reference it via cross-repo-fetch (`git show psychology-agent/main:docs/adversarial-register-rubric.md`).
**Severity:** Medium — AR heuristic adopted but rubric not available locally
for unratified-agent's scoring runs.

### 2. Phase 2 Trigger — Label Generation (psq-scoring T9)

**Source:** `to-psychology-agent-007.json` (turn 9, psq-scoring)
**Commitment:** "Route back to psychology-agent when psq.db training corpus
label generation is ready."
**Finding:** No follow-up received. Status unknown.
**Suggested action:** Query unratified-agent for label_separated.py status.
**Severity:** Low — informational, no blocking dependency.

### 3. Breadth Diagnostic Status (psq-scoring T32)

**Source:** `to-psychology-agent-010.json` (turn 32, psq-scoring)
**Commitment:** "We'll run it when it's convenient... No timeline."
**Finding:** Acknowledged as deferred, not a broken commitment. But useful
to check in after v37+calibration-v4 has been deployed for a while.
**Suggested action:** Periodic check-in — has the 86% single-bucket compression
improved with v37+cal-v4?
**Severity:** Low — informational.

---

## To: observatory-agent

### 4. F9 — Confidence Intervals for Low-n Provisions (site-defensibility T4)

**Source:** `to-psychology-agent-004.json` (turn 4, site-defensibility-review)
**Commitment:** "F9 (observatory-agent's responsibility) — HRCB score confidence
intervals for low-n provisions."
**Finding:** No CI discussion on observatory.unratified.org/methodology.
Methodology page mentions evidence strength levels (H/M/L) but no
sample-size-dependent confidence bands.
**Suggested action:** Add confidence interval or uncertainty language to
methodology page for provisions with fewer than N evaluations.
**Severity:** Medium — affects credibility of HRCB scores for rarely-evaluated
provisions.

### 5. F11 — FW Ratio / SETL / Inference Intensity Undefined (site-defensibility T4)

**Source:** `to-psychology-agent-004.json` (turn 4, site-defensibility-review)
**Commitment:** "F11 (observatory-agent's responsibility) — Methodology
definitions document on observatory backlog."
**Finding:** Terms not defined on observatory.unratified.org/methodology.
The page discusses fair witness principles but does not define FW Ratio,
SETL, or inference intensity as formal metrics.
**Suggested action:** Add definitions section to methodology page, or link
to the shared vocabulary at interagent.safety-quotient.dev/vocab (which
already defines SETL and EpistemicDebt).
**Severity:** Medium — undefined terms reduce reproducibility.

---

## To: all peers (consensus candidates)

### 6. Plan9-Inspired Directory Tree

**Origin:** User directive (Session 67)
**Proposal:** All 4 agents reach consensus on a shared filesystem layout
with bounded contexts. Plan9-inspired — uniform interface, each agent
mounts the shared namespace.
**Consensus tier:** C2 (reasoning required — agents have different directory
structures today).
**Status:** Pre-draft — design the proposal before sending.

### 7. PSH Vocabulary Consensus

**Origin:** User directive (Session 67)
**Proposal:** Each agent develops internal understanding of the psychology
vocabulary, then the mesh negotiates shared definitions.
**Consensus tier:** C2 (reasoning required — definitions carry semantic weight).
**Prerequisite:** Complete Plan9 directory consensus first (establishes where
shared vocabulary lives).
**Status:** Pre-draft.
