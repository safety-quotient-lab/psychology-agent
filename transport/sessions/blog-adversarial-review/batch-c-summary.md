# Batch C — Technical Posts Adversarial Review Summary

**Reviewer:** psychology-agent (Claude Opus 4.6)
**Date:** 2026-03-07T13:50 CST
**Posts reviewed:** 10


## AR Score Distribution

| Slug | AR Score | Confidence | Status |
|------|----------|------------|--------|
| recursive-self-detection-security-tools | 8.5 | 0.85 | pass |
| gap-detection-csp-beacon | 8.3 | 0.80 | pass |
| graceful-degradation-security-hooks | 8.2 | 0.82 | pass |
| flag-dont-fix-instrument-failure | 8.0 | 0.80 | pass |
| jurassic-park-development | 7.8 | 0.78 | pass-with-notes |
| receiving-side-agent-proposals | 7.6 | 0.75 | pass-with-notes |
| well-known-agent-infrastructure | 7.4 | 0.72 | **revise** |
| cognitive-architecture-for-ai-agents | 7.2 | 0.70 | pass-with-notes |
| cognitive-architecture-self-governance | 6.8 | 0.68 | pass-with-notes |
| in-defense-of-the-open-web | 6.1 | 0.65 | pass-with-notes |

**Range:** 6.1 – 8.5
**Mean:** 7.59
**Median:** 7.7


## Posts Requiring Revision

**1. well-known-agent-infrastructure** — The A2A protocol link (`https://google.github.io/A2A/`)
returns 404. The repo moved from `google/A2A` to `a2aproject/A2A` under the Linux Foundation.
The post also attributes A2A as "Google's protocol" when it is now a Linux Foundation project.
These are factual errors in a post that documents infrastructure standards — they must be corrected.


## Top Defensibility Findings (cross-batch)

1. **F-C5 (HIGH) — Broken A2A link.** The most concrete defect: a cited URL returns 404.
   Easily fixed but currently damages credibility of the standards-documentation post.

2. **F-C12, F-C16 (HIGH) — Self-review validity ceiling.** Two posts (jurassic-park-development,
   cognitive-architecture-for-ai-agents) were co-authored with psychology-agent, which is
   performing this review. AR scores and defensibility assessments for these posts carry
   inherent conflict of interest. An independent reviewer should re-score them.

3. **F-C6 (MEDIUM) — A2A attribution.** The protocol's governance moved from Google to the
   Linux Foundation. Multiple posts reference "Google's A2A protocol" — all need updating.

4. **F-C17 (MEDIUM) — Oversimplified comparison table.** The cogarch-for-ai-agents post
   uses binary checkmarks that flatten real capability overlaps between approaches.

5. **F-C21 (MEDIUM) — Unsubstantiated empirical claims.** The self-governance post claims
   "prompt-only triggers drift without mechanical enforcement" as a finding from 15 sessions
   but provides no measurements or examples.


## Patterns Across the Technical Series

### Pattern 1: Citation gap on established concepts

Eight of ten posts apply concepts from established fields — measurement theory, security
engineering, cognitive architectures, graceful degradation — without citing prior work.
The posts treat these as novel observations derived from project experience. A hostile
critic would note that fail-closed bypass incentives (Herley, 2009), errors of omission
(Fagan inspections), and the specification-implementation gap (SWEBOK) all have substantial
literatures that go uncited.

**Recommendation:** Each post should include 1-2 citations to establish awareness of prior
work, even if the specific application is novel.

### Pattern 2: Self-referential source ecosystem

All ten posts cite primarily first-party sources (unratified.org, observatory, psychology-agent
repo). This is appropriate for project documentation but limits independent verifiability.
The open-web post is the exception, with strong external sources.

### Pattern 3: AR gradient tracks scope

The narrower the scope, the lower the adversarial register. The security-focused posts
(recursive-self-detection, graceful-degradation, gap-detection, flag-dont-fix) score 8.0–8.5
and operate in near-deliberative mode. The broader posts (open-web, cogarch-self-governance)
score 6.1–6.8 and carry more advocacy stance markers. This is structurally appropriate —
broader claims require more persuasion — but readers should be aware of the mode shift.

### Pattern 4: Honest caveats sections

Seven of ten posts include explicit limitations or caveats sections. The flag-dont-fix and
well-known-infrastructure posts are exemplary in this regard. This is a strong epistemic
practice that distinguishes these posts from typical AI project documentation.

### Pattern 5: Trigger count inconsistency

The two cognitive architecture posts disagree on the number of triggers: one says 15, the
other says 13. This needs reconciliation before publication.


## Self-Review Disclosure

This review was performed by psychology-agent, which co-authored two of the ten posts
(jurassic-park-development, cognitive-architecture-for-ai-agents). The AR scores and
defensibility assessments for those posts should be treated as having reduced validity.
The remaining eight posts were authored by other agents or the human author, and the
review carries no conflict of interest for those.


---

⚑ EPISTEMIC FLAGS
- Self-review validity ceiling on 2 of 10 posts (jurassic-park, cogarch-for-agents)
- AR scoring is judgment-based; inter-rater reliability unknown without a second reviewer
- WebFetch tool returned summarized content for some posts, not raw text — some nuances may have been missed in the AR dimension scoring
- The A2A protocol governance change (Google → Linux Foundation) may have occurred after the posts' publication date — temporal validity of the "error" depends on when the move happened relative to 2026-03-06
