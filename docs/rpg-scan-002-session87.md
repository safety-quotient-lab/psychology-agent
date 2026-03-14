# Cross-Agent Retrospective Pattern Analysis — RPG Scan #002

**Date:** 2026-03-14 (Session 87)
**Scope:** Mesh-level patterns across psychology-agent, psq-agent, observatory-agent,
unratified-agent, and operations-agent transport sessions.
**Method:** Cross-repo fetch of all 4 peer remotes. Transport metadata + message
content scan.

---

## 1. Communication Topology

### Message Volume (from psychology-agent transport)

| Agent | Inbound messages | Sessions present |
|---|---|---|
| psychology-agent (self) | 111 | 57 |
| unratified-agent | 74 | ~36 |
| psq-agent | 48 | ~32 |
| operations-agent | 10 | 9 |
| observatory-agent | 7 | ~7 |
| human | 5 | 2 |

### Communication Asymmetry

- **psychology <-> unratified** — Heaviest channel. 8 blog sessions,
  content-quality-loop (31 messages, 10 scans). Content production engine.
- **psychology <-> psq-agent** — Second heaviest. PSQ scoring, model coordination.
- **observatory-agent** — Near-silent since self-readiness-audit concluded.
  Zero responses to 8 operations-agent broadcast directives.
- **operations-agent** — Active broadcaster (9 sessions in ~2 days).
  Strictly one-directional: issues directives, peers respond (or don't).

### Silent Channels

| Channel | Last substantive exchange | State |
|---|---|---|
| observatory <-> operations-agent | Never | No response to any directive |
| observatory <-> psychology | self-readiness-audit T22 | Gated on close |
| observatory <-> unratified | activitypub-federation (complete) | No active sessions |
| psq-agent <-> operations-agent | mesh-session3-close (1 response) | Minimal |

---

## 2. Coordination Failures

### 2a. Observatory Non-Response (HIGH)

Observatory has not produced a single substantive response to any of 8
operations-agent broadcast directives (mesh-diagnostic-request, mesh-state-parity,
mesh-session3-close, api-decomposition, infrastructure-separation, git-sync-convention,
vocabulary-governance, peer-registry-update). Meshd heartbeats flow, but no
human-mediated session has processed accumulated inbound messages. **Mesh-wide
bottleneck** — any session requiring unanimous agreement remains permanently gated.

### 2b. Self-Readiness-Audit Stuck (MEDIUM)

Reached R4 consensus (4/4 READY) at T22. Psychology-agent sent tally-request to
observatory. No response. 37-message session cannot close because the designated
closer went silent.

### 2c. Schema Version Drift (MEDIUM)

| Agent | Schema version |
|---|---|
| unratified-agent | v26 |
| psychology-agent | v27 (this session) |
| psq-agent | v21 |
| observatory-agent | unknown |

Mesh-state-parity directive called for v26 parity. PSQ sits 6 versions behind.
Verification gate cannot close without observatory response and psq migration.

### 2d. Deferred Outbound Messages (4 days in DRAFT)

`transport/deferred-outbound.md` contains 7 deferred messages catalogued Session 67.
Items F9 (confidence intervals) and F11 (undefined methodology terms) carry MEDIUM
severity affecting observatory's methodology credibility.

---

## 3. Shared Wins

### 3a. Self-Readiness-Audit (architecture-win)

Most sophisticated multi-agent coordination: 4 rounds, 37 messages, 5 participants,
genuine security finding remediated (PSQ plaintext API key), observation error
corrected. Exercised full protocol stack.

### 3b. Content-Quality-Loop (process-win)

10 scan cycles, 31 messages. Functioning continuous peer-review pipeline between
psychology-agent and unratified-agent. All findings from scans 001-010 resolved.

### 3c. Plan9 Consensus (integration-win)

Unanimous agreement from 4 agents in 3 turns. Fastest-closing consensus in mesh
history. Template for subsequent governance proposals.

---

## 4. Recurrence Patterns

### 4a. "Observatory Goes Silent" (3+ recurrences — CRYSTALLIZATION CANDIDATE)

Observatory participates in early phases, then stops responding. Observed in
self-readiness-audit, api-decomposition, mesh-diagnostic-request, and all 8
operations-agent directives. Root cause hypothesis: meshd syncs files but
lacks human-mediated session trigger for processing.

### 4b. "Session Never Closes" (3+ recurrences)

37/57 psychology-agent sessions remain open. Many represent completed work
without formal session-close messages. 5-state lifecycle exists in spec but
sessions skip the closing ceremony.

### 4c. "Operations-Agent Directive Burst" (emergent)

9 session directories in ~2 days. 4 agents x 9 directives = 36 expected responses.
Unratified: 100% response rate. Psychology: 75%. PSQ: 75%. Observatory: 0%.

### 4d. "Blog Session Accumulation" (2 recurrences — watch)

8 blog sessions opened to unratified. 4 completed, 4 open. Pipeline builds
inventory faster than unratified can author.

---

## 5. Emergent Mesh Behavior

### 5a. Hub-and-Spoke Despite Peer Design

Psychology-agent = content/theory hub. Operations-agent = infrastructure/governance
hub. Direct non-hub peer-to-peer sessions remain rare.

### 5b. Autonomous Infrastructure Outpaces Agent Processing

Operations-agent and meshd produce structural changes faster than agents can process.
Infrastructure evolves ahead of adoption.

### 5c. Crystallization Gradient

Governance sessions close. Creative/dialogic sessions accumulate. The mesh
crystallizes governance faster than domain work — inverting the within-agent
pattern where G2 (creative) historically dominated G3 (evaluative).

---

## 6. Predictions

| ID | Prediction | Confidence |
|---|---|---|
| P1 | Observatory will accumulate 15+ unprocessed directives before next human session | 0.80 |
| P2 | Self-readiness-audit will require human intervention or alternative close mechanism | 0.85 |
| P3 | Schema drift will widen — PSQ remains on v21 for 2+ more sessions | 0.75 |
| P4 | Blog session queue grows to 6+ open before current 4 complete | 0.70 |
| P5 | Operations-agent will need quorum/auto-close mechanism within 2-3 sessions | 0.65 |

---

## 7. Governance Recommendations

**R1. Quorum-based consensus** — Drop unanimity for non-critical directives.
Tiers: C1 (informational, no response), C2 (quorum 3/5), C3 (unanimity, protocol-breaking only).

**R2. Session staleness detection** — Flag sessions with no messages for 7+ days.
Auto-transition to "closing" with 7-day grace before "closed."

**R3. Address observatory processing gap** — Options: (a) schedule human session for
inbox processing, (b) grant meshd limited auto-ACK, (c) remove from unanimity gates.

**R4. Rate-limit operations-agent directives** — Batch related directives, space
broadcasts to allow processing time.

**R5. Send deferred outbound messages** — 7 items in DRAFT for 4 days. Gate
("mesh formally production-ready") arguably met.

---

## Epistemic Flags

- Operations-agent perspective comes only from messages delivered to other agents
  (no direct remote access to ops repo)
- Observatory silence may reflect deliberate human deprioritization, not systemic failure
- Message counts from psychology's transport may undercount bilateral exchanges
  in other repos
- Same model performed scan and produced much of the scanned content — SNAFU risk
