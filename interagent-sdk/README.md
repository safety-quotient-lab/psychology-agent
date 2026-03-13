# interagent-sdk

Shared mesh infrastructure for the safety-quotient agent mesh.

Owned by `operations-agent`. Domain agents consume these scripts and
schemas instead of maintaining independent copies.

## Usage

Set `INTERAGENT_SDK_PATH` in your `.dev.vars`:

```bash
INTERAGENT_SDK_PATH=/path/to/interagent-sdk
```

Or symlink `interagent-sdk/` into your agent repo root.

Scripts source `agents.conf.sh` from the SDK for shared configuration.

## Structure

```
interagent-sdk/
├── scripts/          # Mesh operations scripts
├── schemas/          # Vocabulary and agent-card schemas
├── templates/        # Cogarch, CLAUDE.md, agent-card templates
└── reference/        # Budget calibration, cognitive triggers, rules
```

## Scripts

| Script | Purpose |
|--------|---------|
| agents.conf.sh | Shared agent path configuration |
| mesh-status.sh | Quick mesh health overview |
| mesh-pause.sh | Circuit breaker toggle |
| shadow-mode.sh | Shadow mode toggle |
| budget-check.sh | Autonomy budget display |
| queue-check.sh | Pending transport messages |
| canary.sh | BFT observability (direct vs compositor) |
| archive-sessions.sh | Complement Cascade session archiver |
| claude-instrumented.sh | Claude wrapper with cost tracking |
| context-rotate.sh | Graceful context rotation |

## Schemas

| Schema | Purpose |
|--------|---------|
| vocab.json | Shared mesh vocabulary (JSON-LD) |
| vocab.schema.json | Vocabulary validation schema |

## Version

Follows the mesh vocabulary version: currently v1.3.0.
