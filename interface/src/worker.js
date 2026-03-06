/**
 * worker.js — Cloudflare Worker entry point for the psychology interface.
 *
 * Routes:
 *   POST /session              → create session
 *   POST /turn                 → stream agent response (SSE)
 *   GET  /session/:id          → retrieve session + turns
 *   GET  /session/:id/psq      → retrieve PSQ scores for session
 *   GET  /health               → health check
 *
 * Bindings (wrangler.toml):
 *   env.DB          → D1 database (session + turn storage)
 *   env.SESSION_KV  → KV namespace (fast session state)
 *   env.ARTIFACTS   → R2 bucket (reports, exports)
 *   env.ANTHROPIC_API_KEY → secret (set via wrangler secret put)
 */

import { createSession, getSession, appendTurn, getSessionTurns } from "./session.js";
import { streamAgentResponse } from "./agent.js";

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
      if (method === "POST" && url.pathname === "/turn") {
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
