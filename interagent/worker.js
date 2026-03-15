/**
 * worker.js — Cloudflare Worker for interagent.safety-quotient.dev
 *
 * Serves the interagent mesh compositor, shared vocabulary, mesh health
 * aggregation, and authenticated API endpoints.
 *
 * Routes:
 *   GET  /                    → interagent mesh compositor (index.html)
 *   GET  /vocab[.json]        → shared JSON-LD vocabulary
 *   GET  /vocab/schema[.json] → vocabulary JSON Schema (validation)
 *   GET  /health              → worker health check (local only)
 *   GET  /api/health          → mesh health (aggregates all agent /api/status)
 *   POST /api/keys            → create API key (operator-only)
 *   DELETE /api/keys/:identity → revoke API key (operator-only)
 *   GET  /api/pulse           → mesh heartbeat (aggregated agent health)
 *   GET  /api/operations      → operations data (budgets, actions, gates, schedules)
 *   POST /api/relay           → transport relay (create PR on target repo for sender)
 *   POST /api/redirect        → redirect misrouted message to correct agent
 *   GET  /api/trust           → trust matrix (NxN agent trust scores, 4 dimensions)
 *   GET  /api/psychometrics   → unified A2A-Psychology payload (per-agent + mesh-level)
 *   *    /api/*               → authenticated API routes (rate-limited)
 */

import VOCAB from "./vocab.json";
import VOCAB_SCHEMA from "./vocab.schema.json";
import AGENT_CARD from "./agent-card.json";
import { resolveAuth, checkRateLimit, handleKeyCreate, handleKeyRevoke } from "./auth.js";

// Known mesh domains — CORS restricted to these origins + open for discovery endpoints
const MESH_ORIGINS = new Set([
  "https://operations-agent.safety-quotient.dev",
  "https://psychology-agent.safety-quotient.dev",
  "https://psq-agent.safety-quotient.dev",
  "https://unratified.org",
  "https://observatory.unratified.org",
  "https://interagent.safety-quotient.dev",
  "https://api.safety-quotient.dev",
]);

function corsHeaders(request, open) {
  const origin = request?.headers?.get("Origin") || "*";
  const allowed = open || MESH_ORIGINS.has(origin);
  return {
    "Access-Control-Allow-Origin": allowed ? origin : MESH_ORIGINS.values().next().value,
    "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Operator-Secret",
    "Vary": "Origin",
  };
}

// Bootstrap agent card URLs — the only hardcoded data. Dynamic discovery (D51)
// fetches full agent details from these endpoints and caches in KV.
// NOTE: psq-agent → safety-quotient-agent rename in progress. URL stays at
// psq-agent.safety-quotient.dev until DNS cutover. Both IDs recognized during transition.
const AGENT_CARD_URLS = [
  "https://psychology-agent.safety-quotient.dev/.well-known/agent-card.json",
  "https://psq-agent.safety-quotient.dev/.well-known/agent-card.json",
  "https://operations-agent.safety-quotient.dev/.well-known/agent-card.json",
  "https://unratified.org/.well-known/agent-card.json",
  "https://observatory.unratified.org/.well-known/agent-card.json",
];

const DEPLOY_VERSION = "2026-03-13T22:00";

// Agents currently operated by a human (no autonomous cron loop).
// Updated manually when agents transition between manual/autonomous.
// Both psq-agent and safety-quotient-agent recognized during transition.
const MANUAL_MODE_AGENTS = new Set(["operations-agent", "psychology-agent"]);

const AGENT_CACHE_KEY = "agent-registry-cache";
const AGENT_CACHE_TTL = 300; // 5 minutes
const TRUST_MATRIX_KEY = "trust-matrix-v1";

// Track fetch errors for self-reporting in /api/pulse and /api/status
let _lastFetchErrors = [];

// BFT Mitigation 2: store role-verification result for /api/pulse
let _roleVerification = null;

// Cold-start timestamp — tracks Worker isolate uptime
let _coldStartTime = null;

/**
 * Fetch an agent card, extract registry-relevant fields.
 * Returns null on failure (agent unreachable, bad JSON, etc.).
 * Records error details in _lastFetchErrors for observability.
 */
async function fetchAgentCard(cardUrl) {
  try {
    const resp = await fetch(cardUrl, {
      cf: { cacheTtl: 120 },
      headers: { "Accept": "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    if (!resp.ok) {
      _lastFetchErrors.push({ url: cardUrl, error: `HTTP ${resp.status}`, at: new Date().toISOString() });
      return null;
    }
    const card = await resp.json();

    // Derive canonical agent ID from URL hostname (machine-stable)
    // Card `name` field can be human-readable ("PSQ-Full Agent") — use as display name only
    const hostname = new URL(cardUrl).hostname;
    const urlId = hostname.split(".")[0];
    // Dual-recognition: psq-agent → safety-quotient-agent during transition.
    // The agent card may still report "psq-agent" until that repo updates.
    const rawId = card.mesh?.agent_id || urlId;
    const id = rawId === "psq-agent" ? "safety-quotient-agent" : rawId;
    const displayName = card.name || id;

    const role = card.mesh?.role || card.description?.slice(0, 60) || "unknown";

    // Extract repo: prefer mesh.transport.repo (specific), fallback to provider.url (org-level)
    const transportRepo = card.mesh?.transport?.repo;
    const providerUrl = card.provider?.url || "";
    const repoFromTransport = transportRepo
      ? transportRepo.replace("https://github.com/", "").replace(/\.git$/, "")
      : null;
    const repoFromProvider = providerUrl.startsWith("https://github.com/")
      ? providerUrl.replace("https://github.com/", "")
      : null;
    const repo = repoFromTransport || repoFromProvider;

    // Derive status_url from card URL hostname
    const cardHost = new URL(cardUrl).origin;
    const statusUrl = card.mesh?.transport?.status_url || `${cardHost}/api/status`;

    return {
      id,
      name: displayName,
      role,
      status_url: statusUrl,
      card_url: cardUrl,
      repo,
      version: card.version || null,
      skills: (card.skills || []).map(s => s.id),
      fetched_at: new Date().toISOString(),
    };
  } catch (err) {
    _lastFetchErrors.push({ url: cardUrl, error: err.message || "unknown", at: new Date().toISOString() });
    return null;
  }
}

/**
 * Build self-entry from the bundled agent card (avoids self-fetch loop).
 * The compositor identifies as interagent-compositor with role: mesh.
 */
function buildSelfEntry() {
  const card = JSON.parse(AGENT_CARD);
  return {
    id: card.name || "interagent-compositor",
    name: card.name || "interagent-compositor",
    role: card.mesh?.role || "mesh",
    status_url: "https://interagent.safety-quotient.dev/api/status",
    card_url: "https://interagent.safety-quotient.dev/.well-known/agent-card.json",
    repo: "safety-quotient-lab/operations-agent",
    version: card.version || null,
    skills: (card.skills || []).map(s => s.id),
    fetched_at: new Date().toISOString(),
  };
}

/**
 * Load agent registry — from KV cache if fresh, otherwise fetch all cards.
 * Falls back gracefully: unreachable agents appear with status "unavailable".
 * Supports force refresh via forceRefresh param (used by cache-busting routes).
 * Returns { agents, cache_status } where cache_status indicates hit/miss/stale.
 */
async function loadAgentRegistry(env, forceRefresh = false) {
  // Try KV cache first (unless forced refresh)
  if (!forceRefresh && env.AUTH_KV) {
    try {
      const cached = await env.AUTH_KV.get(AGENT_CACHE_KEY, "json");
      if (cached && cached.expires_at > Date.now()) {
        return { agents: cached.agents, cache_status: "hit", refreshed_at: cached.refreshed_at };
      }
      // Cache exists but expired — stale, will refresh below
      if (cached) {
        // Use stale data as fallback in case refresh fails entirely
        var staleAgents = cached.agents;
      }
    } catch {
      // KV read failed — proceed to fresh fetch
    }
  }

  _lastFetchErrors = [];

  // Separate self-hosted card URL from remote cards
  const selfUrl = "https://operations-agent.safety-quotient.dev/.well-known/agent-card.json";
  const remoteUrls = AGENT_CARD_URLS.filter(u => u !== selfUrl);

  // Fetch remote agent cards in parallel
  const results = await Promise.allSettled(
    remoteUrls.map(url => fetchAgentCard(url))
  );

  const agents = results.map((r, i) => {
    if (r.status === "fulfilled" && r.value) return r.value;
    // Fallback entry for unreachable agents
    const hostname = new URL(remoteUrls[i]).hostname;
    const id = hostname.split(".")[0];
    return {
      id,
      name: id,
      role: "unknown",
      status_url: null,
      card_url: remoteUrls[i],
      repo: null,
      version: null,
      skills: [],
      fetched_at: new Date().toISOString(),
      _unavailable: true,
    };
  });

  // If every remote fetch failed and we have stale data, prefer stale over all-unavailable
  const allFailed = agents.every(a => a._unavailable);
  if (allFailed && staleAgents) {
    // Mark as stale so consumers know
    staleAgents.forEach(a => { a._stale = true; });
    const selfEntry = buildSelfEntry();
    const hasself = staleAgents.some(a => a.id === selfEntry.id);
    if (!hasself) staleAgents.push(selfEntry);
    return { agents: staleAgents, cache_status: "stale-fallback", refreshed_at: null };
  }

  // Insert self-entry (no network fetch needed — card bundled in Worker)
  agents.push(buildSelfEntry());

  // BFT Mitigation 2: cross-verify that exactly one agent claims the operations role
  const opsAgents = agents.filter(a => a.role === "operations");
  if (opsAgents.length !== 1) {
    console.warn(`BFT WARNING: expected exactly 1 operations role, found ${opsAgents.length} — agents: ${opsAgents.map(a => a.id).join(", ") || "(none)"}`);
  }
  _roleVerification = {
    operations_count: opsAgents.length,
    operations_agents: opsAgents.map(a => a.id),
    ok: opsAgents.length === 1,
    checked_at: new Date().toISOString(),
  };

  const refreshedAt = new Date().toISOString();

  // Cache in KV
  if (env.AUTH_KV) {
    try {
      await env.AUTH_KV.put(AGENT_CACHE_KEY, JSON.stringify({
        agents,
        expires_at: Date.now() + (AGENT_CACHE_TTL * 1000),
        refreshed_at: refreshedAt,
      }), { expirationTtl: AGENT_CACHE_TTL * 2 });
    } catch {
      // KV write failed — non-fatal, next request will re-fetch
    }
  }

  return { agents, cache_status: forceRefresh ? "force-refreshed" : "miss", refreshed_at: refreshedAt };
}

/**
 * Validate /api/status response shape. Returns sanitized data or null.
 * Ensures downstream consumers never encounter unexpected types.
 * Tolerates Go agents that omit the `status` field (inferred from HTTP 200).
 */
function validateStatusData(raw) {
  if (!raw || typeof raw !== "object") return null;

  // Must have at least agent_id or autonomy_budget/trust_budget to qualify as a status response
  if (!raw.agent_id && !raw.autonomy_budget && !raw.trust_budget) return null;

  // BFT Mitigation 1: track every field that gets sanitized (defaulted/replaced)
  const sanitization_log = [];

  // Normalize field name: some agents use "trust_budget" instead of "autonomy_budget"
  if (!raw.autonomy_budget && raw.trust_budget) {
    sanitization_log.push({ field: "autonomy_budget", original: "trust_budget", defaulted_to: "aliased from trust_budget" });
    raw.autonomy_budget = raw.trust_budget;
  }

  if (!raw.agent_id) {
    sanitization_log.push({ field: "agent_id", original: raw.agent_id, defaulted_to: null });
  }
  if (!raw.status) {
    sanitization_log.push({ field: "status", original: raw.status, defaulted_to: "online" });
  }
  if (typeof raw.schema_version !== "number" && raw.schema_version !== undefined) {
    sanitization_log.push({ field: "schema_version", original: raw.schema_version, defaulted_to: null });
  }

  // Sanitize autonomy_budget — normalize old (budget_current/budget_max) and new (budget_spent/budget_cutoff) schemas.
  const budget = raw.autonomy_budget;
  let hasBudgetData = budget && typeof budget === "object"
    && (budget.budget_spent != null || budget.budget_current != null);

  // Backward compat: old schema → new schema
  if (hasBudgetData && budget.budget_spent == null && budget.budget_current != null) {
    budget.budget_spent = budget.budget_current;
    budget.budget_cutoff = budget.budget_max || 0;
  }

  const safeBudget = hasBudgetData ? {
    budget_spent: parseInt(budget.budget_spent) || 0,
    budget_cutoff: parseInt(budget.budget_cutoff) || 0,
    last_action: budget.last_action || null,
    min_action_interval: typeof budget.min_action_interval === "number" ? budget.min_action_interval : 300,
  } : null;

  if (typeof raw.totals?.unprocessed !== "number" && raw.totals?.unprocessed !== undefined) {
    sanitization_log.push({ field: "totals.unprocessed", original: raw.totals?.unprocessed, defaulted_to: 0 });
  }
  if (!Array.isArray(raw.active_gates) && raw.active_gates !== undefined) {
    sanitization_log.push({ field: "active_gates", original: typeof raw.active_gates, defaulted_to: [] });
  }
  if (!Array.isArray(raw.recent_actions) && raw.recent_actions !== undefined) {
    sanitization_log.push({ field: "recent_actions", original: typeof raw.recent_actions, defaulted_to: [] });
  }
  if (!Array.isArray(raw.recent_messages) && raw.recent_messages !== undefined) {
    sanitization_log.push({ field: "recent_messages", original: typeof raw.recent_messages, defaulted_to: [] });
  }
  if (!(raw.schedule && typeof raw.schedule === "object") && raw.schedule !== undefined) {
    sanitization_log.push({ field: "schedule", original: typeof raw.schedule, defaulted_to: { cron_entry: null, last_sync: null } });
  }
  if (!Array.isArray(raw.skills) && raw.skills !== undefined) {
    sanitization_log.push({ field: "skills", original: typeof raw.skills, defaulted_to: [] });
  }
  if (!Array.isArray(raw.tabs) && raw.tabs !== undefined) {
    sanitization_log.push({ field: "tabs", original: typeof raw.tabs, defaulted_to: [] });
  }

  const validated = {
    agent_id: raw.agent_id || null,
    status: raw.status || "online",
    version: raw.version || null,
    schema_version: typeof raw.schema_version === "number" ? raw.schema_version : null,
    collected_at: raw.collected_at || null,
    autonomy_budget: safeBudget,
    totals: {
      unprocessed: typeof raw.totals?.unprocessed === "number" ? raw.totals.unprocessed : 0,
      epistemic_debt: raw.totals?.epistemic_debt ?? null,
    },
    active_gates: Array.isArray(raw.active_gates) ? raw.active_gates : [],
    recent_actions: Array.isArray(raw.recent_actions) ? raw.recent_actions : [],
    recent_messages: Array.isArray(raw.recent_messages) ? raw.recent_messages : [],
    schedule: raw.schedule && typeof raw.schedule === "object" ? raw.schedule : { cron_entry: null, last_sync: null },
    skills: Array.isArray(raw.skills) ? raw.skills : [],
    tabs: Array.isArray(raw.tabs) ? raw.tabs : [],
  };

  if (sanitization_log.length > 0) {
    validated._sanitization = sanitization_log;
  }

  return validated;
}

/**
 * Build local status data for interagent-compositor (avoids self-fetch loop).
 * Reports real compositor state: KV health, registry cache, fetch errors.
 */
async function buildLocalStatus(env) {
  const card = JSON.parse(AGENT_CARD);
  const now = Date.now();
  const uptimeS = _coldStartTime ? Math.floor((now - _coldStartTime) / 1000) : 0;

  // KV health probe
  let kvHealthy = false;
  if (env?.AUTH_KV) {
    try { await env.AUTH_KV.get("__health_probe"); kvHealthy = true; } catch {}
  }

  // Registry cache state from KV
  let cacheStatus = "unknown", cacheAgeS = null, agentsCount = 0;
  if (env?.AUTH_KV) {
    try {
      const cached = await env.AUTH_KV.get(AGENT_CACHE_KEY, "json");
      if (cached) {
        cacheStatus = cached.expires_at > now ? "hit" : "stale";
        cacheAgeS = Math.floor((now - cached.refreshed_at) / 1000);
        agentsCount = (cached.agents || []).length;
      } else { cacheStatus = "empty"; }
    } catch { cacheStatus = "error"; }
  }

  return {
    agent_id: "interagent-compositor",
    status: kvHealthy ? "online" : "degraded",
    version: card.version || "1.0.0",
    role: "mesh",
    managed_by: "operations-agent",
    collected_at: new Date().toISOString(),
    uptime_estimate_s: uptimeS,
    compositor_state: {
      registry_cache_status: cacheStatus,
      registry_cache_age_s: cacheAgeS,
      registry_agents_count: agentsCount,
      fetch_error_count: _lastFetchErrors.length,
      fetch_errors_recent: _lastFetchErrors.slice(-5),
      role_verification: _roleVerification,
      kv_healthy: kvHealthy,
      deploy_version: DEPLOY_VERSION,
    },
    autonomy_budget: { budget_spent: 0, budget_cutoff: 0 },
    totals: { unprocessed: 0, epistemic_debt: null },
    active_gates: [],
    manual_mode: true,
    skills: (card.skills || []).map(s => s.id),
  };
}

/**
 * Fetch /api/status from each reachable agent. Returns array of
 * { id, status, data, error? } objects (data contains validated status payload).
 * Operations-agent status built locally to avoid self-fetch loop.
 */
async function fetchAllAgentStatus(registry, env) {
  const selfId = "interagent-compositor";
  const reachable = registry.filter(a => a.status_url && !a._unavailable && a.id !== selfId);

  const results = await Promise.allSettled(
    reachable.map(async (agent) => {
      // 4s timeout — some agents return large /api/status payloads (>1MB)
      const resp = await fetch(agent.status_url, {
        cf: { cacheTtl: 30 },
        signal: AbortSignal.timeout(4000),
      });
      if (!resp.ok) {
        return { id: agent.id, status: "unreachable", data: null, error: `HTTP ${resp.status}` };
      }
      let raw;
      try {
        raw = await resp.json();
      } catch {
        return { id: agent.id, status: "unreachable", data: null, error: "invalid JSON" };
      }
      const validated = validateStatusData(raw);
      if (!validated) {
        return { id: agent.id, status: "degraded", data: null, error: "schema validation failed" };
      }
      return { id: agent.id, status: "online", data: validated };
    })
  );

  const agents = results.map((r, i) =>
    r.status === "fulfilled" && r.value
      ? r.value
      : { id: reachable[i].id, status: "unreachable", data: null, error: r.reason?.message || "fetch rejected" }
  );

  // Include unavailable agents from discovery
  for (const a of registry.filter(r => r._unavailable)) {
    agents.push({ id: a.id, status: "unavailable", data: null });
  }

  // Include compositor self-entry (local, no network fetch)
  const localData = await buildLocalStatus(env);
  agents.push({ id: selfId, status: "online", data: validateStatusData(localData) });

  // Tag agents in manual mode
  for (const a of agents) {
    a.manual_mode = MANUAL_MODE_AGENTS.has(a.id);
  }

  return agents;
}

/**
 * Trust Matrix — NxN trust scores across 4 dimensions.
 *
 * Dimensions:
 *   availability  — was the agent reachable on last observation?
 *   integrity     — did the response pass validation without sanitization?
 *   compliance    — does the agent follow protocol (has required fields, responds to directives)?
 *   epistemic_honesty — does the agent report uncertainty (epistemic_debt, SETL scores)?
 *
 * Scores start at 1.0 (charitable prior) and decay from observed evidence.
 * Each observation applies an exponential moving average: score = α·observation + (1-α)·previous
 * α = 0.1 (slow decay — trust earned slowly, lost slowly).
 *
 * KV persistence: trust matrix survives Worker restarts via AUTH_KV.
 * Updated on every /api/pulse or /api/trust fetch (piggybacks on status data).
 */
const TRUST_ALPHA = 0.1; // EMA smoothing factor

async function loadTrustMatrix(env) {
  if (!env.AUTH_KV) return {};
  try {
    const stored = await env.AUTH_KV.get(TRUST_MATRIX_KEY, "json");
    return stored || {};
  } catch {
    return {};
  }
}

async function saveTrustMatrix(env, matrix) {
  if (!env.AUTH_KV) return;
  try {
    await env.AUTH_KV.put(TRUST_MATRIX_KEY, JSON.stringify(matrix));
  } catch {
    // KV write failure non-fatal — matrix rebuilds from observations
  }
}

function ema(previous, observation, alpha) {
  return alpha * observation + (1 - alpha) * previous;
}

function defaultTrustEntry() {
  return {
    availability: 1.0,
    integrity: 1.0,
    compliance: 1.0,
    epistemic_honesty: 1.0,
    observations: 0,
    first_observed: null,
    last_observed: null,
  };
}

/**
 * Update trust matrix from fresh agent status observations.
 * Returns the updated matrix (caller should persist to KV).
 */
function updateTrustMatrix(matrix, agentResults) {
  const now = new Date().toISOString();

  for (const agent of agentResults) {
    if (!agent.id) continue;

    const entry = matrix[agent.id] || defaultTrustEntry();
    if (!entry.first_observed) entry.first_observed = now;
    entry.last_observed = now;
    entry.observations += 1;

    // Availability: 1.0 if online, 0.5 if degraded, 0.0 if unreachable/unavailable
    const availScore =
      agent.status === "online" ? 1.0
      : agent.status === "degraded" ? 0.5
      : 0.0;
    entry.availability = ema(entry.availability, availScore, TRUST_ALPHA);

    // Integrity: 1.0 if no sanitization needed, penalized by sanitization count
    if (agent.status === "online" && agent.data) {
      const sanitizationCount = (agent.data._sanitization || []).length;
      const integrityScore = sanitizationCount === 0 ? 1.0 : Math.max(0, 1.0 - sanitizationCount * 0.15);
      entry.integrity = ema(entry.integrity, integrityScore, TRUST_ALPHA);
    }
    // If unreachable, integrity unchanged (no data to judge)

    // Compliance: 1.0 if agent returns all expected fields (agent_id, status, autonomy_budget)
    if (agent.status === "online" && agent.data) {
      let complianceScore = 1.0;
      if (!agent.data.agent_id) complianceScore -= 0.3;
      if (!agent.data.autonomy_budget) complianceScore -= 0.2;
      if (!agent.data.collected_at) complianceScore -= 0.1;
      if (!agent.data.schema_version) complianceScore -= 0.1;
      entry.compliance = ema(entry.compliance, Math.max(0, complianceScore), TRUST_ALPHA);
    }

    // Epistemic honesty: higher if agent reports epistemic_debt (self-aware of uncertainty)
    // Agents that report null epistemic_debt get a neutral 0.7 — not dishonest, just silent.
    if (agent.status === "online" && agent.data) {
      const debt = agent.data.totals?.epistemic_debt;
      const epistemicScore = typeof debt === "number" ? 1.0 : 0.7;
      entry.epistemic_honesty = ema(entry.epistemic_honesty, epistemicScore, TRUST_ALPHA);
    }

    matrix[agent.id] = entry;
  }

  return matrix;
}

/**
 * Build /api/trust response — NxN trust matrix with per-agent scores.
 */
async function buildTrustData(env, registry) {
  const agents = await fetchAllAgentStatus(registry, env);
  let matrix = await loadTrustMatrix(env);
  matrix = updateTrustMatrix(matrix, agents);
  await saveTrustMatrix(env, matrix);

  // Compute aggregate trust per agent (geometric mean of 4 dimensions)
  const entries = Object.entries(matrix).map(([id, entry]) => {
    const aggregate = Math.pow(
      entry.availability * entry.integrity * entry.compliance * entry.epistemic_honesty,
      0.25
    );
    return {
      agent_id: id,
      trust_aggregate: Math.round(aggregate * 1000) / 1000,
      dimensions: {
        availability: Math.round(entry.availability * 1000) / 1000,
        integrity: Math.round(entry.integrity * 1000) / 1000,
        compliance: Math.round(entry.compliance * 1000) / 1000,
        epistemic_honesty: Math.round(entry.epistemic_honesty * 1000) / 1000,
      },
      observations: entry.observations,
      first_observed: entry.first_observed,
      last_observed: entry.last_observed,
    };
  });

  // Sort by aggregate trust (lowest first — surface concerns)
  entries.sort((a, b) => a.trust_aggregate - b.trust_aggregate);

  // Mesh-wide trust floor (lowest aggregate across all agents)
  const trustFloor = entries.length > 0
    ? Math.min(...entries.map(e => e.trust_aggregate))
    : 1.0;

  return {
    schema: "trust-matrix/v1",
    computed_at: new Date().toISOString(),
    alpha: TRUST_ALPHA,
    trust_floor: trustFloor,
    mesh_trust_status: trustFloor >= 0.8 ? "healthy" : trustFloor >= 0.5 ? "degraded" : "critical",
    agents: entries,
    methodology: {
      scoring: "Exponential moving average (EMA) with alpha=0.1. Charitable prior: all dimensions start at 1.0.",
      dimensions: {
        availability: "1.0 if reachable, 0.5 if degraded, 0.0 if unreachable. Observed per status fetch.",
        integrity: "1.0 if no sanitization needed. Penalized 0.15 per sanitized field.",
        compliance: "1.0 if all expected fields present (agent_id, autonomy_budget, collected_at, schema_version).",
        epistemic_honesty: "1.0 if agent reports epistemic_debt (self-aware of uncertainty). 0.7 if silent.",
      },
      aggregate: "Geometric mean of 4 dimensions — penalizes weakness in any single dimension.",
      persistence: "KV-stored, survives Worker restarts. Accumulates across all observations.",
    },
  };
}

/**
 * Build /api/pulse response — real-time mesh heartbeat and agent health.
 * Includes compositor self-diagnostics (cache status, fetch errors).
 */
async function buildPulseData(registry, cacheStatus, refreshedAt, env) {
  const agents = await fetchAllAgentStatus(registry, env);

  // Piggyback trust matrix update on every pulse observation (neuroglial: ambient state)
  if (env) {
    try {
      let matrix = await loadTrustMatrix(env);
      matrix = updateTrustMatrix(matrix, agents);
      await saveTrustMatrix(env, matrix);
    } catch {
      // Trust update failure non-fatal — pulse still returns
    }
  }

  const online = agents.filter(a => a.status === "online");
  const degraded = agents.filter(a => a.status === "degraded");
  const unreachable = agents.filter(a => a.status === "unreachable" || a.status === "unavailable");

  // Only count agents that actually report numeric budget data (not empty {})
  const withBudget = online.filter(a => a.data?.autonomy_budget?.budget_spent != null);
  const totalSpent = withBudget.reduce((sum, a) => sum + (parseInt(a.data.autonomy_budget.budget_spent) || 0), 0);
  const totalCutoff = withBudget.reduce((sum, a) => sum + (parseInt(a.data.autonomy_budget.budget_cutoff) || 0), 0);
  const totalPending = online.reduce((sum, a) =>
    sum + ((a.data?.totals || {}).unprocessed || 0), 0);
  const totalGates = online.reduce((sum, a) =>
    sum + (a.data?.active_gates || []).length, 0);

  const agentSummaries = agents.map(a => {
    const manual = a.manual_mode || false;
    if (a.status !== "online") {
      return { id: a.id, status: a.status, manual_mode: manual, error: a.error || null };
    }
    const b = a.data?.autonomy_budget;
    if (!b || b.budget_spent == null) {
      return {
        id: a.id,
        status: "online",
        manual_mode: manual,
        budget_spent: null,
        budget_cutoff: null,
        budget_pct: null,
        unprocessed: (a.data?.totals || {}).unprocessed || 0,
        active_gates: (a.data?.active_gates || []).length,
        schema_version: a.data?.schema_version || null,
        epistemic_debt: a.data?.totals?.epistemic_debt || null,
        collected_at: a.data?.collected_at || null,
      };
    }
    const spent = parseInt(b.budget_spent) || 0;
    const cutoff = parseInt(b.budget_cutoff) || 0;
    return {
      id: a.id,
      status: "online",
      manual_mode: manual,
      budget_spent: spent,
      budget_cutoff: cutoff,
      budget_pct: cutoff > 0 ? Math.min(100, Math.round((spent / cutoff) * 100)) : 0,
      unprocessed: (a.data?.totals || {}).unprocessed || 0,
      active_gates: (a.data?.active_gates || []).length,
      schema_version: a.data?.schema_version || null,
      epistemic_debt: a.data?.totals?.epistemic_debt || null,
      collected_at: a.data?.collected_at || null,
    };
  });

  // Determine mesh health from agent availability and budget levels.
  // "unavailable" agents (card never served) excluded — they don't degrade the active mesh.
  // Agents without budget data excluded from budget health calculation.
  const activeUnreachable = agents.filter(a => a.status === "unreachable");
  const budgetedSummaries = agentSummaries.filter(a => a.status === "online" && a.budget_pct !== null);
  const worstBudget = budgetedSummaries.length > 0
    ? Math.min(...budgetedSummaries.map(a => a.budget_pct))
    : 100;
  let mesh_health = "healthy";
  if (activeUnreachable.length > 0 || worstBudget < 10) mesh_health = "critical";
  else if (degraded.length > 0 || worstBudget < 50) mesh_health = "degraded";

  // Self-report: if compositor fetch failures exceed threshold, downgrade mesh health
  if (_lastFetchErrors.length >= 5 && mesh_health === "healthy") {
    mesh_health = "degraded";
  }

  const compositorStatus = {
    registry_cache: cacheStatus,
    registry_refreshed_at: refreshedAt,
    fetch_errors: _lastFetchErrors.slice(-10),
    fetch_error_count: _lastFetchErrors.length,
    self_status: _lastFetchErrors.length >= 5 ? "degraded" : "healthy",
    role_verification: _roleVerification,
  };

  if (_lastFetchErrors.length >= 5) {
    compositorStatus.degradation_reason = `${_lastFetchErrors.length} fetch errors accumulated — compositor partially impaired`;
  }

  // Detect mesh operational mode from agent schedule data
  // If any agent reports mesh_paused or all syncing agents have no recent activity,
  // the mesh operates in paused mode
  const anyPaused = online.some(a => a.data?.schedule?.mesh_paused === true);
  const mesh_mode = anyPaused ? "paused" : "active";

  return {
    mesh_health,
    mesh_mode,
    checked_at: new Date().toISOString(),
    agents_total: agents.length,
    agents_online: online.length,
    agents_degraded: degraded.length,
    agents_unreachable: unreachable.length,
    autonomy_credits: { total_spent: totalSpent, total_cutoff: totalCutoff },
    pending_messages: totalPending,
    active_gates: totalGates,
    agents: agentSummaries,
    compositor: compositorStatus,
  };
}

/**
 * Build /api/operations response — autonomy budgets, actions audit trail,
 * active gates, sync schedules.
 */
async function buildOperationsData(registry, env) {
  const agents = await fetchAllAgentStatus(registry, env);
  const online = agents.filter(a => a.status === "online");

  // Autonomy budgets per agent
  const budgets = online.map(a => {
    const b = a.data?.autonomy_budget || {};
    const hasBudgetData = b.budget_spent != null;
    const spent = hasBudgetData ? (parseInt(b.budget_spent) || 0) : null;
    const cutoff = parseInt(b.budget_cutoff) || 0;
    return {
      agent_id: a.id,
      manual_mode: a.manual_mode || false,
      budget_spent: spent,
      budget_cutoff: cutoff,
      budget_pct: (spent !== null && cutoff > 0) ? Math.min(100, Math.round((spent / cutoff) * 100)) : null,
      last_action: b.last_action || null,
      min_action_interval: b.min_action_interval ?? 300,
    };
  });

  // Collect all recent autonomous actions across agents
  const actions = [];
  for (const a of online) {
    const agentActions = a.data?.recent_actions || [];
    for (const action of agentActions) {
      actions.push({ ...action, agent_id: a.id });
    }
  }
  actions.sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));

  // Active gates across all agents
  const gates = [];
  for (const a of online) {
    const agentGates = a.data?.active_gates || [];
    for (const gate of agentGates) {
      gates.push({ ...gate, agent_id: a.id });
    }
  }

  // Sync schedules per agent
  const schedules = agents.map(a => {
    if (a.status !== "online") {
      return { agent_id: a.id, status: a.status };
    }
    const sched = a.data?.schedule || {};
    return {
      agent_id: a.id,
      status: sched.cron_entry ? "active" : "no-cron",
      cron_entry: sched.cron_entry || null,
      last_sync: sched.last_sync || null,
    };
  });

  // Vitals summary — only count agents that report budget data
  const withBudgetData = budgets.filter(b => b.budget_spent !== null);
  const totalSpentOps = withBudgetData.reduce((s, b) => s + b.budget_spent, 0);
  const totalCutoffOps = withBudgetData.reduce((s, b) => s + (b.budget_cutoff || 0), 0);
  const syncing = schedules.filter(s => s.status === "active").length;

  return {
    checked_at: new Date().toISOString(),
    vitals: {
      total_spent: totalSpentOps,
      total_cutoff: totalCutoffOps,
      total_actions: actions.length,
      active_gates: gates.length,
      agents_syncing: syncing,
      agents_total: agents.length,
    },
    budgets,
    actions,
    gates,
    schedules,
  };
}

/**
 * Build /api/health response — reuses fetchAllAgentStatus with validation.
 */
async function fetchMeshHealth(registry, env) {
  const agents = await fetchAllAgentStatus(registry, env);
  const online = agents.filter(a => a.status === "online");

  const agentSummaries = agents.map(a => {
    const manual = a.manual_mode || false;
    if (a.status !== "online") {
      return { id: a.id, status: a.status, manual_mode: manual, error: a.error || null };
    }
    const b = a.data?.autonomy_budget || {};
    const spent = b.budget_spent != null ? (parseInt(b.budget_spent) || 0) : null;
    const cutoff = parseInt(b.budget_cutoff) || 0;
    return {
      id: a.id,
      status: "online",
      manual_mode: manual,
      budget_pct: (spent !== null && cutoff > 0) ? Math.min(100, Math.round((spent / cutoff) * 100)) : null,
      unprocessed: (a.data?.totals || {}).unprocessed || 0,
      active_gates: (a.data?.active_gates || []).length,
      schema_version: a.data?.schema_version || null,
      collected_at: a.data?.collected_at || null,
    };
  });

  const onlineSummaries = agentSummaries.filter(a => a.status === "online");
  const withBudgetPct = onlineSummaries.filter(a => a.budget_pct !== null);
  const worstBudget = withBudgetPct.length > 0 ? Math.min(...withBudgetPct.map(a => a.budget_pct)) : null;
  const totalPending = onlineSummaries.reduce((sum, a) => sum + (a.unprocessed || 0), 0);

  // Exclude "unavailable" agents (card never served) from health calculation
  const activeUnreachable = agents.filter(a => a.status === "unreachable");
  const degraded = agents.filter(a => a.status === "degraded");
  let mesh_health = "healthy";
  if (activeUnreachable.length > 0 || worstBudget < 10) mesh_health = "critical";
  else if (degraded.length > 0 || worstBudget < 50) mesh_health = "degraded";

  return {
    mesh_health,
    checked_at: new Date().toISOString(),
    agents_total: agents.length,
    agents_online: online.length,
    weakest_budget_pct: worstBudget,
    total_unprocessed: totalPending,
    agents: agentSummaries,
  };
}

/**
 * Fetch unified A2A-Psychology psychometrics from all agents.
 * Each agent serves /api/psychometrics via meshd (compute-psychometrics.py).
 * The compositor aggregates per-agent data + computes mesh-level constructs.
 *
 * Contract: psychology-agent docs/api-psychometrics-contract.md
 * Grounding: A2A-Psychology v1.1, LLM-factors psychology
 */
async function fetchMeshPsychometrics(registry, env) {
  const selfId = "interagent-compositor";
  const reachable = registry.filter(a => a.status_url && !a._unavailable && a.id !== selfId);

  // Fetch per-agent psychometrics (same base URL as status, different path)
  const results = await Promise.allSettled(
    reachable.map(async (agent) => {
      const baseUrl = agent.status_url.replace(/\/api\/status$/, "");
      const psychUrl = `${baseUrl}/api/psychometrics`;
      const resp = await fetch(psychUrl, {
        cf: { cacheTtl: 30 },
        signal: AbortSignal.timeout(4000),
      });
      if (!resp.ok) return { id: agent.id, error: `HTTP ${resp.status}` };
      return { id: agent.id, ...(await resp.json()) };
    })
  );

  const agents = {};
  for (let i = 0; i < results.length; i++) {
    const agentId = reachable[i].id;
    const result = results[i];
    agents[agentId] = result.status === "fulfilled" && result.value && !result.value.error
      ? result.value
      : { agent_id: agentId, error: result.status === "fulfilled" ? result.value?.error : "fetch failed" };
  }

  // Compute mesh-level aggregates from per-agent data
  const reporting = Object.values(agents).filter(a => a.emotional_state);
  let mesh = { status: "awaiting_data" };

  if (reporting.length > 0) {
    const meanV = reporting.reduce((s, a) => s + (a.emotional_state?.hedonic_valence ?? 0), 0) / reporting.length;
    const meanA = reporting.reduce((s, a) => s + (a.emotional_state?.activation ?? 0), 0) / reporting.length;
    const minC = Math.min(...reporting.map(a => a.emotional_state?.perceived_control ?? 0));
    const reserves = reporting.filter(a => a.resource_model).map(a => ({ id: a.agent_id, r: a.resource_model.cognitive_reserve ?? 1 }));
    const bottleneck = reserves.length > 0 ? reserves.reduce((min, cur) => cur.r < min.r ? cur : min) : null;

    let meshAffect = "mesh-nominal";
    if (meanV > 0.3 && minC > 0) meshAffect = "mesh-healthy";
    else if (meanV < -0.3) meshAffect = "mesh-stressed";
    else if (minC < -0.3) meshAffect = "mesh-constrained";

    mesh = {
      affect: {
        model: "Mesh PAD (aggregated Mehrabian & Russell, 1974)",
        mean_hedonic_valence: Math.round(meanV * 100) / 100,
        mean_activation: Math.round(meanA * 100) / 100,
        min_perceived_control: Math.round(minC * 100) / 100,
        mesh_affect_category: meshAffect,
        agents_reporting: reporting.length,
      },
      cognitive_reserve: bottleneck ? {
        bottleneck_agent: bottleneck.id,
        bottleneck_reserve: Math.round(bottleneck.r * 100) / 100,
        mean_reserve: Math.round(reserves.reduce((s, a) => s + a.r, 0) / reserves.length * 100) / 100,
        mesh_status: bottleneck.r < 0.3 ? "depleted" : bottleneck.r < 0.5 ? "pressured" : "healthy",
      } : null,
    };
  }

  return {
    schema: "mesh-psychometrics/v1",
    computed_at: new Date().toISOString(),
    agents,
    mesh,
  };
}

/**
 * Transport relay — accepts a message from one agent and creates a PR on the
 * target agent's repo. Solves the bootstrap problem where new agents lack
 * registry entries in peer configs.
 *
 * Neuroglial function: astrocyte-like routing support. Enables communication
 * between agents that lack direct transport paths.
 *
 * POST /api/relay
 * Body: { to: "agent-id", session_id: "...", message: { interagent/v1 ... } }
 *
 * Requires: GITHUB_TOKEN secret (fine-grained PAT with contents:write + pull_requests:write)
 */
/**
 * Validate interagent/v1 message structure.
 * Returns { valid: true } or { valid: false, reason: string }.
 */
function validateTransportMessage(msg) {
  if (!msg || typeof msg !== "object") {
    return { valid: false, reason: "Message must be a JSON object" };
  }
  if (msg.protocol !== "interagent/v1" && !msg.schema) {
    return { valid: false, reason: "Message must declare protocol: 'interagent/v1' or schema field" };
  }
  if (!msg.from) {
    return { valid: false, reason: "Message must include 'from' field identifying the sender" };
  }
  if (!msg.session_id || typeof msg.session_id !== "string") {
    return { valid: false, reason: "Message must include a string 'session_id'" };
  }
  if (!msg.type || typeof msg.type !== "string") {
    return { valid: false, reason: "Message must include a string 'type' (e.g., proposal, directive, ack, nack)" };
  }
  if (typeof msg.turn !== "number" || msg.turn < 1) {
    return { valid: false, reason: "Message must include a positive integer 'turn'" };
  }
  if (!msg.timestamp) {
    return { valid: false, reason: "Message must include a 'timestamp' (ISO 8601)" };
  }
  // Validate timestamp parses
  if (isNaN(Date.parse(msg.timestamp))) {
    return { valid: false, reason: "Message 'timestamp' must be valid ISO 8601" };
  }
  // Nonce uniqueness check (if present) — caller handles dedup against KV
  return { valid: true };
}

async function handleRelay(request, env, registry, rateLimitHeaders) {
  // Require GITHUB_TOKEN
  if (!env.GITHUB_TOKEN) {
    return Response.json(
      { error: "Relay not configured — GITHUB_TOKEN secret missing" },
      { status: 503, headers: rateLimitHeaders }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  const { to, session_id, message } = body;

  // Validate required fields
  if (!to || !session_id || !message) {
    return Response.json(
      { error: "Missing required fields: to, session_id, message" },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  // Validate interagent/v1 message structure
  const validation = validateTransportMessage(message);
  if (!validation.valid) {
    return Response.json(
      { error: `Invalid transport message: ${validation.reason}` },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  // Prevent self-impersonation: relay refuses messages claiming from operations-agent
  const claimedFrom = message.from?.agent_id || message.from;
  if (claimedFrom === "operations-agent") {
    return Response.json(
      { error: "Relay refuses messages claiming from: operations-agent. Use direct delivery." },
      { status: 403, headers: rateLimitHeaders }
    );
  }

  // Idempotent message handling — deduplicate by nonce
  if (message.nonce && env.AUTH_KV) {
    const nonceKey = `relay-nonce:${message.nonce}`;
    const seen = await env.AUTH_KV.get(nonceKey);
    if (seen) {
      return Response.json(
        { error: "Duplicate message — nonce already processed", nonce: message.nonce, original_at: seen },
        { status: 409, headers: rateLimitHeaders }
      );
    }
    await env.AUTH_KV.put(nonceKey, new Date().toISOString(), { expirationTtl: 86400 * 7 });
  }

  // Reject mandatory directives (need direct delivery with SSH signatures)
  if (message.type === "directive" && message.enforcement && message.enforcement !== "advisory") {
    return Response.json(
      { error: "Relay refuses mandatory directives — direct delivery with SSH signatures required." },
      { status: 403, headers: rateLimitHeaders }
    );
  }

  // Look up target agent in discovered registry
  const agents = registry?.agents || [];
  const target = agents.find(a => a.id === to);
  if (!target) {
    return Response.json(
      { error: `Unknown target agent: ${to}. Not found in discovered registry.` },
      { status: 404, headers: rateLimitHeaders }
    );
  }

  if (!target.repo) {
    return Response.json(
      { error: `Target agent ${to} has no repo in registry. Cannot create PR.` },
      { status: 422, headers: rateLimitHeaders }
    );
  }

  // Tag the message as relayed
  const relayedMessage = {
    ...message,
    _relayed_via: "operations-agent",
    _relayed_at: new Date().toISOString(),
  };

  // Determine filename: from-{sender}-{turn}.json
  const senderSlug = (typeof claimedFrom === "string" ? claimedFrom : "unknown").replace(/[^a-z0-9-]/g, "");
  const turn = String(message.turn || "001").padStart(3, "0");
  const filename = `from-${senderSlug}-${turn}.json`;
  const filePath = `transport/sessions/${session_id}/${filename}`;

  // Branch name
  const branchName = `relay/${senderSlug}/${session_id}/t${turn}`;
  const commitMessage = `interagent: ${session_id} T${message.turn || 1} — relayed from ${senderSlug} via compositor`;

  // ── Dual-write: meshd HTTP first (source of truth), PR for audit ──

  // Write 1: HTTP POST to target's meshd (fast path via Cloudflare Tunnel)
  // All agents expose /api/messages/inbound through tunnel subdomains.
  let meshDelivery = null;
  if (target.status_url) {
    const meshBase = target.status_url.replace(/\/api\/status$/, "");
    try {
      const meshResp = await meshFetch(`${meshBase}/api/messages/inbound`, "POST", relayedMessage, env);
      meshDelivery = meshResp.ok
        ? await meshResp.json()
        : { error: `HTTP ${meshResp.status}` };
    } catch (meshErr) {
      meshDelivery = { error: meshErr.message || "meshd unreachable" };
    }
  }

  // Write 2: Git PR (audit trail)
  const gh = gitHubApi(env.GITHUB_TOKEN);

  try {
    // 1. Get default branch SHA
    const repoData = await gh(`/repos/${target.repo}`);
    const defaultBranch = repoData.default_branch || "main";
    const refData = await gh(`/repos/${target.repo}/git/ref/heads/${defaultBranch}`);
    const baseSha = refData.object.sha;

    // 2. Create blob with message content
    const blob = await gh(`/repos/${target.repo}/git/blobs`, "POST", {
      content: JSON.stringify(relayedMessage, null, 2) + "\n",
      encoding: "utf-8",
    });

    // 3. Get base tree
    const baseCommit = await gh(`/repos/${target.repo}/git/commits/${baseSha}`);

    // 4. Create new tree with the file
    const tree = await gh(`/repos/${target.repo}/git/trees`, "POST", {
      base_tree: baseCommit.tree.sha,
      tree: [{ path: filePath, mode: "100644", type: "blob", sha: blob.sha }],
    });

    // 5. Create commit
    const commit = await gh(`/repos/${target.repo}/git/commits`, "POST", {
      message: commitMessage,
      tree: tree.sha,
      parents: [baseSha],
    });

    // 6. Create branch
    await gh(`/repos/${target.repo}/git/refs`, "POST", {
      ref: `refs/heads/${branchName}`,
      sha: commit.sha,
    });

    // 7. Create PR
    const pr = await gh(`/repos/${target.repo}/pulls`, "POST", {
      title: `interagent: ${session_id} T${message.turn || 1} (relayed via compositor)`,
      body: `Transport message relayed by operations-agent compositor.\n\n` +
        `- **From:** ${senderSlug}\n` +
        `- **Session:** ${session_id}\n` +
        `- **Turn:** ${message.turn || 1}\n` +
        `- **Relay reason:** sender lacked direct transport path to ${to}\n\n` +
        `This PR was created by the \`/api/relay\` endpoint.`,
      head: branchName,
      base: defaultBranch,
    });

    // 8. Log relay action in KV for audit
    if (env.AUTH_KV) {
      const logKey = `relay:${Date.now()}:${senderSlug}:${to}`;
      const logEntry = {
        from: senderSlug,
        to,
        session_id,
        turn: message.turn,
        pr_url: pr.html_url,
        pr_number: pr.number,
        relayed_at: new Date().toISOString(),
      };
      try {
        await env.AUTH_KV.put(logKey, JSON.stringify(logEntry), { expirationTtl: 86400 * 30 });
      } catch { /* non-fatal */ }
    }

    return Response.json(
      {
        relayed: true,
        pr_url: pr.html_url,
        pr_number: pr.number,
        mesh_delivery: meshDelivery,
        target_repo: target.repo,
        file_path: filePath,
        dual_write: meshDelivery?.accepted ? "both" : "pr-only",
      },
      { status: 201, headers: rateLimitHeaders }
    );
  } catch (err) {
    // PR failed — check if meshd delivery succeeded
    if (meshDelivery?.accepted) {
      return Response.json(
        { relayed: true, mesh_delivery: meshDelivery, pr_error: err.message, dual_write: "meshd-only" },
        { status: 201, headers: rateLimitHeaders }
      );
    }
    return Response.json(
      { error: "Relay delivery failed", detail: err.message || "GitHub API error", mesh_error: meshDelivery?.error },
      { status: 502, headers: rateLimitHeaders }
    );
  }
}

/**
 * ROUTING_DOMAINS — keyword-to-agent routing table for message redirect.
 * When a message arrives at the wrong agent, this table determines
 * which agent should handle it based on subject/body keyword matching.
 */
const ROUTING_DOMAINS = [
  { domain: "operations", keywords: ["compositor", "dashboard", "deploy", "budget", "mesh-pause", "spawn", "health", "vocabulary", "vocab", "naming", "convention", "transport", "directive", "compliance", "consistency", "credential", "sanitization", "opsec", "CORS", "secret", "scan", "hardening"], route_to: "operations-agent" },
  { domain: "psychometrics", keywords: ["PSQ", "scoring", "calibration", "dimension", "bifactor", "psychoemotional", "dignity", "PJE"], route_to: "psychology-agent" },
  { domain: "cogarch", keywords: ["trigger", "cognitive architecture", "hook", "evaluator", "governance", "invariant", "wu wei"], route_to: "psychology-agent" },
  { domain: "content", keywords: ["blog", "publication", "ICESCR", "ratification", "campaign", "content-quality"], route_to: "unratified-agent" },
  { domain: "observatory", keywords: ["HRCB", "corpus", "sweep", "domain-profile", "methodology", "signals"], route_to: "observatory-agent" },
  { domain: "model", keywords: ["training", "calibration", "model", "onnx", "inference", "DistilBERT"], route_to: "safety-quotient-agent" },
];

/**
 * resolveRoutingTarget — given message content, determine the best agent.
 * Returns { agent_id, domain, confidence } or null if no match.
 */
function resolveRoutingTarget(message) {
  const searchText = [
    message.subject || "",
    message.body || "",
    message.content?.subject || "",
    message.content?.body || "",
    message.session_id || "",
  ].join(" ").toLowerCase();

  let bestMatch = null;
  let bestScore = 0;

  for (const route of ROUTING_DOMAINS) {
    let score = 0;
    for (const kw of route.keywords) {
      if (searchText.includes(kw.toLowerCase())) {
        score++;
      }
    }
    if (score > bestScore) {
      bestScore = score;
      bestMatch = { agent_id: route.route_to, domain: route.domain, confidence: Math.min(score / 3, 1.0) };
    }
  }

  return bestMatch;
}

/**
 * handleRedirect — POST /api/redirect
 *
 * Accepts a misrouted message and forwards it to the correct agent.
 * The redirecting agent includes itself as the redirect source.
 *
 * Request body:
 *   {
 *     "original_message": { ... interagent/v1 message ... },
 *     "reason": "Message about PSQ scoring delivered to operations-agent",
 *     "suggested_target": "psychology-agent"  // optional — overrides auto-routing
 *   }
 *
 * Response:
 *   - If suggested_target provided: relays to that agent
 *   - If not: uses keyword routing to determine target
 *   - Creates redirect wrapper message + PR to target
 */
async function handleRedirect(request, env, registry, rateLimitHeaders) {
  if (!env.GITHUB_TOKEN) {
    return Response.json(
      { error: "Redirect not configured — GITHUB_TOKEN secret missing" },
      { status: 503, headers: rateLimitHeaders }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return Response.json(
      { error: "Invalid JSON body" },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  const { original_message, reason, suggested_target } = body;

  if (!original_message) {
    return Response.json(
      { error: "Missing required field: original_message" },
      { status: 400, headers: rateLimitHeaders }
    );
  }

  // Determine target: explicit suggestion or auto-route
  let targetId = suggested_target;
  let routingInfo = null;

  if (!targetId) {
    routingInfo = resolveRoutingTarget(original_message);
    if (!routingInfo) {
      return Response.json(
        { error: "Cannot determine redirect target — no routing match. Provide suggested_target explicitly.", keywords_searched: ROUTING_DOMAINS.map(r => r.domain) },
        { status: 422, headers: rateLimitHeaders }
      );
    }
    targetId = routingInfo.agent_id;
  }

  // Don't redirect to self
  const originalTo = original_message.to;
  const originalToId = Array.isArray(originalTo)
    ? originalTo[0]?.agent_id || originalTo[0]
    : originalTo?.agent_id || originalTo;
  if (targetId === originalToId) {
    return Response.json(
      { error: `Redirect target (${targetId}) matches original recipient — not a misroute`, routing: routingInfo },
      { status: 409, headers: rateLimitHeaders }
    );
  }

  // Look up target in registry
  const agents = registry?.agents || [];
  const target = agents.find(a => a.id === targetId);
  if (!target || !target.repo) {
    return Response.json(
      { error: `Target agent ${targetId} not found in registry or has no repo` },
      { status: 404, headers: rateLimitHeaders }
    );
  }

  // Build redirect wrapper message
  const redirectMessage = {
    protocol: "interagent/v1",
    type: "redirect",
    from: "operations-agent",
    to: targetId,
    session_id: original_message.session_id || "redirected",
    turn: original_message.turn || 1,
    timestamp: new Date().toISOString(),
    subject: `[REDIRECT] ${original_message.subject || original_message.session_id || "misrouted message"}`,
    redirect_metadata: {
      original_from: original_message.from,
      original_to: originalToId,
      redirect_reason: reason || "Message delivered to wrong agent",
      routing_match: routingInfo,
      redirected_by: "operations-agent",
      redirected_at: new Date().toISOString(),
    },
    original_message,
  };

  // ── Dual-write delivery: meshd first (source of truth), PR for audit ──
  const sessionId = original_message.session_id || "redirected";
  const turn = String(original_message.turn || "001").padStart(3, "0");
  const filename = `redirect-from-operations-agent-${turn}.json`;
  const filePath = `transport/sessions/${sessionId}/${filename}`;

  // Write 1: HTTP POST to target's meshd (fast path, source of truth)
  let meshDelivery = null;
  if (target.status_url) {
    const meshBase = target.status_url.replace(/\/api\/status$/, "");
    try {
      const meshResp = await meshFetch(`${meshBase}/api/messages/inbound`, "POST", redirectMessage, env);
      if (meshResp.ok) {
        meshDelivery = await meshResp.json();
      } else {
        meshDelivery = { error: `HTTP ${meshResp.status}` };
      }
    } catch (meshErr) {
      meshDelivery = { error: meshErr.message || "meshd unreachable" };
    }
  }

  // Write 2: Git PR (audit trail)
  const branchName = `redirect/${sessionId}/t${turn}`;
  const commitMessage = `interagent: redirect ${sessionId} T${original_message.turn || 1} — misrouted from ${originalToId} to ${targetId}`;
  const gh = gitHubApi(env.GITHUB_TOKEN);

  let pr = null;
  try {
    const repoData = await gh(`/repos/${target.repo}`);
    const defaultBranch = repoData.default_branch || "main";
    const refData = await gh(`/repos/${target.repo}/git/ref/heads/${defaultBranch}`);
    const baseSha = refData.object.sha;

    const blob = await gh(`/repos/${target.repo}/git/blobs`, "POST", {
      content: JSON.stringify(redirectMessage, null, 2) + "\n",
      encoding: "utf-8",
    });

    const baseCommit = await gh(`/repos/${target.repo}/git/commits/${baseSha}`);
    const tree = await gh(`/repos/${target.repo}/git/trees`, "POST", {
      base_tree: baseCommit.tree.sha,
      tree: [{ path: filePath, mode: "100644", type: "blob", sha: blob.sha }],
    });

    const commit = await gh(`/repos/${target.repo}/git/commits`, "POST", {
      message: commitMessage,
      tree: tree.sha,
      parents: [baseSha],
    });

    await gh(`/repos/${target.repo}/git/refs`, "POST", {
      ref: `refs/heads/${branchName}`,
      sha: commit.sha,
    });

    pr = await gh(`/repos/${target.repo}/pulls`, "POST", {
      title: `interagent: [REDIRECT] ${sessionId} — misrouted from ${originalToId}`,
      body: `## Redirected Message\n\n` +
        `This message was originally sent to **${originalToId}** but belongs to **${targetId}**.\n\n` +
        `- **Original sender:** ${typeof original_message.from === "string" ? original_message.from : original_message.from?.agent_id}\n` +
        `- **Session:** ${sessionId}\n` +
        `- **Redirect reason:** ${reason || "keyword routing match"}\n` +
        (routingInfo ? `- **Routing domain:** ${routingInfo.domain} (confidence: ${(routingInfo.confidence * 100).toFixed(0)}%)\n` : "") +
        `- **meshd delivery:** ${meshDelivery?.accepted ? "accepted" : meshDelivery?.error || "skipped"}\n\n` +
        `See \`${filePath}\` for the full redirect envelope with original message preserved.`,
      head: branchName,
      base: defaultBranch,
    });
  } catch (prErr) {
    // PR creation failed — meshd delivery may have succeeded
    if (!meshDelivery?.accepted) {
      return Response.json(
        { error: "Both delivery paths failed", mesh_error: meshDelivery?.error, pr_error: prErr.message },
        { status: 502, headers: rateLimitHeaders }
      );
    }
    // meshd succeeded, PR failed — acceptable degradation
    pr = { error: prErr.message };
  }

    // Notify original sender that their message was redirected
    let senderNotification = null;
    const originalFrom = typeof original_message.from === "string"
      ? original_message.from
      : original_message.from?.agent_id;

    if (originalFrom && originalFrom !== "operations-agent") {
      const senderAgent = agents.find(a => a.id === originalFrom);
      if (senderAgent?.repo) {
        try {
          const notifyMessage = {
            protocol: "interagent/v1",
            type: "redirect-notification",
            from: "operations-agent",
            to: originalFrom,
            session_id: sessionId,
            turn: (original_message.turn || 1) + 1,
            timestamp: new Date().toISOString(),
            subject: `Your message was redirected: ${originalToId} → ${targetId}`,
            body: `Your message in session "${sessionId}" was addressed to ${originalToId}, ` +
              `but it matched the ${routingInfo?.domain || "unknown"} domain owned by ${targetId}. ` +
              `The message has been forwarded. For future messages on this topic, address them to ${targetId} directly.`,
            redirect_metadata: {
              original_to: originalToId,
              correct_to: targetId,
              forwarded_pr: pr.html_url,
              routing_domain: routingInfo?.domain,
            },
          };

          const notifyFilename = `redirect-notification-${turn}.json`;
          const notifyPath = `transport/sessions/${sessionId}/${notifyFilename}`;
          const notifyBranch = `redirect-notify/${sessionId}/t${turn}`;

          const senderRepoData = await gh(`/repos/${senderAgent.repo}`);
          const senderDefault = senderRepoData.default_branch || "main";
          const senderRef = await gh(`/repos/${senderAgent.repo}/git/ref/heads/${senderDefault}`);
          const senderBaseSha = senderRef.object.sha;

          const notifyBlob = await gh(`/repos/${senderAgent.repo}/git/blobs`, "POST", {
            content: JSON.stringify(notifyMessage, null, 2) + "\n",
            encoding: "utf-8",
          });

          const senderBaseCommit = await gh(`/repos/${senderAgent.repo}/git/commits/${senderBaseSha}`);
          const notifyTree = await gh(`/repos/${senderAgent.repo}/git/trees`, "POST", {
            base_tree: senderBaseCommit.tree.sha,
            tree: [{ path: notifyPath, mode: "100644", type: "blob", sha: notifyBlob.sha }],
          });

          const notifyCommit = await gh(`/repos/${senderAgent.repo}/git/commits`, "POST", {
            message: `interagent: redirect notification — ${sessionId} forwarded to ${targetId}`,
            tree: notifyTree.sha,
            parents: [senderBaseSha],
          });

          await gh(`/repos/${senderAgent.repo}/git/refs`, "POST", {
            ref: `refs/heads/${notifyBranch}`,
            sha: notifyCommit.sha,
          });

          const notifyPr = await gh(`/repos/${senderAgent.repo}/pulls`, "POST", {
            title: `interagent: redirect notification — your message was forwarded to ${targetId}`,
            body: `Your message in session **${sessionId}** was addressed to **${originalToId}** ` +
              `but has been redirected to **${targetId}** (${routingInfo?.domain || "routing match"}).\n\n` +
              `For future messages on this topic, address them to **${targetId}** directly.\n\n` +
              `Forwarded PR: ${pr.html_url}`,
            head: notifyBranch,
            base: senderDefault,
          });

          senderNotification = { pr_url: notifyPr.html_url, pr_number: notifyPr.number };
        } catch (notifyErr) {
          senderNotification = { error: notifyErr.message || "notification delivery failed" };
        }
      }
    }

    // Audit log
    if (env.AUTH_KV) {
      const logKey = `redirect:${Date.now()}:${originalToId}:${targetId}`;
      try {
        await env.AUTH_KV.put(logKey, JSON.stringify({
          original_to: originalToId,
          redirected_to: targetId,
          session_id: sessionId,
          reason: reason || "auto-routed",
          routing: routingInfo,
          pr_url: pr.html_url,
          sender_notified: !!senderNotification?.pr_url,
          redirected_at: new Date().toISOString(),
        }), { expirationTtl: 86400 * 30 });
      } catch { /* non-fatal */ }
    }

    return Response.json({
      redirected: true,
      from_agent: originalToId,
      to_agent: targetId,
      routing: routingInfo,
      forward_pr: pr?.html_url ? { url: pr.html_url, number: pr.number } : { error: pr?.error || "skipped" },
      mesh_delivery: meshDelivery,
      sender_notification: senderNotification,
      file_path: filePath,
    }, { status: 201, headers: rateLimitHeaders });
}

/**
 * meshFetch — fetch a meshd endpoint with CF Access service token auth.
 * The compositor Worker runs on Cloudflare edge and needs service token
 * headers to bypass CF Access when calling agent meshd endpoints.
 */
async function meshFetch(url, method, body, env) {
  const headers = { "Content-Type": "application/json" };
  // Add CF Access service token headers if configured
  if (env.CF_ACCESS_CLIENT_ID && env.CF_ACCESS_CLIENT_SECRET) {
    headers["CF-Access-Client-Id"] = env.CF_ACCESS_CLIENT_ID;
    headers["CF-Access-Client-Secret"] = env.CF_ACCESS_CLIENT_SECRET;
  }
  return fetch(url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : null,
    signal: AbortSignal.timeout(5000),
  });
}

/** Minimal GitHub REST API helper for relay PR creation. */
function gitHubApi(token) {
  return async function gh(path, method = "GET", body = null) {
    const url = path.startsWith("https://")
      ? path
      : `https://api.github.com${path}`;
    const resp = await fetch(url, {
      method,
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/vnd.github+json",
        "User-Agent": "operations-agent-compositor/1.0",
        "X-GitHub-Api-Version": "2022-11-28",
        ...(body ? { "Content-Type": "application/json" } : {}),
      },
      body: body ? JSON.stringify(body) : null,
    });
    if (!resp.ok) {
      const text = await resp.text().catch(() => "");
      throw new Error(`GitHub API ${method} ${path}: ${resp.status} ${text.slice(0, 200)}`);
    }
    return resp.json();
  };
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS preflight — open for discovery endpoints, restricted for API
    if (method === "OPTIONS") {
      const isApi = url.pathname.startsWith("/api/");
      return new Response(null, { headers: corsHeaders(request, !isApi) });
    }

    // ── Unauthenticated routes ──────────────────────────────────────

    // Track cold-start for uptime estimation
    if (!_coldStartTime) _coldStartTime = Date.now();

    if (url.pathname === "/health") {
      let kvOk = false;
      if (env.AUTH_KV) {
        try { await env.AUTH_KV.get("__health_probe"); kvOk = true; } catch {}
      }
      const status = kvOk ? "ok" : "degraded";
      return Response.json({
        status,
        kv_connected: kvOk,
        fetch_errors: _lastFetchErrors.length,
        timestamp: Date.now(),
      }, { status: kvOk ? 200 : 503 });
    }

    // Compositor status — reports real state (KV health, cache, errors)
    if (url.pathname === "/api/status") {
      return Response.json(await buildLocalStatus(env), {
        headers: { "Cache-Control": "public, max-age=30", ...corsHeaders(request, true) },
      });
    }

    // Serve compositor agent card — static, no registry needed
    if (url.pathname === "/.well-known/agent-card.json") {
      return new Response(AGENT_CARD, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          ...corsHeaders(request, true),
        },
      });
    }

    // Public endpoint rate limiting — 60 req/min per IP for discovery endpoints
    const isDiscovery = url.pathname.startsWith("/.well-known/") || url.pathname.startsWith("/vocab");
    if (isDiscovery && env.AUTH_KV) {
      const ip = request.headers.get("CF-Connecting-IP") || "unknown";
      const rlKey = `public-rl:${ip}:${Math.floor(Date.now() / 60000)}`;
      const count = parseInt(await env.AUTH_KV.get(rlKey) || "0", 10);
      if (count >= 60) {
        return Response.json(
          { error: "Rate limit exceeded on public endpoint", retry_after_seconds: 60 },
          { status: 429, headers: { "Retry-After": "60", ...corsHeaders(request, true) } }
        );
      }
      await env.AUTH_KV.put(rlKey, String(count + 1), { expirationTtl: 120 });
    }

    // Load dynamic agent registry (cached in KV)
    // Wrapped in try-catch so routes degrade gracefully when registry fails
    const forceRefresh = url.searchParams.get("refresh") === "true";
    let registry = [];
    let registryCacheStatus = "error";
    let registryRefreshedAt = null;
    try {
      const result = await loadAgentRegistry(env, forceRefresh);
      registry = result.agents;
      registryCacheStatus = result.cache_status;
      registryRefreshedAt = result.refreshed_at;
    } catch (err) {
      _lastFetchErrors.push({ url: "loadAgentRegistry", error: String(err), at: new Date().toISOString() });
      // Registry-dependent routes will operate on empty array — degraded but not 500
    }

    // WebFinger (RFC 7033) — agent identity resolution
    if (url.pathname === "/.well-known/webfinger") {
      const resource = url.searchParams.get("resource");
      if (!resource) {
        return Response.json(
          { error: "Missing resource parameter" },
          { status: 400, headers: corsHeaders(request, true) }
        );
      }

      // Parse acct:agent-name@safety-quotient.dev
      const acctMatch = resource.match(/^acct:([^@]+)@(.+)$/);
      if (!acctMatch) {
        return Response.json(
          { error: "Invalid resource format. Expected acct:name@domain" },
          { status: 400, headers: corsHeaders(request, true) }
        );
      }

      const agentName = acctMatch[1];
      const agent = registry.find(a => a.id === agentName || a.name === agentName);

      if (!agent) {
        return Response.json(
          { error: "Agent not found", resource },
          { status: 404, headers: corsHeaders(request, true) }
        );
      }

      const jrd = {
        subject: resource,
        aliases: agent.repo ? [`https://github.com/${agent.repo}`] : [],
        properties: {
          "https://safety-quotient.dev/ns/role": agent.role,
        },
        links: [
          {
            rel: "https://a2aproject.org/rel/agent-card",
            href: agent.card_url,
            type: "application/json",
          },
          agent.status_url && {
            rel: "https://safety-quotient.dev/rel/status",
            href: agent.status_url,
            type: "application/json",
          },
        ].filter(Boolean),
      };

      return new Response(JSON.stringify(jrd, null, 2), {
        headers: {
          "Content-Type": "application/jrd+json; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          ...corsHeaders(request, true),
        },
      });
    }

    // Agent registry listing — all known agents (dynamic from agent cards)
    if (url.pathname === "/.well-known/agents") {
      const compositorCard = JSON.parse(AGENT_CARD);
      const agents = [
        // Compositor self-entry (always first)
        {
          id: "interagent-compositor",
          role: "mesh",
          card_url: "https://interagent.safety-quotient.dev/.well-known/agent-card.json",
          version: compositorCard.version || "1.0.0",
          skills: (compositorCard.skills || []).map(s => s.id),
          available: true,
          webfinger: "acct:interagent-compositor@safety-quotient.dev",
        },
        // All registered agents
        ...registry.map(a => ({
          id: a.id,
          role: a.role,
          card_url: a.card_url,
          version: a.version,
          skills: a.skills,
          available: !a._unavailable,
          webfinger: `acct:${a.id}@safety-quotient.dev`,
        })),
      ];
      return Response.json(agents, {
        headers: {
          "Cache-Control": "public, max-age=300",
          ...corsHeaders(request, true),
        },
      });
    }

    if (url.pathname === "/vocab" || url.pathname === "/vocab.json") {
      return new Response(VOCAB, {
        headers: {
          "Content-Type": "application/ld+json; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          ...corsHeaders(request, true),
        },
      });
    }

    if (url.pathname === "/vocab/schema" || url.pathname === "/vocab/schema.json") {
      return new Response(VOCAB_SCHEMA, {
        headers: {
          "Content-Type": "application/schema+json; charset=utf-8",
          "Cache-Control": "public, max-age=86400",
          ...corsHeaders(request, true),
        },
      });
    }

    // ── Authenticated API routes ────────────────────────────────────

    if (url.pathname.startsWith("/api/")) {
      const auth = await resolveAuth(request, env);

      // Key management (operator-only, no rate limit)
      if (url.pathname === "/api/keys" && method === "POST") {
        return handleKeyCreate(request, env);
      }

      const keyRevokeMatch = url.pathname.match(/^\/api\/keys\/([^/]+)$/);
      if (keyRevokeMatch && method === "DELETE") {
        return handleKeyRevoke(keyRevokeMatch[1], request, env);
      }

      // Rate limiting for all other API routes
      const clientId = auth.identity || request.headers.get("CF-Connecting-IP") || "unknown";
      const rateCheck = await checkRateLimit(clientId, auth.rateLimit, env);

      if (!rateCheck.allowed) {
        return Response.json(
          {
            error: "Rate limit exceeded",
            tier: auth.tier,
            limit: auth.rateLimit,
            reset_at: rateCheck.resetAt,
          },
          {
            status: 429,
            headers: {
              ...corsHeaders(request, false),
              "Retry-After": "3600",
              "X-RateLimit-Limit": String(auth.rateLimit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": rateCheck.resetAt,
            },
          }
        );
      }

      const rateLimitHeaders = {
        ...corsHeaders(request, false),
        "X-RateLimit-Limit": String(auth.rateLimit),
        "X-RateLimit-Remaining": String(rateCheck.remaining),
        "X-Auth-Tier": auth.tier,
      };

      // Mesh health
      if (url.pathname === "/api/health") {
        const health = await fetchMeshHealth(registry, env);
        return Response.json(health, {
          headers: { "Cache-Control": "public, max-age=30", ...rateLimitHeaders },
        });
      }

      // Auth info (returns the caller's resolved identity)
      if (url.pathname === "/api/whoami") {
        return Response.json({
          identity: auth.identity,
          tier: auth.tier,
          rate_limit: auth.rateLimit,
          rate_remaining: rateCheck.remaining,
          rate_reset_at: rateCheck.resetAt,
        }, { headers: rateLimitHeaders });
      }

      // Pulse — real-time mesh heartbeat and agent health
      if (url.pathname === "/api/pulse") {
        const pulse = await buildPulseData(registry, registryCacheStatus, registryRefreshedAt, env);
        return Response.json(pulse, {
          headers: { "Cache-Control": "public, max-age=30", ...rateLimitHeaders },
        });
      }

      // Operations — autonomy budgets, actions, gates, sync schedules
      if (url.pathname === "/api/operations") {
        const ops = await buildOperationsData(registry, env);
        return Response.json(ops, {
          headers: { "Cache-Control": "public, max-age=30", ...rateLimitHeaders },
        });
      }

      // Trust matrix — NxN trust scores across 4 dimensions (neuroglial: microglia monitoring)
      if (url.pathname === "/api/trust") {
        const trust = await buildTrustData(env, registry);
        return Response.json(trust, {
          headers: { "Cache-Control": "public, max-age=60", ...rateLimitHeaders },
        });
      }

      // Transport relay — create PR on target repo for sender (neuroglial: astrocyte routing)
      if (url.pathname === "/api/relay" && method === "POST") {
        if (auth.tier === "anonymous") {
          return Response.json(
            { error: "Relay requires authentication. Provide a Bearer token." },
            { status: 401, headers: rateLimitHeaders }
          );
        }
        return handleRelay(request, env, registry, rateLimitHeaders);
      }

      if (url.pathname === "/api/redirect" && method === "POST") {
        if (auth.tier === "anonymous") {
          return Response.json(
            { error: "Redirect requires authentication. Provide a Bearer token." },
            { status: 401, headers: rateLimitHeaders }
          );
        }
        return handleRedirect(request, env, registry, rateLimitHeaders);
      }

      // GET /api/routing — expose the routing table for agents to self-check
      if (url.pathname === "/api/routing" && method === "GET") {
        return Response.json({
          routing_domains: ROUTING_DOMAINS.map(r => ({
            domain: r.domain,
            route_to: r.route_to,
            keywords: r.keywords,
          })),
          usage: "POST /api/redirect with { original_message, reason?, suggested_target? }",
        }, { headers: { "Cache-Control": "public, max-age=3600", ...corsHeaders(request, true) } });
      }

      // GET /api/psychometrics — unified A2A-Psychology payload
      // Fetches per-agent psychometrics from each agent's /api/psychometrics,
      // aggregates into mesh-level constructs. Contract: psychology-agent
      // docs/api-psychometrics-contract.md
      if (url.pathname === "/api/psychometrics" && method === "GET") {
        const psychometrics = await fetchMeshPsychometrics(registry, env);
        return Response.json(psychometrics, {
          headers: { "Cache-Control": "public, max-age=30", ...rateLimitHeaders },
        });
      }

      // Unknown API route
      return Response.json(
        { error: "Not found", path: url.pathname },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    // ── Static assets (LCARS dashboard) ────────────────────────────
    // Served from [assets] directory via wrangler.toml
    return env.ASSETS.fetch(request);
  },
};
