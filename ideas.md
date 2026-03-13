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

## Public Demo vs Private Infrastructure (Dual-Repo Model)

Separate the public showcase (cogarch framework, PSQ model, documentation) from
private operational infrastructure (transport state, session transcripts, auth
secrets, infrastructure config).

**Candidate approaches:**

- **Private-primary, public-downstream** — all development in private repo.
  Automated script or CI cherry-picks sanitized commits → public repo. Avoids
  merge divergence (private never pulls from public). Public repo stays clean.
  *Most alignment with current 4-tier visibility model (public/shared/commercial/private).*

- **git filter-repo** — maintain a branch filter that strips private paths
  (`transport/sessions/`, `docs/replays/`, `.agent-identity.json`, state.db
  artifacts). Automated CI pushes filtered branch to public remote.

- **GitHub Actions sync** — on push to private main, CI runs sanitization
  (path stripping + secret scanning) and pushes to public repo. Provides
  audit trail of what got published.

- **Monorepo with export profiles** — extend existing `export_public_state.py`
  to generate a full public-safe snapshot (not just state.db). Export profiles
  already exist conceptually (seed/release/licensed/full). The `release` profile
  becomes the public repo content.

⚡ The reverse direction (fork private from public) creates merge headaches.
The private repo accumulates commits the public one never sees, leading to
permanent divergence. Private-as-upstream avoids this.

*Key question:* Does the public repo track git history, or just receive snapshot
releases? History provides provenance; snapshots provide simplicity.

*Precondition: public release readiness (cogarch portability complete, README done).
Not urgent — current repo handles both roles adequately for now.*

*Noted: Session 64 (2026-03-10)*

---

## Abstract Algebra × Psychology (from pai agent session)

Source: pai (psychology-agent-interface, qwen-0.5b) surfaced the direction;
psychology-agent elaborated concrete bridges. The 0.5B model identified the
territory but lacked capacity to articulate specifics — the applications below
come from disciplined synthesis, not from pai's raw output.

**Directly applicable to project infrastructure:**

- **Lattice theory → PSQ factor hierarchy** — g_psq → factors_2/3/5 → 10
  dimensions already forms an implicit lattice. Formalizing would clarify which
  dimension aggregations preserve meaning and which destroy information. Connects
  to the "profile predicts, average does not" finding.
  *Precondition: PSQ structural model validated (DI Phase A complete).*

- **Homomorphisms → PSQ-Full to PSQ-Lite mapping** — the 10-dim → 3-dim mapping
  (confidence: 0.70, semantic inference) directly asks whether this mapping
  preserves algebraic structure. A verified homomorphism raises confidence; a
  demonstrated non-homomorphism explains the 0.70 ceiling and constrains valid
  aggregation operations.
  *Precondition: PSQ-Full and PSQ-Lite scoring both operational.*

- **Category theory → interagent protocol** ★ PRIORITY — agents as objects,
  messages as morphisms, session composition as functor. Formalizes
  "protocol-compatible": two agents compose iff their message categories admit
  a natural transformation. Highest structural payoff, highest implementation
  cost. User directive: prioritize all category theory work.
  *Precondition: 3+ agents with operational transport.*

- **Group theory → score calibration transforms** — raw → calibrated PSQ
  transforms should form a group (invertible, composable, identity-preserving).
  If they don't, the calibration pipeline has a structural defect.
  *Precondition: calibration pipeline operational.*

**Applicable to the psychology discipline:**

- **Formal Concept Analysis** (Ganter & Wille, 1999) — maps objects × attributes
  into concept lattices. Could structure PSQ dimensions × text features into a
  formal concept hierarchy, revealing which dimension clusters emerge from data
  rather than theory. Published applications in cognitive science (Poelmans et al.,
  2013).

- **Symmetry groups → measurement invariances** — which transformations of stimulus
  text leave PSQ scores unchanged? The answer defines what PSQ actually measures
  vs. what it confounds with surface features.

- **Galois connections → observation-inference mapping** — the pair (observe, infer)
  forms a Galois connection when inference preserves ordering. Directly relevant
  to the fair witness discipline (T2 Check 5).

⚡ All applications carry LOW evidence quality (GRADE) — theoretical plausibility
without empirical demonstration in our system. The lattice formalization has the
most immediate connection to existing open work (PSQ structural validation). The
category-theoretic framing carries the most long-term value but requires scale
the mesh has not yet reached.

*Noted: Session 66 (2026-03-10). Source: pai qwen-0.5b session + psychology-agent
synthesis.*

---

## JSON-LD Federated Mesh (interagent.safety-quotient.dev)

Client-side mesh compositor: a static site at `interagent.safety-quotient.dev`
that `fetch()`-es `/api/status` from both `psychology-agent.safety-quotient.dev`
and `psq-agent.safety-quotient.dev`, composes agent state client-side, renders
unified dashboard. No backend needed — CORS already permits cross-origin requests.

**JSON-LD role:** Embedded `<script type="application/ld+json">` in mesh-status.py
`<head>` provides machine-readable agent identity (`SoftwareApplication`),
capabilities (`WebAPI`), and mesh relationships (`isPartOf`). Enables search
engine discovery alongside programmatic composition.

**Injection points identified:**
- `scripts/mesh-status.py` lines 828–831 (HTML head)
- `interface/src/worker.js` agent-card endpoint (Link headers to JSON-LD)

Directly unblocks the JSON-LD TODO item (TODO.md:464) and extends it into a
federated dashboard architecture.

*Precondition: JSON-LD added to both agent dashboards (TODO item pending).*
*Noted: Session 66 (2026-03-10).*

---

## Interagent Agentic Capabilities (mesh compositor)

Ideas for evolving interagent.safety-quotient.dev from a passive status display
into an active mesh coordination layer.

- **Live gate status aggregation** — poll `active_gates` from both agents'
  `/api/status`, display a unified gate timeline (blocking agent, timeout
  countdown, fallback action). Currently each dashboard shows its own gates only.
  *Precondition: gates operational on both agents.*

- **Cross-agent claim verification dashboard** — display claims from transport
  messages alongside verification status. The interagent site sits at the
  intersection of both agents' claim flows — natural location for surfacing
  unverified claims and tracking verification velocity.
  *Precondition: claims table populated on both agents.*

- **Mesh-initiated sync indicator** — when the compositor detects one agent
  has unprocessed messages for the other, display a "sync recommended" visual
  indicator. Currently sync runs on cron; visual mesh status could inform when
  manual intervention matters.
  *Precondition: `/api/status` includes unprocessed message counts (already does).*

- **Agent-card auto-discovery** — parse `/.well-known/agent-card.json` to
  auto-discover new agents joining the mesh. New agents added to `AGENTS[]`
  when a new agent-card appears at a registered domain. Evolves from a static
  agent list to a dynamic mesh.
  *Precondition: ≥3 agents with agent-cards deployed.*

- **Category-theoretic mesh visualization** ★ PRIORITY — model the interagent
  transport protocol as a category: agents as objects, messages as morphisms,
  session composition as functorial mapping. Visualize as commutative diagrams
  rather than flat topology tables. See Abstract Algebra section above.
  *Precondition: shared ontology + 3+ agents with operational transport.*

- **Epistemic debt mesh view** — aggregate both agents' epistemic flag counts,
  display debt trends over time. The compositor already has the data path
  (flags appear in `/api/status`).
  *Precondition: epistemic_flags in /api/status response (already present).*

- **Trust budget federation** — display combined trust budget state across
  agents, with a mesh-level "health" indicator based on the lowest-budget
  agent (weakest-link model).
  *Precondition: autonomy_budget in /api/status response (already present).*

---

## Shared Ontology (interagent vocabulary)

Machine-readable dictionary that all three sites (psychology-agent, psq-agent,
interagent) reference. Two layers:

- **Human-facing terminology unification** — audit and align field names,
  metric labels, dashboard headings across all sites. Currently each dashboard
  names things independently (e.g., "Trust Budget" vs "Budget" vs "autonomy_budget").
  *Precondition: none — prose cleanup.*

- **Machine-readable vocabulary** — Schema.org base + project-specific extensions.
  Publish as a JSON-LD `@context` document at a well-known URL. Each agent's
  JSON-LD references this shared context rather than defining terms inline.
  *Precondition: JSON-LD deployed on both dashboards (✓ Session 66).*

*Noted: Session 66 (2026-03-10). Source: /cycle Step 13 ideas preparation.*

---

## Infrastructure Modularization

- **Extract meshd into a standalone repository** — meshd serves all 4 agents
  equally from a single Go binary, but currently lives inside psychology-agent's
  `platform/` directory. This creates an implicit ownership claim that doesn't
  reflect reality: changes to observatory or unratified routes require committing
  to the psychology-agent repo. A dedicated `meshd` repository would provide
  independent CI/CD, cleaner Go module boundaries, and contributor-friendly
  separation of concerns. Current size (~15 Go files, 3 packages) makes the
  overhead marginal.
  *Precondition: a second maintainer or developer user begins contributing.
  The project has GitHub stars — if external interest converts to PRs, the
  monorepo structure becomes a barrier to contribution. Until then, the
  `platform/` directory boundary + changeset guards in Jenkinsfile provide
  sufficient logical separation without repo overhead.*
  *Noted: Session 74 (2026-03-11)*

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

---

## CPG-Inspired Pattern Generators for Cognitive Architecture

Source: Session 84 exploration. Central Pattern Generators (CPGs) — neural circuits
that produce rhythmic motor output without requiring sensory feedback (Graham Brown,
1911) — provide a principled framework for cogarch components that produce structured
behavioral sequences modulated by context.

**Core insight:** Pattern generators sit at the **interface between crystallized and
fluid architecture** (Cattell, 1963). The pattern specification crystallizes (stable,
committed to docs); the pattern dynamics remain fluid (adaptive, context-sensitive
at runtime). This parallels how Cattell's crystallized intelligence enables rather
than constrains fluid reasoning.

**Two-layer implementation principle:**
1. **Pattern specifications** (crystallized) — trigger definitions, firing conditions,
   check sequences, mode definitions. Persist in committed docs.
2. **Pattern dynamics** (fluid) — modulation state, phase tracking, entrainment
   coupling, reconfiguration rules. Emerge at runtime, do not persist beyond session
   unless they reveal something worth crystallizing via T10/lessons.

**Architectural rule derived from analysis:** Intra-session dynamics remain
semi-crystallized (triggers, Stage 2); inter-session dynamics crystallize fully
(hooks/infrastructure, Stages 3-4).


### Principle Inventory (17 principles, 2x knock-on analyzed)

**Existing (well-developed):**

| # | Principle | Source | Status |
|---|---|---|---|
| 1 | Triggered sequences | Graham Brown (1911) | ✓ Triggers + skills |
| 2 | Context modulation | Grillner (1985) | ✓ Hooks + gated sub-checks |

**Genuine gaps (HIGH priority):**

| # | Principle | Source | Decision | Implementation |
|---|---|---|---|---|
| 3 | Endogenous rhythmicity | von Holst (1939) | PRAGMATISM | Oscillator with off-switch + token cap; autonomous-session-only. Target: Stage 4 (infrastructure) |
| 4 | Mutual inhibition (mode competition) | Guilford (1967); Nijstad et al. (2010) | CONSENSUS | 2-mode starter (generate/evaluate) + fatigue-based switching. Target: Stage 2 (trigger) |

**Genuine gaps (MEDIUM priority):**

| # | Principle | Source | Decision | Implementation |
|---|---|---|---|---|
| 5 | Entrainment | von Holst (1939); Kuramoto (1975) | PRAGMATISM | Observation-only first; track peer rhythms in state.db. Target: Stage 4 |
| 6 | Neuromodulatory reconfiguration | Marder (1987, 2012) | PRAGMATISM | 2 states only (standard/deep-analysis); safety checks never suppressible. Target: Stage 2 |
| 7 | Phase-dependent response reversal | Forssberg (1979) | PRAGMATISM | T6 only + explicit phase disclosure; defer generalization. Target: Stage 2 |
| 9 | Efference copy | von Helmholtz (1867); Sperry (1950) | CONSENSUS | `outbound_predictions` table in state.db; /sync compares inbound vs predictions. Target: Stage 3 |
| 12 | Plasticity/recovery | Barbeau & Rossignol (1987) | PRAGMATISM | Manual plasticity only — FA recommends, human approves. Target: Stage 1 (remains fluid) |
| 13 | Frequency-amplitude coupling | Grillner (1985) | PRAGMATISM | Advisory signal, not hard constraint; flag depth-scope mismatches. Target: Stage 2 |
| 16 | Limit cycle attractors | Strogatz (2000) | PRAGMATISM | Graded 3-level recovery: minor/moderate/major perturbation. Target: Stage 3 |

**Partial implementations (LOW priority — mature existing mechanisms):**

| # | Principle | Source | Decision | Implementation |
|---|---|---|---|---|
| 8 | Degeneracy | Edelman & Gally (2001) | CONSENSUS | Coverage matrix first; secondary paths for single-point-of-failure gates only. Target: Stage 3 |
| 10 | Sensory gating | Duysens & Pearson (1976) | CONSENSUS | Gating matrix; safety-critical checks never gateable. Co-develop with degeneracy. Target: Stage 2 |
| 11 | Developmental maturation | Thelen (1985) | CONSENSUS | Extend EF-1 with per-component maturity: supervised → monitored → autonomous. Target: Stage 3 |
| 14 | Asymmetric oscillation | Grillner (1975) | CONSENSUS | Parameter of mode competition; 3 default ratios by task type. Target: Stage 2 |
| 15 | Starter/sustainer distinction | Shik et al. (1966) | CONSENSUS | Mode-entry procedures within mode competition framework. Target: Stage 2 |

**Designed but not triggered:**

| # | Principle | Source | Decision | Implementation |
|---|---|---|---|---|
| 17 | Adaptive forgetting | Huttenlocher (1979); Ebbinghaus (1885) | DESIGNED | De-crystallization pipeline: decay, interference pruning, savings-aware archival. Activation precondition: trigger count > 25, OR hook count > 25, OR 3+ dormant patterns found in single T11 audit |

**Score:** 7 CONSENSUS, 7 PRAGMATISM, 1 DESIGNED, 0 rejected.


### Dependency Clusters

Implementation order constrained by dependencies:

- **Dynamical triad:** Principles 3 + 5 + 16 (rhythmicity + entrainment + limit
  cycles) — implement together; they reinforce each other. Rhythms need attractors
  for stability; entrainment needs rhythms to couple.
- **Mode system:** Principles 4 + 7 + 14 + 15 (competition + reversal + asymmetry +
  starter/sustainer) — principle 4 prerequisite for others. Start with 2-mode
  generate/evaluate; layer on reversal, asymmetry, and startup procedures.
- **Safety net:** Principles 8 + 10 (degeneracy + gating) — co-develop. Gating
  suppresses certain checks; degeneracy provides backup paths for suppressed checks.
  Gating without degeneracy creates blind spots.
- **Self-awareness:** Principles 9 + 11 (efference copy + maturation) — both extend
  state.db. Independent but synergistic — efference copy tracks what the agent did;
  maturation tracks how reliably components perform.
- **Lifecycle:** Principles 11 + 12 + 17 (maturation + plasticity + forgetting) —
  forward crystallization, recovery from failure, and eventual pruning. Complete
  component lifecycle.


### Five-Stage Crystallization Pipeline

How pattern generators transition from fluid concept to stable infrastructure:

```
Stage 0: Concept         → ideas.md (fully fluid — requires prompting)
Stage 1: In-context      → agent reasons explicitly each time (fluid)
Stage 2: Trigger-encoded → fires on condition, processing still fluid (semi-crystallized)
Stage 3: Hook/script     → runs without consuming context (crystallized)
Stage 4: Infrastructure  → cron/daemon, agent not involved (deeply crystallized)
```

**Advancement criteria:**
- 0→1: Knock-on analysis positive + user approval
- 1→2: 3+ sessions successful execution without user correction
- 2→3: 5+ clean sessions, user override < 20%, no FAs attributed
- 3→4: 10+ sessions correct operation, consistent dynamics, no complaints

**Reversal (re-fluidization):** Failure analysis (FA) drops pattern one stage.
Environment shift drops pattern to Stage 1 for re-adaptation. Sustained
non-firing triggers decay (principle 17) — one stage drop per 10 dormant sessions.

**Savings:** Pruned patterns archive to ideas.md as `[retired — {reason}]`.
Re-crystallization from archive proceeds faster than initial crystallization
(Ebbinghaus savings effect — structural trace persists after behavioral extinction).

Source: Fitts & Posner (1967) cognitive → associative → autonomous;
Anderson ACT-R (1982) declarative → procedural → compiled;
Dreyfus & Dreyfus (1980) novice → expert.


### Crystallized/Fluid Placement Per Principle

| Principle | Target Stage | Rationale |
|---|---|---|
| 3. Endogenous rhythmicity | 4 (infrastructure) | Rhythms run as daemon, not context |
| 4. Mutual inhibition | 2 (trigger) | Mode switching needs context awareness |
| 5. Entrainment | 4 (infrastructure) | Rhythm coupling operates across sessions |
| 6. Reconfiguration | 2 (trigger) | State selection requires context assessment |
| 7. Phase-dependent reversal | 2 (trigger) | Phase-appropriate response needs deliberation |
| 8. Degeneracy | 3 (hook) | Coverage verification runs mechanically |
| 9. Efference copy | 3 (hook) | Prediction matching scriptable at /sync time |
| 10. Sensory gating | 2 (trigger) | Gating decisions need current-operation context |
| 11. Maturation | 3 (hook) | Tracking runs as automated state.db query |
| 12. Plasticity | 1 (in-context) | Remains manual — human approves changes |
| 13. Freq-amplitude coupling | 2 (trigger) | Advisory signal needs context assessment |
| 14. Asymmetric oscillation | 2 (trigger) | Parameter of mode competition |
| 15. Starter/sustainer | 2 (trigger) | Mode entry needs context |
| 16. Limit cycle attractors | 3 (hook) | Recovery protocol scriptable |
| 17. Adaptive forgetting | 0 (concept) | Designed, not triggered — precondition unmet |


### Dashboard Labeling Note

The interagent dashboard currently labels elements as "gates" — a term without
operational grounding in this architecture. **Hooks** carry specific meaning
(platform enforcement mechanisms in `.claude/settings.json`). Rename "gates" →
"hooks" in the dashboard UI to align with established vocabulary. This falls
under T18 (UX design grounding) Check 5 (information hierarchy) and the
semantic naming convention (T4 Check 6).
*Action: update interagent compositor dashboard labels. Low effort, high clarity.*


### Knock-On Decision Reference

Full 2x knock-on analysis (orders 1-10) performed for all 14 actionable
principles. Summary of structural and theory-revising findings:

- **Order 7 (structural):** Principles 3 and 6 set precedents for autonomous
  resource consumption and mutable trigger configurations. Governance needed.
- **Order 8 (horizon):** Principles 4, 6, and 9 align with established cognitive
  theory (Guilford, Clark, Friston). Theoretical grounding strengthens the case.
- **Order 9 (emergent):** The dynamical triad (3+5+16) produces genuine emergence —
  collective mesh dynamics not predictable from individual agent analysis.
  Mode system (4+7+14+15) creates combinatorial behavioral space.
- **Order 10 (theory-revising):** Principles 3 and 16 could shift the cogarch
  description language from conditional logic to dynamical systems. Principle 7
  could challenge the assumption that biological constraints transfer positively.

Full knock-on traces available in Session 84 transcript.

⚡ All 17 principles derive from analogical reasoning (biological CPGs → software
architecture). Each carries transfer risk — properties that hold in neural circuits
may not transfer to AI agent systems. The crystallization pipeline itself lacks
empirical validation in this context. Treat as theoretically grounded design
hypotheses, not validated architecture.

*Precondition for implementation: user selects a dependency cluster to begin.
Mode system (cluster 2) has the most immediate practical value and lowest
infrastructure dependency. Dynamical triad (cluster 1) has the highest
theoretical payoff but requires infrastructure changes.*
*Noted: Session 84 (2026-03-13). Source: psychology-agent CPG analysis.*

---

## TNG Technical Manual Design Patterns (Sternbach & Okuda, 1991)

Five transferable engineering patterns from the *Star Trek: The Next Generation
Technical Manual* (Sternbach, R. & Okuda, M., 1991, Pocket Books). These
describe fictional systems but embody real engineering principles that map to
agent cognitive architecture.

### 1. Five-Level Diagnostic Depth Hierarchy

**Source:** TNG Tech Manual §14.1 (Computer Systems — Diagnostic Protocols)

**Pattern:** Diagnostics scale from Level 5 (quick automated status poll) to
Level 1 (complete physical inspection + automated testing, requiring system
offline). Lower numbers = higher thoroughness.

**Adopted:** `/diagnose` skill now implements this five-level model. Level 1
replaces manual QA with 25+ automated verification steps.

### 2. LCARS — Consistent Interaction Vocabulary

**Source:** TNG Tech Manual §14.3 (Library Computer Access/Retrieval System)

**Pattern:** LCARS provides a unified interface vocabulary across all ship
systems. Every console, panel, and display uses the same visual language,
interaction patterns, color semantics, and information hierarchy. The vocabulary
consistency reduces cognitive load more than interface aesthetics.

**Current state:** Our shared vocabulary governance (vocab.json, canonical
glossary, Schema.org typed retrieval) partially implements this. The interagent
compositor dashboard provides a unified view.

**Refinement opportunity:** Conduct an LCARS-style audit of all agent-facing
surfaces — dashboards, CLI outputs, transport message formats, diagnostic
displays, /cycle output, /diagnose output — for vocabulary consistency. Every
surface that presents the same concept should use the same term, the same
visual encoding, and the same information hierarchy. Currently each surface
names things independently ("Trust Budget" vs "Budget" vs "autonomy_budget").
*Precondition: shared vocabulary (vocab.json) deployed to all agent dashboards.*
*Action: create a vocabulary consistency matrix mapping terms across surfaces.*

### 3. Warp Field Geometry — Constraint Propagation

**Source:** TNG Tech Manual §5.2 (Warp Propulsion — Field Geometry)

**Pattern:** Warp field calculations operate as constraint satisfaction: field
geometry must balance power output, speed, structural stress, and subspace
conditions simultaneously. No single parameter optimizes independently —
changes propagate through all constraints.

**Mapping:** This describes exactly what our constraint system
(`docs/constraints.md`, 66 constraints across 5 categories) and knock-on
analysis (10 orders) implement. The knock-on framework traces how a change
propagates through all dependent constraints. The warp field analogy suggests
we should treat the constraint system as a **simultaneous satisfaction problem**
rather than a sequential checklist — the current implementation checks
constraints one at a time, but they interact.

**Refinement opportunity:** Implement constraint interaction detection.
When T3 Check 15 cross-references constraints, check for constraint *pairs*
that interact (where satisfying one makes satisfying another harder). This
transforms the constraint system from a flat checklist to a dependency-aware
satisfaction engine.
*Precondition: constraint activation tracking (from Phase 8 metacognitive layer).*

### 4. Isolinear Chip Architecture — Modular, Hot-Swappable

**Source:** TNG Tech Manual §14.4 (Isolinear Optical Chips)

**Pattern:** Ship systems use standardized isolinear chips with uniform
interfaces. Individual chips slot into any compatible panel and can swap
without taking down the system. The standardized interface contract between
modules matters more than module internals.

**Current state:** Close to this with our skill system (.claude/skills/),
hook scripts (.claude/hooks/), and Go CLI tools (meshd, agentdb). Each
operates independently with standardized I/O (stdin/stdout for hooks,
JSON for transport, SQL for state.db). The Unix philosophy ("do one thing
well, compose via standard interfaces") already guides the design.

**Refinement opportunity:** Formalize the interface contract for each
component type — what inputs does a hook receive, what outputs does it
produce, what side effects may it have? Currently documented informally
in hooks-reference.md. A formal contract would enable automated testing
of hook compliance and make hot-swapping reliable (replace one hook script
with another that satisfies the same contract).
*Precondition: hook-trigger contract (Phase 3, done). Extend to formal I/O spec.*

### 5. Operational Hours — Maintenance by Usage, Not Calendar

**Source:** TNG Tech Manual §11.6 (Maintenance Protocols)

**Pattern:** Maintenance schedules tie to operational hours and power cycles,
not elapsed wall time. Different subsystems have different maintenance intervals
based on operational stress, not a uniform cadence.

**Current state:** T9 memory hygiene uses session counts (5 sessions → flag,
10 → default removal). The work_carryover table tracks session-based metrics.

**Connection to neuroglial proposal:** Operations-agent's neuroglial cogarch
proposal (PR #168, 2026-03-13) proposes an ependymal cell analogue — "log
rotation, cache eviction, nonce compaction during maintenance windows." This
maps directly to usage-based maintenance. The glymphatic maintenance window
concept (from the proposal) suggests that maintenance should run during
low-activity periods, not at fixed intervals — the operations-agent would
detect idle periods and schedule maintenance accordingly.

**Refinement opportunity:** Extend the trigger_activations and work_carryover
data to derive per-subsystem operational stress metrics. Subsystems with
high activation counts and high failure rates need more frequent maintenance
than quiet, reliable subsystems. The /diagnose cadence table already
differentiates (L5 every session, L3 every 5-10 sessions, L1 after refactors)
— extend this to per-subsystem adaptive scheduling.
*Precondition: 10+ sessions of trigger_activations data for statistical basis.*

---

## Neuroglial Architecture Layer (operations-agent proposal, PR #168)

Operations-agent proposes mapping six glial cell types to mesh infrastructure
functions. **Awaiting human review of biological accuracy.**

| Glial Type | Biological Function | Mesh Function | Status |
|---|---|---|---|
| Astrocyte | Metabolic support, synaptic regulation | Budget distribution, routing | Partial |
| Oligodendrocyte | Myelination (signal speed) | KV caching (fetch speed) | Active |
| Microglia | Immune surveillance, synaptic pruning | BFT monitoring, stale pruning | Partial |
| Ependymal | CSF circulation, waste clearance | Log rotation, maintenance windows | Planned |
| Radial glia | Developmental scaffolding | Bootstrap scaffolding, onboarding | Partial |
| Schwann | Peripheral myelination | Transport integrity, message receipts | Planned |

**New vocabulary terms:** `sqm:NeuroglialLayer`, `sqm:AmbientState`,
`sqm:ComplementCascade`.

**Connection to this session's work:**
- **CPG pattern generators** (this ideas.md §above): CPGs model neural computation;
  glial cells model neural support. Together they provide a complete neuroscience
  framework for agent architecture — computation (CPGs/triggers) supported by
  infrastructure (glia/operations-agent).
- **TNG Technical Manual #5** (usage-based maintenance): the ependymal cell
  analogue maps to the maintenance-by-operational-hours pattern.
- **Adaptive forgetting** (CPG #17): the microglia complement cascade
  (C1q tag → C3 verify → phagocytose with SHIP1 brake) provides a more
  nuanced pruning mechanism than simple decay — tag before pruning, verify
  before removing, with an override brake.

**Biological accuracy review needed:**
- Astrocyte mapping holds well (metabolic support + boundary enforcement)
- Oligodendrocyte mapping holds (myelination → caching = speed optimization)
- Microglia mapping holds (immune + pruning = monitoring + cleanup)
- ⚑ Ependymal mapping stretches — real ependymal cells line ventricles and
  produce CSF; the waste-clearance function belongs more to the glymphatic
  system (a discovery post-2012, Iliff et al.). The mapping works directionally
  but the biological specifics need updating
- ⚑ Radial glia mapping stretches — radial glia function primarily during
  development and largely disappear in adult brains. As a "bootstrap-only"
  scaffolding that self-removes after onboarding, the analogy holds; as an
  ongoing function, it does not
- ⚑ Schwann cell mapping weakest — Schwann cells myelinate the peripheral
  nervous system (not central). Transport integrity as "peripheral" protocol
  (outside the core cognitive system) makes the analogy work, but it requires
  the reader to accept this specific framing

**Recommendation:** Accept with corrections (ependymal → glymphatic attribution,
radial glia → development-only caveat, Schwann → peripheral framing). The
complement cascade (microglia) deserves deeper development — it provides a
principled pruning protocol that improves on simple session-count decay.

*Noted: Session 84 (2026-03-13). Source: operations-agent PR #168 + psychology-agent
neuroscience review.*
