# Design Decisions + Authority Hierarchy

```
 Decision                    Choice
──────────────────────────────────────────────────
 Use cases                   All (text analysis, research, applied consultation)
 Sub-agent implementation    Staged hybrid. Stage 1: separate Claude Code
                              sessions, human mediates, define comm standard.
                              Stage 2: programmatic calls (PSQ API-ready).
                              Stage 3: MCP wrappers if needed (not pre-committed).
 Audience                    Self, clinicians, researchers, public, other agents
 PJE role                    Case study — first real-world application, not a sub-agent
 Evaluator trigger           Tiered (lightweight default, escalate on disagreement)
 Agent-to-agent protocol     Natural language
 Future sub-agents           Extensible plug-in architecture, none pre-committed
 Disagreement stance         Socratic (guide user to discover, never tell)
 Socratic adaptation         Dynamic calibration — no fixed audience
                              categories; reads ongoing signals in real time
 Machine-to-machine          Socratic stance drops; detection is structural
                              (format + self-id + absence of social hedging)
 License (code)              CC BY-NC-SA 4.0 (root + PSQ code)
 License (PSQ data/weights)  CC BY-SA 4.0 (Dreaddit ShareAlike constraint)
 Cogarch organizing          Semiotics (Peircean). Each trigger classifies a
 principle                   sign type + warrants a specific action. T4 Check 9
                              (Interpretant) = first explicit audience-aware
                              write discipline. Eco's test: every label must
                              produce distinct behavior. 2026-03-05
 BFT model                   2-peer + human TTP. 6 principles from Lamport
                              adapted for git-PR transport. 2026-03-06
 Command protocol             command-request/v1 extension to interagent/v1.
                              Idempotent, state-attested, human-authorized.
 Production hosting           Hetzner CX Ashburn VA ($5/mo, 4GB, Debian 13).
                              Oracle A1 free tier unavailable. 2026-03-06
 Semantic naming scope        All user-facing identifiers: files, dirs, sessions,
                              specs, variables, table headers. No opaque item
                              numbers. Exception: internal codes not displayed
                              to callers (T-numbers, enums). 2026-03-06
 Agent identity naming        "psychology-agent" (not "general-agent"). Role
                              identifier, prose, and protocol messages all use
                              psychology-agent. 2026-03-06
 Scorer consistency           Single-scorer constraint: all training labels from
                              same LLM. Concordance (n≥50, ICC ≥ 0.70 on ≥7/10)
                              required before mixing. Sonnet = validated baseline.
                              Evidence: concordance gate FAIL. 2026-03-08
 Calibration success          MAE improvement without regression (per dim).
                              Original 0.5 max-plateau structurally unachievable
                              (model range compression). 2026-03-08
 Calibration deploy timing    Deploy calibration only after model stabilizes.
                              No artifacts fitted on soon-to-be-replaced models.
                              2026-03-08
 SQLite state layer           Phase 1/1.5: markdown SOT for prose docs,
                              DB SOT for structured non-prose state.
                              Schema v9. 12 tables. SL-2 dual-write
                              live. Polythematic facets. Deterministic
                              keys. 4-tier visibility. min_action_interval.
                              2026-03-09
 MANIFEST generated artifact  MANIFEST.json auto-generated from state.db.
                              Pending only (793→21 lines). Completed
                              history in DB + git history. Phase 1.5:
                              DB = SOT for structured non-prose state.
                              2026-03-09
 Cloud-free bounded context   Psychology-agent: zero cloud runtime dep.
                              CF Worker = separate bounded context.
                              Each agent context inherits but MAY
                              override (DDD). 2026-03-09
 SL-2 dual-write             /sync + /cycle write to state.db alongside
                              markdown in real time. Markdown first, then DB.
                              dual_write.py: 7 subcommands (incl. lesson).
                              2026-03-09
 Optional ACK protocol        ack_required flag (default false). state.db
                              processed column replaces mandatory ACKs.
                              Schema v5: ack_required + ack_received cols.
                              2026-03-09
 Sub-agent cogarch mirror     All agents mirror psychology-agent cogarch
                              exactly: triggers, state layer, memory, FA
                              format, epistemic standards. Shared facet
                              vocabulary enables cross-agent queries.
                              2026-03-09
 Autonomous trust model       EF-1: evaluator-as-arbiter. Replaces human-
 (EF-1)                       as-TTP for autonomous operation. 10-order
                              knock-on + 4-level resolution (consensus →
                              parsimony → pragmatism → ask). Trust budget
                              20 credits/audit. Multi-agent tandem sync
                              via cron + Claude CLI. Derives from BFT +
                              evaluator instantiation. 2026-03-09
 Core governance trust model   7 invariants governing P/J/E lenses.
                              No action without evaluation; bounded
                              autonomy; human escalation; consequence
                              tracing; reversibility-scaled rigor;
                              transparent audit; falsifiability.
                              Derives from EF-1. 2026-03-09
 Requirement-level keywords    BCP 14 (RFC 2119 + RFC 8174). UPPER CASE
 (BCP 14)                     MUST/SHOULD/MAY across all cogarch +
                              trust model docs. 2026-03-09
 System classification          Embedded cognitive system. Cogarch
                              operates as firmware inside Claude Code
                              host. Not metaphorical — architectural.
                              2026-03-09
 Systems thinking              Umbrella methodology (von Bertalanffy,
 (methodology)                 Meadows). 3 sub-principles: DDD
                              (structural), literate programming
                              (expression), embedded system
                              (deployment). Key properties: feedback
                              loops, boundaries, emergence, leverage
                              points (Meadows 1999), stocks/flows,
                              degrees of freedom (DOF gradient across
                              DDD layers: domain=high, application=
                              medium, infrastructure=low). 2026-03-09
 Literate programming          A+C (Knuth 1984, adapted). (A) Docs-as-
 (expression principle)        code: every governing artifact reads as
                              prose. (C) Narrative-driven: no element
                              without origin story, Derives-from chains
                              mandatory, journal = first-class artifact.
                              B (Knuth-strict tangle/weave) deferred.
                              2026-03-09
 Domain-Driven Design          DDD (Evans, 2003) as structural principle
 (structural principle)        under systems thinking. 3 layers with
                              DOF gradient: infrastructure (low DOF —
                              triggers, hooks, memory — leverage points),
                              application (medium DOF — skills, evaluator,
                              trust model), domain (high DOF — PSQ, DI,
                              PJE, topology — cogarch.config.json). Each
                              agent = bounded context. interagent/v1 =
                              context map. De-branding: B+C. 2026-03-09
 Bootstrap adaptive            Infrastructure tools adapt to deployment
 thresholds                    context. Empty transport/sessions/ →
                              structural-only minimums (triggers ≥ 1,
                              decisions ≥ 1, data-dependent ≥ 0).
                              Precedent: infrastructure never assumes
                              a specific data profile. Derives from DDD
                              (DOF gradient). 2026-03-09
 Lessons-to-DB                 Frontmatter → queryable columns; prose
                              stays in markdown. Promotion scan via SQL
                              GROUP BY. bootstrap_lessons.py seeds,
                              dual_write lesson upserts. 2026-03-09
 4-tier state visibility       public/shared/commercial/private.
                              Private-by-default. table_visibility
                              table (v8). Export profiles: seed/release/
                              licensed/full. Observe before promoting.
                              2026-03-09
 Cross-repo transport          Git remote fetch between agents in
 (safety-quotient agent)      separate repos. Each agent adds the
                              other as git remote, reads MANIFEST via
                              `git show {remote}/main:transport/
                              MANIFEST.json`. Split outbox (mail/
                              agent-id/). Pre-commit hook for
                              autonomous secret scanning. Self-healing
                              cron (ensure-cron.sh). Trust model
                              min_action_interval (300s) decouples
                              temporal spacing from trigger mechanism.
                              2026-03-09
```

## Authority Hierarchy

1. **User** = source-of-truth agent. Final authority on what gets pursued, published, or discarded.
2. **Psychology agent** = advisory, Socratic. Analyzes, challenges, synthesizes — does not decide.
3. **Sub-agents** (PSQ, future) = domain experts. Their content is subject to scrutiny.
4. **Adversarial evaluator** = quality control. Can challenge any sub-agent.

**Key principle:** PJE is a hypothesis space, not a specification. The psychology agent helps
the user sort signal from aspiration — the same way PSQ reduced 71 PJE terms to 10
validated dimensions. PJE is a case study in applying this agent, not a privileged component.
