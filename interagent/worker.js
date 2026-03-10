/**
 * worker.js — Cloudflare Worker for interagent.safety-quotient.dev
 *
 * Serves the static interagent mesh compositor page. Single HTML file,
 * no backend — the page fetches /api/status from each agent dashboard
 * client-side and composes the unified mesh view.
 *
 * Routes:
 *   GET /              → interagent mesh compositor (index.html)
 *   GET /health        → health check
 */

import HTML from "./index.html";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", timestamp: Date.now() });
    }

    return new Response(HTML, {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
    });
  },
};
