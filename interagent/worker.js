/**
 * worker.js — Cloudflare Worker for interagent.safety-quotient.dev
 *
 * Serves the static interagent mesh compositor page and the shared
 * vocabulary for the federated agent mesh.
 *
 * Routes:
 *   GET /              → interagent mesh compositor (index.html)
 *   GET /vocab         → shared JSON-LD vocabulary (@context + defined terms)
 *   GET /vocab.json    → alias for /vocab
 *   GET /health        → worker health check (local only)
 *   GET /api/health    → mesh health (aggregates all agent /api/status endpoints)
 */

import HTML from "./index.html";
import VOCAB from "./vocab.json";

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
      const budget = data.trust_budget || {};
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
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", timestamp: Date.now() });
    }

    if (url.pathname === "/api/health") {
      const health = await fetchMeshHealth();
      return Response.json(health, {
        headers: {
          "Cache-Control": "public, max-age=30",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    if (url.pathname === "/vocab" || url.pathname === "/vocab.json") {
      return new Response(VOCAB, {
        headers: {
          "Content-Type": "application/ld+json; charset=utf-8",
          "Cache-Control": "public, max-age=3600",
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new Response(HTML, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  },
};
