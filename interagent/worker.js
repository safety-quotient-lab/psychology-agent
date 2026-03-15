/**
 * worker.js — Cloudflare Worker for interagent.safety-quotient.dev
 *
 * Serves the interagent mesh compositor, shared vocabulary, mesh health
 * aggregation, and authenticated API endpoints.
 *
 * Routes:
 *   GET  /                    → interagent mesh compositor (static assets)
 *   GET  /vocab[.json]        → shared JSON-LD vocabulary
 *   GET  /health              → worker health check (local only)
 *   GET  /api/health          → mesh health (aggregates all agent /api/status)
 *   POST /api/keys            → create API key (operator-only)
 *   DELETE /api/keys/:identity → revoke API key (operator-only)
 *   *    /api/*               → authenticated API routes (rate-limited)
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

async function fetchMeshHealth() {
  const results = await Promise.allSettled(
    AGENT_ENDPOINTS.map(async (agent) => {
      const resp = await fetch(agent.url, { cf: { cacheTtl: 30 } });
      if (!resp.ok) return { id: agent.id, status: "unreachable", error: `HTTP ${resp.status}` };
      const data = await resp.json();
      const budget = data.autonomy_budget || {};
      const cur = budget.budget_current ?? 20;
      const max = budget.budget_max ?? 20;
      const pct = max > 0 ? Math.round((cur / max) * 100) : 0;
      return {
        id: agent.id,
        status: "online",
        budget_pct: pct,
        unprocessed: (data.totals || {}).unprocessed || 0,
        active_gates: (data.active_gates || []).length,
        schema_version: data.schema_version,
        collected_at: data.collected_at,
      };
    })
  );

  const agents = results.map((r, i) =>
    r.status === "fulfilled" ? r.value : { id: AGENT_ENDPOINTS[i].id, status: "unreachable", error: r.reason?.message }
  );

  const online = agents.filter(a => a.status === "online");
  const worstBudget = online.length > 0 ? Math.min(...online.map(a => a.budget_pct)) : 0;
  const totalPending = online.reduce((sum, a) => sum + (a.unprocessed || 0), 0);

  let mesh_health = "healthy";
  if (online.length < agents.length || worstBudget < 10) mesh_health = "critical";
  else if (worstBudget < 50) mesh_health = "degraded";

  return {
    mesh_health,
    checked_at: new Date().toISOString(),
    agents_total: agents.length,
    agents_online: online.length,
    weakest_budget_pct: worstBudget,
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
