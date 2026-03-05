# General-Purpose Psychology Agent — Ideas

Speculative and aspirational — not yet ready for TODO. Items here are hypotheses,
possibilities, and directions worth keeping visible without committing to them.

Flag: ⚡ = contrarian / worth challenging before pursuing

---

## Sub-Agent Candidates (not pre-committed)

- **Resilience agent** — operationalize resilience quotient as a validated
  instrument, following PSQ methodology
- **Contextual adaptation agent** — assess how PJE constructs shift across
  cultural, demographic, or situational contexts (addresses WEIRD assumption gap)
- **Relational dynamics agent** — maps power and trust patterns across longer
  interaction sequences, not just single texts

---

## Evaluator Extensions

- **Longitudinal evaluator** — track how PSQ profiles change across a conversation
  or relationship over time (currently PSQ is text-level, not sequence-level)
- **Scope auditor** — automated check that sub-agents aren't making claims outside
  their validated domains; runs as part of tiered evaluator

---

## PJE Case Study (first real-world application)

- Use general agent to systematically evaluate each PJE operational definition
  against three criteria: (1) novel construct or redundant with existing literature?,
  (2) measurable with current methods?, (3) empirically distinguishable from
  adjacent constructs?
- ⚡ Some PJE terms may be better understood as dimensions of existing constructs
  (e.g., CO may overlap heavily with psychological contract theory — Rousseau, 1989)
  rather than as standalone instruments

---

## Interface & Access

- **Structured report mode** — for clinician/researcher audiences, offer a formatted
  PDF output (LaTeX-rendered) summarizing PSQ profile + general agent synthesis
- **API mode** — for machine callers, return structured JSON with confidence-flagged
  dimensions and evaluator summary
- **Conversation mode** — current default; Socratic dialogue for individual users

---

## Taxonomy Standardization — Broader Pattern

Incorporating elements of industry standards into the project's operational vocabulary
suggests a generalizable capability: a **standards vocabulary adapter** — a tool or
sub-agent that takes an external standard, extracts relevant constructs, maps them
to or enriches the project's existing vocabulary, and identifies gaps.

SWEBOK term: adapter pattern (structural). Knowledge engineering term: ontology mapper
or vocabulary bridge. Project-specific term: **standards vocabulary adapter**.

Candidate standards for future integration:
- **Legal domain (PJE "J")** — Restatements, Black's Law Dictionary, or
  jurisdiction-specific standard as reference
- **Clinical domain** — DSM-5/ICD-11 for diagnostic constructs; APA Ethics Code
  for professional practice language
- **Research methodology** — APA Publication Manual + AERA/APA/NCME Standards for
  Educational and Psychological Testing

⚡ Risk: over-standardizing creates rigidity. PSQ and PJE have novel constructs that
shouldn't be forced into existing taxonomies. Standards are reference frames, not
constraints — the adapter incorporates elements, it doesn't replace the vocabulary.

Not pre-committed. Worth pursuing if the agent's scope expands into those domains.


## Cognitive Architecture Improvements (from unudhr cogarch review)

- **YAML frontmatter on all skills** — add structured `name`, `description`,
  `user-invocable`, `argument-hint`, `allowed-tools` headers to all four skills
  (/doc, /hunt, /cycle, /capacity). Self-documenting; consistent with unudhr pattern;
  `allowed-tools` could serve as a permission boundary in future Claude Code versions.
  *Precondition: none — XS effort.*

- **`$ARGUMENTS` parsing pattern** — update skill argument-handling from prose
  description to structured `$ARGUMENTS` mode tables (Claude Code native variable).
  Makes skill interfaces explicit and machine-parseable.
  *Precondition: none — S effort per skill.*

- **`/audit` general codebase skill** — 11-category codebase audit (security, errors,
  data integrity, performance, resilience, database, frontend, worker/queue, knowledge,
  code quality, hygiene). Auto-discovers system type via tags; scan → plan → fix → status
  workflow. Highly reusable; the unudhr version is already well-tested.
  *Precondition: implementation phase started (codebase exists to audit).*

---

## PSQ Commercial Model (undefined — ideas only)

Data and model weights are CC BY-SA 4.0 (open). Commercial model must live above
the data layer. Candidate directions:

- **Hosted scoring API** — PSQ-as-a-service. Free tier for research; paid tier for
  production volume. Standard SaaS. Does not conflict with CC BY-SA on the data.
- **Enterprise SaaS** — team psychological safety dashboard. Organizations upload
  communication logs; PSQ profiles surfaced with longitudinal tracking. High-value
  market (HR, L&D, clinical teams).
- **Clinical deployment support** — not selling the model, selling the integration:
  HIPAA-compliant deployment, custom calibration for clinical populations, ongoing
  model maintenance. Consulting revenue model.
- **Custom fine-tuning** — PSQ base model is open; domain-specific fine-tunes
  (legal communications, crisis intervention, education) are proprietary.
  Base model stays CC BY-SA; fine-tuned variants under separate license.
- **Model weights re-licensing** ⚡ — legal gray area: model weights trained on
  CC BY-SA data may be separately licensable if the lab adds substantial computational
  work (training infrastructure, calibration). Not resolved. Worth legal advice before
  acting on. Pursue only if commercial strategy requires it.

*Precondition: PSQ API-ready and v-validated. No commercial model decision needed before then.*

---

## Semiotic-Reflexive Cogarch Extensions (from SRT paper review)

Source: Lancaster (2026), "The Semiotic-Reflexive Transformer," Substack/SSRN.
The SRT operationalizes Peircean semiotic decomposition, metapragmatic divergence
tracking, and catastrophe-theoretic bifurcation detection as differentiable neural
modules. Four concepts transfer to our trigger-based cogarch:

- **Cumulative divergence tracking (T2 extension)** — track vocabulary alignment
  between agent output and user demonstrated vocabulary as a running estimate,
  not just event-driven on pushback (T6). The SRT's Metapragmatic Attention Head
  shows divergence accumulates gradually before rupture. Draft trigger language:

  > **T2 sub-check: Vocabulary alignment scan.** Before responding, compare
  > terminology in the draft response against the user's demonstrated vocabulary
  > in the current conversation. If the agent uses a term the user has not used
  > and the term participates in multiple interpretive communities, flag it for
  > explicit binding (see Term Collision Rule, CLAUDE.md). Rising misalignment
  > across consecutive responses warrants a pacing checkpoint.

- **Bifurcation early warning (T3 extension)** — detect when a term or concept
  approaches interpretive instability before the misunderstanding crystallizes.
  The SRT's Bifurcation Estimation Network models cusp catastrophe geometry;
  critical slowing down (rising variance) serves as early warning. Draft trigger:

  > **T3 sub-check: Interpretive bifurcation scan.** Before recommending, check
  > whether any key term in the recommendation could produce divergent
  > interpretations depending on the audience's interpretive framework. If a
  > term sits at a bifurcation point (two plausible, incompatible readings),
  > bind it explicitly to one reading and name the alternative. Do not leave
  > contested terms unbound in recommendations.

- **Audience-shift detection (T3 extension)** — the SRT's community-conditioned
  interpretants vary by community embedding. When the user shifts discourse
  domain mid-conversation (e.g., clinical discussion to engineering planning),
  terms previously bound to one interpretive community may need rebinding. Draft:

  > **T3 sub-check: Audience-shift detection.** If the user's vocabulary,
  > question sophistication, or domain markers shift significantly from the
  > conversation baseline established at T1, reassess which interpretive
  > community governs the current exchange. Previously bound terms may need
  > explicit rebinding. This complements dynamic Socratic calibration.

- **Micro-semiotic audit (T2 extension)** — the SRT's Reflexive Reasoning Module
  runs continuously as a meta-observer. Our T11 runs on demand. A lighter-weight
  periodic check at T2 frequency would catch vocabulary drift earlier. Draft:

  > **T2 sub-check: Semiotic consistency.** Before responding, verify that any
  > project-specific term (cogarch vocabulary, PSQ dimensions, PJE constructs)
  > appears with its documented definition, not a drifted variant. If the
  > agent's usage has diverged from the documented definition, correct before
  > responding. This catches vocabulary drift that T11 would find at audit time.

⚡ All four extensions add T2/T3 processing overhead. The SRT paper itself notes
training instability when all modules run simultaneously. For our cogarch, the
risk manifests as over-checking: every response triggers multiple sub-checks that
add latency without proportional value. Consider gating: run the full suite only
when divergence indicators (pushback, domain shift, novel terminology) exceed a
threshold. Light mode (semiotic consistency only) by default.

*Precondition: T11 audit to evaluate integration points. S effort for trigger
language; M effort for calibrating gate thresholds.*

**Structural resonance:** The SRT's central claim — "the interpretant varies by
community and collapsing it destroys signal" — echoes the PSQ's "profile predicts,
average does not." Both resist dimensionality reduction that averages away meaningful
variation. Implication for architecture item 3 (adversarial evaluator): when
sub-agents disagree, preserve the shape of the disagreement rather than averaging.

---

## Meta

- This agent system is itself a case study in PJE — it embodies Psycho Safety
  Engineering (structured conditions for psychological safety in human-AI interaction)
  and Psycho Ergonomics (interaction design that reduces cognitive load). Worth
  documenting this reflexivity explicitly at some point.
