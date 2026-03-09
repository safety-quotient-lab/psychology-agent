# Cognitive Architecture — Adaptation Guide

How to adopt the embedded cognitive system for your own agent project.

**System classification:** embedded cognitive system
**Methodology:** systems thinking (von Bertalanffy, 1968; Meadows, 2008)
**Structural principle:** Domain-Driven Design (Evans, 2003)
**Expression principle:** literate programming (Knuth, 1984, adapted: A+C)


## What You Get

The cogarch separates into three layers with a degrees-of-freedom (DOF)
gradient. Each layer carries a different adoption cost:

| Layer | DOF | What it contains | Adopter action |
|-------|-----|------------------|----------------|
| **Infrastructure** | Low | Triggers (T1-T16), hooks (19 scripts), memory pattern (index + topic files), dual-write (state.db), lite prompts, bootstrap | **Inherit logic as-is; replace identity values.** Hooks contain `/tmp/{agent-id}-*` paths and agent ID arguments — the enforcement logic stays identical, only the name changes. Leverage points (Meadows, 1999). |
| **Application** | Medium | Skills (/hunt, /cycle, /sync, /knock, /iterate, /doc), evaluator protocol, trust model, /adjudicate command | **Configure.** Skills contain agent identity in message templates and example commands — replace those values. Skill logic works for any agent; evaluator and trust model may need domain-specific tuning. |
| **Domain** | High | Agent identity, organization, peer agents, scoring subsystem, transport topology, domain documents | **Replace entirely.** `cogarch.config.json` parameterizes all domain-layer degrees of freedom. |


## Step 0: Fork and Read

1. Fork `safety-quotient-lab/psychology-agent`
2. Read `CLAUDE.md` — the top paragraph describes the system classification and methodology
3. Read `docs/architecture.md` — the Design Decisions table contains every resolved choice
4. Read `cogarch.config.json` — the reference implementation for the psychology agent


## Step 1: Replace `cogarch.config.json`

This single file parameterizes all domain-layer values. Replace every field
with your agent's identity, organization, and domain content.

**After editing per-section, run a global find-and-replace** within the file:
replace `psychology-agent` with your agent ID, and `safety-quotient-lab` with
your GitHub org/user. This catches nested fields (repo URLs, schema references,
default agent values) that appear across multiple sections.

### Section-by-section guide

**`identity`** — your agent's name, role, description, model, capabilities.

```json
{
  "agent_id": "your-agent",
  "display_name": "Your Agent",
  "role": "your role description",
  "description": "What your agent does",
  "model": "claude-opus-4-6",
  "instance_label": "Claude Code (Opus 4.6), macOS arm64",
  "stance": "socratic",
  "capabilities": ["your-capability-1", "your-capability-2"]
}
```

**`organization`** — your GitHub org/user, repo name, URLs.

**`infrastructure`** — your worker URL (if deploying a CF Worker), production
endpoints (if running a scoring or inference service). Set to `null` for fields
that don't apply.

**`scoring_subsystem`** — if your agent has a scoring/inference subsystem, configure
its routes, env vars, response schema, and dimensions. If not, set `"enabled": false`
and leave the rest as placeholder — the infrastructure layer will skip scoring routes.

**`peers`** — your registered peer and sub-agents. Each agent needs: role, transport
method, message prefix, discovery URL. The `outbound_routing_domains` table controls
what content gets surfaced to which agent during /sync.

**`sub_projects`** — directories within your repo that belong to sub-agents. The
subproject-boundary hook reads these paths to warn on cross-context writes.

**`facets`** — vocabulary for the polythematic facet system. Replace `topic_domain_map`
with your domain names, `work_stream_prefixes` with your work streams, and
`agent_detection_patterns` with your agent IDs.

**`transport`** — your repo URL, session paths, naming convention. The transport
infrastructure (interagent/v1 protocol, MANIFEST.json, /sync skill) works for any
agent — only the URLs and agent names change.

**`domain_content`** — references to your domain-specific documents and constructs.
Points the adaptation path to files that an adopter replaces entirely.


## Step 2: Update Downstream Consumers

After replacing `cogarch.config.json`, update the files that currently hardcode
identity and domain-layer values. Four tiers, ordered by coupling strength — Tier 1
reads directly from config sections; Tiers 2-4 use the agent name in paths, templates,
and scripts.

### Consumer mapping (4 tiers across 19 files)

**Tier 1 — Config consumers (23 locations, 6 files):**

| Config section | File | Lines | What to change |
|---|---|---|---|
| `identity.agent_id` | `interface/src/agent.js` | 36 | System prompt references |
| | `scripts/bootstrap_state_db.py` | 499 | Default agent facet |
| | `.claude/hooks/stop-completion-gate.sh` | 37-43 | MANIFEST pending check |
| | `.well-known/agent-card.json` | 3 | `agent_id` field |
| `organization` | `interface/src/worker.js` | 46-54 | Agent card: name, description, provider, URLs |
| `infrastructure.worker_url` | `interface/src/worker.js` | 47 | Agent card `url` field |
| `scoring_subsystem.routes` | `interface/src/worker.js` | 77, 86, 218, 229 | Skill endpoints + route handlers |
| `scoring_subsystem.env_var` | `interface/src/psq-client.js` | 6, 18, 24, 32 | Environment variable name |
| | `interface/src/worker.js` | 219, 235 | `env.PSQ_ENDPOINT_URL` references |
| `scoring_subsystem.extraction_pattern` | `interface/src/agent.js` | 109 | Regex in `extractPSQBlock()` |
| | `interface/src/psq-client.js` | 11 | Response schema reference |
| `sub_projects` | `.claude/hooks/subproject-boundary.sh` | 14-18 | Case patterns + boundary messages |
| `facets.topic_domain_map` | `scripts/bootstrap_state_db.py` | 267-271 | `TOPIC_DOMAIN_MAP` dict |
| `facets.work_stream_prefixes` | `scripts/bootstrap_state_db.py` | 273-281 | `WORK_STREAM_PREFIXES` list |
| `facets.agent_detection_patterns` | `scripts/bootstrap_state_db.py` | 493-499 | Agent detection if/elif logic |

**Tier 2 — Hook identity references (8 locations, 7 files):**

Hook scripts use `/tmp/psychology-agent-*` temp file paths and agent ID arguments.
The *logic* stays the same — only the agent name in the path changes. Find-and-replace
`psychology-agent` with your agent ID in these files:

| File | What to change |
|---|---|
| `.claude/hooks/tool-failure-halt.sh` | `/tmp/psychology-agent-consecutive-failures` path |
| `.claude/hooks/tool-failure-reset.sh` | Same path (must match halt script) |
| `.claude/hooks/session-end-check.sh` | `/tmp/psychology-agent-session-log.jsonl` path |
| `.claude/hooks/config-drift-detector.sh` | `/tmp/psychology-agent-config-drift.jsonl` path |
| `.claude/hooks/subagent-audit.sh` | `/tmp/psychology-agent-subagent-audit.jsonl` + budget file paths |
| `.claude/hooks/task-completed-route.sh` | `/tmp/psychology-agent-completed-tasks.jsonl` path |
| `.claude/hooks/session-start-orient.sh` | Agent ID argument passed to transport-scan.sh |

**Tier 3 — Skill identity references (12 locations, 3 files):**

Skills contain agent ID, discovery URL, and repo URL in JSON templates and example
commands. The *skill logic* stays the same — only the identity values change:

| File | What to change |
|---|---|
| `.claude/skills/sync/SKILL.md` | `agent_id`, `role`, `discovery_url` in message template; `--from-agent` argument; repo URLs in example commands |
| `.claude/skills/scan-peer/SKILL.md` | `agent_id`, `discovery_url`, `repo` in message template; project paths in examples |
| `.claude/skills/iterate/SKILL.md` | Repo URL in example `gh pr list` command |

**Tier 4 — Autonomous operation scripts (not needed if no autonomous mode):**

| File | What to change |
|---|---|
| `scripts/autonomous-sync.sh` | Agent ID default, repo URL, cron target |
| `scripts/trust-budget.py` | Agent ID references |
| `transport/hooks/transport-scan.sh` | Default `AGENT_ID` fallback value |

**Organization name:** In addition to the agent ID replacement above, find-and-replace
`Safety Quotient Lab` with your organization name in `interface/src/worker.js` (line 50,
agent card `organization` field). If you delete the `interface/` directory (no CF Worker),
this step becomes unnecessary.

**If you have no scoring subsystem:** Delete `interface/src/psq-client.js` entirely.
Remove the PSQ routes from `worker.js` (lines 218-240). Remove the `extractPSQBlock`
function from `agent.js`. Set `scoring_subsystem.enabled` to `false` in your config.

**If you have no CF Worker:** Delete the `interface/` directory. The cogarch
operates entirely within Claude Code — the worker provides an HTTP API surface
that many agents won't need.


## Step 3: Write Your System Prompt

The system prompt lives at the path specified by `domain_content.system_prompt_file`
(default: `interface/src/agent.js`, constant `PSYCHOLOGY_SYSTEM`).

Replace it with your agent's identity, commitments, refusals, and scope boundaries.
The structure works for any agent:

1. **Identity block** — role, stance, authority level
2. **Commitments** — epistemic transparency, anti-sycophancy, fair witness
3. **Refusals** — what the agent will not do (scope boundaries)
4. **Before every response** — checklist (observation vs inference, chunking, uncertainty)
5. **Subsystem integration** — rules for interpreting scoring output (if applicable)
6. **Machine-to-machine** — detection and response mode for agent callers


## Step 4: Replace Domain Content

Delete or replace the files listed in `domain_content.domain_docs`:

| Psychology agent file | Purpose | Adopter action |
|---|---|---|
| `docs/dignity-instrument-spec.md` | Dignity Index measurement spec | Delete or replace with your instrument |
| `docs/dignity-phase-a-study.md` | Feasibility study protocol | Delete or replace |
| `docs/ethical-marketing-rubric.md` | Content quality rubric | Replace with your quality criteria |
| `safety-quotient/` | PSQ sub-agent (DistilBERT model) | Replace with your sub-agent or delete |
| `pje-framework/` | PJE case study | Delete or replace with your case study |

**Also delete** — domain-specific content not in `domain_docs`:

| File / directory | Reason |
|---|---|
| `blog/` | Psychology agent blog posts |
| `.claude/proposals/` | Inbound proposals from peer agents |
| `docs/psychology-interface-spec.md` | CF Worker spec for psychology agent |
| `docs/lite-system-prompt.md` | Lite prompt for psychology agent |
| `docs/hn-draft.md` | Hacker News submission draft |
| `docs/github-workflow-convention.md` | Psychology agent GitHub workflow |
| `docs/claim-verification-log.json` | EF-2 claim verification tracker |
| `docs/ef1-psychological-foundations.md` | Psychological foundations for trust model |
| `docs/decisions/*.md` | Adjudication records (your decisions start fresh) |
| `docs/memory-snapshots/*.md` | Memory snapshots (clear content; files get repopulated by /cycle) |
| `docs/MEMORY-snapshot.md` | Memory index snapshot (regenerated by /cycle Step 10) |
| `lessons.md` | Lessons learned (start fresh) |
| `README.md` | Rewrite for your agent |

**Keep these files** — they belong to the infrastructure and application layers.
After keeping them, run `sed -i 's/psychology-agent/your-agent/g'` across all of
them to replace example agent names in JSON samples and message templates:

- `docs/architecture.md` — your design decisions (clear the psychology-agent entries,
  keep the table structure)
- `docs/cognitive-triggers.md` — T1-T16 trigger system (infrastructure layer)
- `docs/ef1-trust-model.md` — autonomous trust model (application layer)
- `docs/ef1-governance.md` — governance invariants (application layer)
- `docs/bft-design-note.md` — BFT design (application layer)
- `docs/command-request-v1-spec.md` — command protocol spec (application layer)
- `docs/machine-response-v3-spec.md` — scoring response schema (application layer)
- `docs/local-coordination-v1-spec.md` — local coordination protocol (application layer)
- `docs/subagent-layer-spec.md` — sub-agent communication spec (application layer)
- `docs/peer-layer-spec.md` — peer agent spec (application layer)
- `docs/adversarial-register-rubric.md` — adversarial evaluator rubric (application layer)
- `scripts/schema.sql` — state layer schema (infrastructure layer)
- `scripts/bootstrap_state_db.py` — after updating facet vocabulary (Step 2)
- `scripts/dual_write.py` — state layer dual-write (infrastructure layer)
- `.claude/hooks/` — hook scripts (infrastructure layer; identity already handled in Step 2)
- `.claude/skills/` — skills (application layer; identity already handled in Step 2)
- `.claude/rules/` — glob-scoped conventions (infrastructure layer)


## Step 5: Update Transport Identity

1. **`.well-known/agent-card.json`** — replace agent_id, description, transport
   repo URL, capabilities, sub_agents, active_sessions
2. **`transport/agent-registry.json`** — replace all agent entries with your mesh
3. **`transport/MANIFEST.json`** — clear all entries (fresh start)
4. **`transport/sessions/`** — delete all session directories (your transport
   history starts fresh)


## Step 6: Update Documentation Chain

1. **`CLAUDE.md`** — update the top paragraph (system classification + methodology
   already describe the cogarch generically; replace domain-specific references
   in the Skills, Scope Boundaries, and Anti-Patterns sections)
2. **`lab-notebook.md`** — clear session history; keep the Current State template
3. **`journal.md`** — clear; start your own research narrative
4. **`TODO.md`** — clear; add your own task backlog
5. **`ideas.md`** — clear; add your own speculative directions
6. **`lessons.md`** — clear; start fresh
7. **`README.md`** — rewrite for your agent
8. **`BOOTSTRAP.md`** — verify all referenced files exist after your changes
9. **Memory files** (`MEMORY.md` + `memory/*.md`) — clear content; keep the
   index + topic file structure


## Step 7: Global Cleanup

After completing Steps 1-6, run a final sweep to catch any references that
individual steps missed:

```bash
# Find remaining agent identity references
grep -rn "psychology-agent" --include='*.md' --include='*.sh' \
  --include='*.js' --include='*.py' --include='*.json' . \
  | grep -v '.git/' | grep -v 'node_modules/'

# Find remaining organization references
grep -rn "Safety Quotient Lab" . | grep -v '.git/'
grep -rn "safety-quotient-lab" . | grep -v '.git/'
```

**Expected survivors:** `docs/cogarch-adaptation-guide.md` references
`psychology-agent` as the reference implementation — leave those as-is.
Everything else should carry your agent's identity.


## What NOT to Change

These components represent the infrastructure layer — low DOF, high leverage.
Modifying their **logic** breaks the embedded cognitive system:

- **Triggers T1-T16** — the behavioral governance system. Fires on tool use,
  session start, compaction, response generation. Domain-agnostic.
- **Hook script logic** — mechanical enforcement of triggers. The scripts in
  `.claude/hooks/` intercept Claude Code's I/O pipeline. **Do not change what
  hooks do** — only replace the agent identity values they reference (Step 2,
  Tier 2). The temp file paths and agent ID arguments carry your agent's name;
  the enforcement logic stays identical.
- **Memory pattern** — index (MEMORY.md) + topic files + snapshots + bootstrap.
  The structure works for any agent; only the content changes.
- **Dual-write protocol** — markdown first, then DB. Recovery via bootstrap script.
- **Skill logic** — /hunt, /cycle, /sync, /knock, /iterate, /doc operate on the
  documentation chain, not on domain content. **Do not change what skills do** —
  only replace the agent identity values in message templates and example commands
  (Step 2, Tier 3). The workflow logic stays identical.
- **interagent/v1 protocol** — message schema, SETL, epistemic flags, action gates.


## Verification Checklist

After adaptation, verify:

- [ ] `cogarch.config.json` contains your agent identity (no psychology-agent references)
- [ ] `python3 -c "import json; json.load(open('cogarch.config.json'))"` passes
- [ ] `.well-known/agent-card.json` reflects your agent identity
- [ ] `transport/agent-registry.json` lists your agents (or empty agents block)
- [ ] `transport/MANIFEST.json` cleared (empty pending + recently_completed)
- [ ] `python scripts/bootstrap_state_db.py --force` completes with all checks passing.
  The script detects fresh installs (no transport session directories) and
  applies structural-only thresholds automatically.
- [ ] `CLAUDE.md` top paragraph matches your system classification
- [ ] `docs/cognitive-triggers.md` exists and has 100+ lines (unchanged from source)
- [ ] No grep hits for "psychology-agent" in `*.sh *.js *.py *.json *.md` outside
  of `transport/sessions/`, `docs/snapshots/`, and `docs/cogarch-adaptation-guide.md`
- [ ] No grep hits for "Safety Quotient Lab" outside of `transport/sessions/`,
  `docs/snapshots/`, `LICENSE`, and `NOTICE`
- [ ] Hook temp files use your agent name: `grep -r '/tmp/' .claude/hooks/ | grep -v your-agent-id` returns nothing


## License

The cogarch infrastructure and application layers carry Apache 2.0 (root LICENSE).
Domain content (PSQ data + model weights) carries CC BY-SA 4.0
(safety-quotient/LICENSE-DATA). Adopters inherit Apache 2.0 for all infrastructure
and application layer code. Domain content you add carries whatever license you choose.

**`LICENSE` and `NOTICE`:** These files contain the original copyright holder
("Kashif Shah / Safety Quotient Lab"). Per Apache 2.0 §4(a), you MUST retain the
original NOTICE file. You MAY add your own copyright line to NOTICE and LICENSE
for your additions. Do not remove the original attribution.
