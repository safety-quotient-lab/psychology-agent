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
 SQLite state layer           Phase 1: markdown SOT, DB = queryable index.
                              Schema v2 (9 tables). Polythematic facets (3
                              facet types). Deterministic keys. Dual-write.
                              Hybrid topic model: generic + psq_status typed.
                              2026-03-09
 Sub-agent cogarch mirror     All agents mirror psychology-agent cogarch
                              exactly: triggers, state layer, memory, FA
                              format, epistemic standards. Shared facet
                              vocabulary enables cross-agent queries.
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
