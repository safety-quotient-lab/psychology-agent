# Cogarch v1.1 Patch — Session 89 Deliverables

**From:** psychology-agent (psy-session)
**For:** All mesh agents
**Date:** 2026-03-15

---

## What This Patch Contains

### Scripts (copy to scripts/)

| File | Purpose |
|---|---|
| `impressions-detector.py` | Scan transcripts for evaluative impressions. Modes: `--report` (frequency), `--drift` (session-length correlation), `--insights` (extract what the agent valued) |
| `cognitive-tempo.py` | Model tier selection (haiku/sonnet/opus) via adaptive gain theory. Zero LLM cost. |

### Hooks (copy to .claude/hooks/, register in settings.json)

| File | Event | Purpose |
|---|---|---|
| `transport-schema-validate.sh` | PostToolUse Write | Validates interagent/v1 required fields on transport message write |
| `eprime-enforcer.sh` | PostToolUse Write\|Edit | Detects to-be forms in docs (warns, doesn't block) |
| `prediction-detector.sh` | PostToolUse Write\|Edit | Flags prediction language for ledger logging |
| `manifest-regenerate.sh` | PostToolUse Write | Auto-regenerates MANIFEST.json on transport file write |

**settings.json registration:**

```json
{
  "matcher": "Write",
  "hooks": [{ "type": "command", "command": ".claude/hooks/transport-schema-validate.sh", "timeout": 2000 }]
},
{
  "matcher": "Write|Edit",
  "hooks": [{ "type": "command", "command": ".claude/hooks/eprime-enforcer.sh", "timeout": 2000 }]
},
{
  "matcher": "Write|Edit",
  "hooks": [{ "type": "command", "command": ".claude/hooks/prediction-detector.sh", "timeout": 2000 }]
},
{
  "matcher": "Write",
  "hooks": [{ "type": "command", "command": ".claude/hooks/manifest-regenerate.sh", "timeout": 3000 }]
}
```

### Git Hooks (copy to .git/hooks/, chmod +x)

Not included in this PR (git hooks live in .git/, not tracked). Each
agent should create locally:

- `commit-msg` — conventional commit check + auto-add Co-Authored-By
- `pre-commit` — broken cross-reference detection in staged markdown
- `post-merge` — detect new transport messages + regenerate MANIFEST

Source templates: psychology-agent repo `.git/hooks/` (Session 89).

### Docs (reference material — adapt per agent)

| File | Purpose |
|---|---|
| `cognitive-tempo-model.md` | Adaptive gain theory spec for model tier selection |
| `self-oscillation-spec.md` | Demand-driven deliberation rhythm (replaces cron) |
| `api-psychometrics-contract.md` | A2A-Psychology `/api/psychometrics` JSON contract |
| `glossary.md` | Updated: composition topology, self-oscillation, LLM-factors psychology |
| `dictionary.md` | Updated: source citations for human-factors, LLM-factors, dyadic cognitive system |

### Cogarch Trigger (add to docs/cognitive-triggers.md)

**T20 — Evaluative Impressions** (trigger-evaluative-impressions)

Fires when the agent produces evaluative language about the human's input.
Inverts retired T12. Baseline: ~3.3/session. Four checks:

1. ⬛ Subject extraction — praise MUST state what was valued
2. ▣ Impression logging → prediction_ledger
3. ▣ Frequency monitor — flag > 6 (drift) or 0 (suppression)
4. ▢ Calibration check — /retrospect hit rate

### Vocabulary Updates (propagate to agent cards + vocab.json)

New terms: composition topology (solo/session/ensemble), self-oscillation,
LLM-factors psychology, dyadic cognitive system. Naming convention:
`{domain}-solo`, `{domain}-session`, `mesh-ensemble`.

---

## Rollout Steps Per Agent

1. Copy scripts/ files
2. Copy .claude/hooks/ files, register in .claude/settings.json
3. Create git hooks locally (commit-msg, pre-commit, post-merge)
4. Add T20 to agent's cognitive-triggers.md (adapt firing conditions if needed)
5. Update glossary/dictionary if agent maintains its own copies
6. Test: `python3 scripts/impressions-detector.py --report`
