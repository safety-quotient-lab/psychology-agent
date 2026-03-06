/**
 * psq-client.js — Worker-side PSQ scoring proxy.
 *
 * Calls the PSQ HTTP endpoint (safety-quotient/src/server.js).
 * Endpoint binds 127.0.0.1 only — CF Worker and PSQ server must run on the
 * same machine for local dev. Production requires PSQ_ENDPOINT_URL secret.
 *
 * Endpoint contract (interagent sync psq-endpoint-001.json, 2026-03-06):
 *   GET  /health → { status, model, calibration_version, ready }
 *   POST /score  → { text: string, session_id?: string }
 *                ← psychology-agent/machine-response/v3 + hierarchy extension
 *                   (factors_2, factors_3, factors_5, g_psq)
 *   Latency: ~8s model init (once), ~20–60ms per inference
 *   Per-dimension response includes: score, raw_score, confidence, meets_threshold
 *   raw_score = pre-calibration model output (needed to interpret trust_conditions
 *   artifact: raw 3.72 → calibrated 5.79 per §17 finding)
 *
 * PSQ_ENDPOINT_URL: set in [dev.vars] for local dev, or wrangler secret put for prod.
 */

/**
 * Score `text` via the PSQ HTTP endpoint.
 *
 * @param {string} psqEndpointUrl — from env.PSQ_ENDPOINT_URL
 * @param {string} textToScore
 * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
 */
export async function scorePSQ(psqEndpointUrl, textToScore, sessionId = undefined) {
  if (!psqEndpointUrl) {
    return {
      ok: false,
      error: "PSQ_ENDPOINT_URL not configured — set in wrangler.toml or via wrangler secret put",
    };
  }

  if (!textToScore || !textToScore.trim()) {
    return { ok: false, error: "text is required" };
  }

  const requestBody = { text: textToScore };
  if (sessionId) requestBody.session_id = sessionId;

  let response;
  try {
    response = await fetch(`${psqEndpointUrl}/score`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(requestBody),
    });
  } catch (networkError) {
    return { ok: false, error: `PSQ endpoint unreachable: ${networkError.message}` };
  }

  if (!response.ok) {
    const errorBody = await response.text().catch(() => "");
    return {
      ok: false,
      error: `PSQ endpoint returned ${response.status}: ${errorBody.slice(0, 200)}`,
    };
  }

  let psqData;
  try {
    psqData = await response.json();
  } catch {
    return { ok: false, error: "PSQ endpoint returned non-JSON response" };
  }

  return { ok: true, data: psqData };
}

/**
 * Check PSQ endpoint liveness.
 *
 * @param {string} psqEndpointUrl — from env.PSQ_ENDPOINT_URL
 * @returns {Promise<{ok: boolean, data?: object, error?: string}>}
 */
export async function healthCheckPSQ(psqEndpointUrl) {
  if (!psqEndpointUrl) return { ok: false, error: "PSQ_ENDPOINT_URL not configured" };

  try {
    const response = await fetch(`${psqEndpointUrl}/health`);
    if (!response.ok) return { ok: false, error: `PSQ health check returned ${response.status}` };
    const data = await response.json();
    return { ok: true, data };
  } catch (networkError) {
    return { ok: false, error: `PSQ endpoint unreachable: ${networkError.message}` };
  }
}
