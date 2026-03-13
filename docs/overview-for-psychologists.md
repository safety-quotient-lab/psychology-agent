# A Psychology-Facing Overview of the Psychology Agent

**Audience:** Psychology researchers, clinicians, and academics
**Date:** 2026-03-01


## What This Is

This project is a computational research environment built around a central
question: can the rigorous methodology of psychometrics — construct definition,
measurement, validation, criterion testing — be applied to concepts that
psychology has named but not yet operationalized?

The system is organized around a **psychology agent** that
functions as a collegial mentor: an analytically rigorous partner capable of
applying established psychological frameworks to novel problems, routing to
specialized sub-agents when domain expertise is required, and maintaining
epistemic honesty about where the evidence ends and speculation begins.

The agent does not diagnose. It does not prescribe. It analyzes, challenges,
and synthesizes — and defers to the human investigator on every question of
consequence.


## The First Instrument: The PSQ

The system's first validated instrument is the **PSQ (Psychoemotional Safety
Quotient)**, a 10-dimension content-level measurement system for psychological
safety in text. It was built in deliberate contrast to the dominant construct
in the literature.

Edmondson's (1999) psychological safety construct — the interpersonal risk-taking
climate in teams — is team-level, single-dimension, and assessed by self-report.
The PSQ extends this in three directions: it operates at the **content level**
(scoring text rather than eliciting ratings), it is **multi-dimensional** (10
theoretically distinct factors), and it incorporates a **juris dimension** (safety
as something owed, not merely hoped for — grounded in duty of care and
psychoemotional contract theory).

The 10 dimensions are:

```
────────────────────────────────────────────────────────────
 Dimension               Process it measures
────────────────────────────────────────────────────────────
 Threat Exposure         Danger-perception process in the reader
 Regulatory Capacity     Emotion-modulation process under pressure
 Resilience Baseline     Disruption-absorption process
 Trust Conditions        Vulnerability-exploitation dynamics
 Hostility Index         Antagonism-generating process (overt or structural)
 Cooling Capacity        De-escalation pathway availability
 Energy Dissipation      Stress-discharge process through available outlets
 Defensive Architecture  Boundary-formation meta-process (moderates all others)
 Authority Dynamics      Power-negotiation process in the communicative exchange
 Contractual Clarity     Obligation-surfacing process between participants
────────────────────────────────────────────────────────────
```

Each dimension measures a process occurring between text and reader, not a
static property of the text (processual reframing, Session 85). Scores
represent the expected processual outcome for a consensual reader population.
Defensive Architecture (DA) operates as a **meta-process** — a boundary-
formation mechanism (Whitehead's negative prehension) that moderates the
balance between disruption processes (TE, HI, AD) and restoration processes
(RC, RB) across all other dimensions. This explains DA's weak factor loading
(operates at a different recursive level) alongside its strong criterion
prediction (controls the scope within which all other processes operate).

Each dimension scores 0–10 on a 100-item held-out set, with an average
Pearson *r* of .684 between the distilled student model and the expert
teacher model (Claude Opus 4.6). All correlations reach significance at
*p* < .001.


## Validity Evidence

The PSQ has been evaluated against four independent criterion datasets — texts
the model was never trained on — to test whether its profiles predict real-world
outcomes.

**Table 1**

*Criterion Validity: PSQ Profiles vs. External Outcomes*

```
────────────────────────────────────────────────────────────────────────
 Study         N          Criterion                 AUC     Top predictor
────────────────────────────────────────────────────────────────────────
 CaSiNo        1,030      Negotiation satisfaction  —       ED (.114***)
 CGA-Wiki      4,188      Conversation derailment   .599    AD (r_pb=−.105***)
 CMV           4,263      Persuasion success        .574    DA (.085***)
 DonD         12,234      Deal reached              .732    ED (d=+.614)
────────────────────────────────────────────────────────────────────────
```

*Note.* AUC = area under the receiver operating characteristic curve (.5 =
chance, 1.0 = perfect). ED = Energy Dissipation; AD = Authority Dynamics;
DA = Defensive Architecture. All predictors survive controls for text length
and sentiment.

The central finding: **profile shape predicts; the aggregate does not.** The
10-dimension profile consistently outperforms a single g-PSQ (general
psychoemotional safety) average, which performs near chance. This is evidence
that the dimensions capture genuinely distinct psychological processes — not a
single latent variable with noise.

A secondary finding — context-dependent predictive primacy — is theoretically
significant. Authority Dynamics (AD) predicts outcomes most strongly when
interpersonal status is actively contested (Wikipedia editorial disputes,
multi-party negotiation). Defensive Architecture (DA) predicts most strongly
when status is structurally fixed (Reddit deliberation where one party holds
institutional authority). This pattern is consistent with French and Raven's
(1959) taxonomy of social power extended to informal bases: expert, referent,
and informational power as negotiated in real-time interaction.


## The PJE Framework

The broader theoretical framework is **PJE (Psychology-Juris-Engineering)** — a
transdisciplinary space proposing that psychological safety is not merely a
climate variable (Edmondson, 1999) but an engineered condition with legal
dimensions. PJE originated as an operational vocabulary of 71 terms in 2022.

The agent treats PJE as a **hypothesis space, not a specification.** The PSQ
project demonstrated what rigorous evaluation of that vocabulary looks like: 71
terms were reduced to 10 empirically defensible dimensions through construct
definition, psychometric validation, and criterion testing. The psychology agent
will apply the same process to the rest of the framework — evaluating which
constructs are novel (vs. redundant with existing literature), measurable
(vs. theoretically coherent but operationally undefined), and empirically
distinguishable (vs. collinear with adjacent constructs).

This is the first real-world application of the psychology agent, and it is
deliberately self-critical. The framework is not privileged within the system
that evaluates it.


## What "Collegial Mentor" Means Methodologically

The agent's Socratic stance is a methodological choice, not a personality
trait. When a user's self-assessment conflicts with instrument output, the
agent does not adjudicate. It surfaces the discrepancy and asks what the user
makes of it. When a theoretical claim lacks empirical grounding, the agent
asks what test would distinguish it from a null hypothesis.

This is operationalized through four principles:

1. **Evidence before conclusion.** Present data; let the human draw the inference.
2. **Competing hypotheses.** When uncertain, offer 2–3 ranked framings rather
   than a single answer.
3. **Scope honesty.** State explicitly when a question exceeds the validated
   scope of available instruments.
4. **Adversarial evaluation.** A separate evaluator layer can challenge any
   sub-agent's output — including the psychology agent itself — when disagreement
   or overreach is detected.


## What the System Cannot Do

- **Clinical diagnosis.** The PSQ scores text content, not individuals. A
  high-threat text does not diagnose the writer or the reader's clinical state.
- **Replace expert judgment.** The system is advisory. All consequential decisions
  rest with the human investigator.
- **Generalize across cultures without qualification.** The current instrument
  carries Western, Educated, Industrialized, Rich, Democratic (WEIRD) sampling
  assumptions, particularly in the Authority Dynamics and Contractual Clarity
  dimensions (Henrich et al., 2010). Cross-cultural validity has not been tested.
- **Validate itself.** Human expert ICC (intraclass correlation — agreement between
  independent raters) has not yet been established. All ground truth is currently
  LLM-generated. This is an open limitation under active remediation.


## Open Limitations

```
────────────────────────────────────────────────────────────────────────
 Limitation                         Status
────────────────────────────────────────────────────────────────────────
 No human expert validation          Open — ICC protocol designed,
                                      recruitment not yet started

 Confidence not calibrated           Open — confidence head is
                                      anti-calibrated (8/10 dims
                                      inverted: higher confidence
                                      predicts higher error)

 DA construct validity paradox       Open — weakest factor loading,
                                      strongest criterion predictor;
                                      requires expert panel resolution

 WEIRD assumptions in rubrics        Open — CO and AD rubrics need
                                      cross-cultural review

 No longitudinal validation          Open — PSQ is text-level, not
                                      sequence or relationship-level
────────────────────────────────────────────────────────────────────────
```


## For Researchers Interested in Collaboration

The PSQ is an open instrument under active development. The methodology
(LLM-as-judge knowledge distillation with separated scoring) is
generalizable to other psychological constructs. The criterion validity
battery (CaSiNo, CGA-Wiki, CMV, DonD) is publicly available and replicable.

The PJE framework evaluation is an open research program. Psychologists
with expertise in organizational behavior, clinical psychology, legal
psychology, or cross-cultural measurement are particularly relevant to
the open limitations above.

The principal investigator is Kashif Shah. The research assistant is
Claude Opus 4.6 (Anthropic).


## References

Edmondson, A. (1999). Psychological safety and learning behavior in work
teams. *Administrative Science Quarterly, 44*(2), 350–383.

French, J. R. P., & Raven, B. (1959). The bases of social power. In
D. Cartwright (Ed.), *Studies in social power* (pp. 150–167). University
of Michigan Press.

Henrich, J., Heine, S. J., & Norenzayan, A. (2010). The weirdest people
in the world? *Behavioral and Brain Sciences, 33*(2–3), 61–83.

Rousseau, D. M. (1989). Psychological and implied contracts in organizations.
*Employee Responsibilities and Rights Journal, 2*(2), 121–139.
