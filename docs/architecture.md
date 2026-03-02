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


## Skills

```
────────────────────────────────────────────────────────────────────────
 Skill      When              What it does
────────────────────────────────────────────────────────────────────────
 /doc       Mid-work          Persist decisions, findings, reasoning
                               to the correct file on disk

 /cycle     Post-work         Full documentation chain update,
                               commit, clean up

 /hunt      Discovery         Find highest-value next work
────────────────────────────────────────────────────────────────────────
```

*Note:* `/cycle` and `/hunt` currently exist only in the safety-quotient
sub-project. Versions for the general agent may be needed as the project grows.
