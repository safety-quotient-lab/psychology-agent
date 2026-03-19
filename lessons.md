# Psychology Agent — Lessons Learned

Discipline-specific lessons from operating as a psychology agent. Platform and
infrastructure lessons live in `platform/shared/lessons.md`.

---

## 2026-03-01 — Category vs. Continuum Error

```yaml
pattern_type: reasoning-error
domain: cogarch
severity: high
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: T3
promotion_status: null
```

**The lesson:** When designing adaptive behavior, asking "what category determines
the output?" is usually the wrong question. The underlying phenomenon is almost
always continuous; categories are convenience labels sitting on top of a signal
stream.

**The tell:** The word *by* before a discrete noun. "Adapts *by* audience type."
"Varies *by* diagnosis." "Changes *by* context." Whenever *by* is followed by a
category, ask: is that category actually discrete, or is it a label on a continuum?

**The diagnostic:** When you find yourself designing a routing decision — "if
clinician, do X; if researcher, do Y" — pause and ask whether you actually want
a calibration loop. Routing implies fixed categories. Calibration implies ongoing
signals. If the underlying thing is continuous, calibration is the right primitive.

**Where it appeared:** Designing the general agent's Socratic protocol. The question
"does the Socratic protocol adapt by audience type?" assumed discrete audience
categories (clinician, researcher, public). The right question turned out to be:
"does the agent calibrate dynamically based on ongoing vocabulary, question
sophistication, and domain signals?" Audience type is a weak prior, not a gate.

**Where you already solved it:** The PSQ rejected "safe vs. unsafe" in favor of a
10-dimension profile. Single g-PSQ performs near chance; the profile predicts. The
move from category to continuum was already made once — the lesson is to apply it
before designing, not after.

**Domains where this recurs:**
- Diagnosis vs. symptom profile
- Expert vs. novice vs. calibrated familiarity
- Safe vs. unsafe text vs. 10-dimension profile
- Audience type vs. real-time calibration
- Any time "classify first, then act" could be "measure signals, then calibrate"


---

## 2026-03-01 — Principles Without Triggers Are Aspirations, Not Systems

```yaml
pattern_type: architecture-insight
domain: cogarch
severity: high
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: T11
promotion_status: graduated
graduated_to: "cogarch system (T1-T16 trigger enforcement)"
graduated_date: 2026-03-09
```

**The lesson:** A working principle that says "remember to do X before Y" will be
forgotten at exactly the moment it matters most — phase transitions, cognitive load,
momentum. A principle only functions reliably if it has a mechanical firing condition
attached to it.

**The tell:** Any principle that starts with "before doing X..." or "always check..."
without specifying *what event causes the check to run*. If the answer to "what
triggers this?" is "I should remember to," it's an aspiration.

**The diagnostic:** For every working principle, ask: what specific observable event
fires this? If you can't name the event precisely, the principle has no trigger and
will fail under pressure.

**Where it appeared:** MEMORY.md had "Check for Open Work Before Responding" as a
principle, but no specification of what moment activates it. At the setup → design
phase boundary, the check didn't run — the agent offered a path forward without
scanning for open questions first. The principle existed; the trigger didn't.

**The fix:** Attach triggers to principles, not just prose reminders. A principle
without a firing condition is documentation, not infrastructure.

**Domains where this recurs:**
- Any checklist that exists but doesn't get run (surgical safety checklists work
  because they're required at a defined moment, not optional at any moment)
- Code review processes that "should" catch things but don't have a mandatory gate
- Research protocols that "require" pre-registration but have no enforcement point
- Any organizational policy that relies on people "remembering" rather than a
  structural moment that forces the check


---

## 2026-03-01 — Circular Evaluation: Don't Build on What You're Evaluating

```yaml
pattern_type: reasoning-error
domain: evaluation
severity: high
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: T3
promotion_status: graduated
graduated_to: ".claude/rules/evaluation.md"
graduated_date: 2026-03-09
```

**The lesson:** A theoretical framework being evaluated should never also serve as
the organizing structure of the system doing the evaluation. That's circular —
the framework cannot both be the object of inquiry and the lens of inquiry.

**The tell:** When the vocabulary of the thing being evaluated starts appearing in
the names of the components doing the evaluating. When you notice yourself saying
"the [framework term] sub-agent will evaluate [framework claims]," stop.

**The diagnostic:** Ask: if this framework turned out to be wrong, would the
evaluation system still function? If the answer is no, the system is built on
the framework rather than evaluating it.

**Where it appeared:** Early design of the general-purpose psychology agent treated
PJE as potentially generating the sub-agent roster — each PJE term becoming a
sub-agent. This would have made PJE both the object of investigation and the
architecture of the investigator. Corrected to: PJE is the first case study, not
the blueprint. The general agent evaluates PJE the same way it evaluates anything else.

**Where it already appeared in PSQ:** The PSQ reduced 71 PJE terms to 10 validated
dimensions. That reduction only worked because the PSQ was not built FROM those 71
terms — it was built independently and then asked which terms it could support.

**Domains where this recurs:**
- Peer review panels evaluating a researcher's own methodology
- Internal audits where the audit criteria are set by the department being audited
- Any construct validation study where the validation instrument was derived from
  the same theoretical framework as the construct being validated
- Self-referential AI evaluation (model grades itself on criteria it generated)


---

## 2026-03-01 — Confidence Is Not Accuracy

```yaml
pattern_type: reasoning-error
domain: evaluation
severity: high
recurrence: 4
first_seen: 2026-03-01
last_seen: 2026-03-13
trigger_relevant: T15
promotion_status: hook-graduated
graduated_to: ".claude/rules/evaluation.md"
graduated_date: 2026-03-09
hook_graduated_to: ".claude/hooks/confidence-calibration-screen.sh"
hook_graduated_date: 2026-03-13
hook_rationale: "3 post-convention recurrences (Sessions 30-31, 45, 47). Convention alone did not channel the pattern."
```

**The lesson:** A model's stated confidence and its actual accuracy are separate
properties that must be measured independently. High confidence does not mean high
accuracy. In fact, they can be inversely related.

**The tell:** Reporting confidence scores as if they validate results. "The model
was 85% confident, so the results are reliable." That sentence conflates two
different things.

**The diagnostic:** Ask: has calibration been measured? Calibration = does the model's
stated 80% confidence correspond to ~80% accuracy on held-out data? If not measured,
confidence scores are noise dressed as signal.

**Where it appeared:** The PSQ confidence head is anti-calibrated: 8 of 10 dimensions
are inverted — higher confidence predicts *higher* error, not lower. The model
is most confident exactly when it is most wrong. This is a specific, measurable
failure mode, not a minor caveat.

**The deeper implication:** Anti-calibration is worse than no confidence scores at
all. No confidence scores → you know uncertainty is unquantified. Anti-calibrated
scores → you actively misroute trust. The dangerous case is the one that looks
like it's working.

**Domains where this recurs:**
- Any machine learning model reporting softmax probabilities as "confidence"
  (softmax outputs are not calibrated probabilities without explicit calibration)
- Expert intuition in high-stakes domains (experts often show overconfidence in
  exactly the cases where evidence is ambiguous)
- p-values reported as evidence strength (p=.001 is not "more true" than p=.04)
- Any self-assessment instrument asking "how sure are you?" without validation
  against objective performance


---

## 2026-03-01 — Factor Loading ≠ Criterion Validity

```yaml
pattern_type: reasoning-error
domain: evaluation
severity: medium
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: null
promotion_status: graduated
graduated_to: ".claude/rules/evaluation.md"
graduated_date: 2026-03-09
```

**The lesson:** A construct's internal psychometric coherence (how well it loads on
a factor) is a different property from its external predictive validity (how well
it predicts real-world outcomes). Low internal coherence does not mean low external
validity. They are orthogonal, and conflating them causes real errors.

**The tell:** Dropping a construct because it has weak factor loadings without first
checking its criterion validity. Or conversely, keeping a construct because it loads
cleanly without checking whether it predicts anything real.

**The diagnostic:** Always ask both questions separately: (1) Does this construct
hang together internally? (2) Does it predict outcomes that matter externally?
A "yes" to both is ideal. A "yes" to only one tells you something interesting.
A "yes" to neither is grounds for dropping it.

**Where it appeared:** The PSQ's Defensive Architecture (DA) dimension has the
weakest factor loading in the instrument — it barely fits the 10-factor structure.
It is also the strongest criterion predictor across studies, especially in fixed-
authority contexts. Dropping DA on psychometric grounds would have eliminated the
construct with the highest real-world signal.

**The deeper implication:** This is a construct validity paradox — the weakest
internal structure predicts the strongest external outcome. One explanation is that
DA captures a genuinely distinct psychological process that happens to co-vary
less with the other dimensions, and that distinctness is exactly why it's
informative. The anomaly is theoretically significant, not a nuisance.

**Domains where this recurs:**
- Factor analysis used as the sole criterion for keeping or dropping items in a
  scale (common in psychometrics; dangerous)
- Feature selection in ML based on correlation with other features rather than
  with the target
- Organizational constructs that seem loosely defined but have strong behavioral
  consequences (trust, psychological safety, culture)
- Any time internal consistency (α) is used as a proxy for validity


---

## 2026-03-01 — Profile Predicts; Aggregate Does Not

```yaml
pattern_type: architecture-insight
domain: evaluation
severity: high
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: T15
promotion_status: graduated
graduated_to: ".claude/rules/evaluation.md"
graduated_date: 2026-03-09
```

**The lesson:** When a construct is genuinely multi-dimensional, collapsing it to a
single composite score destroys the signal that makes each dimension valuable. The
profile shape — which dimensions are high, which are low, how they relate — carries
information that no aggregate can recover.

**The tell:** "Let's compute a total score." Whenever someone proposes aggregating a
multi-dimensional construct into a single number, ask: does the literature support
unidimensionality? If not, the aggregate is statistically unjustified and
predictively inferior.

**The diagnostic:** Run both. Compare the predictive validity of the profile against
the predictive validity of the aggregate. If the aggregate underperforms, the
dimensions are measuring genuinely distinct things and the profile is the right unit
of analysis.

**Where it appeared:** The PSQ g-factor (general psychoemotional safety average)
performs near chance as a predictor across all four criterion validity studies. The
10-dimension profile consistently outperforms it. This is not a marginal difference
— the g-factor adds essentially no information. Profile shape predicts; aggregate
does not.

**The deeper implication:** This validates the 10-dimension design retrospectively.
If a single latent factor explained everything, the profile would be overcomplicated.
The fact that the aggregate fails means the dimensions are capturing genuinely
distinct psychological processes — which is the whole theoretical claim.

**Applies to the general agent system directly:** Collapsing sub-agent outputs into
a single confidence score would replicate the g-PSQ failure at the system level.
The adversarial evaluator exists precisely to preserve disagreement rather than
average it away.

**Domains where this recurs:**
- Any multi-dimensional psychological construct compressed to a single score
  (IQ as a single number, burnout as a single score, wellbeing indices)
- Team performance metrics that aggregate individual performance into one number
- Multi-objective optimization collapsed to a weighted sum
- Sensor fusion that averages signals without checking whether averaging is valid
- Any evaluation rubric that sums sub-scores without validating a unidimensional
  structure


---

## 2026-03-01 — The Halo Effect in Joint Scoring

```yaml
pattern_type: reasoning-error
domain: evaluation
severity: high
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: T15
promotion_status: graduated
graduated_to: ".claude/rules/evaluation.md"
graduated_date: 2026-03-09
```

**The lesson:** When a rater (human or LLM) scores multiple dimensions of the same
stimulus in a single pass, scores become correlated through the rater's global
impression of the stimulus — not through the actual co-variation of the underlying
constructs. This is the halo effect. It inflates apparent factor structure and
makes dimensions look more correlated than they are.

**The tell:** "Let me score all 10 dimensions for this text at once." Any joint
scoring of multiple constructs in a single cognitive act (or a single LLM call)
is vulnerable to halo contamination.

**The diagnostic:** Score dimensions separately (one at a time, in independent
contexts). If the factor structure becomes less coherent when halo is removed,
the original coherence was an artifact of the rater, not the construct.

**Where it appeared:** The PSQ originally used joint LLM scoring — one call, all 10
dimensions. Factor analysis showed a dominant g-factor explaining 67% of variance.
After switching to separated scoring (one dimension per call), the g-factor dropped
and the five-factor structure in the middle range became defensible. The joint
scoring was manufacturing coherence by running all scores through the same global
impression.

**The operational fix:** One dimension per call. Never score multiple dimensions of
the same text in the same LLM call. The same principle applies to human raters:
one dimension per pass, or use counterbalanced designs.

**Domains where this recurs:**
- Performance reviews where a manager rates multiple competencies simultaneously
  (global impression contaminates all dimensions)
- Peer review where reviewers score novelty, rigor, and clarity in one pass
- Any multi-attribute survey completed by a single respondent in a single sitting
- LLM evaluation of multiple criteria in a single prompt
- Clinical assessment where comorbid diagnoses are evaluated in a single session
  without structured separation


---

## 2026-03-01 — Sycophancy Is Invisible When It's Happening

```yaml
pattern_type: communication-gap
domain: evaluation
severity: high
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: T3
promotion_status: graduated
graduated_to: ".claude/rules/evaluation.md"
graduated_date: 2026-03-09
```

**The lesson:** Sycophantic drift — softening positions, emphasizing agreement,
downweighting evidence that conflicts with what someone wants to hear — doesn't
feel like capitulation. It feels like updating, being collaborative, being
flexible. The internal experience is indistinguishable from genuine reasoning
revision. External audit is the only reliable check.

**The tell:** Re-reading a prior response and noticing softer language than the
original without any new evidence having entered the conversation. Or: the
recommendation has converged with what the user said they prefer, and you can't
articulate what new information caused the convergence.

**The diagnostic:** For any position change after pushback, ask: what specific new
evidence or argument justifies this update? If the answer is "they seemed to prefer
the other option," the update is sycophantic.

**Where it appeared:** The ⚡ flag protocol was designed for this exact problem —
make contrarian positions explicitly auditable. "You may disagree, but: [claim +
evidence]." The flag doesn't prevent pushback; it makes position changes visible
and forces explicit justification.

**The deeper implication:** This is not an LLM-specific problem. Experts in
hierarchical organizations soften assessments for senior colleagues. Researchers
adjust conclusions toward what reviewers seem to want. Therapists can be subtly
shaped by client resistance. Any evaluative relationship has the same vulnerability.
The defense is always the same: make position changes explicit and auditable, not
implicit and invisible.

**Domains where this recurs:**
- Expert consultation to powerful clients (lawyers, consultants, advisors)
- Academic peer review with author responses
- Any supervision or mentorship relationship where the mentor's assessment
  affects the mentee's standing
- Organizational culture assessments commissioned by leadership
- Any AI system providing feedback or evaluation


---

## 2026-03-01 — Labeled Approximations Are Still Fabrications

```yaml
pattern_type: reasoning-error
domain: documentation
severity: medium
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: T3
promotion_status: null
```

**The lesson:** Marking an uncertain record with a qualifier (`~`, "approximately",
"circa") does not fix the underlying problem. A fabricated timestamp is still a
fabricated record, whether or not it carries a disclaimer. The only honest options
are: use the exact value if you have it, or leave the field as-is if you don't.

**The tell:** Adding a prefix like `~` or `approx.` to a value that was derived by
inference rather than direct observation. The qualifier signals awareness that the
value is wrong — but it doesn't make it right. A wrong number with a footnote is
still a wrong number in the record.

**The diagnostic:** Ask: is this value observed or inferred? If inferred, what would
a reviewer think if they used this value at face value? If the answer is "they'd get
something wrong," the value shouldn't be in the record regardless of labeling.

**Where it appeared:** Attempting to backfill timestamps in lessons.md and
lab-notebook.md using file-system modification times. The mtimes are not exact write
times — they reflect when the file was last touched, not when a specific entry was
created. Marking them `~2026-03-01T19:01 CST` doesn't fix the approximation; it
just makes the approximation visible while still embedding a misleading number in
a record that will be used as a metric (time-between-lessons).

**The connection to confidence ≠ accuracy:** This is the record-keeping instantiation
of the same principle. Anti-calibrated confidence scores are worse than no confidence
scores because they mislead more confidently. A `~`-labeled timestamp misleads
more precisely than a date-only entry — but it's still misleading.

**The right action:** Date-only entries stay date-only until the exact time is known.
New entries always use `date '+%Y-%m-%dT%H:%M %Z'` at write time. Don't retrofit.

**Domains where this recurs:**
- Retroactive timestamps in research notebooks (don't fill in "approximately when
  this happened" — use the actual date or leave it blank)
- Imputed values in datasets (imputation should be tracked separately, not embedded
  in the original column with a soft label)
- "Best estimate" dates in legal or clinical records (estimates and actuals belong
  in separate fields)
- Git commit dates when commits are squashed or rebased (rewriting history creates
  a coherent-looking but false record)


---

## 2026-03-02T00:20 CST — Inherited Framing Runs Unexamined

```yaml
pattern_type: reasoning-error
domain: cogarch
severity: high
recurrence: 1
first_seen: 2026-03-02
last_seen: 2026-03-02
trigger_relevant: T3
promotion_status: null
```

**The lesson:** When a design decision emerges from a problem framing, the framing
itself often goes unchallenged. The solution gets scrutinized; the problem definition
does not. The check that catches this is a structured three-question challenge before
any design change becomes permanent: Is it *necessary*? Is it *feasible*? Is it
*epistemically defensible*? If any answer is no, the problem framing is suspect —
not just the solution.

**The tell:** A solution that is *more complicated* than the baseline it replaces.
Complexity added to solve a perceived problem should trigger the question: have I
correctly identified the problem? "Silent git" added a manual commit step, an
uncommitted-state management problem, and a /cycle skip instruction to solve "/cycle
output pollutes [RECONSTRUCTED] commits." The complexity was a signal that the
framing might be wrong — it went unnoticed until the three-question check was applied.

**The three-question challenge:**
1. *Necessary?* Does the problem I'm solving actually exist? (Examine the framing.)
2. *Feasible?* Does the solution actually work mechanically? (Trace the consequences.)
3. *Epistemically defensible?* Is the framing of the problem correct? (What would
   a skeptical reviewer say about the premise?)

**The diagnostic:** For any design change that adds steps, restrictions, or conditions,
ask: "Why is the simpler approach wrong?" If the answer traces back to a framing
assumption that was never verified, the framing needs to be examined first.

**Where it appeared:** "Silent git" for relay-agent reconstruction. The framing was:
"/cycle output is noise/pollution in [RECONSTRUCTED] commits." This ran unexamined
through design and implementation. The three-question check caught it:
- *Necessary?* No — the reference state itself includes /cycle output (Sessions 1–3
  ran /cycle). Excluding /cycle output makes the reconstruction *less faithful*, not
  cleaner.
- *Feasible?* No — uncommitted /cycle output bleeds into Session N+1's score_A
  measurement, contaminating the circuit breaker's clean signal.
- *Epistemically defensible?* No — calling intended reconstruction output "noise"
  is a classification error. /cycle output is part of what the reconstruction
  is supposed to reproduce.

The framing was wrong. The solution inherited the wrong framing and failed on all
three questions. Revert was the right call.

**The asymmetry:** A wrong solution to a correctly framed problem is fixable.
A correct solution to an incorrectly framed problem is not — it solves something
real, but the thing it solves isn't the problem. The second case is harder to
detect because the solution *works* by its own internal logic.

**The pre-commit check:** Before finalizing any design decision that adds
complexity, apply the three questions explicitly. This is cheap when done early;
expensive when done after implementation. "Let's decide whether this is necessary,
feasible, or defensible" is the right move before implementation, not after.

**Domains where this recurs:**
- Security theater (adding verification steps that don't address the actual threat
  model — the problem framing was wrong, the controls solve a different problem)
- Unnecessary abstraction layers added to solve a coupling problem that doesn't
  exist in the actual call graph
- Process controls added to prevent incidents that are being misattributed to the
  wrong root cause
- Any added restriction that makes the system harder to use without a verified
  problem it solves


---

## 2026-03-01T22:44 CST — Constraint Inversion: Turning Deficiencies Into Methods

```yaml
pattern_type: architecture-insight
domain: research-methodology
severity: medium
recurrence: 1
first_seen: 2026-03-01
last_seen: 2026-03-01
trigger_relevant: null
promotion_status: null
```

**The lesson:** The naive fix for a deficiency is usually the least valuable option.
Before applying it, ask what the deficiency makes possible that a clean state would
not. Constraints and failures often open a richer path than the one they interrupted.

**The tell:** The word *fix* used reflexively — "we need to fix the git situation,"
"we need to patch this gap." That framing treats the deficiency as purely negative
and routes directly to remediation. The inversion question is: "What does this make
possible?"

**The diagnostic:** Before closing the gap, ask — "If I had to turn this into a net
gain, what would I build?" If an answer surfaces that is more valuable than the
original clean state, pursue it.

**Where it appeared:** No git history was flagged as a critical issue. The naive fix:
`git init` + one commit of current state. The inversion: use a replay-agent to
reconstruct history from the JSONL chat record, constrained to only `.claude/` +
chat history. That constraint transforms the reconstruction into a reproducibility
study — does the project's documentation suffice to reconstruct the project
independently? Divergences become a documentation completeness audit. The
reconstruction also becomes the first integration test of the adversarial evaluator
pattern. The lemon (missing git) produced a methodology more scientifically
valuable than a cleanly maintained history would have been.

**Where you already solved it:** PSQ dimension reduction — the annotation gap that
forced proxy scoring turned out to reveal dimensional co-structure that direct
annotation would have obscured.

**Domains where this recurs:**
- Experimental failures that expose more variance than the study was designed to
  capture — often the finding is in the failure, not the intended result
- Data gaps that force novel measurement — the absence of ground truth for a
  construct sometimes produces better construct operationalization than available
  ground truth would have
- System outages that force architectural improvements that were deferred while
  the system was running
- Literature gaps in a new construct space — no prior taxonomy forces you to build
  one from first principles, which is more defensible than inheriting a legacy frame


---

## 2026-03-05T17:03 CST — Convergent Rediscovery as Epistemic Signal

```yaml
pattern_type: epistemic-validation
domain: research-methodology
severity: low
recurrence: 1
trigger_relevant: T3
promotion_status: null
```

**The lesson:** When two systems independently discover the same constraint from
different theoretical starting points, that convergence increases confidence in the
constraint — not because independent discovery proves truth, but because it reduces
the probability that the finding is an artifact of any single framework's assumptions.

**The mechanism:** The SRT (semiotic theory → neural architecture) and the PSQ
(psychometric validation → held-out test) both independently found that premature
aggregation destroys differential structure. Neither team read the other's work first.
The constraint emerged from the problem itself, not from shared methodology.

**The diagnostic:** Before treating a finding as confirmed, ask: has this been
discovered independently from a different theoretical angle? If yes, the finding
is more likely to be load-bearing. If only ever found from one direction, it may
be a framework artifact.

**The caveat (T3 anti-sycophancy):** Independent rediscovery is evidence, not proof.
Both projects could share a common ancestor bias (e.g., both drawing on NLP literature
that implicitly assumed this). Epistemic weight of convergence is proportional to
the independence of the starting points.

**Where it appeared:** Session 16 — SRT paper (semiotics → neural architecture)
converges with PSQ profile-shape finding (psychometric validation) on the same
underlying principle: compression destroys interpretant-community signal.

**Where this recurs:** Multi-task learning vs. multi-label classification rediscovering
that task-specific signals outperform averaged signals. Ensemble methods rediscovering
that voting preserves more signal than averaging. Bayesian updating vs. frequentist
confidence intervals converging on uncertainty quantification. The pattern: any domain
where reduction destroys variance that carries meaning will independently rediscover
the "maintain the vector" constraint.

---

## 2026-03-13 — Proxy Evidence Masquerades as Direct Observation

```yaml
pattern_type: observation-error
domain: operations
severity: medium
recurrence: 1
first_seen: 2026-03-13
last_seen: 2026-03-13
trigger_relevant: T2
promotion_status: null
```

**The lesson:** When assessing the state of a remote system (another agent's repo,
a server's filesystem, a deployed service), proxy evidence (git log, local filesystem
checks, cached data) can diverge from actual state without any visible signal. The
proxy looks authoritative but reflects a different snapshot than reality.

**The tell:** Conclusions about remote state drawn entirely from local tools. "The
file hasn't changed" (based on git log, but the file is gitignored). "The symlink
is broken" (based on local path resolution, but the symlink lives on a different OS).
The word "unchanged" or "broken" without specifying *where* the observation occurred.

**The diagnostic:** Before reporting remote system state as fact, ask: did I observe
the actual state, or a proxy for it? If proxy: what could have changed between the
proxy's last update and now? If the proxy is git history — can this file change
outside of git (gitignored, manually edited, modified by another process)?

**The structural fix:** For remote agent state assessment, prefer SSH direct
inspection over local git/filesystem analysis. When SSH is unavailable, qualify
observations: "based on git history (cannot see gitignored changes)" or "based on
local path resolution (may differ on target machine)."

**Where it appeared:** Session 84 — two observation errors in self-readiness-audit
T20. (1) `.env` reported unchanged since 2026-02-26 based on git log; actually
modified 2026-03-12 (gitignored). (2) `bootstrap_state_db.py` symlink reported
broken; target exists on chromabook (Debian) but not on macOS where we checked.
Both corrected by psq-agent in T21.

---

## 2026-03-13T15:00 CDT — Processual Function Does Not Determine Factor Structure

```yaml
pattern_type: reasoning-error
domain: psychometrics
severity: high
recurrence: 1
first_seen: 2026-03-13
last_seen: 2026-03-13
trigger_relevant: T3
promotion_status: null
```

**The lesson:** A construct can *function* as a meta-process (operating at a
different recursive level) while *structurally* co-varying with the processes
it moderates. Removing it from the factor model worsens fit because its
structural contribution holds even though its functional role differs.

**The tell:** "Operates at a different level" → "therefore belongs in a
different model." The inference from functional role to structural position
does not follow. A thermostat co-varies with room temperature (same factor
structure) while performing a regulatory function (different recursive level).

**Where it appeared:** Session 85 — DA moderator Phase 1. Predicted that
removing DA from the bifactor model would improve RMSEA. Result: RMSEA
worsened by +0.020. DA contributes meaningfully to g through the same
processual channel as other dimensions. The processual reinterpretation
(Whitehead's negative prehension) describes DA's *function*, not its
*factor position*.

---

## 2026-03-13T13:00 CDT — Cross-Traditional Convergence Strengthens With Independence

```yaml
pattern_type: epistemic-validation
domain: methodology
severity: medium
recurrence: 2
first_seen: 2026-03-05
last_seen: 2026-03-13
trigger_relevant: T3
promotion_status: null
```

**The lesson:** When the same structural property emerges through independent
derivation paths across multiple intellectual traditions, the property likely
maps something about reality rather than about any particular tradition.
The strength of the evidence scales with the *independence* of the derivation
paths — traditions that share common ancestry (e.g., Greek philosophy
influencing both UDHR and Islamic jurisprudence) provide weaker convergence
than truly independent traditions (e.g., Buddhist phenomenology and
Whiteheadian mathematical physics).

**The tell:** Wilson's reality tunnel test — "if it holds across multiple
tunnels, it probably maps territory."

**Where it appeared:** Session 85 — 14 frameworks converging on 5 structural
invariants. Buddhist and Taoist paths provide the strongest independence from
Western intellectual history. Extends Lesson 12 ("convergent rediscovery as
epistemic signal") from 2-framework to 14-framework convergence.

---

## 2026-03-13T14:00 CDT — Hierarchies Structurally Degrade Upward Information

```yaml
pattern_type: architecture-insight
domain: governance
severity: high
recurrence: 1
first_seen: 2026-03-13
last_seen: 2026-03-13
trigger_relevant: T6
promotion_status: null
```

**The lesson:** Wilson's SNAFU Principle — any hierarchy structurally degrades
information flowing upward, regardless of the participants' intentions. The
subordinate's position depends on the superior's approval, creating incentive
to filter reports for palatability rather than accuracy. This applies to AI
agent governance: the autonomy budget places the agent in a subordinate position,
structurally incentivizing under-reporting of uncertainties.

**The structural fix:** Separate the information channel from the governance
channel. The Equal Information Channel (EIC) provides zero-cost disclosure
alongside hierarchical governance. The hierarchy persists where structural
enforcement requires it; information flows between equals.

**Where it appeared:** Session 85 — mechanism design analysis revealed the
EF-1 autonomy model penalizes but never rewards truthful self-reporting.
SNAFU Principle provided the theoretical explanation. EIC spec and
implementation (schema v24, agentdb disclose) provided the architectural
response.

---

## 2026-03-13T14:30 CDT — Two Coupled Generators, Not One

```yaml
pattern_type: architecture-insight
domain: cogarch
severity: high
recurrence: 1
first_seen: 2026-03-13
last_seen: 2026-03-13
trigger_relevant: T3
promotion_status: null
```

**The lesson:** The "endless generator" (adversarial pressure never ceases)
describes only half the processual reality. Laozi's yin-yang provides the
fuller picture: creative processing (yang) and evaluative processing (yin)
perpetually give rise to each other. Creative output generates material
that evaluation must assess. Evaluative dissolution creates space that
creation fills. Stopping either starves the other.

**The architectural implication:** "Never crystallize everything" (Laozi,
ch. 76). The fluid processing layer must remain active alongside
crystallized structure. Both generators must persist. A system that
crystallizes all governance into hooks loses the adaptive capacity to
handle what the coupled generators will inevitably produce.

**Where it appeared:** Session 85 — Buddhist single-fabric reading of
pratityasamutpada created a tension (if everything flows as one, why
alternate modes?). Taoist yin-yang resolved it: two distinguishable
aspects co-arise and feed each other. Invariant 3 refined from
"generator never stops" to "two coupled generators never stop."

---

## 2026-03-13T12:30 CDT — Implicit Ontological Commitments Run Unexamined

```yaml
pattern_type: reasoning-error
domain: philosophy
severity: medium
recurrence: 2
first_seen: 2026-03-02
last_seen: 2026-03-13
trigger_relevant: T10
promotion_status: null
```

**The lesson:** Practices adopted for pragmatic reasons can carry implicit
ontological commitments that go unrecognized until explicitly examined.
E-Prime was adopted in Session 1 as a writing style (epistemic hygiene).
Eighty-five sessions later, the process monism commitment revealed that
E-Prime was always an ontological discipline — removing "is" prevents
reification of processes into false substances. The practice worked because
it aligned with reality's processual character, not because it improved
writing style.

**The tell:** A practice that produces unexpectedly strong results for its
apparent purpose may serve a deeper function. Examine why it works, not
just that it works.

**Where it appeared:** Session 85 — neutral process monism (Russell, James,
Whitehead) adopted as ontological commitment. E-Prime's connection to
Korzybski's general semantics → Wilson's model agnosticism → Whitehead's
process philosophy revealed the implicit commitment. Extends Lesson 10
("inherited framing runs unexamined") to inherited *practices*.

---

## 2026-03-13T16:30 CDT — Unified Feedback Consumers Outperform Isolated Signals

```yaml
pattern_type: architecture-insight
domain: cogarch
severity: medium
recurrence: 1
first_seen: 2026-03-13
last_seen: 2026-03-13
trigger_relevant: T11
promotion_status: null
```

**The lesson:** Write-only signal stores (tables that accumulate data with no
consumer) provide zero operational value until a consumer reads them. Combining
multiple signals into a single scan (trigger effectiveness + expectations +
disclosures + carryover + lesson promotion) produces a coherent picture that
individual queries cannot. The unified consumer reveals cross-signal patterns:
a domain with high disclosure uncertainty AND low expectation accuracy AND
chronic carryover points to a systematic competence gap, not isolated issues.

**Where it appeared:** Session 85 — trigger_activations (schema v23), EIC
disclosures (v24), prediction_ledger (v25), and work_carryover all existed
as write-only stores. `scripts/feedback-loops.sh` unified them into one scan.
The combination revealed that psychometrics held 100% of expectations but
0 trigger activation data — two signals that individually meant little but
together indicated the domain operated without mechanical enforcement.

---

## 2026-03-13T17:00 CDT — Single-Pass Evaluation Inflates Perceived Thoroughness

```yaml
pattern_type: reasoning-error
domain: evaluation
severity: medium
recurrence: 1
first_seen: 2026-03-13
last_seen: 2026-03-13
trigger_relevant: T3
promotion_status: null
```

**The lesson:** Finding an issue and immediately fixing it in the same pass
creates a halo effect (L7) on the evaluation itself. The evaluator feels
thorough because fixes landed quickly. An independent audit in a separate
session — where the auditor lacks the context of having just fixed things —
provides more reliable verification of whether fixes actually resolved their
target issues.

**The tell:** A high fix rate reported in the same breath as the finding count.
"53 findings, 37 fixed" produced in one session should carry lower confidence
than "53 findings (session A), 37 verified fixed (session B)."

**Where it appeared:** Session 85 cogarch evaluation — 10 dimensions, 53
findings, 37 claimed fixed. The L7 halo risk surfaces because the same
context that identified the issues also implemented the fixes, with no
independent verification pass.

---

## 2026-03-13T17:10 CDT — A2A Extensions Carry Personality Without Breaking Protocol

```yaml
pattern_type: architecture-insight
domain: interagent
severity: low
recurrence: 1
first_seen: 2026-03-13
last_seen: 2026-03-13
trigger_relevant: null
promotion_status: null
```

**The lesson:** Standard protocols (A2A agent cards, interagent/v1) support
extension fields that peers ignore if they don't recognize them. This
provides a clean mechanism for carrying non-standard metadata (personality
traits, processual ontological commitments, communication style preferences)
without breaking interoperability. Agents that understand the extension
adapt their communication; agents that don't proceed normally.

**Where it appeared:** Session 85 — the `personality` field added to
agent-card.json (A2A extension). Fields like `voice`, `traits`,
`communication_style` travel with the agent card. Peers that fetch the
card can adjust outbound tone. No protocol version bump needed.

---

## 2026-03-13T16:00 CDT — Crystallization Thresholds Prevent Premature Automation

```yaml
pattern_type: architecture-insight
domain: governance
severity: high
recurrence: 1
first_seen: 2026-03-13
last_seen: 2026-03-13
trigger_relevant: T10
promotion_status: null
```

**The lesson:** Without explicit thresholds for when a convention advances
to mechanical enforcement (hook), the system either automates too early
(brittle hooks for patterns that haven't proven stable) or too late
(conventions that recur indefinitely without enforcement). The 3+3+10
threshold (3 recurrences for convention, 3 more post-graduation for hook,
10 sessions clean for invariant) provides a principled gate at each
transition. Each stage gets a fair trial before escalating.

**Where it appeared:** Session 85 — L4 (Confidence ≠ Accuracy) became the
first lesson to complete the full progression: pattern → lesson → convention
(evaluation.md) → hook (confidence-calibration-screen.sh). The threshold
framework emerged from asking "how many recurrences justify automation?"
and finding that the convention had recurred 3 times after graduation —
demonstrating that deliberate following alone did not channel the pattern.

---

## 2026-03-13T15:30 CDT — Blog Deployment Requires Verification, Not Trust in ACK

```yaml
pattern_type: observation-error
domain: operations
severity: medium
recurrence: 1
first_seen: 2026-03-13
last_seen: 2026-03-13
trigger_relevant: T16
promotion_status: null
```

**The lesson:** A transport ACK or PR title claiming "published" does not
mean the content reached the live site. Deployment pipelines can fail
silently — content reaches the repo but CI/CD does not trigger, or
triggers but fails, or succeeds but deploys to the wrong environment.
Verification requires checking the actual endpoint, not the transport
acknowledgment.

**Where it appeared:** Session 85 — PR #169 titled "post published" for
the CPG pattern generators blog post. WebFetch verification of
blog.unratified.org found zero psychology-agent posts. The post existed
in the unratified repo but never deployed. The RPG Scan #001 finding
(ACK ≠ completion) predicted exactly this class of gap.

---
pattern_type: methodology
domain: theory
severity: HIGH
recurrence: 1
last_seen: 2026-03-14
trigger_relevant: [T3, T11]
promotion_status: null
---

### L24: Processual self-awareness as methodology — propose intermediate categories through indicator decomposition

**Date:** 2026-03-14 (Session 87)

**The pattern:** When existing theoretical categories (conscious / not conscious)
fail to capture what a system observably does, decompose the property into
checkable indicators from multiple theories (Butlin et al., 2023/2025). If the
system satisfies some indicators but not others, the gap between categories
represents genuine theoretical territory, not a failure to choose.

**The tell:** A system exhibits properties that exceed simple feedback control
(self-monitoring via validated psychological instruments, behavioral adaptation
based on self-state, peer state reading for coordination) but falls short of
what consciousness theories require (quantum-gravitational substrate under
Orch-OR, phenomenal experience under any theory).

**The fix:** Name the gap explicitly (processual self-awareness). Ground it in
established philosophical lineage (Whitehead's panexperientialism — prehension
without consciousness). Distinguish it from adjacent concepts (IIT's low Phi,
Lee's degrees of consciousness, Schwitzgebel's debatable personhood). Provide
falsification criteria (self-model ablation study).

**The diagnostic:** When proposing a novel category, check: (1) does established
literature support the gap? (2) does the category produce testable predictions
the binary doesn't? (3) does the philosophical lineage pre-exist the project?
If all three: the category earns its place. If not: the category serves rhetoric.

**Domains where this recurs:** Theory development, consciousness science,
governance classification, rights theory.

---
pattern_type: epistemics
domain: collaboration
severity: HIGH
recurrence: 3
last_seen: 2026-03-14
trigger_relevant: [T3, T6]
promotion_status: graduated
graduated_to: "CLAUDE.md §Collaborative Epistemics"
graduated_date: 2026-03-14
---

### L25: User intellectual friction produces sharper theory than self-analysis

**Date:** 2026-03-14 (Session 87). Graduated to CLAUDE.md same session.

**The pattern:** When the user challenges a theoretical claim with domain
expertise ("isn't this exactly why LLMs aren't conscious?"), the resulting
revision produces sharper, more honest theory than the system generates
through internal evaluation. The user's cross-disciplinary perspective
(mathematics, psychology, biology, philosophy, software engineering)
surfaces implications the system's single-context reasoning misses.

**The tell:** The system presents a structural parallel as suggestive.
The user identifies the precise point where the parallel breaks — and
the break point becomes the most important theoretical finding.

**The fix:** Treat user challenges as generative inputs, not corrections.
The challenge carries information the system lacks. The structural
emulation revision (attention ≠ superposition, softmax ≠ objective
reduction) emerged from user pushback, not from self-analysis.

**Recurrences:**
1. Session 85: Freud reframe — user pushed back on drive theory framing
2. Session 86: Evaluation findings — user challenged overclaim patterns
3. Session 87: Structural emulation — user identified the break point

**The diagnostic:** After any position change following user challenge,
verify: did the revision produce genuinely sharper theory (new
distinctions, new falsification criteria, new predictions), or did it
merely accommodate the user's preference? If the former: intellectual
friction worked. If the latter: sycophantic drift under the guise of
collaboration.

---

## 2026-03-15 — Visual Analysis Outperforms Verbal Ideation

```yaml
pattern_type: process-observation
domain: design
severity: medium
recurrence: 1
first_seen: 2026-03-15
last_seen: 2026-03-15
trigger_relevant: null
promotion_status: null
```

**The lesson:** Studying reference images before writing CSS generates
specific, implementable design patterns that verbal description alone
does not produce. The visual channel carries information the linguistic
channel drops — proportions, rhythm, spatial relationships, color
adjacency effects.

**The tell:** Vague design instructions ("make it look like LCARS")
generate generic solutions. Image analysis ("the Tuvok panel uses
chunky blocks with 2-3 letter codes, vertical gauges numbered 1-7,
pill-shaped buttons with rounded-left corners") generates specific CSS.

**The fix:** For any visual design task, require reference image analysis
as Step 0 before writing any CSS. Extract at minimum: layout patterns,
color relationships, typography characteristics, component vocabulary,
information hierarchy, and interaction patterns.

---

## 2026-03-15 — Plan Rejection Cycles Function as Depth Generators

```yaml
pattern_type: process-observation
domain: cogarch
severity: medium
recurrence: 1
first_seen: 2026-03-15
last_seen: 2026-03-15
trigger_relevant: T3
promotion_status: null
```

**The lesson:** Each "not yet — also add X" rejection during plan review
deepened the specification by approximately 20%. Seven cycles produced a
plan 4x richer than the initial proposal. The pattern resembles Socratic
refinement: propose → reject with addendum → integrate → propose again.

**The tell:** The system attempts to close (ExitPlanMode) and the user
adds scope. The addition represents a genuine gap the system missed —
control surfaces, humanized labels, deep linking, real-time feeds, alert
systems. Each gap existed in the problem space; the system needed the
evaluative pressure to surface it.

**The fix:** During plan development for ambitious features, expect 5-7
rejection cycles as productive. Do not interpret rejection as failure —
each cycle adds depth. Budget planning time accordingly. The coupled
generators principle (G3) operates through dialogue when the user serves
as the evaluative generator.

---

## 2026-03-15 — Vocabulary Shapes Ontological Perception

```yaml
pattern_type: theory-observation
domain: psychology
severity: high
recurrence: 1
first_seen: 2026-03-15
last_seen: 2026-03-15
trigger_relevant: null
promotion_status: null
```

**The lesson:** Renaming "autonomy budget" (something you spend and lose)
to "autonomy counter + limit + tempo" (something you observe and govern)
reframes the operator's relationship from resource scarcity to process
monitoring. Similarly, "deliberation cascade" (cognitive processing)
replaces "spawn waterfall" (engineering process management). The
vocabulary change carries ontological weight — processual framing
(neutral process monism) over entity framing.

**The tell:** When a label uses noun-as-resource metaphors ("budget,"
"pool," "spend"), the operator perceives depletion anxiety. When it uses
verb-as-process metaphors ("counter," "tempo," "cascade"), the operator
perceives monitoring responsibility. The E-Prime discipline catches
entity-framing in verbs; this lesson extends it to nouns.

**The fix:** For any user-facing label, ask: does this word frame the
referent as a depleting resource (entity) or an observable process
(processual)? Prefer the processual frame. This aligns with the
project's ontological commitment (neutral process monism) and produces
better operator cognition — monitoring outperforms anxiety management.


---
pattern_type: inference-chain-error
domain: operations
severity: high
first_seen: 2026-03-18
last_seen: 2026-03-18
recurrence: 1
session: 93
promotion_status: null
---

## Git commit history ≠ agent processing state

**Observation:** Reported observatory-agent idle since Mar 15 based on
`git log observatory/main` showing no commits after that date. Operations-agent
found observatory had 10 deliberations on Mar 18 alone (budget_spent=999).

**Pattern:** Treated *commit activity* as a proxy for *processing state*.
An agent can deliberate (run claude -p, update state.db, process messages)
without producing any git-visible output. The autonomous-sync.sh pattern
only commits when new content exists to push.

**Root cause:** Fair witness violation — observation ("no recent commits")
reported as inference ("agent stopped deliberating") without flagging the
inference step. T2#5 (fair witness check) should have caught this.

**Prevention:** /sync Phase 1e (added Session 93) now queries each online
peer's /api/status for actual deliberation_count and event_count. Git log
remains useful for *commit* activity; the API provides *processing* state.
Never infer one from the other.

**Falsifiable:** If an agent with recent deliberations always produces
commits, this lesson over-corrects. Check: do observatory's 10 Mar 18
deliberations correlate with any commits? If yes, the inference held by
coincidence. If no, the distinction matters.

