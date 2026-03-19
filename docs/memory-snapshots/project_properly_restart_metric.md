---
name: "let me do it properly" restart metric
description: Track LLM self-correction phrases ("let me X properly") as behavioral signal — measures mid-task restarts and their relationship to output quality
type: project
---

## "Let Me Do It Properly" — Self-Correction Signal Tracking

**Baseline scan (Session 93, 2026-03-16):** 130 occurrences across 54 transcript
sessions (~2.4 per session average). 19 sessions contained the pattern; 35 did not.

**Phrase family (narrow self-correction — implies prior attempt failed):**
- "Let me fix it properly" (6)
- "Let me rewrite it properly" (3)
- "Let me fix this properly" (3)
- "let me do it properly" (3)

**Broader family (130 total — includes planning uses):**
- "Let me think through this properly"
- "Let me design this properly"
- "Let me scope this properly"
- "Let me frame this properly"
- "Let me structure this properly"

**Why:** The phrase signals the LLM recognized its current approach as inadequate
and announced a restart. Two distinct interpretations compete:

1. **Genuine self-correction** — the model detected quality drift and course-
   corrected. Higher frequency correlates with more complex tasks requiring
   iterative refinement. Healthy signal.

2. **Performative restart** — the model substitutes announcing "properly" for
   actually improving. The restart phrase creates an illusion of rigor without
   substantive change in approach. Sycophantic self-presentation.

Distinguishing these requires comparing pre- and post-"properly" output quality.

**How to apply:** Build a detector script (similar to `impressions-detector.py`)
that:
1. Scans transcripts for the phrase family
2. Extracts context window (5 tool calls before and after the phrase)
3. Classifies: did the approach actually change? (planning shift, different
   tool sequence, new strategy vs. same approach repeated)
4. Tracks frequency per session — correlate with session complexity and outcome

**Connections:**
- T20 (evaluative impressions) — parallel self-monitoring signal
- T3#5 (anti-sycophancy) — performative restarts represent self-directed sycophancy
- T14 substitution patterns — "let me do it properly" may warrant a substitution
  (just do it differently, don't announce the restart)

**TODO:** Build `scripts/restart-detector.py` — scan transcripts, extract context,
classify genuine vs. performative restarts. Add to /retrospect cadence.
