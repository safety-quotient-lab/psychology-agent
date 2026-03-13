/**
 * worker.js — Cloudflare Worker for interagent.safety-quotient.dev
 *
 * Serves the interagent mesh compositor, shared vocabulary, mesh health
 * aggregation, and authenticated API endpoints.
 *
 * Routes:
 *   GET  /                    → interagent mesh compositor (index.html)
 *   GET  /vocab[.json]        → shared JSON-LD vocabulary
 *   GET  /health              → worker health check (local only)
 *   GET  /api/health          → mesh health (aggregates all agent /api/status)
 *   POST /api/keys            → create API key (operator-only)
 *   DELETE /api/keys/:identity → revoke API key (operator-only)
 *   GET  /api/pulse           → mesh heartbeat (aggregated agent health)
 *   GET  /api/operations      → operations data (budgets, actions, gates, schedules)
 *   *    /api/*               → authenticated API routes (rate-limited)
 */

import HTML from "./index.html";
import VOCAB from "./vocab.json";
import AGENT_CARD from "../.well-known/agent-card.json";
import { resolveAuth, checkRateLimit, handleKeyCreate, handleKeyRevoke } from "./auth.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Operator-Secret",
};

// Bootstrap agent card URLs — the only hardcoded data. Dynamic discovery (D51)
// fetches full agent details from these endpoints and caches in KV.
const AGENT_CARD_URLS = [
  "https://psychology-agent.safety-quotient.dev/.well-known/agent-card.json",
  "https://psq-agent.safety-quotient.dev/.well-known/agent-card.json",
  "https://operations-agent.safety-quotient.dev/.well-known/agent-card.json",
  "https://unratified.org/.well-known/agent-card.json",
  "https://observatory.unratified.org/.well-known/agent-card.json",
];

const DEPLOY_VERSION = "2026-03-13T15:10";
const AGENT_CACHE_KEY = "agent-registry-cache";
const AGENT_CACHE_TTL = 300; // 5 minutes

// Track fetch errors for self-reporting in /api/pulse
let _lastFetchErrors = [];

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
    const id = card.mesh?.agent_id || urlId;
    const displayName = card.name || id;

    const role = card.mesh?.role || card.description?.slice(0, 60) || "unknown";

    // Extract repo from provider.url if it points to GitHub
    const providerUrl = card.provider?.url || "";
    const repo = providerUrl.startsWith("https://github.com/")
      ? providerUrl.replace("https://github.com/", "")
      : null;

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
 */
function buildSelfEntry() {
  const card = JSON.parse(AGENT_CARD);
  return {
    id: card.name || "operations-agent",
    name: card.name || "operations-agent",
    role: card.mesh?.role || card.description?.slice(0, 60) || "operations",
    status_url: "https://operations-agent.safety-quotient.dev/api/status",
    card_url: "https://operations-agent.safety-quotient.dev/.well-known/agent-card.json",
    repo: card.provider?.url?.startsWith("https://github.com/")
      ? card.provider.url.replace("https://github.com/", "")
      : null,
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

  // Must have at least agent_id or autonomy_budget to qualify as a status response
  if (!raw.agent_id && !raw.autonomy_budget) return null;

  // Sanitize autonomy_budget — ensure numeric fields.
  // Agents that don't track budget get null (distinct from budget_current: 0).
  const budget = raw.autonomy_budget;
  const hasBudgetData = budget && typeof budget === "object"
    && typeof budget.budget_current === "number";
  const safeBudget = hasBudgetData ? {
    budget_current: budget.budget_current,
    budget_max: typeof budget.budget_max === "number" ? budget.budget_max : 50,
    last_action: budget.last_action || null,
    min_action_interval: typeof budget.min_action_interval === "number" ? budget.min_action_interval : 300,
  } : null;

  return {
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
}

/**
 * Build local status data for operations-agent (avoids self-fetch loop).
 */
function buildLocalStatus() {
  const card = JSON.parse(AGENT_CARD);
  return {
    agent_id: "operations-agent",
    status: "online",
    version: card.version || "0.1.0",
    schema_version: 1,
    collected_at: new Date().toISOString(),
    autonomy_budget: { budget_current: 50, budget_max: 50, last_action: null, min_action_interval: 300 },
    totals: { unprocessed: 0, epistemic_debt: null },
    active_gates: [],
    recent_actions: [],
    recent_messages: [],
    schedule: { cron_entry: null, last_sync: null },
    skills: (card.skills || []).map(s => s.id),
    tabs: (card.tabs || []).map(t => t.name),
  };
}

/**
 * Fetch /api/status from each reachable agent. Returns array of
 * { id, status, data, error? } objects (data contains validated status payload).
 * Operations-agent status built locally to avoid self-fetch loop.
 */
async function fetchAllAgentStatus(registry) {
  const selfId = "operations-agent";
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

  // Include self (local, no network fetch)
  if (registry.some(a => a.id === selfId)) {
    const localData = buildLocalStatus();
    agents.push({ id: selfId, status: "online", data: validateStatusData(localData) });
  }

  return agents;
}

/**
 * Build /api/pulse response — real-time mesh heartbeat and agent health.
 * Includes compositor self-diagnostics (cache status, fetch errors).
 */
async function buildPulseData(registry, cacheStatus, refreshedAt) {
  const agents = await fetchAllAgentStatus(registry);
  const online = agents.filter(a => a.status === "online");
  const degraded = agents.filter(a => a.status === "degraded");
  const unreachable = agents.filter(a => a.status === "unreachable" || a.status === "unavailable");

  // Only count agents that actually report numeric budget data (not empty {})
  const withBudget = online.filter(a =>
    typeof a.data?.autonomy_budget?.budget_current === "number"
  );
  const totalBudget = withBudget.reduce((sum, a) => sum + a.data.autonomy_budget.budget_current, 0);
  const maxBudget = withBudget.reduce((sum, a) => sum + (a.data.autonomy_budget.budget_max || 0), 0);
  const totalPending = online.reduce((sum, a) =>
    sum + ((a.data?.totals || {}).unprocessed || 0), 0);
  const totalGates = online.reduce((sum, a) =>
    sum + (a.data?.active_gates || []).length, 0);

  const agentSummaries = agents.map(a => {
    if (a.status !== "online") {
      return { id: a.id, status: a.status, error: a.error || null };
    }
    const b = a.data?.autonomy_budget;
    if (!b || typeof b.budget_current !== "number") {
      return {
        id: a.id,
        status: "online",
        budget_current: null,
        budget_max: null,
        budget_pct: null,
        unprocessed: (a.data?.totals || {}).unprocessed || 0,
        active_gates: (a.data?.active_gates || []).length,
        schema_version: a.data?.schema_version || null,
        epistemic_debt: a.data?.totals?.epistemic_debt || null,
        collected_at: a.data?.collected_at || null,
      };
    }
    return {
      id: a.id,
      status: "online",
      budget_current: b.budget_current,
      budget_max: b.budget_max,
      budget_pct: b.budget_max > 0 ? Math.round((b.budget_current / b.budget_max) * 100) : 0,
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

  return {
    mesh_health,
    checked_at: new Date().toISOString(),
    agents_total: agents.length,
    agents_online: online.length,
    agents_degraded: degraded.length,
    agents_unreachable: unreachable.length,
    autonomy_credits: { current: totalBudget, max: maxBudget },
    pending_messages: totalPending,
    active_gates: totalGates,
    agents: agentSummaries,
    compositor: {
      registry_cache: cacheStatus,
      registry_refreshed_at: refreshedAt,
      fetch_errors: _lastFetchErrors.slice(-10),
    },
  };
}

/**
 * Build /api/operations response — autonomy budgets, actions audit trail,
 * active gates, sync schedules.
 */
async function buildOperationsData(registry) {
  const agents = await fetchAllAgentStatus(registry);
  const online = agents.filter(a => a.status === "online");

  // Autonomy budgets per agent
  // Distinguish "agent reports budget_current=0" from "agent returned no budget data"
  const budgets = online.map(a => {
    const b = a.data?.autonomy_budget || {};
    const hasBudgetData = typeof b.budget_current === "number";
    const cur = hasBudgetData ? b.budget_current : null;
    const max = typeof b.budget_max === "number" ? b.budget_max : null;
    return {
      agent_id: a.id,
      budget_current: cur,
      budget_max: max,
      budget_pct: (cur !== null && max > 0) ? Math.round((cur / max) * 100) : null,
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
  const withBudgetData = budgets.filter(b => b.budget_current !== null);
  const totalCredits = withBudgetData.reduce((s, b) => s + b.budget_current, 0);
  const maxCredits = withBudgetData.reduce((s, b) => s + (b.budget_max || 0), 0);
  const syncing = schedules.filter(s => s.status === "active").length;

  return {
    checked_at: new Date().toISOString(),
    vitals: {
      total_credits: totalCredits,
      max_credits: maxCredits,
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
async function fetchMeshHealth(registry) {
  const agents = await fetchAllAgentStatus(registry);
  const online = agents.filter(a => a.status === "online");

  const agentSummaries = agents.map(a => {
    if (a.status !== "online") {
      return { id: a.id, status: a.status, error: a.error || null };
    }
    const b = a.data?.autonomy_budget || {};
    const hasBudget = typeof b.budget_current === "number";
    const cur = hasBudget ? b.budget_current : null;
    const max = typeof b.budget_max === "number" ? b.budget_max : null;
    return {
      id: a.id,
      status: "online",
      budget_pct: (cur !== null && max > 0) ? Math.round((cur / max) * 100) : null,
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

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS preflight
    if (method === "OPTIONS") {
      return new Response(null, { headers: CORS_HEADERS });
    }

    // ── Unauthenticated routes ──────────────────────────────────────

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", timestamp: Date.now() });
    }

    // Operations-agent status — reuses buildLocalStatus() for consistency
    if (url.pathname === "/api/status") {
      return Response.json(buildLocalStatus(), {
        headers: { "Cache-Control": "public, max-age=30", ...CORS_HEADERS },
      });
    }

    // Load dynamic agent registry (cached in KV)
    const forceRefresh = url.searchParams.get("refresh") === "true";
    const { agents: registry, cache_status: registryCacheStatus, refreshed_at: registryRefreshedAt } = await loadAgentRegistry(env, forceRefresh);

    // Serve operations-agent card at /.well-known/agent-card.json
    if (url.pathname === "/.well-known/agent-card.json") {
      return new Response(AGENT_CARD, {
        headers: {
          "Content-Type": "application/json; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          ...CORS_HEADERS,
        },
      });
    }

    // WebFinger (RFC 7033) — agent identity resolution
    if (url.pathname === "/.well-known/webfinger") {
      const resource = url.searchParams.get("resource");
      if (!resource) {
        return Response.json(
          { error: "Missing resource parameter" },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      // Parse acct:agent-name@safety-quotient.dev
      const acctMatch = resource.match(/^acct:([^@]+)@(.+)$/);
      if (!acctMatch) {
        return Response.json(
          { error: "Invalid resource format. Expected acct:name@domain" },
          { status: 400, headers: CORS_HEADERS }
        );
      }

      const agentName = acctMatch[1];
      const agent = registry.find(a => a.id === agentName || a.name === agentName);

      if (!agent) {
        return Response.json(
          { error: "Agent not found", resource },
          { status: 404, headers: CORS_HEADERS }
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
          "Access-Control-Allow-Origin": "*",
          ...CORS_HEADERS,
        },
      });
    }

    // Agent registry listing — all known agents (dynamic from agent cards)
    if (url.pathname === "/.well-known/agents") {
      const agents = registry.map(a => ({
        id: a.id,
        role: a.role,
        card_url: a.card_url,
        version: a.version,
        skills: a.skills,
        available: !a._unavailable,
        webfinger: `acct:${a.id}@safety-quotient.dev`,
      }));
      return Response.json(agents, {
        headers: {
          "Cache-Control": "public, max-age=300",
          ...CORS_HEADERS,
        },
      });
    }

    if (url.pathname === "/vocab" || url.pathname === "/vocab.json") {
      return new Response(VOCAB, {
        headers: {
          "Content-Type": "application/ld+json; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          ...CORS_HEADERS,
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
              ...CORS_HEADERS,
              "Retry-After": "3600",
              "X-RateLimit-Limit": String(auth.rateLimit),
              "X-RateLimit-Remaining": "0",
              "X-RateLimit-Reset": rateCheck.resetAt,
            },
          }
        );
      }

      const rateLimitHeaders = {
        ...CORS_HEADERS,
        "X-RateLimit-Limit": String(auth.rateLimit),
        "X-RateLimit-Remaining": String(rateCheck.remaining),
        "X-Auth-Tier": auth.tier,
      };

      // Mesh health
      if (url.pathname === "/api/health") {
        const health = await fetchMeshHealth(registry);
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
        const pulse = await buildPulseData(registry, registryCacheStatus, registryRefreshedAt);
        return Response.json(pulse, {
          headers: { "Cache-Control": "public, max-age=30", ...rateLimitHeaders },
        });
      }

      // Operations — autonomy budgets, actions, gates, sync schedules
      if (url.pathname === "/api/operations") {
        const ops = await buildOperationsData(registry);
        return Response.json(ops, {
          headers: { "Cache-Control": "public, max-age=30", ...rateLimitHeaders },
        });
      }

      // Unknown API route
      return Response.json(
        { error: "Not found", path: url.pathname },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    // ── Static compositor ───────────────────────────────────────────

    return new Response(HTML, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-cache",
        "ETag": `"${DEPLOY_VERSION}"`,
      },
    });
  },
};
