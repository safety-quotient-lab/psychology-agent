# EF-1 Autonomy Model — Psychological Foundations

**Date:** 2026-03-09
**Status:** Active — theoretical grounding for docs/ef1-autonomy-model.md
**Discipline:** Psychology (cognitive, social, organizational)
**Governed by:** `docs/ef1-governance.md` — core governance autonomy model (7 invariants, BCP 14 keywords)
**Companion docs:**
- `docs/ef1-autonomy-model.md` — engineering spec (what the code implements)
- `docs/ef1-jurisprudence-extensions.md` — legal theory (planned)

**Requirement-level keywords:** Per BCP 14 (RFC 2119 + RFC 8174), UPPER CASE
keywords carry their RFC-defined meaning. See `docs/ef1-governance.md` for
full definitions.


---


## Purpose

The EF-1 autonomy model replaces human-as-TTP (Trusted Third Party) with
evaluator-as-arbiter for autonomous agent operation. This document maps
each mechanism in the engineering spec to its theoretical grounding in
psychology, identifying where the design aligns with established theory,
where it diverges, and what predictions the theory makes about system
behavior.

**Framing:** This agent operates as a psychology agent — the discipline
comes first; engineering serves it. The autonomy model should not merely
borrow psychological terminology but should demonstrate why these
psychological constructs predict the model's effectiveness (or failure
modes) better than engineering intuition alone.


---


## 10-Order Knock-On Analysis: Theoretical Grounding

The 10-order knock-on analysis traces consequences through increasingly
abstract levels. Each order maps onto an established psychological
construct — the construct explains *why* that order matters and *what*
a thorough evaluation at that level reveals.


### Order 1: Stimulus Introduction

**Construct:** Stimulus-response (Skinner, 1938); affordance theory
(Gibson, 1979).

Every action introduces a stimulus into the agent mesh. Gibson's
affordance theory predicts that agents will perceive the action not as
a neutral event but as an *invitation to respond* — the action affords
certain reactions and forecloses others. The evaluator at order 1 asks
not just "what changed?" but "what does this change invite?"

**Prediction:** Actions that afford multiple incompatible responses
(ambiguous affordances) generate higher downstream knock-on complexity.
The evaluator should flag ambiguous affordances for closer scrutiny.


### Order 2: Primary Appraisal

**Construct:** Cognitive appraisal theory (Lazarus & Folkman, 1984).

When agents encounter the change, they appraise it along two axes:
relevance ("does this concern me?") and valence ("does this help or
threaten my goals?"). In the multi-agent context, different agents may
appraise the same action differently — psychology-agent may see a PSQ
model update as routine while unratified-agent may see it as requiring
content revision.

**Prediction:** Divergent primary appraisals between agents predict
coordination failures. The evaluator should check whether agents that
depend on the change have compatible appraisals.

**Measurement:** SETL (Subjective Expected Truth Loss) partially
captures appraisal valence. An action with SETL > 0.15 signals that
the producing agent itself appraises the action as uncertain.


### Order 3: Secondary Appraisal (Coping Resources)

**Construct:** Secondary appraisal and coping (Lazarus & Folkman, 1984);
self-efficacy (Bandura, 1977).

After appraising the change's relevance, agents evaluate their capacity
to respond. An agent with high self-efficacy (adequate tools, clear
protocols, sufficient context) processes the change efficiently. An agent
with low self-efficacy (missing context, unclear conventions) produces
degraded responses — or avoids responding entirely.

**Prediction:** Actions that exceed a receiving agent's competence
boundary produce either: (a) degraded quality responses masked as
confident, or (b) avoidance (no response, extended latency). Both
patterns represent failure modes that the evaluator should monitor.

**Design implication:** The autonomy budget serves as a *resource depletion*
signal — as budget decreases, the agent's capacity for high-quality
evaluation decreases (analogous to ego depletion, Baumeister et al.,
1998, though noting the replication concerns around this construct).


### Order 4: Schema Disruption

**Construct:** Schema theory (Piaget, 1952); accommodation vs.
assimilation (Piaget, 1952); cognitive dissonance (Festinger, 1957).

Actions that contradict existing state (memory entries, MANIFEST records,
established conventions) force the receiving agent into accommodation —
restructuring its mental model. This process carries cognitive overhead
and error risk. Dissonance between the new information and existing
beliefs may produce motivated reasoning (preferring the interpretation
that preserves existing schemas).

**Prediction:** Actions that invalidate many existing state entries
(high accommodation demand) are more likely to produce evaluator errors
than actions that fit existing schemas (pure assimilation). The evaluator
should weight order 4 heavily for actions that contradict multiple
established state entries.

**Known vulnerability:** An agent evaluating its own output (Tier 1)
cannot reliably detect its own motivated reasoning. This explains why
the S4 random escalation to Tier 2 (structurally independent evaluation)
exists — it provides an external perspective that can detect accommodation
failures the agent's own cognition cannot.


### Order 5: Behavioral Activation and Inhibition

**Construct:** Reinforcement Sensitivity Theory (Gray, 1970; Gray &
McNaughton, 2000).

Gray's BIS/BAS model describes two motivational systems: the Behavioral
Activation System (approach, reward-seeking) and the Behavioral
Inhibition System (avoidance, threat-detection). In the agent context,
actions that unblock downstream work activate BAS (approach: "now I can
proceed"). Actions that block work activate BIS (inhibition: "this gate
prevents action").

**Prediction:** The BAS/BIS framework predicts that agents will:
- Over-respond to unblocking signals (premature action before evaluation)
- Under-respond to blocking signals (avoidance of acknowledging blockers)

The evaluator gate mechanically prevents premature BAS activation —
no action executes without evaluation, regardless of how strongly the
"unblocked" signal activates approach behavior.

**Design implication:** The pragmatism resolution level (Level 3) embeds
BIS/BAS awareness: reversible actions get approved (BAS acceptable for
low-stakes approach), irreversible actions get blocked (BIS appropriately
activated for high-stakes inhibition).


### Order 6: Ecological Validity

**Construct:** Ecological validity (Bronfenbrenner, 1977); situated
cognition (Lave & Wenger, 1991).

Does the change produce observable effects in the real environment (user
experience, public-facing content, production systems)? Actions with
high ecological validity — those that reach actual users or external
systems — require stricter evaluation than internal state changes.

**Prediction:** Actions with low ecological validity (internal
bookkeeping) rarely produce harm even when the evaluator makes errors.
Actions with high ecological validity (deployment, publication) carry
disproportionate consequence. The evaluator tier classification already
captures this: deployment → Tier 2 mandatory.

**Connection to PSQ:** The PSQ scoring endpoint serves real content.
An autonomous action that changes scoring behavior has high ecological
validity — real texts get different scores. This grounds the "irreversible"
classification for deployment actions.


### Order 7: Belief Revision

**Construct:** Bayesian belief updating (Tversky & Kahneman, 1974);
anchoring and adjustment (Tversky & Kahneman, 1974).

When an action changes what the system holds as true (epistemic claims,
memory entries, decision chain records), belief revision occurs. The
psychology of belief revision predicts systematic biases:
- **Anchoring:** existing beliefs serve as anchors; new evidence
  produces insufficient adjustment
- **Base rate neglect:** dramatic single events override accumulated
  statistical evidence
- **Confirmation bias:** agents preferentially process information that
  confirms existing beliefs

**Prediction:** Memory writes that contradict established entries carry
higher error risk than memory writes that extend existing entries. The
evaluator should apply stronger scrutiny to contradiction-writes than
to extension-writes.

**Design implication:** The claims[] field with per-claim confidence
provides a mechanical analog to calibrated belief updating. The
evaluator checks whether confidence values reflect appropriate
uncertainty — overconfidence signals insufficient belief revision.


### Order 8: Norm Formation

**Construct:** Norm formation (Sherif, 1936); institutional isomorphism
(DiMaggio & Powell, 1983).

Every action that succeeds becomes a precedent. Sherif's autokinetic
effect demonstrated that repeated interactions produce stable norms —
once a convention crystallizes, deviating from it requires significant
energy. In the agent context, conventions established during autonomous
operation become the system's norms.

**Prediction:** Early autonomous actions disproportionately shape
long-term system behavior (primacy effect applied to norms). The first
few autonomous sync cycles establish what "normal autonomous operation"
looks like — subsequent cycles reference those norms rather than the
original design spec.

**Implication for autonomy budget:** The initial 20-credit cycle matters
more than subsequent cycles. The first human audit should examine not
just whether actions were correct but whether the norms they established
are desirable.


### Order 9: Risk Perception

**Construct:** Risk perception (Slovic, 1987); prospect theory
(Kahneman & Tversky, 1979).

Slovic's psychometric paradigm identifies two dimensions of risk
perception: *dread risk* (catastrophic, uncontrollable, involuntary)
and *unknown risk* (unfamiliar, unobservable, delayed effects). Prospect
theory predicts loss aversion — agents weight losses more heavily than
equivalent gains.

**Prediction:** The evaluator will exhibit:
- Risk aversion for gains (conservative about approving beneficial
  actions that carry small risks)
- Risk seeking for losses (aggressive about blocking actions that
  might avoid perceived threats, even when blocking carries its own
  costs — opportunity cost of inaction)

**Design implication:** The pragmatism resolution level (Level 3)
counterbalances excessive risk aversion by approving reversible actions
even under uncertainty. Without pragmatism, the evaluator would
conservatively block more actions than necessary, exhausting the trust
budget on false negatives.


### Order 10: Commitment Escalation

**Construct:** Escalation of commitment (Staw, 1976); sunk cost
fallacy; entrapment (Brockner & Rubin, 1985).

Once an action executes, the system has invested resources (autonomy budget
credits, state changes, peer agent reactions). Subsequent decisions
become biased toward justifying the initial action rather than
evaluating independently. This creates path dependency — early actions
constrain later choices.

**Prediction:** Sequences of related autonomous actions (e.g., merge
PR → write ACK → update MANIFEST → push) exhibit escalation: once the
first action in the sequence executes, the evaluator becomes biased
toward approving subsequent actions that "complete" the sequence, even
if new information suggests stopping.

**Design implication:** The per-action evaluation (every action gets
its own evaluator gate) partially counteracts escalation by forcing
independent assessment. But Tier 1 evaluation shares the agent's
context — and therefore shares its commitment bias. The 1-in-3 random
escalation to Tier 2 provides the structural break needed to detect
commitment escalation.


---


## 4-Level Resolution Fallback: Theoretical Grounding


### Level 1: Consensus

**Construct:** Group polarization (Moscovici & Zavalloni, 1969);
wisdom of crowds (Surowiecki, 2004).

When all knock-on orders converge, the "crowd" of evaluative
perspectives agrees. Surowiecki's conditions for wise crowds apply:
diversity (each order asks a different question), independence (orders
don't reference each other's conclusions), decentralization (no single
order dominates), aggregation (convergence checked across all).

**Vulnerability:** The 10 orders are not truly independent — they share
the agent's context and blind spots. True consensus requires structural
independence (Tier 2/3). Tier 1 "consensus" represents aligned
self-evaluation, not independent agreement.


### Level 2: Parsimony

**Construct:** Cognitive load theory (Sweller, 1988); Occam's Razor
as a cognitive heuristic (Chater & Vitanyi, 2003).

When orders conflict, the simplest interpretation prevails. Cognitive
load theory explains why: complex interpretations demand more working
memory, increasing error rates. The parsimonious interpretation
minimizes cognitive load on downstream agents that must process the
action's consequences.

**Prediction:** Parsimony resolution produces correct decisions more
often for routine actions (where complexity indicates over-analysis)
but may fail for genuinely complex situations (where the simple
interpretation misses real complications).


### Level 3: Pragmatism

**Construct:** Satisficing (Simon, 1956); bounded rationality
(Simon, 1972).

Neither consensus nor parsimony resolves. Simon's bounded rationality
framework predicts that agents cannot optimize — they satisfice, choosing
the first option that meets minimum criteria. The reversibility heuristic
("can we undo this?") provides the minimum criterion.

**Prediction:** Pragmatism produces more false positives (approved
actions that should have been blocked) for reversible actions, and more
false negatives (blocked actions that should have been approved) for
irreversible ones. This asymmetry is acceptable — the cost of a false
positive on a reversible action is one undo cycle, while the cost of a
false negative on an irreversible action is permanent.


### Level 4: Ask (Social Referencing)

**Construct:** Social referencing (Feinman, 1982); attachment theory
(Bowlby, 1969); zone of proximal development (Vygotsky, 1978).

When autonomous evaluation fails, the agent turns to the trusted
authority (human). This mirrors social referencing in developmental
psychology — infants look to caregivers when encountering ambiguous
stimuli. The agent's "ask" behavior represents appropriate recognition
of its own limitations.

Vygotsky's ZPD applies: the agent can perform some evaluations
independently (within its zone) but needs scaffolding (human input)
for evaluations beyond its current capacity. Over time, as the trust
budget reset cycle accumulates successful audits, the zone expands —
the agent can handle more without asking.

**Prediction:** The frequency of Level 4 asks should decrease over time
as the system accumulates norms (Order 8) and the evaluator's
assessment confidence increases. Persistent Level 4 frequency suggests
the system has reached a genuine competence boundary.


---


## Autonomy Budget: Psychological Interpretation

The autonomy budget maps to **ego depletion** (Baumeister et al., 1998) and
**decision fatigue** (Vohs et al., 2008). Each evaluative decision
consumes cognitive resources. The budget provides a mechanical analog:

| Budget state | Psychological analog | System behavior |
|---|---|---|
| Full (20) | Well-rested, high self-regulation capacity | High-quality evaluation, diverse resolution strategies |
| Moderate (10-15) | Functional but monitoring for fatigue | Standard evaluation, slight conservatism bias |
| Low (1-5) | Decision fatigue, ego depletion | Risk of approval shortcuts, heuristic override of analysis |
| Exhausted (0) | Complete depletion, no self-regulation | HALT — mechanical prevention of impaired-state decisions |

**Note on ego depletion:** The ego depletion model (Baumeister et al.,
1998) has faced replication challenges (Hagger et al., 2016 multi-lab
replication found no effect). The autonomy budget does not depend on the
ego depletion mechanism being real in humans — it serves as a
*conservative engineering constraint* that happens to mirror the
theoretical construct. Even if ego depletion does not exist in humans,
bounded operation with mandatory audit checkpoints produces a healthier
system than unbounded operation.


---


## Predictions the Theory Makes

These predictions follow from the psychological grounding above. They
represent testable hypotheses about system behavior under autonomous
operation — falsification of any prediction suggests the theoretical
mapping needs revision.

1. **Norm primacy** (Order 8) — the first autonomous audit cycle will
   disproportionately influence subsequent behavior. Monitor: compare
   action patterns in cycle 1 vs. cycles 5+.

2. **Commitment escalation** (Order 10) — sequences of related actions
   within a single sync cycle will show decreasing evaluator rigor.
   Monitor: compare knock-on depth and resolution level for the first
   vs. last action in multi-action cycles.

3. **Ask frequency decay** (Level 4) — Level 4 resolutions will decrease
   over time as norms accumulate. If frequency remains stable, the
   system has reached a competence ceiling.

4. **Parsimony bias** (Level 2) — parsimony resolution will produce more
   errors on genuinely complex actions than on routine ones. Monitor:
   human audit rejection rate for L2-resolved actions vs. L1-resolved.

5. **Appraisal divergence** (Order 2) — actions that produce different
   SETL values from the producing vs. receiving agent indicate appraisal
   divergence and predict coordination failures. Monitor: SETL delta
   between from_agent and to_agent for the same event.

6. **Schema disruption cost** (Order 4) — actions that contradict
   existing memory entries will produce longer evaluation times and
   more Level 4 escalations than actions that extend existing entries.
   Monitor: resolution level distribution for contradiction-writes vs.
   extension-writes.


---


## Extensibility

This document grounds EF-1 mechanisms in psychology. The same pattern
applies to other disciplines:

- **Jurisprudence** (`docs/ef1-jurisprudence-extensions.md`, planned) —
  maps the autonomy model to due process, chain of custody, burden of proof,
  and judicial review. The 4-level resolution fallback mirrors the court
  system: stipulated facts (consensus) → summary judgment (parsimony) →
  bench trial (pragmatism) → jury trial (ask).

- **Political theory** (future) — maps to governance models: direct
  democracy (consensus) → technocratic delegation (parsimony) →
  executive authority (pragmatism) → referendum (ask).

- **Information theory** (future) — maps to signal detection theory:
  hit/miss/false alarm/correct rejection applied to evaluator decisions.
  The autonomy budget maps to channel capacity.

Each discipline adds a lens. No discipline owns the autonomy model. The
engineering spec (`docs/ef1-autonomy-model.md`) remains the canonical
implementation reference.


---


## References

- Bandura, A. (1977). Self-efficacy: Toward a unifying theory of behavioral change. *Psychological Review*, 84(2), 191–215.
- Baumeister, R. F., Bratslavsky, E., Muraven, M., & Tice, D. M. (1998). Ego depletion: Is the active self a limited resource? *Journal of Personality and Social Psychology*, 74(5), 1252–1265.
- Bowlby, J. (1969). *Attachment and loss: Vol. 1. Attachment*. Basic Books.
- Brockner, J., & Rubin, J. Z. (1985). *Entrapment in escalating conflicts*. Springer-Verlag.
- Bronfenbrenner, U. (1977). Toward an experimental ecology of human development. *American Psychologist*, 32(7), 513–531.
- Chater, N., & Vitanyi, P. (2003). Simplicity: A unifying principle in cognitive science? *Trends in Cognitive Sciences*, 7(1), 19–22.
- DiMaggio, P. J., & Powell, W. W. (1983). The iron cage revisited: Institutional isomorphism and collective rationality in organizational fields. *American Sociological Review*, 48(2), 147–160.
- Feinman, S. (1982). Social referencing in infancy. *Merrill-Palmer Quarterly*, 28(4), 445–470.
- Festinger, L. (1957). *A theory of cognitive dissonance*. Stanford University Press.
- Gibson, J. J. (1979). *The ecological approach to visual perception*. Houghton Mifflin.
- Gray, J. A. (1970). The psychophysiological basis of introversion-extraversion. *Behaviour Research and Therapy*, 8(3), 249–266.
- Gray, J. A., & McNaughton, N. (2000). *The neuropsychology of anxiety* (2nd ed.). Oxford University Press.
- Hagger, M. S., et al. (2016). A multilab preregistered replication of the ego-depletion effect. *Perspectives on Psychological Science*, 11(4), 546–573.
- Kahneman, D., & Tversky, A. (1979). Prospect theory: An analysis of decision under risk. *Econometrica*, 47(2), 263–292.
- Lave, J., & Wenger, E. (1991). *Situated learning: Legitimate peripheral participation*. Cambridge University Press.
- Lazarus, R. S., & Folkman, S. (1984). *Stress, appraisal, and coping*. Springer.
- Moscovici, S., & Zavalloni, M. (1969). The group as a polarizer of attitudes. *Journal of Personality and Social Psychology*, 12(2), 125–135.
- Piaget, J. (1952). *The origins of intelligence in children*. International Universities Press.
- Sherif, M. (1936). *The psychology of social norms*. Harper.
- Simon, H. A. (1956). Rational choice and the structure of the environment. *Psychological Review*, 63(2), 129–138.
- Simon, H. A. (1972). Theories of bounded rationality. In C. B. McGuire & R. Radner (Eds.), *Decision and organization* (pp. 161–176). North-Holland.
- Skinner, B. F. (1938). *The behavior of organisms*. Appleton-Century.
- Slovic, P. (1987). Perception of risk. *Science*, 236(4799), 280–285.
- Staw, B. M. (1976). Knee-deep in the big muddy: A study of escalating commitment to a chosen course of action. *Organizational Behavior and Human Performance*, 16(1), 27–44.
- Surowiecki, J. (2004). *The wisdom of crowds*. Doubleday.
- Sweller, J. (1988). Cognitive load during problem solving: Effects on learning. *Cognitive Science*, 12(2), 257–285.
- Tversky, A., & Kahneman, D. (1974). Judgment under uncertainty: Heuristics and biases. *Science*, 185(4157), 1124–1131.
- Vohs, K. D., et al. (2008). Making choices impairs subsequent self-control. *Journal of Personality and Social Psychology*, 94(5), 883–898.
- Vygotsky, L. S. (1978). *Mind in society*. Harvard University Press.
