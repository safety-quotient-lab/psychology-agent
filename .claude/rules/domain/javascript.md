---
globs: ["**/*.js", "**/*.mjs"]
---

# JavaScript Conventions

## CF Worker Pattern (interface/src/)

- Worker entry point: `export default { async fetch(request, env) { ... } }`
- Use `Response.json()` for JSON responses, not manual `new Response(JSON.stringify(...))`
- CORS headers applied consistently across all routes
- Error responses include structured JSON: `{ error: "message" }`
- Route matching: explicit pathname checks, specific routes before parameterized

## Agent SDK Integration

- Import from `@anthropic-ai/claude-agent-sdk`
- Streaming responses via `streamAgentResponse()` pattern (see agent.js)
- System prompt injected via `PSYCHOLOGY_SYSTEM` constant (identity + cogarch subset)

## PSQ Client

- PSQ endpoint URL from `env.PSQ_ENDPOINT_URL` (wrangler secret)
- Health check before scoring: `GET /health` → 200 required
- Score responses follow `machine-response/v3` schema

## General

- ES modules (`import`/`export`), not CommonJS
- Async/await over raw promises
- Destructuring for function parameters where it improves readability
