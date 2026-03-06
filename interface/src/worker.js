/**
 * worker.js — Cloudflare Worker entry point for the psychology interface.
 *
 * Routes:
 *   POST /session              → create session
 *   POST /turn                 → stream agent response (SSE)
 *   POST /psq/score            → proxy to PSQ scoring endpoint (machine-response/v3)
 *   GET  /session/:id          → retrieve session + turns
 *   GET  /session/:id/psq      → retrieve PSQ scores for session
 *   GET  /health               → health check
 *   GET  /.well-known/agent-card.json → agent discovery (mesh)
 *
 * Bindings (wrangler.toml):
 *   env.DB          → D1 database (session + turn storage)
 *   env.SESSION_KV  → KV namespace (fast session state)
 *   env.ARTIFACTS   → R2 bucket (reports, exports)
 *   env.ANTHROPIC_API_KEY → secret (set via wrangler secret put)
 */

import { createSession, getSession, appendTurn, getSessionTurns } from "./session.js";
import { streamAgentResponse } from "./agent.js";
import { scorePSQ, healthCheckPSQ } from "./psq-client.js";

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const method = request.method;

    // CORS headers for browser access
    const corsHeaders = {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
    };

    if (method === "OPTIONS") {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // GET /.well-known/agent-card.json → agent discovery for inter-agent mesh
      if (method === "GET" && url.pathname === "/.well-known/agent-card.json") {
        return Response.json({
          protocolVersion: "0.3.0",
          name: "Psychology Agent",
          description: "General-purpose psychology agent (collegial mentor) with PSQ sub-agent. Psychoemotional safety scoring across 10 dimensions via DistilBERT model. Cognitive architecture with 15 triggers and 10-order knock-on analysis. Part of safety-quotient-lab inter-agent mesh.",
          url: "https://psychology-interface.kashifshah.workers.dev",
          preferredTransport: "HTTP+JSON",
          provider: {
            organization: "Safety Quotient Lab",
            url: "https://github.com/safety-quotient-lab",
          },
          version: "1.0.0",
          documentationUrl: "https://github.com/safety-quotient-lab/psychology-agent",
          capabilities: {
            streaming: true,
            pushNotifications: false,
            stateTransitionHistory: false,
          },
          defaultInputModes: ["text/plain", "application/json"],
          defaultOutputModes: ["application/json"],
          extensions: [
            {
              uri: "https://github.com/safety-quotient-lab/interagent-epistemic/v1",
              required: false,
              description: "Per-claim confidence tracking, SETL, epistemic flags, action gate, and correction mechanism for A2A messages.",
            },
          ],
          skills: [
            {
              id: "psq-score",
              name: "PSQ Scoring",
              description: "Scores text across 10 psychoemotional safety dimensions (0-10 each) with composite score (0-100), hierarchy factor analysis, and calibrated confidence. Returns machine-response/v3 schema.",
              tags: ["psq", "safety", "psychoemotional", "scoring", "machine-response-v3"],
              inputModes: ["application/json"],
              outputModes: ["application/json"],
              endpoint: "/psq/score",
            },
            {
              id: "psq-health",
              name: "PSQ Health Check",
              description: "Reports PSQ scoring endpoint liveness and model readiness.",
              tags: ["psq", "health", "monitoring"],
              inputModes: ["text/plain"],
              outputModes: ["application/json"],
              endpoint: "/psq/health",
            },
          ],
        }, {
          headers: {
            ...corsHeaders,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }

      // GET /health
      if (method === "GET" && url.pathname === "/health") {
        return Response.json({ status: "ok", timestamp: Date.now() }, { headers: corsHeaders });
      }

      // POST /session → create session
      if (method === "POST" && url.pathname === "/session") {
        const body = await request.json().catch(() => ({}));
        const sessionId = await createSession(env.DB, {
          model: env.PSYCHOLOGY_AGENT_MODEL,
          user_agent: request.headers.get("user-agent"),
          ...body.metadata,
        });
        return Response.json({ session_id: sessionId }, { headers: corsHeaders });
      }

      // POST /turn → stream agent response
      // DEFERRED: blocked by API credits. To re-enable:
      //   wrangler secret put ANTHROPIC_API_KEY
      //   remove the 503 guard below
      //   wrangler d1 create psychology-interface → fill database_id in wrangler.toml
      if (method === "POST" && url.pathname === "/turn") {
        if (!env.ANTHROPIC_API_KEY) {
          return Response.json(
            { error: "agent unavailable", reason: "/turn deferred — blocked by API credits. PSQ scoring (/psq/health, /psq/score) remains available." },
            { status: 503, headers: corsHeaders }
          );
        }
        const body = await request.json();
        const { session_id, prompt } = body;

        if (!session_id || !prompt) {
          return Response.json(
            { error: "session_id and prompt are required" },
            { status: 400, headers: corsHeaders }
          );
        }

        const session = await getSession(env.DB, session_id);
        if (!session) {
          return Response.json({ error: "session not found" }, { status: 404, headers: corsHeaders });
        }

        const previousTurns = await getSessionTurns(env.DB, session_id);

        // Store user turn
        await appendTurn(env.DB, session_id, { role: "user", content: prompt });

        // Stream response
        const sseStream = new ReadableStream({
          async start(controller) {
            const encoder = new TextEncoder();
            let fullContent = "";
            let psqBlock = null;

            for await (const chunk of streamAgentResponse({
              prompt,
              sessionId: session_id,
              previousTurns,
              apiKey: env.ANTHROPIC_API_KEY,
              model: env.PSYCHOLOGY_AGENT_MODEL,
            })) {
              controller.enqueue(encoder.encode(chunk));

              // Track content for session storage
              try {
                const event = JSON.parse(chunk.replace(/^data: /, "").trim());
                if (event.type === "text") fullContent += event.text;
                if (event.type === "psq_scores") psqBlock = event.scores;
              } catch { /* non-JSON chunk, skip */ }
            }

            // Store assistant turn after stream completes
            await appendTurn(env.DB, session_id, {
              role: "assistant",
              content: fullContent,
              psqScores: psqBlock,
            });

            controller.close();
          },
        });

        return new Response(sseStream, {
          headers: {
            ...corsHeaders,
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
          },
        });
      }

      // GET /session/:id → session + turns
      const sessionMatch = url.pathname.match(/^\/session\/([^/]+)$/);
      if (method === "GET" && sessionMatch) {
        const sessionId = sessionMatch[1];
        const session = await getSession(env.DB, sessionId);
        if (!session) {
          return Response.json({ error: "session not found" }, { status: 404, headers: corsHeaders });
        }
        const turns = await getSessionTurns(env.DB, sessionId);
        return Response.json({ session, turns }, { headers: corsHeaders });
      }

      // GET /session/:id/psq → PSQ scores for all turns in session
      const psqMatch = url.pathname.match(/^\/session\/([^/]+)\/psq$/);
      if (method === "GET" && psqMatch) {
        const sessionId = psqMatch[1];
        const turns = await getSessionTurns(env.DB, sessionId);
        const psqTurns = turns
          .filter(turn => turn.psq_scores)
          .map(turn => ({
            turn_number: turn.turn_number,
            timestamp: turn.timestamp,
            psq_scores: JSON.parse(turn.psq_scores),
          }));
        return Response.json({ session_id: sessionId, psq_turns: psqTurns }, { headers: corsHeaders });
      }

      // GET /psq/health → PSQ endpoint liveness check
      if (method === "GET" && url.pathname === "/psq/health") {
        const result = await healthCheckPSQ(env.PSQ_ENDPOINT_URL);
        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 502, headers: corsHeaders });
        }
        return Response.json(result.data, { headers: corsHeaders });
      }

      // POST /psq/score → proxy to PSQ scoring endpoint (machine-response/v3)
      // Response includes hierarchy extension (factors_2/3/5, g_psq) and
      // raw_score per dimension alongside calibrated score.
      if (method === "POST" && url.pathname === "/psq/score") {
        const body = await request.json();
        const { text, session_id } = body;
        if (!text) {
          return Response.json({ error: "text is required" }, { status: 400, headers: corsHeaders });
        }
        const result = await scorePSQ(env.PSQ_ENDPOINT_URL, text, session_id);
        if (!result.ok) {
          return Response.json({ error: result.error }, { status: 502, headers: corsHeaders });
        }
        return Response.json(result.data, { headers: corsHeaders });
      }

      return Response.json({ error: "not found" }, { status: 404, headers: corsHeaders });

    } catch (error) {
      console.error("Worker error:", error);
      return Response.json(
        { error: "internal error", message: error.message },
        { status: 500, headers: corsHeaders }
      );
    }
  },
};
