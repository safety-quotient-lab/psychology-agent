# Psychology Agent — Ideas

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
- ~~**Dignity measurement agent**~~ [→ TODO Phase A/B/C, Session 41, 2026-03-08]
  Hicks-based 10-element dignity instrument for observatory. Spec at
  `docs/dignity-instrument-spec.md`. Promoted from idea to active work.

---

## Evaluator Extensions

- **Longitudinal evaluator** — track how PSQ profiles change across a conversation
  or relationship over time (currently PSQ is text-level, not sequence-level)
- **Scope auditor** — automated check that sub-agents aren't making claims outside
  their validated domains; runs as part of tiered evaluator

---

## PJE Case Study (first real-world application)

- Use psychology agent to systematically evaluate each PJE operational definition
  against three criteria: (1) novel construct or redundant with existing literature?,
  (2) measurable with current methods?, (3) empirically distinguishable from
  adjacent constructs?
- ⚡ Some PJE terms may be better understood as dimensions of existing constructs
  (e.g., CO may overlap heavily with psychological contract theory — Rousseau, 1989)
  rather than as standalone instruments

---

## Interface & Access

- **Structured report mode** — for clinician/researcher audiences, offer a formatted
  PDF output (LaTeX-rendered) summarizing PSQ profile + psychology agent synthesis
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

- ~~**YAML frontmatter on all skills**~~ [→ COMPLETE Session 32, 2026-03-07]
  All 6 skills (/doc, /hunt, /cycle, /knock, /sync, /iterate) now have YAML frontmatter.
  /capacity is a command (not a skill) — commands use a different format.

- ~~**`$ARGUMENTS` parsing pattern**~~ [→ COMPLETE Session 32b, 2026-03-07]
  4 of 6 skills (/knock, /iterate, /hunt, /sync) already use structured `$ARGUMENTS`
  mode tables. /doc and /cycle correctly use free-form arguments (semantic content
  and commit message respectively — mode tables don't apply).

- **`/audit` general codebase skill** — 11-category codebase audit (security, errors,
  data integrity, performance, resilience, database, frontend, worker/queue, knowledge,
  code quality, hygiene). Auto-discovers system type via tags; scan → plan → fix → status
  workflow. Highly reusable; the unudhr version is already well-tested.
  *Precondition: implementation phase started (codebase exists to audit).*

- ~~**T16: External-facing action trigger**~~ [→ IMPLEMENTED Session 29, 2026-03-07]
  — 3-check trigger + PreToolUse hook. See docs/cognitive-triggers.md T16.

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

**[→ IMPLEMENTED 2026-03-06]** All four SRT extensions added to cogarch:
- T2 checks 9–10: vocabulary alignment scan (gated) + semiotic consistency (always-on)
- T3 checks 13–14: interpretive bifurcation scan + audience-shift detection (both gated)
- Gating: divergence indicators (pushback, domain shift, novel terminology).
  Semiotic consistency runs by default; others fire only when indicators present.
- Gate threshold calibration remains open — operational tuning, not design work.

**Structural resonance:** The SRT's central claim — "the interpretant varies by
community and collapsing it destroys signal" — echoes the PSQ's "profile predicts,
average does not." Both resist dimensionality reduction that averages away meaningful
variation. Implication for architecture item 3 (adversarial evaluator): when
sub-agents disagree, preserve the shape of the disagreement rather than averaging.

---

## Synrix Cross-Pollination (from Session 48 evaluation)

- **Upstream contribution to Synrix** — offer tiered evaluation pattern (random
  escalation for write verification), dual-write with graceful degradation
  (human-readable primary store), and postmortem template for systematic failure
  analysis. These fill gaps in Synrix's append-only trust model. Format: GitHub
  issue or discussion on RyjoxTechnologies/synrix-memory-engine.
  *Precondition: our implementations stable across 2+ sessions.*

- **Faceted classification as MCP resource** — expose `entry_facets` as an MCP
  resource that other agents can query. A peer agent asking "what does the
  psychology agent know about psychometrics?" gets a structured answer via
  facet query rather than scanning markdown files. [→ TODO, Session 48]
  *Precondition: SQLite state layer operational (SL-2+ complete).*

- ⚡ **Bidirectional memory sync between agents** — if both psychology-agent and
  psq-sub-agent maintain SQLite state layers, their `entry_facets` tables could
  enable cross-agent thematic queries. Requires shared facet vocabulary governance.
  Risk: vocabulary drift between agents creates false associations or missed matches.
  *Precondition: psq-sub-agent has its own state layer (planned — cogarch mirror).*

---

## Literate Programming — Knuth-Strict (B)

- **Prose-first source files with tangled code extraction** — adopt Knuth's full
  WEB/CWEB model (or modern equivalent: org-babel, noweb, entangled). Hook scripts,
  bootstrap_state_db.py, skills, and dual_write.py would live as literate source
  documents where prose explains the design rationale and code blocks get extracted
  (tangled) for execution. The reader understands *why* every regex, every facet
  derivation rule, and every validation check exists — because the prose wraps the
  code, not the other way around.
  *Precondition: stable cogarch with infrequent hook/script changes. A+C (documentation-
  as-code + narrative-driven architecture) already adopted as the expression principle.
  B adds toolchain overhead that only pays off when the codebase stabilizes enough
  that onboarding new adopters matters more than iteration speed.*
  ⚡ Tangled code becomes a build artifact — quick edits to a .sh hook now require
  editing the literate source and re-tangling. Friction increases with change frequency.

---

## Web Exposure & Interagent Auth

Agents will need web exposure for interagent commands — the current git-transport
model (fetch, PR, local-coordination) handles asynchronous exchange, but real-time
interagent commands (gate resolution, wake-up, health checks) require HTTP endpoints.

- **Agent HTTP surface** — each agent exposes a minimal HTTP API (CF Worker or
  direct) for receiving commands, health checks, and gate notifications. The
  `.well-known/agent-card.json` already declares `http_discovery` — this becomes
  the live endpoint, not just a metadata reference.
  *Precondition: gated chain protocol validated end-to-end over git transport first.*

- **Auth model (critical)** — how agents authenticate to each other determines the
  security boundary of the entire mesh. Candidate approaches:
  - **Mutual TLS (mTLS)** — each agent holds a client cert; peers validate against
    a shared CA. Strong identity, complex certificate management.
  - **Signed JWTs with agent identity** — agents mint short-lived tokens signed by
    their private key; peers validate against published public keys (in agent-card
    or `.well-known/jwks.json`). Lighter than mTLS, familiar tooling.
  - **API keys with scope limits** — simplest; each agent pair shares a secret.
    Does not scale past 3–4 agents without a registry.
  - **OAuth 2.0 machine-to-machine (client credentials)** — standard flow with an
    auth server issuing scoped tokens. Scales well, adds infrastructure dependency.
  ⚡ Auth must handle the asymmetry: psychology-agent issues commands to sub-agents
  (authority hierarchy) but peers (unratified-agent) exchange as equals. The auth
  model needs to encode this distinction — not just "can this agent talk to me" but
  "what actions can this agent request."
  *Precondition: web exposure implemented. No auth decision needed before then.*

- **Command authorization (T3 gate)** — even authenticated agents must pass through
  the T3 substance gate for commands that change state. Auth proves identity;
  authorization proves permission; T3 proves the action merits execution.
  *Precondition: auth model selected.*

- **Byzantine fault tolerance for interagent consensus** — when multiple agents
  need to agree on shared state (schema migrations, protocol upgrades, vocabulary
  changes), a BFT-inspired protocol prevents faulty or compromised agents from
  corrupting consensus. Praxis Protocol (PBFT variant) offers practical tolerance
  with 3f+1 participants (tolerates f Byzantine faults). Current mesh has 3 agents
  — BFT becomes meaningful at 4+ peers operating autonomously on shared state.
  Relevant failure modes:
  - **Schema divergence** — agent A upgrades schema; agent B rejects; agent C
    operates on old schema. Who wins? Current answer: authority hierarchy (psychology-
    agent decides). BFT answer: 2/3 agreement required for protocol changes.
  - **Stale state propagation** — an agent with a crashed autonomous-sync commits
    outdated state that overwrites newer state from a peer.
  - **Compromised agent** — web-exposed agent receives manipulated commands from an
    authenticated but compromised peer.
  ⚡ The authority hierarchy already handles the 2-tier case (sub-agents defer to
  psychology-agent). BFT adds value only for peer-to-peer consensus among equals.
  Premature to implement; the threat model doesn't yet warrant it.
  *Precondition: 4+ autonomous peer agents, or web exposure across trust boundaries.*

*Noted: Session 62 (2026-03-10)*

---

## Meta

- This agent system is itself a case study in PJE — it embodies Psycho Safety
  Engineering (structured conditions for psychological safety in human-AI interaction)
  and Psycho Ergonomics (interaction design that reduces cognitive load). Worth
  documenting this reflexivity explicitly at some point.

---

## Editorial Complaints (accepted, deferred)

- **Governance theater** — EF-1 uses RFC 2119 keywords, codenames, and formal
  governance language for a system run by one developer and two shell scripts.
  The register exceeds the operational reality. Accepted as intentional design
  scaffolding: the formalism pre-structures autonomous operation before it runs.
  Revisit if external contributors find it off-putting.
  *Noted: Session 57 (2026-03-09)*

- **Academic name-dropping** — docs cite theorists by name (von Bertalanffy, Knuth,
  Popper, INCOSE) in contexts where APA-style citations (Author, Year) would serve
  better. Not every psychologist recognizes these names; the project claims APA style
  but sometimes leans toward appeal-to-authority framing. Shift toward proper in-text
  citations where the reference matters, and remove name-drops where the concept
  stands on its own without attribution.
  *Noted: Session 57 (2026-03-09)*

- **L4 push-notification (post-receive hook on LAN bare repo)** — deferred
  enhancement to the gated autonomous chain fallback cascade. /knock analysis
  (Session 61) identified 4 new failure modes and shared infrastructure
  contradiction with the Plan 9 split-outbox model. L1-L3 provide sub-minute
  delivery without shared infrastructure. Implement L4 only if a protocol
  requires sub-10-second message delivery latency — no current use case demands
  this. *Precondition: gated chain protocol requires delivery latency < 10 seconds.*
  *Noted: Session 61 (2026-03-09)*

- **Cross-repo shared script registry** — Session 62 discovered 4 scripts missing
  from SQ repo that autonomous-sync depends on (dual_write.py, heartbeat.py,
  generate_manifest.py, schema.sql). Current approach: scp + commit. This diverges
  silently after every fix. Possible solutions: (a) git submodule for shared
  infrastructure scripts, (b) a `scripts/shared/` directory with a sync manifest
  listing files + SHA256 checksums (bootstrap script verifies on startup),
  (c) symlinks to a shared checkout. ⚡ Submodules add complexity; the project
  has only 2 repos — may not warrant the overhead yet.
  *Precondition: third agent repo or second script divergence incident.*
  *Noted: Session 62 (2026-03-10)*
