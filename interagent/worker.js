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
 *   GET /health        → health check
 */

import HTML from "./index.html";
import VOCAB from "./vocab.json";

export default {
  async fetch(request) {
    const url = new URL(request.url);

    if (url.pathname === "/health") {
      return Response.json({ status: "ok", timestamp: Date.now() });
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
