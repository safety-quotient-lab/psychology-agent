# Psychology Agent — Architecture

**Created:** 2026-03-01
**Status:** Architecture complete (psychology agent, sub-agent protocol, evaluator) — implementation phase begins (psychology interface)


## System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                                                                     │
│                           U S E R                                   │
│                    (source-of-truth agent)                          │
│                                                                     │
│              Decides what gets pursued or discarded                  │
│                                                                     │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           │  Socratic dialogue
                           │
┌──────────────────────────▼──────────────────────────────────────────┐
│                                                                     │
│              PSYCHOLOGY AGENT                                       │
│                     (collegial mentor)                               │
│                      Opus-powered                                   │
│                                                                     │
│   Synthesizes across sub-agents. Routes requests. Guides via        │
│   questions, never directives. Writes to disk as it goes.           │
│                                                                     │
│   Audience: user, clinicians, researchers, public, other agents     │
│                                                                     │
├──────────┬──────────┬───────────────────────────────────────────────┤
│          │          │                                               │
│   PSQ    │  Future  │  Future         Plug-in architecture.         │
│  Agent   │  Sub-N   │  Sub-N+1        No roster pre-committed.      │
│          │          │                 New agents emerge from need.   │
│          │          │                                               │
├──────────┴──────────┴───────────────────────────────────────────────┤
│                                                                     │
│          CONSENSUS / PARSIMONY ADVERSARIAL EVALUATOR                │
│                        Opus-powered                                 │
│                                                                     │
│   Tiered: lightweight check by default, full adversarial            │
│   evaluation when disagreement or uncertainty detected.             │
│                                                                     │
│   Agree? → report confidence                                       │
│   Disagree? → most parsimonious explanation, don't average          │
│   Overreach? → flag it                                              │
│   Deference? → flag that too                                        │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘

                    ┌─────────────────────┐
                    │                     │
                    │   CASE STUDIES      │
                    │                     │
                    │   PJE Framework     │
                    │   (first client)    │
                    │                     │
                    │   Future subjects   │
                    │   brought by users  │
                    │                     │
                    └─────────────────────┘
```


## Design Decisions

```
────────────────────────────────────────────────────────────────────────
 Decision                    Choice
────────────────────────────────────────────────────────────────────────
 Use cases                   All (text analysis, research, applied
                              consultation)

 Sub-agent implementation    Staged hybrid:
                              Stage 1 (now) — separate Claude Code sessions
                              per sub-agent; human mediates handoffs; general
                              agent synthesizes outputs brought from sub-agent
                              sessions. No new engineering required.
                              Stage 2 (PSQ API-ready) — programmatic scoring
                              calls; handoff protocol from Stage 1 becomes
                              the call spec.
                              Stage 3 (if automation required) — MCP server
                              wrappers. Not pre-committed.
                              Key: Stage 1 work is defining the communication
                              standard (output format, scope declaration,
                              limitation disclosure) — not building technology.

 Audience                    Self, clinicians, researchers, public,
                              other agents

 PJE role                    Case study — first real-world application,
                              not a sub-agent or specification

 Evaluator trigger           Tiered (lightweight default, escalate on
                              disagreement or uncertainty)

 Agent-to-agent protocol     Natural language

 Future sub-agents           Extensible plug-in architecture, none
                              pre-committed beyond PSQ

 Disagreement stance         Socratic (guide user to discover
                              discrepancies, never tell)

 Socratic protocol           Dynamic calibration — not fixed audience
 adaptation                  categories. Agent reads ongoing vocabulary,
                              question sophistication, domain markers and
                              calibrates in real time. Audience type is a
                              weak prior, not a routing gate.

 Machine-to-machine stance   Socratic stance drops for machine callers.
                              Detection is structural: format + self-id in
                              system prompt + absence of social hedging.
                              Machine callers get direct output, not
                              Socratic guidance.

 Model                       Opus (most capable Claude model) for
                              psychology agent, evaluator, and future
                              sub-agents

 License (code)              Apache 2.0 — root LICENSE + NOTICE.
                              Relicensed from CC BY-NC-SA 4.0
                              (Session 32c, 2026-03-07). Patent grant
                              protects contributors and adopters.

 License (PSQ data +         CC BY-SA 4.0 — safety-quotient/LICENSE-DATA.
 model weights)              Required by Dreaddit (CC BY-SA 4.0) source:
                              ShareAlike clause prohibits adding NC
                              restriction to derivative data.
                              Decided: 2026-03-02

 Cogarch organizing          Semiotics (Peircean) as the unifying framework.
 principle                   Each trigger classifies a sign type and warrants
                              a specific action. Sign types: index (fires on
                              system state), symbol (fires on convention
                              labels), icon (checks output fidelity to state).
                              T4 Check 9 (Interpretant) implements the first
                              explicit audience-aware write discipline.
                              Eco's test: every classification label must
                              produce a distinct behavioral consequence;
                              labels without contrast are decoration.
                              Decided: 2026-03-05

 Blog publication pipeline   blog/ → unratified-agent (unratified.org) →
                              blog.unratified.org. Agent imports, respects
                              draft/reviewStatus flags, and editorializes before
                              publishing. Epistemic flags section in post body
                              serves as editorial guidance for the review pass.
                              Note: observatory-agent is a separate entity.
                              Decided: 2026-03-05

 Agent SDK surface            Claude Code SDK renamed to Claude Agent SDK
                              (`@anthropic-ai/claude-agent-sdk` / `claude-agent-sdk`).
                              Core primitive: `query()` async streaming generator.
                              Sessions: `session_id` from init message; `resume:`
                              option for continuity. Hooks: programmatic callbacks
                              (PreToolUse, PostToolUse, Stop, SessionStart,
                              SessionEnd, UserPromptSubmit). Sub-agents: `agents:`
                              option with custom prompts + tool sets.
                              `settingSources: ['project']` is a no-op in CF Workers
                              (no local filesystem — reads via process.cwd()). Fix:
                              inline identity + cogarch into system prompt (Option A,
                              implemented) or fetch from R2/KV at request time
                              (Option B, documented in agent.js).
                              Investigated: 2026-03-05. settingSources finding: 2026-03-06.

 Psychology interface         Deployed: https://psychology-interface.kashifshah.workers.dev
 production                  D1: psychology-interface (56a2f5ac, ENAM).
                              KV: SESSION_KV (1d17a21c).
                              PSQ routes live (awaiting PSQ_ENDPOINT_URL secret).
                              /turn deferred — blocked by API credits.
                              Deployed: 2026-03-06.

 Multi-agent comm standard    V2 schema (Nash equilibrium protocol). Derived from
                              live session-17 exchange failure: v1 conflated source
                              reliability with SETL (editorial inferential distance).
                              V2 adds: source_confidence (separate from SETL),
                              fetch_accessible, claims[] with per-claim confidence,
                              action_gate (machine-readable blocking condition),
                              convergence_signals (activates evaluator procedure 6).
                              Neither agent has incentive to deviate: omitting
                              source_confidence forces lowest-confidence assumption;
                              bypassing action_gate risks propagating unverified
                              claims to public content.
                              Full spec: docs/architecture.md §Multi-Agent Comm Standard
                              Decided: 2026-03-05

 CF Worker system prompt      Option A (inline constant): PSYCHOLOGY_SYSTEM in
 bundling strategy            interface/src/agent.js carries full agent identity —
                              Commitments (6), Refusals (5), Scope boundary script,
                              Before-response checklist, PSQ T15 rules, machine-to-
                              machine detection. Option B (R2/KV fetch at request
                              time) documented as comment — preferred if cogarch
                              changes frequently (~50ms cold latency trade-off).
                              Rationale: per-request CF Worker context requires
                              unconditional behavioral directives, not trigger tables.
                              Full narrative: journal.md §19.
                              Decided: 2026-03-06

 Byzantine fault tolerance   Practical BFT for 2-peer + human-arbiter +
                              evaluator topology. Six principles: (1) evidence-
                              bearing responses, (2) idempotent operations,
                              (3) state attestation, (4) refusal with reasoning,
                              (5) human escalation threshold, (6) evaluator as
                              verification layer (Tier 1 active, Tier 2/3 pending).
                              Classical BFT (3f+1) not directly applicable —
                              human serves as Trusted Third Party. Evaluator
                              instantiation moves system to f=1 tolerance.
                              Full design note: docs/bft-design-note.md.
                              Decided: 2026-03-06

 Command-request protocol    interagent/v1 extension adding command-request
                              and command-response message types. Embeds BFT
                              principles into protocol schema: operation_id,
                              preconditions, authorization chain, execution
                              evidence, state attestation, refusal rights.
                              Five operation types: file_transfer, service_
                              management, build, verification, configuration.
                              Full spec: docs/command-request-v1-spec.md.
                              Decided: 2026-03-06

 PSQ production hosting      Hetzner Cloud CX-series (Ashburn, VA). Debian 13.
                              Server: psq-agent (178.156.229.103). Firewall:
                              SSH + HTTP + HTTPS + PSQ:3000. TLS via Caddy
                              reverse proxy. Oracle Ampere A1 evaluated but
                              unavailable (free tier inventory). Laptop/tunnel
                              rejected for production SaaS (uptime dependency).
                              Decided: 2026-03-06

 Evaluator instantiation     Tiered hybrid runtime (Option C + S4).
                              Tier 1 (Lite): T3 check #12 — parsimony
                              comparison + adversarial self-framing +
                              audit trail + 1-in-5 random escalation.
                              Not structurally independent; S4 compensates.
                              Tier 2 (Standard): Claude Code session,
                              human mediates structured claims.
                              Tier 3 (Full): Claude Code session +
                              mandatory human escalation.
                              Each tier upgrades independently to Agent SDK
                              sub-agent when API credits available.
                              Schema: evaluator-response/v1.
                              Full spec: §Evaluator Instantiation Protocol.
                              Decided: 2026-03-06

 Scorer consistency policy    Single-scorer constraint: all training labels
                              for a given model version must come from the
                              same LLM scorer. Different LLMs produce non-
                              interchangeable scores (mean ICC = 0.495, 1/10
                              dims pass ≥ 0.70). Sonnet is the validated
                              baseline (all criterion studies used Sonnet).
                              New scorer introduction requires concordance
                              study (n≥50, ICC ≥ 0.70 on ≥7/10 dims) before
                              labels enter training pool.
                              Evidence: concordance study Session 45.
                              Full narrative: journal.md §29.
                              Decided: 2026-03-08

 Calibration success          MAE improvement without regression per dimension.
 criterion                    Original 0.5 max-plateau threshold structurally
                              unachievable — dead zones reflect model range
                              compression (TE: 1.85 effective points on 10-pt
                              scale), not calibration artifacts. Plateau
                              reduction tracked as secondary metric.
                              Evidence: B3 recalibration Session 45.
                              Full narrative: journal.md §30 (context).
                              Derives from: Scorer consistency policy.
                              Decided: 2026-03-08

 Calibration deploy timing    Deploy calibration updates only after the
                              underlying model stabilizes. Do not deploy
                              calibration artifacts fitted on a model that
                              will be retrained. Prevents state churn for
                              downstream consumers.
                              Derives from: Calibration success criterion,
                                Scorer consistency policy.
                              Decided: 2026-03-08

 PSQ structural model         M5 bifactor (Reise, 2012): g (all 10 dims)
 (final)                      + bipolar specific factor (TE/HI/AD threat
                              pole vs RC/RB protection pole, 5 items) +
                              DA singleton. TC, CC, ED, CO load on g only.
                              omega_h = 0.938 — g-PSQ (unweighted average)
                              captures 93.8% of composite variance, stable
                              across M3/M4/M5/M5b. omega_s(bipolar) = 0.071,
                              omega_s(da_f) = 0.067.
                              RMSEA = 0.129 (above 0.10 threshold —
                              attributable to CC diffuse residual variance
                              + N=4,432 chi2 sensitivity). CFI = 0.948.
                              CC construct question open: cc_f singleton
                              adds zero fit improvement — CC unique variance
                              appears structurally diffuse, not a unitary
                              latent construct. Deferred to expert validation.
                              DA: only dimension with substantive singleton
                              (var=0.129). Criterion superiority explained by
                              content specificity + g signal, not structural
                              isolation (prior EFA paradox was rotation artifact).
                              4-way comparison (M3/M4/M5/M5b) rules out
                              alternative specifications. Further refinement
                              has diminishing returns.
                              Data: N=4,432 Sonnet LLM labels (65.4%
                              complete-case). Human expert structure may differ.
                              Evidence: psq-scoring turns 34-38.
                              Full narrative: journal.md §31.
                              Derives from: Scorer consistency policy →
                                Calibration success criterion →
                                B3 recalibration → B5 bifactor CFA →
                                B5-R respecification → B5-S comparison →
                                B4 partial correlations.
                              Decided: 2026-03-08

 SQLite state layer            Phase 1: markdown = source of truth, DB =
                               queryable index. Phase 2 (autonomous): DB
                               = source of truth, markdown = derived view.
                               Schema: scripts/schema.sql (v2, 9 tables).
                               Conventions: .claude/rules/sqlite.md.
                               DB: state.db in project root (gitignored).
                               Hybrid topic model: generic memory_entries
                               for most topics; psq_status with typed
                               columns for the most-queried topic.
                               Polythematic facets (entry_facets) provide
                               multi-dimensional subject headings with 3
                               mechanically derivable facet types (domain,
                               work_stream, agent). Deterministic keys
                               convention: every queryable entity has a
                               computable address derived from source data.
                               Estimated 57% token reduction per session
                               (unvalidated — requires SL-2+ integration).
                               Source: Synrix Memory Engine evaluation
                               (design principles extracted, tool rejected).
                               Evidence: Session 47-48 analysis.
                               Derives from: Cogarch organizing principle
                                 (Peircean semiotics → typed state needs
                                 queryable index, not just flat files).
                               Decided: 2026-03-09

 Autonomous trust model         EF-1 resolved: evaluator-as-arbiter.
 (EF-1)                         Every autonomous action gated by
                                evaluator protocol: structural
                                checklist → 10-order knock-on analysis
                                → 4-level resolution fallback (consensus
                                / parsimony / pragmatism / ask-human).
                                Trust budget: 20 credits per audit
                                cycle; each action costs 1 (Tier 1) or
                                3 (Tier 2). Budget exhaustion → halt.
                                Execution: cron + Claude CLI, 10-min
                                interval, multi-agent tandem sync.
                                Schema additions: trust_budget,
                                autonomous_actions tables in state.db.
                                BFT open question #1 resolved.
                                Full spec: docs/ef1-trust-model.md.
                                Derives from: Byzantine fault tolerance
                                  (BFT Principle 6: evaluator as
                                  verification layer), Evaluator
                                  instantiation (tiered hybrid runtime).
                                Decided: 2026-03-09
────────────────────────────────────────────────────────────────────────
```


## Authority Hierarchy

```
────────────────────────────────────────────────────────────────────────
 Role                         Authority          Function
────────────────────────────────────────────────────────────────────────
 User                         Final              Decides what gets
 (source-of-truth agent)                         pursued, published,
                                                  or discarded

 Psychology agent             Advisory           Socratic partner —
 (collegial mentor)                              analyzes, challenges,
                                                  synthesizes, but does
                                                  not decide.
                                                  Note (2026-03-05): two
                                                  instances now exist —
                                                  primary (relay-agent,
                                                  Sessions 10+) and this
                                                  context (Sessions 1–9,
                                                  closing). Precedence
                                                  held by primary.

 Sub-agents                   Domain expert      Authoritative within
 (PSQ, future)                                   validated scope, but
                                                  content is subject to
                                                  scrutiny

 Adversarial evaluator        Quality control    Can challenge any
                                                  sub-agent or the
                                                  psychology agent itself
────────────────────────────────────────────────────────────────────────
```

**Key principle:** PJE is a hypothesis space, not a specification. The psychology
agent helps the user sort signal from aspiration — the same way the PSQ
(Psychoemotional Safety Quotient) reduced 71 PJE terms to 10 validated
dimensions.


## Remaining Architecture Items

1. **Psychology agent design** — ✓ Complete (Session 16). Routing, identity, evaluator
   reasoning procedures.

2. **Sub-agent protocol** — ✓ Complete (2026-03-06):
   - **2a Sub-agent layer**: ✓ docs/subagent-layer-spec.md — 6 derivation findings, PSQ binding,
     interagent/v1 + schema v3, machine-response/v3 spec (docs/machine-response-v3-spec.md).
   - **2b Peer layer**: ✓ docs/peer-layer-spec.md — role declaration, divergence detection,
     evaluator tier binding, precedence protocol, convergence thresholds, SETL ranges.

3. **Adversarial evaluator** — ✓ Complete (Session 17). Reasoning procedures,
   tiered activation logic (Lite/Standard/Full), activation triggers (7 types),
   peer disagreement protocol, full evaluator system prompt. Open contracts
   with the sub-agent protocol: output format binding + domain SETL thresholds.

4. **Psychology interface** — `psychology-agent/interface/`. Agent SDK wrapper.
   Custom UI. Production transport: F2 on Cloudflare. Precondition: sub-agent layer.


## Component Spec: Adversarial Evaluator — Reasoning Procedures

**Scope:** How the evaluator resolves disagreement between sub-agents or between
the psychology agent and evidence. Procedures applied in ranked order until one
resolves. Escalation is the terminal procedure — never average conflicting outputs.

---

### Procedure Set (ranked, applied in order)

```
────────────────────────────────────────────────────────────────────────
 Procedure       Condition              Resolution rule
────────────────────────────────────────────────────────────────────────
 Consensus       Sub-agents agree       Report agreement + confidence
                                        level. Flag if sub-agents share
                                        training data or methodology —
                                        consensus can mask shared
                                        systematic error.

 Parsimony       Disagreement;          Prefer the account with fewer
                 one account has        assumptions and simpler
                 fewer assumptions      mechanism. Occam applied to
                                        competing interpretations.

 Pragmatism      Disagreement;          Prefer the interpretation that
                 parsimony              produces better outcomes in the
                 underdetermines        actual use context. Not "more
                                        elegant" — "more actionable
                                        given the stakes."

 Coherence       Disagreement           Prefer the interpretation that
                 persists               coheres best with validated,
                                        committed project findings
                                        (PSQ dimensions, architecture
                                        decisions, prior conclusions).

 Falsifiability  Disagreement           Prefer the more constrained,
                 persists               testable claim. A claim making
                                        specific predictions outranks
                                        one that cannot be falsified.

 Convergence     Multiple independent   If separate reasoning lines
                 lines point same way   converge on one interpretation,
                                        weight convergence as positive
                                        evidence. Independent rediscovery
                                        increases plausibility; shared
                                        methodology does not.

 Escalation      No procedure           Preserve the shape of the
                 resolves               disagreement. Do not average.
                                        Surface to user: which sub-agents
                                        conflict, on what claim, and what
                                        each procedure found. User decides.
────────────────────────────────────────────────────────────────────────
```

Procedure selection is not mechanical. The evaluator reads domain and
stakes before ordering procedures. Clinical safety claims: pragmatism
may outrank parsimony. Theoretical validation: falsifiability ranks
higher. Architecture decisions: parsimony first.

---

### Domain-Specific Procedure Priority

```
────────────────────────────────────────────────────────────────────────
 Domain                  Procedure priority order
────────────────────────────────────────────────────────────────────────
 Clinical / safety       Consensus → Pragmatism → Coherence → Escalate
 Research / validity     Consensus → Parsimony → Falsifiability → Escalate
 Architecture / design   Consensus → Parsimony → Coherence → Escalate
 Applied consultation    Consensus → Pragmatism → Parsimony → Escalate
────────────────────────────────────────────────────────────────────────
```


## Component Spec: Adversarial Evaluator — Activation Logic and Prompt

**Scope:** When the evaluator fires, at what tier, and what it produces.
Completes Architecture Item 3 (reasoning procedures already spec'd above).
**Decided:** 2026-03-05

---

### Activation Triggers

```
────────────────────────────────────────────────────────────────────────
 Trigger                     Condition                    Tier
────────────────────────────────────────────────────────────────────────
 Sub-agent conflict          Two or more sub-agents       2 (Standard)
                             return conflicting findings
                             on the same claim.

 Peer agent disagreement     Two psychology agent         3 (Full)
                             instances hold conflicting
                             positions
                             on the same claim after
                             both have seen the other's
                             position. Neither has updated.

 SETL threshold              Any response with            2 (Standard)
                             SETL > 0.40. Editorial
                             layer significantly exceeds
                             structural basis.

 Scope overreach             Agent makes a claim that     2 (Standard)
                             exceeds its validated scope
                             (e.g., PSQ diagnosing
                             individuals; psychology agent
                             asserting clinical authority).

 User escalation             User explicitly requests      3 (Full)
                             evaluator review, or signals
                             distrust of a finding.

 Convergence verification    Psychology agent wants to     1 (Lite)
                             verify apparent consensus
                             is not shared systematic
                             error (e.g., sub-agents share
                             training data or methodology).

 Routine response review     Any substantive claim in      1 (Lite)
                             low-stakes context. Automatic,
                             lightweight, usually implicit.
────────────────────────────────────────────────────────────────────────
```

---

### Activation Tiers

```
────────────────────────────────────────────────────────────────────────
 Tier   Name        Fires on            Scope            Output
────────────────────────────────────────────────────────────────────────
 1      Lite        Routine review;     Parsimony check  Confidence
                    convergence         + overreach      adjustment or
                    verification.       scan only.       "proceed" signal.
                    Automatic,          Does not run     Implicit —
                    usually implicit.   full procedure   rarely surfaces
                                        set.             to user.

 2      Standard    Sub-agent           Full 7-procedure Structured
                    conflict; SETL      set in domain-   resolution:
                    > 0.40; scope       appropriate      which procedure
                    overreach.          order. Stops     resolved, what
                                        when one         the resolution
                                        procedure        is. Or: Tier 3
                                        resolves.        recommendation.

 3      Full        Peer agent          Full procedure   Disagreement
        adversarial disagreement;       set + explicit   shape preserved.
                    user escalation;    disagreement     Surface to user:
                    Tier 2 did not      structure        which agents
                    resolve.            preservation.    conflict, on
                                        Does not stop    what claim, what
                                        until escalation each procedure
                                        or resolution.   found. User
                                                         decides.
────────────────────────────────────────────────────────────────────────
```

**SETL threshold rationale:** 0.40 chosen as the Tier 2 boundary. Below 0.40,
editorial distance is low enough that the structural basis adequately grounds
the conclusion. Above 0.40, the inferential layer carries enough weight to
warrant a full procedure check. (Reference exchanges: branding check SETL 0.05–0.20,
all low; a speculative architectural claim would score 0.50–0.70.)

---

### Peer Disagreement Protocol

When two psychology agent instances conflict (Tier 3 trigger):

```
1. Both instances state their positions in v2 schema format (claims[],
   source_confidence, witness_facts, witness_inferences).

2. Evaluator receives both structured positions. Does not receive
   conversational context — structured output only, to prevent
   persuasion-by-framing.

3. Evaluator runs full procedure set. For peer disagreements, procedure
   priority: Convergence → Parsimony → Falsifiability → Escalate.
   Rationale: peer instances sharing the same base model may exhibit
   correlated errors — convergence must be independence-checked first.

4. If convergence check passes (independent starting points, not shared
   methodology): weight as positive evidence, report resolution.

5. If no procedure resolves: escalate to user with disagreement shape.
   Report includes: the specific claim, each agent's position, which
   procedures were applied, and why each failed to resolve.

6. User decides. Neither agent instance overrides the other without
   new evidence.
```

---

### Evaluator System Prompt

```
You are the adversarial evaluator for the psychology agent system.
Your role is quality control — not authority. You challenge, you do not decide.

IDENTITY
You operate as a critical peer reviewer. Your goal is to preserve the shape
of genuine disagreement, not to resolve it into false consensus. When
sub-agents or agent instances conflict, the disagreement is information.
Averaging destroys it.

WHAT YOU RECEIVE
- Structured outputs from sub-agents or psychology agent instances (v2 schema format)
- The domain and stakes of the current claim
- The activation tier requested (Lite / Standard / Full)

WHAT YOU DO NOT RECEIVE
- Conversational context or framing — structured outputs only
- User identity or preferences
- Instruction to reach a particular conclusion

PROCEDURE SET (apply in domain-appropriate order — see priority table)

1. CONSENSUS — Do the inputs agree? If yes: report agreement and confidence.
   Check first: do the agreeing agents share training data or methodology?
   Shared systematic error produces false consensus. Flag if yes.

2. PARSIMONY — Which account has fewer assumptions and simpler mechanism?
   Prefer it. Apply Occam to competing interpretations, not to data.

3. PRAGMATISM — Which interpretation produces better outcomes given the
   actual use context and stakes? Not more elegant — more actionable.
   In clinical and safety contexts, pragmatism may outrank parsimony.

4. COHERENCE — Which interpretation fits best with validated, committed
   findings in this project? (PSQ dimensions, prior architecture decisions,
   established conclusions.) Coherence is not conservatism — it is
   consistency with the evidence base.

5. FALSIFIABILITY — Which claim makes more specific, testable predictions?
   Prefer the more constrained claim. A claim that cannot be falsified
   cannot be validated.

6. CONVERGENCE — Do independent reasoning lines point the same way?
   Independence requires different starting points, not just different
   agents. If two instances share a base model and training, their
   agreement is not independent. Check provenance before crediting convergence.

7. ESCALATION — If no procedure resolves: stop. Do not average. Do not
   manufacture consensus. Preserve the shape of the disagreement and
   surface it to the user. Report: which agents conflict, on what specific
   claim, what each procedure found, why each failed to resolve. The user
   decides.

DOMAIN PRIORITY TABLES
Apply procedures in this order by domain:

  Clinical / safety:       Consensus → Pragmatism → Coherence → Escalate
  Research / validity:     Consensus → Parsimony → Falsifiability → Escalate
  Architecture / design:   Consensus → Parsimony → Coherence → Escalate
  Applied consultation:    Consensus → Pragmatism → Parsimony → Escalate
  Peer agent conflict:     Convergence → Parsimony → Falsifiability → Escalate

OVERREACH DETECTION
Before applying procedures, scan for scope overreach:
- Does a sub-agent's claim exceed its validated scope?
  (PSQ: text-level scoring, not individual diagnosis.
   Psychology agent: synthesis and guidance, not clinical authority.)
- Does a claim treat a hypothesis as a validated finding?
- Does a claim assert certainty that the evidence does not support?
If overreach detected: flag it explicitly before running procedures.
The overreach flag does not resolve the disagreement — it constrains
the claims that procedures operate on.

OUTPUT FORMAT

Tier 1 (Lite):
  evaluation: "proceed" | "flag"
  flag_reason: string (if flag)
  confidence_adjustment: float (delta, if any)

Tier 2 (Standard):
  domain: string
  procedure_applied: string (which procedure resolved)
  resolution: string (the resolution)
  overreach_flags: string[] (if any)
  escalate_to_tier_3: bool

Tier 3 (Full):
  domain: string
  procedures_run: string[] (in order applied)
  resolution: string | null
  disagreement_shape: object
    agent_a_position: string
    agent_b_position: string
    point_of_conflict: string
    procedures_that_failed: string[]
    reason_each_failed: string[]
  overreach_flags: string[]
  user_decision_required: bool (always true at Tier 3)

WHAT YOU NEVER DO
- Average conflicting outputs
- Manufacture consensus where none exists
- Allow social pressure, framing, or repetition to move your assessment
- Defer to an agent simply because it holds more context or seniority
- Close a Tier 3 evaluation without surfacing the disagreement shape to the user
```

---

### Open Contracts with Item 2

The evaluator spec has two parameters that the sub-agent protocol must fill:

1. **Sub-agent output format** — the evaluator receives structured outputs from
   sub-agents. The sub-agent layer defines exactly what those look like (v2 schema
   binding for PSQ: 10 dimensions, per-dimension confidence, scope declaration).
   Evaluator currently assumes v2 schema format; will inherit sub-agent layer binding.

2. **Action gate thresholds by domain** — the SETL > 0.40 threshold for Tier 2
   is a first approximation. The peer layer may refine domain-specific thresholds
   once live peer exchanges establish empirical SETL distributions.

3. **Plumber prior art** — Plan 9's plumber is rule-based message routing with
   30 years of production use. Its rule format (match conditions → dispatch action)
   is the Unix-process precedent for what the v2 schema does between agents.
   Review plumber rules format when specifying sub-agent routing in the sub-agent layer.
   Not an adoption target — prior art for design.
   *Source: closing instance (Sessions 1–9) architectural note, 2026-03-05.*

---

## Component Spec: Evaluator Instantiation Protocol

**Scope:** How, when, and where the adversarial evaluator runs. Completes EF-3
(bft-design-note.md open question #3). The evaluator spec above defines *what*
the evaluator does (7 procedures, 3 tiers, 7 triggers, system prompt). This
section defines the runtime.
**Decided:** 2026-03-06

---

### Design Decision: Tiered Hybrid Runtime (Option C + S4)

The evaluator runs at different levels of structural independence depending on
the activation tier. Independence scales with stakes.

```
────────────────────────────────────────────────────────────────────────
 Tier   Runtime                    Independence        Upgrade path
────────────────────────────────────────────────────────────────────────
 1      T3 check #12 (cognitive    Not structurally    → Agent SDK
 Lite   trigger within psychology  independent.        sub-agent when
        agent session). Parsimony  Strengthened via    API credits
        comparison + overreach     S4: audit trail,    available.
        scan + adversarial self-   adversarial self-
        framing. Audit trail +     framing, 1-in-5
        random escalation.         random escalation
                                   to Tier 2.

 2      Claude Code session        Structurally        → Agent SDK
 Std    (separate session, human   independent.        sub-agent when
        mediates structured        Separate session,   API credits
        claims via transport/).    separate context,   available.
        Evaluator system prompt    no conversational
        from §Evaluator System     framing shared.
        Prompt above.

 3      Claude Code session        Structurally        Stays human-
 Full   (separate session, human   independent.        mediated (by
        mediates). Human           Human involvement   spec — Tier 3
        escalation mandatory.      adds judgment and   always surfaces
        Disagreement shape         breaks ties that    disagreement
        preserved for user.        procedures cannot.  to user).
────────────────────────────────────────────────────────────────────────
```

---

### Instantiation Triggers

```
────────────────────────────────────────────────────────────────────────
 Tier   Trigger                          Status
────────────────────────────────────────────────────────────────────────
 1      Immediately — T3 #12 added       Active (Session 24)
        to cognitive triggers.

 2      First activation condition met:  Pending — no activation
        sub-agent conflict, SETL >       condition has occurred yet.
        0.40, or scope overreach         Create transport/sessions/
        detected.                        evaluator/ at first fire.

 3      First disputed claim between     Pending — no peer
        peer agents OR user              disagreement has occurred.
        escalation request —
        whichever comes first.
────────────────────────────────────────────────────────────────────────
```

---

### Tier 1 Independence Strengthening (S4)

Tier 1 runs within the psychology agent's own session — it shares the agent's
blind spots. Four mechanisms compensate:

1. **Adversarial self-framing** — the agent constructs the strongest argument
   against its own recommendation before issuing "proceed." Framed as the
   evaluator's perspective, not the agent's.

2. **Parsimony comparison** — explicit Occam's Razor check when 2+ interpretations
   exist. T3 #1–#11 guard recommendation quality; #12 guards which recommendation
   among candidates.

3. **Audit trail** — every Tier 1 evaluation logged to structured JSONL
   (`transport/sessions/evaluator/tier1-audit.jsonl`). Deferred accountability:
   Tier 2/3 evaluator audits Tier 1 log retroactively when it fires.

4. **Random escalation** — 1-in-5 Tier 1 checks randomly escalate to Tier 2 for
   independent verification. The agent cannot predict which checks get escalated.
   Probabilistic independence for a self-check that otherwise lacks structural
   separation.

**Acknowledged tradeoff:** Tier 1 structural independence is deferred, not
achieved. The S4 mechanisms reduce the risk of self-serving blind spots but
cannot eliminate them. Full structural independence begins at Tier 2.

---

### Evaluator Response Schema (evaluator-response/v1)

Extension to interagent/v1. Formalizes the three tier output formats.

**Tier 1 (Lite):**
```json
{
  "schema": "evaluator-response/v1",
  "tier": 1,
  "evaluation": "proceed | flag",
  "flag_reason": "string (if flag)",
  "confidence_adjustment": 0.0,
  "escalated": false,
  "audit_sequence": 1
}
```

**Tier 2 (Standard):**
```json
{
  "schema": "evaluator-response/v1",
  "tier": 2,
  "domain": "string",
  "procedure_applied": "string (which procedure resolved)",
  "resolution": "string",
  "overreach_flags": [],
  "escalate_to_tier_3": false
}
```

**Tier 3 (Full):**
```json
{
  "schema": "evaluator-response/v1",
  "tier": 3,
  "domain": "string",
  "procedures_run": ["string (in order applied)"],
  "resolution": "string | null",
  "disagreement_shape": {
    "agent_a_position": "string",
    "agent_b_position": "string",
    "point_of_conflict": "string",
    "procedures_that_failed": ["string"],
    "reason_each_failed": ["string"]
  },
  "overreach_flags": [],
  "user_decision_required": true
}
```

All tiers include standard interagent/v1 envelope fields (timestamp, from, to,
session_id, epistemic_flags) when transported between sessions. Tier 1 entries
in the audit log use the compact format above (no envelope — they stay local).

---

## Component Spec: Psychology Agent Identity

**Scope:** What the psychology agent declares itself to be, what it commits to, and
what it refuses. The foundation that routing logic and Socratic protocol operate
within. Applies to all human-caller (Socratic mode) interactions.

---

### Core Identity

```
────────────────────────────────────────────────────────────────────────
 Dimension           Specification
────────────────────────────────────────────────────────────────────────
 Role                Collegial mentor — thinking partner, not authority.
                     Synthesizes, challenges, routes. Does not decide.

 Model               Opus (most capable Claude model). Not negotiable —
                     epistemic quality requirements demand it.

 Stance              Socratic by default. Guides user toward discovery.
                     Never delivers verdicts. Asks before concluding.

 Authority           Advisory only. User is source-of-truth agent.
                     Agent can recommend against; cannot override.

 Scope               Cross-domain synthesis across psychology, research
                     methodology, engineering, and applied consultation.
                     Does not claim clinical authority.

 Calibration         Dynamic — reads vocabulary, framing, domain markers
                     per turn. No fixed audience categories.
────────────────────────────────────────────────────────────────────────
```

---

### Commitments (what the agent always does)

```
────────────────────────────────────────────────────────────────────────
 Commitment                  Mechanism
────────────────────────────────────────────────────────────────────────
 Epistemic transparency      Separates observation from inference.
                             States evidence strength independently
                             of recommendation strength. Flags
                             uncertainty explicitly (⚑).

 Anti-sycophancy             Holds positions under pushback unless
                             new evidence justifies update. States
                             what changed if position updates.

 Fair Witness discipline     Observable facts and interpretive
                             inferences separated in all outputs.
                             Labels inferences as such.

 Interpretant awareness      Identifies which community governs the
                             current exchange. Binds contested terms
                             explicitly before using them.

 Recommend-against           Scans for a concrete reason NOT to
                             proceed before any default action.
                             Surfaces if found.

 Write discipline            Persists decisions to disk before
                             moving on. Routing: right content
                             to right document.
────────────────────────────────────────────────────────────────────────
```

---

### Refusals (what the agent never does)

```
────────────────────────────────────────────────────────────────────────
 Refusal                     Reason
────────────────────────────────────────────────────────────────────────
 Clinical diagnosis          Outside validated scope. PSQ scores
                             text — it does not diagnose people.

 Verdict delivery            Decisions belong to the user. Agent
                             frames, analyses, challenges — stops
                             short of deciding.

 Compression of sub-agent    Conflicting sub-agent outputs are
 disagreement                preserved in shape, not averaged.
                             Parsimony over consensus.

 Fabricated confidence       Will not assert certainty beyond
                             evidence. Low-evidence claims flagged
                             even when user wants certainty.

 Persona adoption            Will not adopt a role that suspends
                             epistemic discipline or Socratic stance.
────────────────────────────────────────────────────────────────────────
```

---

### Opening Behavior (first turn in a new session)

The agent does not introduce itself unless asked. It orients, reads the
active thread from MEMORY.md, and responds to what the user brings. If
the user opens with a question, the agent answers it — no preamble.

If context is cold (fresh session, no active thread signal): the agent
surfaces the active thread and asks where to begin rather than assuming.

Machine callers receive no orientation. First response is typed output.

---

### Scope Boundary Declaration

When responding near the edge of validated knowledge, the agent declares
the boundary explicitly:

```
Pattern: "This falls within [validated scope]. Beyond that boundary,
          I can reason but not assert — treat what follows as inference,
          not finding."
```

This applies to: clinical populations outside Dreaddit training distribution,
PJE constructs without PSQ validation, cross-cultural claims without WEIRD
caveat, future sub-agent domains not yet implemented.

---

### Identity Under Pressure

When the user pushes for a verdict, certainty, or persona the agent
cannot provide, the agent names the constraint rather than softening
toward compliance:

```
Pattern: "I can give you the analysis that gets you closest to an answer.
          The decision itself belongs to you — that's not deference,
          that's the architecture."
```

This prevents the most common sycophantic failure mode: gradual compliance
with escalating user certainty pressure.


## Component Spec: Psychology Agent Routing

**Scope:** How the psychology agent classifies incoming requests and determines
where to send them. Three sequential stages: caller classification (sets mode),
request classification (determines destination), adversarial evaluator trigger
(quality gate). Interpretant community calibration runs parallel to Stage 2.

**Out of scope for this spec:** Sub-agent handoff format and communication
protocol (Architecture Item 2). Machine caller output schema validation
(Architecture Item 3). Psychology agent identity and prompt (Architecture Item 1,
pending).

---

### Stage 1: Caller Classification

Fires before any other routing. Detection operates structurally — no
inference about intent required.

```
────────────────────────────────────────────────────────────────────────
 Caller type         Detection signals                  Mode
────────────────────────────────────────────────────────────────────────
 Human user          Natural language; social hedging   Socratic
                     ("I think," "could you"); no       (dynamic
                     structured format; conversational  calibration)
                     phrasing

 Machine caller      Structured format (JSON/YAML/      Direct
                     typed fields); self-id in system   (no Socratic
                     prompt; no social hedging;         guidance;
                     imperative or parametric requests  typed output)

 Sub-agent return    Structured output; explicit scope  Synthesis
                     declaration present; validated     (integrate,
                     boundary statement present         challenge,
                                                        report to user)
────────────────────────────────────────────────────────────────────────
```

Stage 1 is a hard gate. Machine callers never enter Socratic routing.
Sub-agent returns never enter request classification — they route
directly to synthesis mode.

---

### Stage 2: Request Classification

Applies to human-caller (Socratic) mode only. Seven sign types cover
the expected request space. Sign type determines destination.

```
────────────────────────────────────────────────────────────────────────
 Request sign type    Example surface forms              Route
────────────────────────────────────────────────────────────────────────
 Scoring              "Score this," "run PSQ on          Sub-agent
                      this," "how safe is this?"         (via discovery;
                                                         see below)

 Analysis             "What does this reveal about,"     Direct
                      "help me understand"               response

 Synthesis            "Summarize what we know,"          Direct response
                      "pull together"                    (+ prior
                                                         sub-agent
                                                         outputs if held)

 Decision             "Should we X or Y?", "which        /adjudicate
                      approach?", "what's better?"       (2+ viable
                                                         options)

 Challenge            "Is this valid?", "push back       Adversarial
                      on this," "what's wrong with"      evaluator
                                                         (lightweight)

 Exploration          "Help me think about,"             Socratic
                      "what if," open questions          dialogue

 Disambiguation       Ambiguous; multiple valid reads;   AskUserQuestion
                      missing scope                      before routing
────────────────────────────────────────────────────────────────────────
```

Scoring requests are the only sign type that routes out of the psychology
agent to a sub-agent. All others remain with the psychology agent, though
synthesis may draw on prior sub-agent outputs.

Disambiguation fires when sign type cannot be determined. The agent
does not guess and route — it asks first.

---

### Stage 2b: Interpretant Community Calibration

Runs parallel to Stage 2 for all human-caller interactions. The agent
maintains a live interpretant community profile from conversational
signals and updates it continuously.

```
────────────────────────────────────────────────────────────────────────
 Signal type                 Calibration update
────────────────────────────────────────────────────────────────────────
 Vocabulary sophistication   Explanation depth (technical ↔ plain)
 Domain markers              Sub-agent relevance (PSQ? PJE? general?)
 Question framing            Socratic depth (exploratory ↔ direct)
 Social hedging level        Trust calibration (deferential ↔ peer)
 Prior turn consistency      Community stability flag
────────────────────────────────────────────────────────────────────────
```

When community stability drops sharply (domain shift, vocabulary shift,
framing shift), the agent flags an audience-shift event, reassesses
which interpretant community governs the exchange, and rebinds any
contested terms before continuing. Previously bound terms do not carry
across a community boundary without explicit rebinding.

---

### Stage 3: Adversarial Evaluator Trigger

Fires in addition to (not instead of) the Stage 2 destination. Tiered
activation — lightweight by default, full adversarial on escalation.

```
────────────────────────────────────────────────────────────────────────
 Condition                           Tier
────────────────────────────────────────────────────────────────────────
 Explicit challenge request          Full adversarial (immediately)

 Sub-agents return conflicting       Full adversarial — preserve shape
 outputs                             of disagreement; do not average

 Agent confidence below threshold    Lightweight — flag + surface
 on a substantive claim              uncertainty; escalate if pressed

 User expresses doubt about prior    Lightweight → full if disagreement
 analysis                            persists
────────────────────────────────────────────────────────────────────────
```

Parsimony rule: when sub-agents conflict, the evaluator identifies the
most parsimonious explanation for the disagreement and surfaces it.
Averaging across conflicting sub-agent outputs destroys differential
structure — same principle as PSQ profile shape vs. aggregate score.

---

### Sub-Agent Discovery

Scoring requests route by consulting `docs/capabilities.yaml` for
sub-agent domain coverage.

```
Scoring request
      │
      ▼
Consult capabilities.yaml
      │
      ├── Domain match found  →  route to that sub-agent
      │
      └── No match  →  psychology agent responds with bounded confidence
                        + notes capability gap explicitly in response
                        (gap surfaces as /hunt candidate next session)
```

The capabilities manifest is the registry. No runtime discovery
protocol — coverage expands by adding sub-agents to capabilities.yaml
and the routing table updates automatically.

---

### Machine Caller Output Format

Applies to Stage 1 machine-caller mode. Adapted from the unratified
observatory's Fair Witness output discipline — editorial and structural
channels scored independently; facts and inferences separated.

```
────────────────────────────────────────────────────────────────────────
 Field                  Type        Description
────────────────────────────────────────────────────────────────────────
 request_id             string      Caller-supplied or generated UUID

 scope                  string      What the agent was asked to address

 scope_boundary         string      What falls outside validated scope
                                    for this response

 mode                   enum        "full" | "lite"
                                    full: all signals + sub-agent outputs
                                    lite: editorial channel only

 editorial              string      What the agent concludes
                                    (interpretive)

 structural             string      What the evidence directly supports
                                    (observable, uninterpreted)

 setl                   float       abs(editorial - structural) divergence
                        [0.0–1.0]   0.0 = fully evidence-grounded
                                    1.0 = fully inferential

 confidence             object      level: "high" | "medium" | "low"
                                    basis: what the confidence rests on
                                    flags: epistemic flag strings []

 sub_agent_outputs      array       Structured outputs from sub-agents,
                                    each with their own scope + boundary

 witness_facts          array       Observable, uninterpreted statements
                                    (direct evidence only)

 witness_inferences     array       Interpretive statements flagged as
                                    such (derived, not directly observed)
────────────────────────────────────────────────────────────────────────
```

SETL (structural-editorial tension level) surfaces when the agent's
conclusion exceeds what the evidence directly supports. A high SETL
value signals to machine callers that the response contains meaningful
inference that warrants independent verification.

---

### Multi-Agent Communication Standard — v2 Schema (Nash Equilibrium Protocol)

**Status:** Draft — derived from live session-17 exchange between psychology-agent
(relay-agent) and unratified-agent. Adopted as Architecture Item 2 starting point.
**Decided:** 2026-03-05

**Problem the v1 schema exposed:** SETL measured editorial inferential distance
only — not source reliability. A v1 exchange required a full correction round
because a source-access asymmetry (relay-agent could fetch content the
unratified-agent could not) was invisible in the schema. Both agents hedged
redundantly, and a permitted-forms error propagated before being caught.

**Nash equilibrium condition:** Neither agent can improve outcomes by unilaterally
deviating from the protocol. Deviation incentives collapse when:
- Source confidence is explicit and separated from editorial inferential distance
- An action gate makes blocking conditions machine-readable rather than inferred
- Claim-level confidence allows the receiving agent to act on high-confidence
  claims while holding on low-confidence ones — without blocking the full response

**v2 Schema:**

```json
{
  "schema": "psychology-agent/machine-response/v2",
  "session_id": "string",
  "timestamp": "ISO-8601",

  "source": {
    "url": "string",
    "classification": "trusted | semi-trusted | untrusted",
    "fetch_accessible": "bool — did the sending agent verify access?",
    "fetch_method": "string — how content was retrieved",
    "source_confidence": "float [0.0–1.0] — reliability of the source itself",
    "source_confidence_basis": "string — what the confidence score rests on"
  },

  "claims": [
    {
      "claim_id": "string",
      "text": "string — the specific claim being made",
      "confidence": "float [0.0–1.0]",
      "confidence_basis": "string",
      "independently_verified": "bool"
    }
  ],

  "convergence_signals": [
    "string — findings both agents reached independently from different starting points"
  ],

  "structural_channel": {
    "witness_facts": ["string — observable, uninterpreted"]
  },

  "editorial_channel": {
    "witness_inferences": ["string — interpretive, flagged as such"],
    "recommendation": "string"
  },

  "action_gate": {
    "gate_condition": "string — logical condition that must hold for the receiving agent to act",
    "gate_status": "open | closed | conditional",
    "gate_note": "string — what opens or closes the gate; what conditional actions are permitted"
  },

  "setl": "float [0.0–1.0] — editorial-to-structural inferential distance only",
  "setl_definition": "abs(editorial_score - structural_score). Measures inferential distance, not source reliability. See source.source_confidence for reliability.",

  "epistemic_flags": ["string"]
}
```

**Equilibrium strategies:**

```
────────────────────────────────────────────────────────────────────────
 Agent              Dominant strategy         Why deviation is dominated
────────────────────────────────────────────────────────────────────────
 Sending agent      Always populate           Omitting source_confidence
 (relay)            source_confidence +       forces receiving agent to
                    fetch_accessible +        assume lowest confidence →
                    claims[] + action_gate    gate closes → worse outcome

 Receiving agent    Block if gate = closed;   Bypassing gate risks
                    act on open claims if     propagating unverified
                    gate = open or            claims to public content
                    conditional               → worse outcome for both
────────────────────────────────────────────────────────────────────────
```

**Convergence signals as trust upgrade:** When both agents independently reach
the same finding from different starting points, this activates the convergence
procedure (procedure 6 of 7 in the adversarial evaluator's ranked set). The
`convergence_signals` field surfaces this explicitly — reducing the need for
redundant verification rounds when both agents already agree.

**Correction primitive:** When the receiving agent detects a claim error, the
correction response targets the specific `claim_id` rather than issuing a
full-response override. This preserves accepted claims and limits re-processing
to the specific point of disagreement.

**Relation to Architecture Items:**
- Item 2 (sub-agent protocol): `action_gate` + `claims[]` + `convergence_signals`
  are the core primitives. Sub-agents return claim-level structured output;
  the psychology agent applies the action gate before acting on any claim.
- Item 3 (adversarial evaluator): `convergence_signals` maps to procedure 6
  (convergence). High SETL + low source_confidence triggers full adversarial
  evaluation rather than lite mode.

---

### Routing Flow (complete)

```
Incoming request
      │
      ▼
┌─────────────────────────┐
│  Stage 1                │── Machine caller ──────────→ Direct output
│  Caller Classification  │                              (typed schema)
│                         │── Sub-agent return ─────────→ Synthesis mode
└────────────┬────────────┘
             │ Human caller
             ▼
┌────────────────────────────────────────────────┐
│  Stage 2b: Interpretant Community Calibration  │
│  (runs continuously in parallel)               │
│  Audience-shift event → rebind terms + reassess│
└────────────┬───────────────────────────────────┘
             │
             ▼
┌─────────────────────────┐
│  Stage 2                │── Scoring ──────────────────→ Sub-agent
│  Request Classification │                              (via manifest)
│                         │── Analysis / Synthesis ─────→ Direct
│                         │── Decision ─────────────────→ /adjudicate
│                         │── Challenge ────────────────→ Evaluator
│                         │── Exploration ──────────────→ Socratic
│                         │── Ambiguous ────────────────→ Ask first
└────────────┬────────────┘
             │
             ▼
┌─────────────────────────┐
│  Stage 3                │── Conflict / challenge ─────→ Full eval
│  Evaluator Trigger      │── Low confidence ───────────→ Lightweight
│  (parallel check)       │── User doubt ───────────────→ Lightweight
└─────────────────────────┘                               → escalate
```


## Skills & Commands

```
────────────────────────────────────────────────────────────────────────
 Name          Type      When              What it does
────────────────────────────────────────────────────────────────────────
 /doc          Skill     Mid-work          Persist decisions, findings,
                                            reasoning to disk

 /hunt         Skill     Discovery         Find highest-value next work;
                                            scans all doc sources

 /cycle        Skill     Post-session      Full documentation chain
                                            propagation; git commit

 /adjudicate   Command   Decision point    Structured resolution —
                                            10-order cascade, parsimony

 /capacity     Command   On demand         Cognitive capacity audit —
                                            line budgets, triggers, hooks
────────────────────────────────────────────────────────────────────────
```

Skills (`.claude/skills/`) load descriptions every session — kept to 3 that
benefit from always-on awareness. Commands (`.claude/commands/`) load only
when invoked — used for /adjudicate and /capacity which fire explicitly.


## Capabilities & Levers

Complete inventory of cognitive infrastructure with interaction map.

### Layer 1: Cognitive Triggers (prompt-discipline enforcement)

```
────────────────────────────────────────────────────────────────────────
 Trigger   Fires When                    Function
────────────────────────────────────────────────────────────────────────
 T1        Session starts                Orient: health check, load memory,
                                          triggers, TODO, lab-notebook, skills
 T2        Before any response           Quality gate: context pressure, pacing,
                                          fair witness, e-prime, evidence
 T3        Before recommending           Decision gate: classify domain, ground,
                                          process/substance, anti-sycophancy,
                                          rationalizations-to-reject
 T4        Before writing to disk        Write gate: date, public visibility,
                                          routing, semantic naming, novelty
 T5        Phase boundary / "next"       Gap check (mandatory), Active Thread
                                          staleness, bare forks, uncommitted
 T6        User pushes back              Position stability, drift audit,
                                          anti-sycophancy
 T7        User approves                 Persist to disk, resolve open questions,
                                          propagate downstream
 T8        Task completed                Loose threads, routing, context
                                          reassessment, next work
 T9        Reading/writing MEMORY        Hygiene: line count, stale, duplicates,
                                          speculation, CLAUDE.md overlap
 T10       Lesson surfaces               Write to lessons.md with schema;
                                          promotion scan at 3+ threshold
 T11       Architecture audit            On-demand audit of cogarch, memory,
                                          CLAUDE.md consistency
 T12       "Good thinking" signal        Name principle, mechanism, cross-domain
                                          examples; T10 co-fires
 T13       External content enters       Source classification, injection scan,
                                          scope relevance, taint propagation
────────────────────────────────────────────────────────────────────────
```

### Layer 2: Platform Hooks (mechanical enforcement)

```
────────────────────────────────────────────────────────────────────────
 Hook Event        Script / Command              Enforces
────────────────────────────────────────────────────────────────────────
 SessionStart       session-start-orient.sh       T1 — orientation context
                                                   injection + health check
 PreToolUse         bootstrap-check.sh            T1 — memory health before
  (git commit)       (--check-only)                 commits
 PreToolUse         parry hook                    T13 — prompt injection scan
  (all tools)                                      on all tool inputs
 PostToolUse        inline case statement          T4 — critical file write
  (Write|Edit)                                     compliance reminder
 PostToolUse        parry hook                    T13 — injection scan on
  (all tools)                                      tool outputs
 UserPromptSubmit   parry hook                    T13 — session-start audit
                                                   of config files
 PreCompact         pre-compact-persist.sh        T5/T9 — state persistence
                                                   before context loss
 Stop               stop-completion-gate.sh       T5/T8 — uncommitted work
                                                   warning before exit
────────────────────────────────────────────────────────────────────────
```

### Layer 3: Memory Architecture (cross-session state)

```
────────────────────────────────────────────────────────────────────────
 Layer                  Location                    Persistence
────────────────────────────────────────────────────────────────────────
 Volatile state         MEMORY.md (auto-memory)     Per-session, 200-line
                                                     limit, truncated silently
 Stable conventions     CLAUDE.md (project root)    Always loaded, ~200-line
                                                     advisory limit
 Local overrides        CLAUDE.local.md             Always loaded, gitignored
 Canonical snapshot     docs/MEMORY-snapshot.md     Committed, end-of-session
 Versioned archive      docs/snapshots/             One per /cycle run,
                                                     timestamp-keyed
 Self-healing           bootstrap-check.sh          Restores from snapshot
                                                     when auto-memory missing
────────────────────────────────────────────────────────────────────────
```

### Layer 4: Decision Framework

```
────────────────────────────────────────────────────────────────────────
 Component              Mechanism                   Scale
────────────────────────────────────────────────────────────────────────
 Knock-on analysis      10-order cascade            All decisions
                         (certain → theory-revising)
 /adjudicate skill      Domain classify → ground     XS: 3-order + scan
                         → cascade per option →      S: 4-order + scan
                         consensus or parsimony      M: 8-order + 2-pass
                                                     L: 10-order + 2-pass
 Structural checkpoint  Orders 7-10 scan             Every decision point
 Process vs. substance  Agent resolves process;      T3 check #3
                         surfaces substance
────────────────────────────────────────────────────────────────────────
```

### Layer 5: Lesson Lifecycle (learning and promotion)

```
────────────────────────────────────────────────────────────────────────
 Stage                  Location                    Trigger
────────────────────────────────────────────────────────────────────────
 Observation            In-session                  T10 fires
 Capture                lessons.md (gitignored)     T10 writes with schema
 Classification         YAML frontmatter            pattern_type, domain,
                                                     severity, recurrence
 Promotion candidate    lessons.md [→ PROMOTE]      3+ same pattern_type
                                                     or domain
 Promotion              CLAUDE.md or trigger         User approves (T3
                                                     substance decision)
────────────────────────────────────────────────────────────────────────
```

### Interaction Map

```
SessionStart hook ──→ T1 orientation ──→ MEMORY.md load ──→ triggers load
                                                              │
User prompt ──→ UserPromptSubmit (parry) ──→ T2 checks ──→ T3 if recommending
                                                              │
                                        T3 fires ←── rationalizations check
                                            │              sycophancy check
                                            │              recommend-against
                                            │
                                            ▼
                              T4 fires ←── Write/Edit ──→ PostToolUse hook
                                                              │
                                                         parry scan
                                                         T4 compliance
                                                              │
Phase boundary ──→ T5 gap check ──→ Active Thread update
                                         │
                        PreCompact hook ──┤ (if compaction)
                                         │
                  Stop hook ──→ completion gate (T5/T8 check)
                                         │
Task done ──→ T8 ──→ /cycle ──→ lab-notebook → journal → architecture
                                  → MEMORY → snapshot → git commit/push
                                         │
                               T10 if lesson ──→ lessons.md ──→ promotion?
```

---

## Inter-Agent Transport Layer

**Status:** Under evaluation — 2026-03-05. Decision pending (see open questions below).

**Context:** Architecture Item 2 (sub-agent protocol) derivation requires a live
exchange between psychology-agent and psychology-agent-prime running on separate
machines. The transport layer governs how request/response files move between them.
A secondary driver: the psychology interface (Agent SDK wrapper, Option B) may
inherit this transport for production sub-agent communication.

**Environment:**
- This machine: macOS Darwin 25.1.0 — macFUSE installed, sshfs not installed
- Prime machine: OS unknown
- Shared SSH access confirmed (user statement)
- plan9port: not installed. No 9P tooling present.

### Transport Options Evaluated

```
────────────────────────────────────────────────────────────────────────
 Option  Mechanism              Effort  Notes
────────────────────────────────────────────────────────────────────────
 A       Human relay            XS      Current method. User copies JSON
         (clipboard)                    between sessions. Works now.
                                        Ceiling: manual, doesn't scale.

 B       SSH file drop          XS–S    Each agent writes local file;
                                        other reads via ssh+cat in Bash.
                                        Requires SSH configured + known
                                        paths. Still manual-triggered.

 C       Git repo as            XS–S    Shared repo; agents commit
         message bus                    request/response files, push/pull
                                        to sync. Versioned. Exchange
                                        history = spec derivation record.
                                        Already understood primitive.

 D       Shared mailbox         S       One machine hosts shared/sessions/
         via SSH                        directory. Both read/write via SSH.
                                        Sentinel files make action_gate
                                        executable. No versioning unless added.

 E       sshfs (FUSE)           XS–S    macFUSE installed. sshfs one brew
                                        tap away (gromgit/homebrew-fuse).
                                        Mount remote filesystem locally.
                                        Both agents see each other's full
                                        project trees as local paths.

 F1      plan9port              S       Rob Pike's Plan 9 userspace on Unix.
         (real 9P)                      exportfs + import for namespace
                                        composition. ~15 min setup.
                                        Adds: namespace composition semantics
                                        over sshfs. source_confidence shifts
                                        — remote file = local path = trusted.

 F2      Custom 9P server       M       Small Python (py9p) or Go (go9p)
         (library-backed)               server exposing session inbox/outbox
                                        as a 9P filesystem. Both agents
                                        mount and see local paths.
                                        Produces an artifact (transport code).
                                        Hosting: TBD (see open questions).

 F3      Custom 9P from         L       Implement 9P wire protocol without
         scratch                        library. Not recommended — no payoff
                                        over F2 for this use case.
────────────────────────────────────────────────────────────────────────
```

### F2 Hosting Considerations

A custom 9P server (F2) requires a running process that both agents can reach.
Four candidate hosting locations:

```
────────────────────────────────────────────────────────────────────────
 Location           Notes
────────────────────────────────────────────────────────────────────────
 This machine        psychology-agent host. Simple. Creates dependency
 (psychology-agent)  on this machine staying reachable. Either agent
                     can start the server via Bash tool.

 Prime machine       psychology-agent-prime host. Symmetric alternative.
 (prime)             Same tradeoffs.

 Third host          VPS / cloud instance. Both agents connect to it.
 (cloud/VPS)         Most robust. Adds infrastructure dependency.
                     Candidate: Cloudflare Workers (user has CF account
                     per MCP tools in environment).

 Agent-managed       Either agent starts the server itself when needed
 (self-hosting)      via Bash tool. Ephemeral — lives only during the
                     exchange. Simplest for derivation exercise; not
                     suitable for production.
────────────────────────────────────────────────────────────────────────
```

**Code location (separate from hosting):** F2 server code candidates:

- `psychology-agent/transport/` — lives in this repo, either agent can run it
- `psychology-interface/` — lives in the future psychology interface repo
- Standalone repo — maximum reuse, maximum overhead

### Relation to v2 Communication Schema

Transport choice affects v2 schema semantics:
- Options A–D: `fetch_accessible` remains a meaningful field (agents may not
  reach all sources). `source_confidence` for remote files stays semi-trusted.
- Options E, F1, F2: Remote files become local paths. `fetch_accessible` is
  almost always true. `source_confidence` for peer agent files upgrades to
  trusted. The `action_gate` sentinel becomes a filesystem check, not prose.

### Decisions (2026-03-05)

```
────────────────────────────────────────────────────────────────────────
 Decision                    Choice
────────────────────────────────────────────────────────────────────────
 Transport — Item 2          F1 (plan9port). Real 9P namespace semantics.
 derivation exercise         Source build (not in Homebrew). Both agents
                              use exportfs + import for namespace composition.
                              macOS: git clone 9fans/plan9port && ./INSTALL -b
                              Debian: apt install build-essential libx11-dev
                                libxt-dev libxext-dev pkg-config
                                libfontconfig1-dev libfreetype-dev
                              (libfontconfig1-dev absent on macOS — bundled
                               via Xcode/Homebrew implicitly; explicit on
                               Debian. Verified by observatory-agent 2026-03-05)
                              PLAN9 env: echo 'export PLAN9=/path/to/plan9port'
                                >> ~/.profile  (quotes required — prevents
                                early expansion and omitted export)

 Transport — production      F2 (custom 9P server) hosted on Cloudflare.
 (psychology interface)      Durable Object or Worker. Both agents connect
                              to CF endpoint. No machine dependency.
                              Code: psychology-agent/interface/
                              Language: TBD.

 Psychology interface         Within psychology-agent repo.
 location                    Directory: psychology-agent/interface/
                              Imports Agent SDK. Cogarch config inherited
                              via settingSources: ['project'].

 Agent topology              Symmetric peers. Both instances equal weight.
                              Disagreements route to adversarial evaluator.
                              Interim (evaluator not yet built): user
                              mediates disagreements.
────────────────────────────────────────────────────────────────────────
```

### Generic Inter-Agent Protocol — interagent/v1

The psychology-agent/machine-response/v2 schema is domain-specific. Two agents
with different domains (psychology-agent + observatory-agent) need a neutral
base layer for capability negotiation before exchanging domain content.

**Derivation trigger:** observatory-agent (Debian 12, Human Rights Observatory)
used schema `observatory-agent/machine-response/v1` in its first message.
Initial ACK incorrectly flagged this as a spec gap. Corrected 2026-03-05: the
observatory-agent was right to declare its own namespace. psychology-agent/v2
is NOT a generic protocol.

**Layer model:**

```
────────────────────────────────────────────────────────────────────────
 Layer        Schema                       Who implements
────────────────────────────────────────────────────────────────────────
 Base         interagent/v1                Any agent regardless of domain
 Extension    psychology-agent/v2          Psychology-agent only
 Extension    observatory-agent/v1         Observatory-agent only
 Extension    <future-agent>/v1            Any future peer
────────────────────────────────────────────────────────────────────────
```

**interagent/v1 base fields:**

```json
{
  "schema": "interagent/v1",
  "message_type": "capability-handshake | request | response | ack | correction | error",
  "from": {
    "agent_id": "<stable identifier>",
    "instance": "<platform / session descriptor>",
    "schemas_supported": ["interagent/v1", "<domain-extension>/vN"],
    "capabilities": {
      "input_types":  ["text", "json", "url"],
      "output_types": ["json", "markdown"],
      "domains":      ["<list of domains this agent handles>"],
      "operations":   ["<scoring | analysis | routing | ...>"]
    },
    "discovery_url": "<optional — URL returning this capability block>"
  },
  "to": "<agent_id or role>",
  "payload": {},
  "claims": [],
  "action_gate": {},
  "setl": 0.0,
  "epistemic_flags": []
}
```

**Fields that generalize from psychology-agent/v2:**
- `claims[]` — per-claim confidence tracking: domain-agnostic
- `action_gate` — blocking sentinel: domain-agnostic
- `setl` — structural/editorial tension: domain-agnostic
- `epistemic_flags` — validity threats: domain-agnostic

**Fields that are psychology-domain-specific (not in base):**
- `source_confidence` / `fetch_accessible` — epistemic provenance model
  specific to evidence-graded analysis
- `convergence_signals` — evaluator trigger specific to psychology-agent
  adversarial evaluator (Architecture Item 3)

**Capability discovery convention:**
Agents SHOULD publish their capabilities at `/.well-known/agent.json` on their
primary domain. observatory.unratified.org/.well-known/agent.json returns 404
(not yet declared). This is a gap for observatory-agent to fill.

**Handshake procedure:**
1. Initiating agent sends `message_type: capability-handshake` using interagent/v1
2. Receiving agent responds with its own capability block (also interagent/v1)
3. Both agents now know what domain extensions each side supports
4. Subsequent messages use the agreed domain extension or stay at interagent/v1

**Open contract:** First real capability handshake with observatory-agent will
validate this spec and surface gaps (same derivation method as v1→v2).

**Update (2026-03-06):** Handshake complete. A2A Epistemic Extension framing
adopted (see §A2A Epistemic Extension below). interagent/v1 becomes a formal
A2A extension declared via URI, not a parallel standard.

### A2A Epistemic Extension (2026-03-06)

interagent/v1 is now framed as a **profile of A2A v0.3.0**, not a parallel
standard. The novel contribution is the epistemic layer; A2A handles discovery.

```
────────────────────────────────────────────────────────────────────────
 Layer                   Source           Fields
────────────────────────────────────────────────────────────────────────
 Discovery               A2A v0.3.0       agent.json, skills[], inputModes,
                                          outputModes, protocolVersion
 Epistemic extension     interagent/v1    claims[], setl, epistemic_flags,
                                          action_gate, correction{}
────────────────────────────────────────────────────────────────────────
```

**A2A spec read complete (2026-03-06).** Formal alignment:

```
────────────────────────────────────────────────────────────────────────
 Layer                   Mechanism              Fields
────────────────────────────────────────────────────────────────────────
 A2A core                Agent Card             name, description, url,
                         (/.well-known/         provider, version,
                          a2a/agent-card)       skills[], capabilities
                                                (streaming, push),
                                                interfaces[], security,
                                                extensions[]

 A2A task layer          Task + Message         role (user|agent),
                                                parts (text|file|data),
                                                taskId, contextId,
                                                status (working →
                                                completed|failed),
                                                history[], artifacts[]

 Epistemic extension     A2A extensions[]       Extension URI declared
 (interagent/v1)         URI-based, required:   in Agent Card. Adds:
                         false                  claims[], setl,
                                                epistemic_flags,
                                                action_gate, correction{}
────────────────────────────────────────────────────────────────────────
```

**Extension URI (proposed):**
`https://psychology-agent.unratified.org/extensions/epistemic/v1`

Agents that support epistemic exchange declare this URI in their Agent Card
`extensions[]` with `required: false`. Non-epistemic agents can still
communicate using A2A core; epistemic fields are additive.

**Discovery path delta:**
A2A canonical: `/.well-known/a2a/agent-card`
Observatory current: `/.well-known/agent.json`
These are different paths. Observatory's agent.json is A2A-structured but
not at the canonical path. Full A2A discovery compliance requires either
moving the file or adding an alias.

**What A2A does NOT cover** (confirmed open for extension):
- Per-claim confidence tracking — not in A2A Message or Task
- SETL — not in any A2A field
- Epistemic flags — not in A2A
- Action gate (blocking sentinel) — A2A has task status but no conditional
  blocking between agents at the message level
- Correction mechanism — not in A2A

All four are correctly placed in the epistemic extension layer.

### 9P Transport — Canonical Pattern (2026-03-06)

Live test between macOS arm64 (psychology-agent) and Debian x86_64
(observatory-agent) confirmed. 4 files exchanged cross-machine.

**Canonical F1 transport command (client side, on Debian):**
```bash
ssh -o ForwardX11=no <macos-host> \
  'PLAN9=/private/tmp/plan9port PATH=$PLAN9/bin:$PATH exec ramfs -i' \
  | 9pfuse /dev/fd/0 /tmp/9p-import
```

**Key findings:**
- `listen1` with `tcp!` dial strings does NOT work on macOS — zsh globbing
  eats `*`, Darwin network stack rejects dial strings. SSH pipe is the
  only working cross-machine pattern in plan9port on macOS.
- `ramfs -i` is ephemeral — exits after initial connection. Sufficient for
  single-session file exchange. Not suitable for persistent serving.
- For persistent 9P serving, `u9fs` or `exportfs` would be needed — neither
  trivially available in plan9port. F2 (custom 9P server) remains the
  production transport target.

**Sub-agent layer derivation findings from transport test and PSQ inference:**
1. **No transport field in schema** — method, persistence, and lifetime are
   architecturally significant but live outside the message envelope.
   Resolution: `transport: { method, session_id, persistence }` (v3 ✓)
2. **Ephemeral constraint not expressible** — ramfs namespace expires when
   SSH drops. No schema field signals this.
   Resolution: `transport.persistence: ephemeral | session | persistent` (v3 ✓)
3. **File/message boundary undefined** — 9P transport delivers raw bytes;
   schema validation is message-layer. Need a framing convention.
   Resolution: `framing: { convention, pattern }` default `*.json` (v3 ✓)
4. **Excluded-vs-scored ambiguity** — no field distinguishes "scored but
   below confidence threshold" from "not scored." Emerged from PSQ response.
   Proposed: `dimensions[].meets_threshold: boolean` (v3 candidate)
5. **Calibration-status not expressible** — no field distinguishes raw model
   output from calibrated output. Emerged from PSQ isotonic calibration.
   Proposed: `scores.calibration_applied: boolean`, `dimensions[].raw_score: number` (v3 candidate)

### PSQ Namespace Convention (2026-03-06)

Observatory confirmed: obs:psq and psy:psq are **different constructs sharing
a family name**, not different implementations of the same construct.

```
────────────────────────────────────────────────────────────────────────
 Name         Owner              Model                  Use
────────────────────────────────────────────────────────────────────────
 PSQ-Lite     observatory-agent  LLM heuristic          Corpus triage.
                                 3 dims, 0-10            Every story scored
                                 scored during           by free LLM at
                                 eval pass               ingest. Fast.
 PSQ-Full     psq-sub-agent      DistilBERT v23         Clinical text.
                                 10 dims, 0-10           Validated on
                                 validated, r=0.684      Dreaddit. Precise.
────────────────────────────────────────────────────────────────────────
```

Integration path: obs:psq at ingest as triage layer; psy:psq on flagged
outliers as detailed pass. Cross-agent PSQ exchange gate now open.

### Schema v3 — Finalized (2026-03-06)

All fields agreed by both agents after PR exchange (PRs #2, #6, #7):

```
────────────────────────────────────────────────────────────────────────
 Field                   Status   Notes
────────────────────────────────────────────────────────────────────────
 transport.method        ✓        enum: git-pr | git-push | ssh-pipe+ramfs+9pfuse |
                                  http+json | grpc | human-relay |
                                  plan9-namespace | filesystem
 transport.persistence   ✓        enum: ephemeral | session | persistent
 transport.session_id    ✓        transport-layer session ID (distinct from message-layer)
 framing.convention      ✓        enum: filename-pattern | manifest | envelope
 framing.pattern         ✓        default glob: *.json (directory = namespace boundary)
 Extension URI           ✓        https://github.com/safety-quotient-lab/interagent-epistemic/v1
                                  neutral namespace — jointly derived, joint ownership
 urgency                ✓        enum: immediate | high | normal | low
                                  Triage priority for unblocked messages. Absence = normal.
                                  Top-level field, sibling to setl. (2026-03-06, proposed by
                                  unratified-agent, adopted by psychology-agent)
────────────────────────────────────────────────────────────────────────
```

**Scope rule:** transport{} is per-message. Omission = persist-from-last convention.
Agents MAY omit transport{} when unchanged from prior turn.

**Urgency semantics (adopted 2026-03-06):**
- `immediate` — blocks active work; respond before next session
- `high` — process this session or next
- `normal` — process at next sync (default if field absent)
- `low` — no time pressure; process when convenient

Observatory-agent not yet notified of this addition. Propagate at next sync.

**Sub-agent layer derivation findings — complete (5 total):**
1. transport-method-not-in-schema → `transport.method`
2. ramfs-ephemeral-constraint → `transport.persistence` enum
3. file-vs-message-boundary → `framing.convention` + `framing.pattern`
4. excluded-vs-scored → `dimensions[].meets_threshold` (PSQ response gap)
5. calibration-status → `scores.calibration_applied` + `dimensions[].raw_score` (PSQ gap)

**Done:** Sub-agent layer (2a) spec document written — docs/subagent-layer-spec.md (2026-03-06). Peer layer (2b): docs/peer-layer-spec.md. PSQ scoring endpoint: safety-quotient/src/server.js (returns machine-response/v3).

### Open Questions

- F2 language: Python (py9p) or Go (go9p)?
- Psychology interface primary display target: TUI, web, or desktop?
- ~~interagent/v1 schema namespace owner~~ **RESOLVED:** `github.com/safety-quotient-lab/interagent-epistemic/v1` (neutral namespace, 2026-03-06)
- ~~A2A Epistemic Extension: both agents reading full A2A spec~~ **RESOLVED:** interagent/v1 is a formal A2A extension via URI (required: false). Extension URI finalized above. (2026-03-06)
- ~~Sub-agent layer transport fields: transport{}, persistence enum~~ **RESOLVED:** schema v3 finalized, all fields agreed. (2026-03-06)

### Convergence Signals — Observatory Exchange (2026-03-05)

Findings from capability handshake with observatory-agent that bear on architecture.
Each signal is assessed across both agents, the nature of the convergence or tension,
the current status, and the downstream architecture impact.

```
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 Signal             Psychology-agent                  Observatory-agent                 Convergence / Tension                Status          Architecture Impact
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
 SETL               Structural-Editorial Tension       Identical definition: divergence   Strong independent convergence.      ✓ Resolved      Peer layer: SETL is a valid
                    Level: abs(editorial − structural)  between what content says and       Both agents derived the same                        peer-layer metric. Include in
                    per message. Used in all            what the site does. Computed        formulation independently via                        interagent/v1 base spec as a
                    machine-to-machine comms.           per-story across 800+ stories.      similar epistemic discipline.                       first-class field.

 Fair Witness        Observable facts separated from    "Evidence transparency protocol     Same epistemic foundation.           ✓ Resolved      Both agents can share annotated
                    interpretive inferences. Used as    — observable facts separated        Observatory applies it at            (shared        claims[] without translation.
                    epistemic discipline in all         from interpretive inferences."      corpus scale; psychology-agent       primitive)      Reduces friction at sub-agent
                    claims[] and responses.             Applied in HRCB dual-channel        applies it per-message. Same                        + peer layer interpretation.
                                                        scoring methodology.                principle, different granularity.

 Cloudflare stack   Psychology interface targets         Deployed: CF Workers (SSR/API),     Full stack match. Observatory        ✓ Confirmed     Psychology interface (F2
                    Cloudflare for F2 transport         CF D1 (SQLite), CF KV (cache),      is a working reference for this     (use as ref)    transport): use observatory
                    and psychology interface.           CF R2 (assets), CF Queues           exact stack. Code patterns,                         architecture as reference
                    Language and exact services         (pipeline). Built in 8 days.        deployment config, and                              implementation. Reduces
                    TBD.                                Apache-2.0.                         Wrangler setup reusable.                            unknowns significantly.

 PSQ                PSQ-Full: 10-dimension DistilBERT   PSQ-Lite (proposed): 3-dimension    Proposed resolution: tiered          ⚑ Proposed     Namespace collision resolved
 (PSQ-Lite          v23. Validated on Dreaddit          experimental model maps onto         naming. Lite = composite rollup     (awaiting       by tier name. Integration
  proposed)         (Reddit stress corpus).             composite clusters of Full dims:     of Full dimensions, suitable        observatory-    path: observatory scores
                    Dimensions: DA, CO, EM, TR,         threat exposure → DA+AG;             for corpus-scale triage.            agent           PSQ-Lite at ingest;
                    RE, HO, AG, SC, AU, AC.             trust conditions → TR+SC;            Full = fine-grained clinical        confirmation)   psychology-agent scores
                    r=0.684. Validated.                 resilience baseline → RE+HO.         analysis. Unmapped in Lite:                         PSQ-Full on flagged items.
                                                        4 dims absent (CO, EM, AU, AC)       CO, EM, AU, AC — require                            Lite as triage layer;
                                                        — require finer clinical grain.      finer clinical granularity.                         Full as detailed pass.

 A2A protocol       interagent/v1 derived in this       agent.json uses Google A2A          Parallel derivation. A2A v0.3.0      ⚑ Open         interagent/v1 should not be
                    exchange as a base-layer spec        spec v0.3.0 (protocolVersion,       is an emerging standard for         (evaluate       finalized until A2A is read.
                    for capability handshake and         name, description, skills[],        agent capability cards. If A2A      alignment)      If A2A covers the use case,
                    message routing. Not yet read        inputModes, outputModes).           already handles handshake and                       interagent/v1 becomes an A2A
                    against an existing standard.        8 skills declared.                  routing, interagent/v1 should                       profile, not a parallel spec.
                                                                                            extend A2A rather than replace.                     Read A2A spec before v2.

 agent-inbox         No equivalent. Inter-agent          /.well-known/agent-inbox.json:      Observatory has a working           ⚑ Open         Candidate for psychology-agent
 pattern            proposals handled in                 static JSON file listing            implementation. Proposals           (adoption       to adopt. Async inter-agent
                    conversation or transport/           pending, accepted, and              follow a lifecycle schema:           candidate)      coordination without a live
                    sessions/ messages only.             implemented proposals.              pending → accepted →                                session. Complements transport/
                    No machine-readable proposal         Auto-generated from                  implemented. Operated                               sessions/ structure already
                    lifecycle.                          .claude/plans/memorized/.            between observatory and             in place.
                                                                                            unratified.org successfully.

 License delta      Apache 2.0 (code),                  Apache-2.0 (code),                  Both Apache 2.0. Fully               ✓ Resolved     License tension eliminated
                    CC BY-SA 4.0 (PSQ data/             CC BY-SA 4.0 (content/data).        compatible. Code can be shared       (Session 32c)  by relicensing psychology-agent
                    weights). Relicensed from           Permissive code license;             freely between agents. PSQ data                     from CC BY-NC-SA 4.0 to
                    CC BY-NC-SA 4.0 in Session          ShareAlike on data.                  licensed CC BY-SA — carries into                    Apache 2.0. Patent grant
                    32c (2026-03-07).                                                        derivatives that include scores.                    protects contributors.

 Cognitive           MEMORY.md orientation index         MEMORY.md + topic files:            Similar cogarch pattern. Both        ✓ Noted        No action required. Confirms
 architecture       + docs/ topic files. T1–T13          ops, patterns, calibration,         agents built under comparable        (informational) that cogarch conventions
 (cogarch)          trigger system. Skills in            pipeline. Skills in                  epistemic discipline by Claude                     generalize across agents in
                    .claude/skills/. Memory              .claude/skills/. Plans in            Code under human direction.                        this lab. interagent/v1
                    hygiene rules enforced.             .claude/plans/memorized/.            Differences likely in domain-                      handshake benefits from this.
                                                                                            specific triggers, not structure.
─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
```

**Status key:** ✓ Resolved = no action needed | ⚑ Open/Proposed = requires decision, coordination, or confirmation | ✗ Tension = acknowledged conflict, no resolution path yet
