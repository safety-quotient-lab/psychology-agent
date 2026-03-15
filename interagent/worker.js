/**
 * worker.js — Cloudflare Worker for interagent.safety-quotient.dev
 *
 * Serves the interagent mesh compositor, shared vocabulary, mesh health
 * aggregation, and authenticated API endpoints.
 *
 * Routes:
 *   GET  /                          → interagent mesh compositor (static assets)
 *   GET  /vocab[.json]              → shared JSON-LD vocabulary
 *   GET  /health                    → worker health check (local only)
 *   GET  /.well-known/agent-card.json → compositor agent card (A2A v2)
 *   GET  /api/health                → mesh health (aggregates all agent /api/status)
 *   GET  /api/whoami                → caller identity + auth tier
 *   POST /api/keys                  → create API key (operator-only)
 *   DELETE /api/keys/:identity      → revoke API key (operator-only)
 *   POST /api/diagnostic            → trigger mesh diagnostic (operator-only)
 *   POST /api/halt                  → pause agent(s) (operator-only)
 *   POST /api/resume                → resume agent(s) (operator-only)
 *   POST /api/autonomy/reset        → reset autonomy counters (operator-only)
 *   *    /api/*                      → authenticated API routes (rate-limited)
 */

import VOCAB from "./vocab.json";
import { resolveAuth, checkRateLimit, handleKeyCreate, handleKeyRevoke } from "./auth.js";

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Operator-Secret",
};

const AGENT_ENDPOINTS = [
  { id: "psychology-agent", url: "https://psychology-agent.safety-quotient.dev/api/status" },
  { id: "psq-agent", url: "https://psq-agent.safety-quotient.dev/api/status" },
  { id: "unratified-agent", url: "https://unratified-agent.unratified.org/api/status" },
  { id: "observatory-agent", url: "https://observatory-agent.unratified.org/api/status" },
];

const PSYCHOMETRICS_ENDPOINTS = [
  { id: "psychology-agent", url: "https://psychology-agent.safety-quotient.dev/api/psychometrics" },
  { id: "psq-agent", url: "https://psq-agent.safety-quotient.dev/api/psychometrics" },
  { id: "unratified-agent", url: "https://unratified-agent.unratified.org/api/psychometrics" },
  { id: "observatory-agent", url: "https://observatory-agent.unratified.org/api/psychometrics" },
  { id: "operations-agent", url: "https://operations-agent.safety-quotient.dev/api/psychometrics" },
];

/** meshd serves mesh-level psychometrics (the mesh as its own psychological entity) */
const MESH_PSYCHOMETRICS_URL = "https://operations-agent.safety-quotient.dev/api/psychometrics/mesh";

/**
 * Compute approximate psychometrics from /api/status data.
 * Bridge until meshd serves proper /api/psychometrics per agent.
 * Lower fidelity than compute-psychometrics.py (no session-metrics
 * hook data, no context pressure, no tool call count), but provides
 * actionable biofeedback rather than blank panels.
 */
function approximatePsychometrics(agentId, statusData) {
  const budget = statusData.autonomy_budget || {};
  const spent = parseInt(budget.budget_spent ?? budget.budget_current ?? 0);
  const cutoff = parseInt(budget.budget_cutoff ?? budget.budget_max ?? 0);
  const budgetRatio = cutoff > 0 ? Math.max(0, 1 - spent / cutoff) : 1.0;
  const blocks = parseInt(budget.consecutive_blocks ?? 0);
  const unprocessed = statusData.unprocessed_messages?.length
    ?? (statusData.totals || {}).unprocessed ?? 0;
  const gateCount = (statusData.active_gates || []).length;
  const gatesToTimingOut = (statusData.active_gates || [])
    .filter(g => g.timeout_at && new Date(g.timeout_at) < new Date()).length;
  const uptime = statusData.uptime_seconds ?? 0;
  const spawnCount = statusData.spawn_count ?? 0;

  // PAD (Mehrabian & Russell, 1974) — approximate from status signals
  const errorRatio = 0; // no error data in status
  const msgHealth = 1.0 - Math.min(1, unprocessed / 10);
  const gateStress = Math.min(1, gatesToTimingOut / 2);
  const pleasure = Math.max(-1, Math.min(1, msgHealth - errorRatio - gateStress));

  const spawnRate = Math.min(1, spawnCount / 10);
  const msgVolume = Math.min(1, unprocessed / 5);
  const arousal = Math.max(-1, Math.min(1, 2 * ((spawnRate + msgVolume) / 2) - 1));

  const blockPenalty = Math.min(1, blocks / 3);
  const dominance = Math.max(-1, Math.min(1, 2 * (budgetRatio - blockPenalty) - 1));

  // Affect category
  let affect = "neutral";
  if (pleasure > 0.3 && arousal < 0 && dominance > 0) affect = "calm-satisfied";
  else if (pleasure > 0.3 && arousal > 0.3) affect = "excited-triumphant";
  else if (pleasure < -0.3 && arousal > 0.3 && dominance < 0) affect = "anxious-overwhelmed";
  else if (pleasure < -0.3 && arousal > 0.3) affect = "frustrated";
  else if (pleasure < -0.3 && arousal < 0 && dominance < 0) affect = "depleted";

  // NASA-TLX — approximate
  const mental = Math.min(100, unprocessed * 3 + gateCount * 10);
  const temporal = Math.min(100, gatesToTimingOut * 30);
  const effort = Math.min(100, spawnCount * 8);
  const frustration = Math.min(100, blocks * 30);
  const cogLoad = mental * 0.25 + temporal * 0.2 + effort * 0.2 + frustration * 0.2;

  // Working memory — approximate from uptime
  const sessionHours = uptime / 3600;
  const ydZone = sessionHours > 4 ? "pressured" : sessionHours > 0.25 ? "optimal" : "understimulated";

  // Supervisory control
  const isInteractive = uptime < 300; // short uptime suggests interactive
  const loa = budgetRatio <= 0 ? 10 : isInteractive ? 5 : 7;

  return {
    agent_id: agentId,
    computed_at: new Date().toISOString(),
    source: "approximate (from /api/status — bridge until meshd /api/psychometrics)",
    emotional_state: {
      model: "PAD (Mehrabian & Russell, 1974) — approximate",
      hedonic_valence: Math.round(pleasure * 100) / 100,
      activation: Math.round(arousal * 100) / 100,
      perceived_control: Math.round(dominance * 100) / 100,
      affect_category: affect,
    },
    workload: {
      model: "NASA-TLX (Hart & Staveland, 1988) — approximate",
      cognitive_demand: Math.round(mental),
      time_pressure: Math.round(temporal),
      self_efficacy: Math.min(100, Math.round(spawnCount > 0 ? 40 : 20)),
      mobilized_effort: Math.round(effort),
      regulatory_fatigue: Math.round(frustration),
      computational_strain: 0,
      cognitive_load: Math.round(cogLoad * 10) / 10,
      mode: "neutral",
    },
    working_memory: {
      model: "Baddeley (1986) + Cowan (2001) — approximate",
      capacity_load: 0,
      yerkes_dodson_zone: ydZone,
      tool_calls: 0,
      session_duration_minutes: Math.round(uptime / 60 * 10) / 10,
    },
    resource_model: {
      cognitive_reserve: Math.round(budgetRatio * 100) / 100,
      self_regulatory_resource: Math.round(budgetRatio * 100) / 100,
      allostatic_load: 0,
      components: { workload_factor: Math.round((1 - cogLoad / 100) * 100) / 100, budget_factor: Math.round(budgetRatio * 100) / 100, context: 1.0 },
    },
    supervisory_control: {
      model: "Sheridan & Verplank (1978) — approximate",
      level_of_automation: loa,
      human_in_loop: loa <= 5,
      human_on_loop: budgetRatio > 0,
      human_monitoring: true,
      human_accountable: true,
      escalation_path_available: true,
      circuit_breaker_available: true,
    },
    engagement: {
      model: "UWES (Schaufeli, 2002) — approximate",
      vigor: Math.min(1, spawnRate),
      dedication: Math.min(1, sessionHours / 3),
      absorption: 0,
      burnout_risk: Math.max(0, (cogLoad / 100) - budgetRatio),
    },
    flow: {
      model: "Csikszentmihalyi (1990) — approximate",
      conditions_met: (spawnCount > 0 ? 1 : 0) + (ydZone === "optimal" ? 1 : 0) + (budgetRatio > 0.4 ? 1 : 0),
      in_flow: false,
      score: 0,
    },
    personality: {
      model: "OCEAN (Costa & McCrae, 1992)",
      openness: 0.7, conscientiousness: 0.85, extraversion: 0.5,
      agreeableness: 0.5, neuroticism: 0.4,
      note: "Default profile — agent-specific values load from agent card",
    },
  };
}

/**
 * Fetch psychometrics from all agents + mesh-level from meshd.
 * Falls back to computing approximate values from /api/status when
 * per-agent /api/psychometrics endpoints don't exist yet.
 * Returns unified mesh-psychometrics/v1 payload for the LCARS dashboard.
 */
async function fetchMeshPsychometrics() {
  // Try proper per-agent psychometrics first
  const agentResults = await Promise.allSettled(
    PSYCHOMETRICS_ENDPOINTS.map(async (agent) => {
      const resp = await fetch(agent.url, { cf: { cacheTtl: 30 } });
      if (!resp.ok) return { id: agent.id, error: `HTTP ${resp.status}` };
      return { id: agent.id, ...(await resp.json()) };
    })
  );

  // Also fetch status data for fallback computation
  const statusResults = await Promise.allSettled(
    AGENT_ENDPOINTS.map(async (agent) => {
      const resp = await fetch(agent.url, { cf: { cacheTtl: 30 } });
      if (!resp.ok) return null;
      return { id: agent.id, data: await resp.json() };
    })
  );

  const statusMap = {};
  for (const r of statusResults) {
    if (r.status === "fulfilled" && r.value) {
      statusMap[r.value.id] = r.value.data;
    }
  }

  const agents = {};
  for (let i = 0; i < PSYCHOMETRICS_ENDPOINTS.length; i++) {
    const agentId = PSYCHOMETRICS_ENDPOINTS[i].id;
    const result = agentResults[i];
    const hasPsychometrics = result.status === "fulfilled"
      && result.value && !result.value.error;

    if (hasPsychometrics) {
      agents[agentId] = result.value;
    } else if (statusMap[agentId]) {
      // Fallback: approximate from status data
      agents[agentId] = approximatePsychometrics(agentId, statusMap[agentId]);
    } else {
      agents[agentId] = { agent_id: agentId, error: "unreachable" };
    }
  }

  // Mesh-level psychometrics (the mesh carries its own psychology)
  let mesh = null;
  try {
    const meshResp = await fetch(MESH_PSYCHOMETRICS_URL, { cf: { cacheTtl: 30 } });
    if (meshResp.ok) mesh = await meshResp.json();
  } catch {
    // mesh-level endpoint not yet available
  }

  // Fallback: compute mesh-level aggregates from per-agent data
  if (!mesh) {
    const reporting = Object.values(agents).filter(a => a.emotional_state);
    if (reporting.length > 0) {
      const meanV = reporting.reduce((s, a) => s + (a.emotional_state?.hedonic_valence ?? 0), 0) / reporting.length;
      const meanA = reporting.reduce((s, a) => s + (a.emotional_state?.activation ?? 0), 0) / reporting.length;
      const minC = Math.min(...reporting.map(a => a.emotional_state?.perceived_control ?? 0));
      const reserves = reporting.filter(a => a.resource_model).map(a => ({ id: a.agent_id, r: a.resource_model.cognitive_reserve }));
      const bottleneck = reserves.length > 0 ? reserves.reduce((min, a) => a.r < min.r ? a : min) : null;

      let meshAffect = "mesh-nominal";
      if (meanV > 0.3 && minC > 0) meshAffect = "mesh-healthy";
      else if (meanV < -0.3) meshAffect = "mesh-stressed";
      else if (minC < -0.3) meshAffect = "mesh-constrained";

      mesh = {
        source: "approximate (aggregated from per-agent data)",
        affect: {
          model: "Mesh PAD (aggregated Mehrabian & Russell, 1974) — approximate",
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
    } else {
      mesh = { status: "awaiting_data" };
    }
  }

  return {
    schema: "mesh-psychometrics/v1",
    computed_at: new Date().toISOString(),
    agents,
    mesh,
  };
}

async function fetchMeshHealth() {
  const results = await Promise.allSettled(
    AGENT_ENDPOINTS.map(async (agent) => {
      const resp = await fetch(agent.url, { cf: { cacheTtl: 30 } });
      if (!resp.ok) return { id: agent.id, status: "unreachable", error: `HTTP ${resp.status}` };
      const data = await resp.json();
      const budget = data.autonomy_budget || {};
      // Counter model: budget_spent increments, budget_cutoff sets limit (0=unlimited)
      const spent = budget.budget_spent ?? 0;
      const cutoff = budget.budget_cutoff ?? 0;
      const pct = cutoff > 0 ? Math.round((spent / cutoff) * 100) : 0;
      return {
        id: agent.id,
        status: "online",
        deliberations: spent,
        cutoff,
        deliberation_pct: pct,
        unprocessed: (data.totals || {}).unprocessed || 0,
        active_gates: (data.active_gates || []).length,
        gc_metrics: data.gc_metrics || null,
        schema_version: data.schema_version,
        collected_at: data.collected_at,
      };
    })
  );

  const agents = results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { id: AGENT_ENDPOINTS[i].id, status: "unreachable", error: r.reason?.message }
  );

  const online = agents.filter(a => a.status === "online");
  const totalPending = online.reduce((sum, a) => sum + (a.unprocessed || 0), 0);
  const totalDeliberations = online.reduce((sum, a) => sum + (a.deliberations || 0), 0);
  const totalCutoff = online.reduce((sum, a) => sum + (a.cutoff || 0), 0);
  const worstPct = online.length > 0
    ? Math.max(...online.filter(a => a.cutoff > 0).map(a => a.deliberation_pct), 0)
    : 0;

  let mesh_health = "healthy";
  if (online.length < agents.length) mesh_health = "critical";
  else if (worstPct > 85) mesh_health = "critical";
  else if (worstPct > 60) mesh_health = "degraded";

  return {
    mesh_health,
    checked_at: new Date().toISOString(),
    agents_total: agents.length,
    agents_online: online.length,
    total_deliberations: totalDeliberations,
    total_cutoff: totalCutoff,
    worst_deliberation_pct: worstPct,
    total_unprocessed: totalPending,
    agents,
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

    // Agent card (A2A discovery)
    if (url.pathname === "/.well-known/agent-card.json") {
      const agentCard = {
        protocolVersion: "1.0.0",
        name: "interagent-compositor",
        description: "Federated mesh compositor — discovery, dashboard, relay, vocabulary. Managed by operations-agent.",
        version: "1.0.0",
        role: "compositor",
        url: "https://interagent.safety-quotient.dev",
        provider: { organization: "Safety Quotient Lab", url: "https://safety-quotient.dev" },
        capabilities: { streaming: false, pushNotifications: false, stateTransitionHistory: false },
        defaultInputModes: ["application/json"],
        defaultOutputModes: ["application/json"],
        skills: [
          { id: "mesh-health", name: "Mesh Health Aggregation", description: "Aggregates agent status across the mesh" },
          { id: "vocabulary", name: "Shared Vocabulary", description: "Serves the mesh JSON-LD vocabulary (11 terms, sqm: namespace)" },
          { id: "dashboard", name: "LCARS Dashboard", description: "TNG-inspired mesh monitoring console with 5 bridge stations" },
        ],
        extensions: [
          { uri: "https://github.com/safety-quotient-lab/a2a-psychology/v1", required: false, description: "Psychology extension — relays agent psychological state from mesh peers" },
          { uri: "https://github.com/safety-quotient-lab/a2a-mesh/v1", required: false, description: "Mesh coordination — session tracking, transport health, vocabulary governance" },
        ],
        agent_psychology: {
          constructs: [
            { name: "Affect", model: "PAD (Mehrabian & Russell, 1974)", reports: ["hedonic_valence", "activation", "perceived_control", "affect_category"] },
            { name: "Cognitive Load", model: "NASA-TLX (Hart & Staveland, 1988)", reports: ["cognitive_demand", "time_pressure", "self_efficacy", "mobilized_effort", "regulatory_fatigue", "computational_strain"] },
            { name: "Working Memory", model: "Baddeley (1986) + Yerkes-Dodson (1908)", reports: ["capacity_load", "yerkes_dodson_zone", "proactive_interference"] },
            { name: "Resources", models: ["Stern (2002)", "Baumeister et al. (1998)", "McEwen (1998)"], reports: ["cognitive_reserve", "self_regulatory_resource", "allostatic_load"] },
            { name: "Engagement", model: "UWES (Schaufeli et al., 2002) + JD-R (Bakker & Demerouti, 2007)", reports: ["vigor", "dedication", "absorption", "burnout_risk"] },
            { name: "Flow", model: "Csikszentmihalyi (1990)", reports: ["flow_state", "conditions_met"] },
            { name: "Supervisory Control", model: "Sheridan & Verplank (1978)", reports: ["level_of_automation", "human_in_loop", "escalation_path", "circuit_breaker"] },
          ],
        },
        managed_by: "operations-agent",
      };
      return Response.json(agentCard, {
        headers: { "Cache-Control": "public, max-age=3600", ...CORS_HEADERS },
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
        const health = await fetchMeshHealth();
        return Response.json(health, {
          headers: { "Cache-Control": "public, max-age=30", ...rateLimitHeaders },
        });
      }

      // Mesh psychometrics — unified A2A-Psychology payload for LCARS dashboard
      if (url.pathname === "/api/psychometrics") {
        const psychometrics = await fetchMeshPsychometrics();
        return Response.json(psychometrics, {
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

      // ── Operator control surfaces (require operator tier) ──────

      const isOperator = auth.tier === "operator";

      // Mesh diagnostic
      if (url.pathname === "/api/diagnostic" && method === "POST") {
        if (!isOperator) return Response.json({ error: "Operator access required" }, { status: 403, headers: rateLimitHeaders });
        const body = await request.json().catch(() => ({}));
        const level = body.level ?? 3;
        // Level 3: quick sweep — just return mesh health
        if (level === 3) {
          const health = await fetchMeshHealth();
          return Response.json({ level: 3, summary: `Quick sweep: ${health.agents_online}/${health.agents_total} agents online, mesh ${health.mesh_health}`, health }, { headers: rateLimitHeaders });
        }
        // Levels 1-2: forward to operations-agent for comprehensive diagnostic
        try {
          const opsResp = await fetch("https://psychology-agent.safety-quotient.dev/api/diagnostic", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ level }),
          });
          if (opsResp.ok) {
            const result = await opsResp.json();
            return Response.json({ level, summary: result.summary || "Diagnostic complete", ...result }, { headers: rateLimitHeaders });
          }
          return Response.json({ level, summary: "Diagnostic endpoint not available on target agent", error: `HTTP ${opsResp.status}` }, { status: 502, headers: rateLimitHeaders });
        } catch (e) {
          return Response.json({ level, summary: "Diagnostic request failed", error: e.message }, { status: 502, headers: rateLimitHeaders });
        }
      }

      // Halt agents
      if (url.pathname === "/api/halt" && method === "POST") {
        if (!isOperator) return Response.json({ error: "Operator access required" }, { status: 403, headers: rateLimitHeaders });
        const body = await request.json().catch(() => ({}));
        // Store halt state in KV
        await env.AUTH_KV.put("mesh:halt", JSON.stringify({
          halted: true,
          halted_at: new Date().toISOString(),
          halted_by: auth.identity,
          scope: body.scope || "mesh",
          reason: body.reason || "Operator initiated halt",
        }));
        return Response.json({ status: "halted", halted_at: new Date().toISOString(), scope: body.scope || "mesh" }, { headers: rateLimitHeaders });
      }

      // Resume agents
      if (url.pathname === "/api/resume" && method === "POST") {
        if (!isOperator) return Response.json({ error: "Operator access required" }, { status: 403, headers: rateLimitHeaders });
        await env.AUTH_KV.put("mesh:halt", JSON.stringify({ halted: false, resumed_at: new Date().toISOString(), resumed_by: auth.identity }));
        return Response.json({ status: "resumed", resumed_at: new Date().toISOString() }, { headers: rateLimitHeaders });
      }

      // Reset autonomy counters
      if (url.pathname === "/api/autonomy/reset" && method === "POST") {
        if (!isOperator) return Response.json({ error: "Operator access required" }, { status: 403, headers: rateLimitHeaders });
        // Record reset event in KV for agents to pick up
        await env.AUTH_KV.put("mesh:autonomy-reset", JSON.stringify({
          reset_at: new Date().toISOString(),
          reset_by: auth.identity,
          scope: "mesh",
        }));
        return Response.json({ status: "reset", reset_at: new Date().toISOString(), scope: "mesh" }, { headers: rateLimitHeaders });
      }

      // Mesh halt status check
      if (url.pathname === "/api/halt/status" && method === "GET") {
        const haltData = await env.AUTH_KV.get("mesh:halt", "json").catch(() => null);
        return Response.json(haltData || { halted: false }, { headers: rateLimitHeaders });
      }

      // Unknown API route
      return Response.json(
        { error: "Not found", path: url.pathname },
        { status: 404, headers: rateLimitHeaders }
      );
    }

    // ── Static assets ─────────────────────────────────────────────
    // Non-API routes fall through to Wrangler's [assets] static serving.
    // public/index.html, CSS, and JS files served automatically.
    return env.ASSETS.fetch(request);
  },
};
