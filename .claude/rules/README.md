# Rules Filesystem — Cogarch Convention

Rules organize by cognitive function, following the agent's own
architecture rather than external taxonomies.

## Structure

```
.claude/rules/
├── anti-patterns.md          # Universal — always mounted
├── README.md                 # This file
├── domain/                   # Domain-specific (activate by file glob)
│   ├── evaluation.md         # Psychometric methodology
│   ├── javascript.md         # Code conventions
│   ├── lcars.md              # LCARS visual pattern catalog gate
│   ├── markdown.md           # Documentation formatting
│   ├── sqlite.md             # State layer conventions
│   └── transport.md          # Interagent protocol
├── layer/                    # Cognitive layer (activate by agent state)
│   ├── fluid.md              # Gf — novel/deliberative work
│   ├── crystallized.md       # Gc — routine/pattern-matched work
│   └── metacognitive.md      # Gm — reflective/self-monitoring work
└── mode/                     # Behavioral mode (activate by task context)
    ├── generative.md         # Brainstorming, exploring, diverging
    ├── evaluative.md         # Checking, validating, converging
    └── neutral.md            # Building, implementing, fixing
```

## Three Activation Channels

| Directory | Activation | Mechanism |
|---|---|---|
| Root (`anti-patterns.md`) | Every session | Claude Code loads unconditionally |
| `domain/` | File glob match | Claude Code native — `paths` frontmatter |
| `layer/` | Cognitive state | T2 trigger check — agent reads matching rule when determining Gf/Gc/Gm routing |
| `mode/` | Task context | T2 trigger check — agent reads matching rule when detecting generative/evaluative/neutral mode |

Domain rules fire mechanically (file paths). Layer and mode rules
mount deliberately (agent reads them based on its own state assessment).
This maps to the Plan 9 namespace model: three orthogonal namespaces
composed by union at task time.

## Graduation Criteria

A convention becomes a rule when:
1. It attaches to a specific scope (file glob, layer, or mode)
2. AND either: validated across 2+ sessions, OR breaking it produces
   visible defect

Universal conventions stay in CLAUDE.md. Domain-specific conventions
with file affinity crystallize into `domain/` rules. Layer and mode
conventions crystallize when the cognitive pattern stabilizes.

## Self-Modification Constraint

`claude -p` (autonomous deliberation) CAN write to `.claude/rules/`
but MUST NOT install rules without human confirmation. Rule changes
represent governance amendments — EF-1 invariant (governance-captures-
itself) requires human approval. The autonomous agent may *propose*
a rule (draft + surface for review) but not *install* one.

## Staleness

Rules represent structural knowledge — no decay tracking. Manual
review during architecture audits (/retrospect, /diagnose) suffices.
If a rule's scope stops matching any work the agent performs, flag
for review — do not auto-retire.

## Relationship to PSH

PSH classifies *entities* (transport messages, decisions, memory
entries) for retrieval and faceted search. Rules organize by
*cognitive function* (layer, mode, domain) for behavioral governance.
Different concerns, complementary systems. PSH categories may appear
in rule descriptions for cross-reference but do not drive rule
activation.
