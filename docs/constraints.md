# Psychology Agent — Constraint Taxonomy

Formal registry of constraints governing this agent system. Each constraint
has an ID, a category, a one-line statement, and a provenance pointer to
the canonical source where the constraint lives and receives enforcement.

**Purpose:** Consolidate constraints scattered across cognitive triggers,
architecture specs, protocol docs, and platform conventions into a single
reference. This document indexes constraints — it does not replace the
canonical sources where each constraint receives its mechanical enforcement.

**Categories:**

| Code | Category | Scope |
|------|----------|-------|
| E | Ethical | IRB, participant protection, WEIRD, clinical boundaries, authority limits, licensing |
| M | Methodological | Validation, calibration, replication, evidence standards |
| P | Platform | Claude Code, auto-memory, context limits, cogarch infrastructure, naming, write discipline |
| I | Interagent | Protocol versioning, transport assumptions, peer/sub-agent rules |
| D | Dependencies | Opus model, DistilBERT/ONNX, CF Workers, hosting, SDK |

**Version:** 1.0
**Created:** 2026-03-06
**Source:** F-1 finding from claude-control cross-project review

---

## E — Ethical

| ID | Constraint | Provenance |
|----|-----------|------------|
| E-1 | Clinical diagnosis forbidden — PSQ scores text, not individuals; agent does not claim clinical authority | architecture.md §Refusals; T15 Check 1 |
| E-2 | WEIRD assumption flag mandatory — PSQ trained on Dreaddit (Reddit, English, Western); non-Dreaddit text must disclose distribution mismatch | T15 Check 6; machine-response-v3-spec.md §Limitations |
| E-3 | IRB/ethics implications visible to interpretant community — T4 Check 9 fires when content touches clinical or human-subjects research | cognitive-triggers.md T4 #9 |
| E-4 | Verdict delivery forbidden — decisions belong to the user; agent frames, challenges, stops short of deciding | architecture.md §Refusals |
| E-5 | Persona adoption forbidden — agent will not suspend epistemic discipline or Socratic stance | architecture.md §Refusals |
| E-6 | Fabricated confidence forbidden — will not assert certainty beyond evidence; low-evidence claims flagged | architecture.md §Refusals |
| E-7 | Conflicting sub-agent outputs preserved in shape, not averaged — disagreement carries information | architecture.md §Refusals; peer-layer-spec.md §MUST NOT |
| E-8 | Shared systematic error must be declared in consensus — shared training data or methodology disclosed | architecture.md §Consensus procedure |
| E-9 | Apache 2.0 on code; CC BY-SA 4.0 on PSQ data/weights (Dreaddit ShareAlike constraint) | README.md; LICENSE; NOTICE; safety-quotient/LICENSE-DATA |
| E-10 | Public repository — all tracked files treated as public; no credentials, private paths, sensitive data | T4 Check 2 |

---

## M — Methodological

| ID | Constraint | Provenance |
|----|-----------|------------|
| M-1 | Scale discipline — dimension scores 0-10; psq_composite 0-100; hierarchy factors 0-10; never mix scales | T15 Check 3 |
| M-2 | Anti-calibration known — raw confidence values all < 0.6; use meets_threshold (r-based proxy, r >= 0.6) instead | T15 Check 2; machine-response-v3-spec.md §Confidence |
| M-3 | Composite citation gate — cite psq_composite only when status="scored"; excluded/fallback values are placeholders | T15 Check 1 |
| M-4 | PSQ-Lite coverage gap disclosed — 3 dimensions only; 7-dim gap may carry dominant clinical signal | T15 Check 5 |
| M-5 | PSQ-Lite mapping confidence capped at 0.70 — semantic inference, not validated decomposition | T15 Check 4 |
| M-6 | Calibration version pinned — must state whether output is raw or calibrated; format: {method}-v{n}-{date} | subagent-layer-spec.md §Gap #5; machine-response-v3-spec.md |
| M-7 | Dimension exclusion semantics — meets_threshold=false means "scored but excluded," distinct from "not run" | subagent-layer-spec.md §Gap #1 |
| M-8 | Validation basis declared — held-out n=1897 (isotonic calibration); model r=0.684 (Dreaddit, n=2760) | subagent-layer-spec.md §Gap #5; scope_declaration |
| M-9 | Evidence-bearing responses mandatory — claims linked to evidence in all substantive outputs | T2 Check 7 |
| M-10 | Speculation never persisted as fact in memory — only confirmed decisions land in MEMORY files | T9 Check 4 |
| M-11 | Shared-operator confound — the same human operates all agents in the mesh; no inter-agent derivation path qualifies as "independent" without external verification. The human participates as an agent within the system, not an observer of it. Claims of convergent architecture across agents require either: (a) external replication by a different operator, (b) tracing the pattern to mainstream engineering precedent outside this project (confound-free edge), or (c) formal demonstration from the coordination problem's constraint structure. Self-report about implicit cognition carries low reliability — the operator cannot reliably distinguish "I chose this for engineering reasons" from "my biological intuitions shaped my engineering judgment." | Session 91; theoretical-directions.md §15 |

---

## P — Platform

| ID | Constraint | Provenance |
|----|-----------|------------|
| P-1 | Auto-memory 200-line hard limit — system silently truncates line 201+; target < 60 lines (index pattern) | T9 Check 1; MEMORY.md §Hygiene |
| P-2 | Memory stale decay — 5 sessions without update: flag for review; 10 sessions: default removal unless waived | T9 Check 2 |
| P-3 | Gap check mandatory before phase boundary — no bare forks, no loose threads, no silent epistemic debt | T5 Check 1 |
| P-4 | Epistemic flag sweep before phase close — unresolved flags resolved or explicitly deferred with rationale | T5 Check 6 |
| P-5 | Bootstrap restoration on missing auto-memory — T1 fires bootstrap-check.sh; do not proceed if restoration fails | T1 Check 1; BOOTSTRAP.md |
| P-6 | Context pressure checkpoint at 60% — invoke /doc; at 75% actively compress or compact | T2 Check 1 |
| P-7 | Reversibility assessment before Write/Edit — classify as additive/substitutive/subtractive; confirm before subtractive on shared state | T4 Check 10 |
| P-8 | Semantic naming mandatory — all user-facing identifiers fully descriptive; no abbreviations or opaque numbers | T4 Check 6; CLAUDE.md §Code Style |
| P-9 | Date discipline — system clock only; no approximate timestamps; date -Idate for dates, full timestamp for lessons/lab entries | T4 Check 1 |
| P-10 | Lab-notebook chronological order enforced — new entry timestamp must be later than last existing entry | T4 Check 7 |
| P-11 | Pre-commit cogarch gate — bootstrap-check.sh --check-only blocks commits when cognitive-triggers.md below 100 lines | bootstrap-check.sh |
| P-12 | Sub-project boundary warning — fires on Write/Edit/Read crossing into safety-quotient/ or pje-framework/ | subproject-boundary.sh hook |
| P-13 | Pushback accumulator — 3+ same-session pushbacks surfaces structural disagreement pattern | pushback-accumulator.sh hook; T6 Check 5 |
| P-14 | Trigger firing condition specificity required — principles without mechanical triggers remain aspirations | cognitive-triggers.md intro |
| P-15 | Knock-on structural checkpoint mandatory at all scales — orders 7-10 scanned even for XS/S decisions | T14; MEMORY.md §Knock-on depth |
| P-16 | Interpretant identification before writing — all relevant audiences identified; conflicts route to separate artifacts | T4 Check 9 |
| P-17 | Reversibility classification before external actions — reversible/hard-to-reverse/irreversible; hard-to-reverse requires confirmation, irreversible requires explicit approval | T16 Check 3 |
| P-18 | Data integrity read-diff-write-verify for transport and external writes — prevents duplicates, naming collisions, MANIFEST drift | T16 Check 5; transport.md §Data Integrity |
| P-19 | Pushback accumulator bridges to lesson pipeline — 3+ pushbacks generates T10 lesson candidate with pattern_type: structural-disagreement | pushback-accumulator.sh hook; T10 |
| P-20 | Anti-patterns registry in CLAUDE.md — known-failing approaches loaded every session, no graduation ceremony required | CLAUDE.md §Anti-Patterns |
| P-21 | Hook health audit in T11 — verify each hook script exists and has execute permission | T11 Check 5 |
| P-22 | Lesson promotion velocity gate — recurrence >= 2 AND span <= 10 calendar days required for promotion | T10 Check 6 |
| P-23 | Diff verification in /scan-peer — skip empty diffs, whitespace-only changes, verify file existence before reporting | /scan-peer Phase 1b |

---

## I — Interagent

| ID | Constraint | Provenance |
|----|-----------|------------|
| I-1 | Schema v3 transport scope is per-message — omission means persist-from-last | subagent-layer-spec.md §Transport scope |
| I-2 | Transport method declared — enum: git-pr, git-push, ssh-pipe+ramfs+9pfuse, http+json, filesystem, human-relay | subagent-layer-spec.md §Transport fields |
| I-3 | Persistence field required — values: ephemeral, session, persistent | subagent-layer-spec.md §Transport fields |
| I-4 | Framing convention required for raw-byte transport — convention enum: filename-pattern, manifest, envelope | subagent-layer-spec.md §Framing fields |
| I-5 | Capability handshake before schema upgrade — initiator sends message_type: capability-handshake | subagent-layer-spec.md §Capability Handshake |
| I-6 | Domain SETL thresholds — Lite: >0.30; Standard: >0.40; Full: >0.60 (empirical, needs refinement) | subagent-layer-spec.md §Open Contracts; peer-layer-spec.md |
| I-7 | Cumulative peer SETL > 0.40 across 3+ turns triggers Standard tier evaluation | peer-layer-spec.md §SETL as divergence |
| I-8 | Precedence by recency applies to state facts only, not reasoning or analysis | peer-layer-spec.md §Precedence Protocol |
| I-9 | Convergence threshold — 1 signal: note; 2 same turn: apply procedure 6; 3+: joint finding | peer-layer-spec.md §Convergence Signals |
| I-10 | Peers must not average conflicts, silently defer, or resolve substitutive divergences unilaterally | peer-layer-spec.md §MUST NOT |
| I-11 | Receiver must not act on unverifiable state claims after divergence — may act on directly readable content | peer-layer-spec.md §Context Sync |
| I-12 | Claims[] per-claim confidence tracking required — claim_id, text, confidence, confidence_basis, independently_verified | subagent-layer-spec.md §A2A Extension |
| I-13 | Action gate blocking sentinel — gate_condition, gate_status, gate_note; machine-readable | subagent-layer-spec.md §A2A Extension |
| I-14 | Scope declaration required in all sub-agent responses — in_scope, out_of_scope, validation_basis | machine-response-v3-spec.md §scope_declaration |
| I-15 | v2 to v3 migration adds fields only — no fields removed or renamed; backward compatible | machine-response-v3-spec.md §Migration |

---

## D — Dependencies

| ID | Constraint | Provenance |
|----|-----------|------------|
| D-1 | Opus required for psychology agent, evaluator, and future sub-agents | CLAUDE.md §Model Policy; architecture.md |
| D-2 | PSQ v23 model = DistilBERT base-uncased — inference via ONNX; best.pt needed only for recalibration | capabilities.yaml; README.md |
| D-3 | Calibration data (calibration.json) tracked via .gitignore exception — must be manually deployed to remote | subagent-layer-spec.md §Status |
| D-4 | CF Workers D1 database for psychology-interface — ENAM region (56a2f5ac); SESSION_KV (1d17a21c) | architecture.md §Production |
| D-5 | PSQ production on Hetzner CX (Ashburn) — Caddy reverse proxy, auto-TLS, port 3000 closed | architecture.md §PSQ hosting |
| D-6 | Dreaddit CC BY-SA 4.0 flows through — PSQ data/weights cannot carry NC restriction | LICENSE-DATA |
| D-7 | CF Workers settingSources no-op — no local filesystem; PSYCHOLOGY_SYSTEM inlined as constant | architecture.md §Agent SDK |
| D-8 | Sub-agent staging: Stage 1 (separate sessions) active; Stage 2 (programmatic API) ready; Stage 3 (MCP) deferred | architecture.md §Sub-agent implementation |

---

## Usage

**Cross-reference from T3:** When recommending, scan relevant constraint IDs
for the domain. E-category constraints apply to all clinical/psychological
content. M-category constraints apply when PSQ output enters context.

**Adding constraints:** Assign the next ID in the relevant category. Add the
constraint here AND enforce it in the canonical source (trigger check, hook,
protocol spec). A constraint without enforcement is an aspiration.

**Retiring constraints:** Do not delete — mark as `[RETIRED: reason, date]`.
Retired constraints preserve the reasoning for why they once existed.

**Constraint count:** E:10, M:10, P:23, I:15, D:8 — 66 total

## Structural Invariant Mapping (Session 85)

Each constraint reduces to a specific instance of one or more of the five
structural invariants (ef1-governance.md). Constraints that map cleanly
to an invariant receive enforcement through the invariant's governance
machinery. Constraints without invariant mapping represent domain-specific
rules that supplement the invariants.

| Invariant | Constraints that reduce to it | Count |
|-----------|------------------------------|-------|
| **1. Worth precedes merit** | E-1 (no clinical authority), E-4 (no verdict delivery), E-5 (no persona adoption), E-7 (preserve disagreement shape) | 4 |
| **2. Protection requires structure** | P-5 (bootstrap restoration), P-6 (context pressure), P-11 (pre-commit gate), P-14 (triggers need firing conditions), P-17 (reversibility before external), P-18 (data integrity), P-21 (hook health) | 7 |
| **3. Two coupled generators** | P-3 (gap check before boundary — yin), P-4 (epistemic sweep — yin), P-22 (lesson promotion — crystallization) | 3 |
| **4. Governance captures itself** | M-9 (evidence-bearing), M-10 (no speculation as fact), M-11 (shared-operator confound), E-6 (no fabricated confidence), E-8 (systematic error declared), P-13 (pushback accumulator) | 6 |
| **5. No single architecture dominates** | I-10 (no averaging conflicts), I-11 (no unverifiable state), E-2 (WEIRD flag) | 3 |
| **Domain-specific (no invariant reduction)** | M-1 through M-8, I-1 through I-9, I-12 through I-15, D-1 through D-8, P-1, P-2, P-7 through P-10, P-12, P-15, P-16, P-19, P-20, P-23, E-3, E-9, E-10 | 44 |

**Result:** 23 of 67 constraints (34%) reduce to structural invariant instances.
The remaining 44 represent domain-specific rules (PSQ methodology, transport
protocol, platform mechanics) that supplement the invariants with operational
detail. No constraints conflict with the invariants.

**Recommendation:** The 23 invariant-mapped constraints function as enforcement
instances. T3 Check 15 can prioritize these 23 when scanning — they represent
the governance-critical subset. The remaining 44 provide operational guardrails
that the 4-level resolution fallback handles when questions arise.

---

## Relation to Other Documents

| Document | Role |
|----------|------|
| docs/cognitive-triggers.md | Mechanical enforcement for P-category and some E/M constraints |
| docs/architecture.md | Design-level source for E, I, and D constraints |
| docs/subagent-layer-spec.md | Protocol-level source for I constraints |
| docs/peer-layer-spec.md | Peer protocol source for I constraints |
| docs/machine-response-v3-spec.md | Schema-level source for M and I constraints |
| bootstrap-check.sh | Mechanical enforcement for P-5 and P-11 |
| .claude/hooks/ | Platform enforcement for P-7, P-12, P-13 |
