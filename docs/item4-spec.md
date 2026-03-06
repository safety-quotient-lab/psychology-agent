# Architecture Item 4 — Psychology Interface Specification

**Status:** In progress — scaffolding and core integration (2026-03-06)
**Prerequisite:** Item 2a complete (PSQ sub-agent binding defined ✓)
**Stack:** @anthropic-ai/claude-agent-sdk v0.2.70 + Cloudflare Workers (F2)
**Location:** `psychology-agent/interface/`

---

## Overview

Item 4 builds the user-facing layer: a purpose-built psychology interface rather
than the generic Claude Code shell. It wraps the general-purpose psychology agent
in a streaming web UI with PSQ score visualization, session persistence, and
cogarch inheritance via `settingSources: ['project']`.

```
Browser (UI)
  │  Server-Sent Events (streaming)
  ▼
Cloudflare Worker (interface/)
  ├── @anthropic-ai/claude-agent-sdk  → General agent (Opus)
  │     settingSources: ['project']   → CLAUDE.md + skills + cogarch carry over
  │     agents: [psq-agent]           → PSQ sub-agent routing
  ├── D1 (SQLite)                     → Session history, conversation turns
  ├── KV                              → Active session state, agent config
  └── R2                              → Larger artifacts (reports, exports)
```

---

## Agent SDK Integration

### Core primitive

```javascript
import { query } from "@anthropic-ai/claude-agent-sdk";

for await (const message of query({
  prompt: userInput,
  options: {
    model: "claude-opus-4-6",
    settingSources: ["project"],     // loads CLAUDE.md, skills, hooks
    session_id: sessionId,           // continuity across turns
    resume: previousMessages,        // restore context on reconnect
    systemPrompt: PSYCHOLOGY_SYSTEM, // identity spec from architecture.md
    agents: {
      psq: {
        prompt: PSQ_AGENT_SYSTEM,    // PSQ sub-agent identity
        tools: ["score"],            // scoped tools only
      }
    }
  }
})) {
  yield message; // stream to client via SSE
}
```

### `settingSources: ['project']` effect

Loading from project source automatically inherits:
- `CLAUDE.md` — stable conventions (APA style, jargon policy, model policy)
- `.claude/skills/` — /doc, /hunt, /cycle, /capacity, /adjudicate
- `.claude/settings.json` — hooks (SessionStart, PreCompact, Stop, etc.)

The psychology agent's identity, epistemic standards, and cognitive triggers
carry over into the SDK-wrapped instance without duplication.

### Cogarch note

Hooks run inside the Agent SDK session. `SessionStart` fires with the orientation
context. `Stop` fires the completion gate. `PreCompact` surfaces Active Thread
before compression. Identical behavior to the Claude Code shell.

---

## Transport: F2 (Cloudflare Workers)

Production transport replaces the F1 plan9port derivation channel.

```
F1 (derivation, complete):   SSH pipe + ramfs -i + 9pfuse (cross-machine)
F2 (production, Item 4):     Cloudflare Worker + D1 + KV + R2
```

### Why Cloudflare

- **Observatory reference**: observatory-agent runs CF Workers + D1 + KV + R2
  as a working multi-agent deployment — direct reference architecture available
- **No machine dependency**: F1 required specific hosts; F2 is globally available
- **Durable Objects**: stateful WebSocket connections for streaming without timeout
- **D1**: SQLite-compatible session storage with zero operational overhead

### Worker architecture

```
POST /session          → create session (D1), return session_id
POST /turn             → stream agent response (SSE)
GET  /session/:id      → retrieve session history (D1)
GET  /session/:id/psq  → retrieve PSQ scores for session (D1)
POST /psq/score        → invoke PSQ sub-agent directly (when endpoint ready)
```

---

## Session Storage Schema (D1)

```sql
CREATE TABLE sessions (
  session_id    TEXT PRIMARY KEY,
  created_at    INTEGER NOT NULL,
  last_turn_at  INTEGER NOT NULL,
  context_state TEXT,   -- JSON: last_commit, last_session (for interagent sync)
  metadata      TEXT    -- JSON: user agent, model used, flags
);

CREATE TABLE turns (
  turn_id       TEXT PRIMARY KEY,
  session_id    TEXT NOT NULL REFERENCES sessions(session_id),
  turn_number   INTEGER NOT NULL,
  role          TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'psq')),
  content       TEXT NOT NULL,
  psq_scores    TEXT,   -- JSON: PSQ dimension scores if this turn has PSQ output
  setl          REAL,   -- SETL value for this turn (null if user turn)
  timestamp     INTEGER NOT NULL
);

CREATE INDEX idx_turns_session ON turns(session_id, turn_number);
```

---

## PSQ Visualization

PSQ scores surface as structured data in the agent's message stream. The UI
extracts them and renders a 10-dimension display.

### Extraction pattern

Agent output contains PSQ scores in the machine-response/v3 format
(docs/machine-response-v3-spec.md). The Worker parses structured JSON blocks
from the stream and separates them from narrative text.

```javascript
// Detect PSQ output block in stream
function extractPSQBlock(messageContent) {
  const match = messageContent.match(/```json\s*({\s*"schema":\s*"psychology-agent\/machine-response[^`]+)\s*```/s);
  return match ? JSON.parse(match[1]) : null;
}
```

### Visualization components

```
10-dimension radar chart (SVG):
  threat_exposure, hostility_index, authority_dynamics,
  energy_dissipation, regulatory_capacity, resilience_baseline,
  trust_conditions, cooling_capacity, defensive_architecture,
  contractual_clarity

Composite score bar (0–100):
  g_psq with confidence interval (r-range from calibration)

Factor clusters (3-factor view):
  threat_hostility, relational_safety, coping_resources

Epistemic flags panel:
  dimensions below confidence threshold (r < 0.6)
  calibration artifacts (trust_conditions note)
  scope disclaimers
```

**Blocked pending:** PSQ scoring endpoint. The Worker calls the PSQ sub-agent
via `agents: { psq: { ... } }`. Until the PSQ Agent SDK endpoint exists, PSQ
visualization uses mock data in development.

---

## Cogarch Inheritance via `settingSources`

Three things carry over automatically from `settingSources: ['project']`:

| Source | Carries over |
|---|---|
| CLAUDE.md | Communication conventions, epistemic quality standard, model policy |
| .claude/skills/ | /doc, /hunt, /cycle, /capacity, /adjudicate — callable in SDK sessions |
| .claude/settings.json | Hooks: SessionStart orientation, PreCompact persist, Stop gate |

**What does NOT carry over:** auto-memory (`MEMORY.md` in `~/.claude/projects/`).
Auto-memory is Claude Code shell-specific. The SDK interface manages session
state via D1 instead — same information, different persistence layer.

---

## Development Sequence

```
Phase 1 (now):   Scaffold + Agent SDK integration (no UI)
  ├── interface/package.json + wrangler.toml
  ├── interface/src/agent.js — query() wrapper + SSE streaming
  ├── interface/src/session.js — D1 session CRUD
  └── interface/src/worker.js — CF Worker entry point (HTTP routing)

Phase 2:         Minimal UI
  ├── interface/public/index.html — chat interface (vanilla JS)
  ├── interface/public/psq.js — PSQ score display (SVG radar)
  └── interface/public/style.css

Phase 3:         PSQ integration (blocked on scoring endpoint)
  ├── PSQ scoring endpoint in safety-quotient/
  └── interface/src/psq.js — Worker-side PSQ routing

Phase 4:         Production deployment
  ├── CF Workers deployment (wrangler deploy)
  ├── D1 database provisioning
  └── KV namespace + R2 bucket setup
```

---

## Open Contracts with Items 2 and 3

- **Item 2a PSQ binding:** Worker uses `psychology-agent/machine-response/v3` schema
  (docs/machine-response-v3-spec.md) to parse PSQ output from the agent stream.
- **Item 2b peer layer:** `context_state` column in sessions table carries
  `last_commit` for interagent sync when peer exchanges occur through the interface.
- **Item 3 evaluator:** Evaluator activation happens inside the Agent SDK session —
  same tiered logic (Lite/Standard/Full), same 7-procedure set. No interface changes
  needed; evaluator is invisible to the UI layer.

---

## Status

```
────────────────────────────────────────────────────────────────
 Item                                Status
────────────────────────────────────────────────────────────────
 Agent SDK surface investigation     ✓ Complete (Session 17)
 Item 4 spec document               ✓ This file
 interface/ directory scaffold       ✓ Phase 1 in progress
 CF Worker entry point               ✓ Phase 1
 Agent SDK query() wrapper           ✓ Phase 1
 D1 session schema                   ✓ Phase 1
 Minimal chat UI                     ✗ Phase 2
 PSQ radar visualization             ✗ Phase 2
 PSQ scoring endpoint                ✗ Blocked — safety-quotient/
 Production CF deployment            ✗ Phase 4
────────────────────────────────────────────────────────────────
```
