# General-Purpose Psychology Agent — Architecture

**Created:** 2026-03-01
**Status:** Design phase — decisions resolved, implementation not started


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
│              GENERAL-PURPOSE PSYCHOLOGY AGENT                       │
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
                              general agent, evaluator, and future
                              sub-agents

 License (code)              CC BY-NC-SA 4.0 — root LICENSE and
                              safety-quotient/LICENSE. NonCommercial
                              retained; no source dataset constraint
                              applies to the code layer.

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

 General agent                Advisory           Socratic partner —
 (collegial mentor)                              analyzes, challenges,
                                                  synthesizes, but does
                                                  not decide

 Sub-agents                   Domain expert      Authoritative within
 (PSQ, future)                                   validated scope, but
                                                  content is subject to
                                                  scrutiny

 Adversarial evaluator        Quality control    Can challenge any
                                                  sub-agent or the
                                                  general agent itself
────────────────────────────────────────────────────────────────────────
```

**Key principle:** PJE is a hypothesis space, not a specification. The general
agent helps the user sort signal from aspiration — the same way the PSQ
(Psychoemotional Safety Quotient) reduced 71 PJE terms to 10 validated
dimensions.


## Remaining Architecture Items

1. **General agent design** — prompt, routing logic, Socratic protocol, skill set
2. **Sub-agent protocol** — how sub-agents plug in, communicate, declare scope
3. **Adversarial evaluator** — tiered activation logic, parsimony reasoning


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
                                            8-order cascade, parsimony

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
 Knock-on analysis      8-order cascade             All decisions
                         (certain → horizon)
 /adjudicate skill      Domain classify → ground     XS: 3-order + scan
                         → cascade per option →      S: 4-order + scan
                         consensus or parsimony      M: 6-order + 2-pass
                                                     L: 8-order + 2-pass
 Structural checkpoint  Orders 7-8 scan              Every decision point
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
