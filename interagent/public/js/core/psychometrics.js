/**
 * psychometrics.js — Shared A2A-Psychology data layer for all LCARS stations.
 *
 * Fetches unified mesh-psychometrics/v1 from the compositor endpoint.
 * All stations consume from this shared cache — no per-agent fan-out.
 *
 * Contract: docs/api-psychometrics-contract.md
 * Grounding: A2A-Psychology v1.1, LLM-factors psychology (docs/llm-factors-psychology.md)
 *
 * The dashboard serves as the biofeedback mechanism for the human-LLM dyad
 * (LLM-factors §2.4 Degradation Patterns). Each construct displayed provides
 * the human operator actionable information about the mesh's psychological state.
 */

// ── Module State ───────────────────────────────────────────────
let cache = null;
let fetchPending = false;
let lastFetchTime = 0;

/** Cache TTL matches server-side: 30 seconds */
const CACHE_TTL_MS = 30000;
const FETCH_TIMEOUT = 8000;

const COMPOSITOR_PSYCHOMETRICS_URL =
    "https://interagent.safety-quotient.dev/api/psychometrics";

// ── Data Fetching ──────────────────────────────────────────────

/**
 * Fetch unified psychometrics from the compositor.
 * Returns cached data if fresh (< 30s old). All stations call this —
 * only one network request per refresh cycle.
 * @returns {Promise<Object|null>} mesh-psychometrics/v1 payload
 */
export async function fetchPsychometrics() {
    const now = Date.now();
    if (cache && (now - lastFetchTime) < CACHE_TTL_MS) {
        return cache;
    }
    if (fetchPending) {
        // Another station already fetching — wait for it
        return new Promise((resolve) => {
            const interval = setInterval(() => {
                if (!fetchPending) {
                    clearInterval(interval);
                    resolve(cache);
                }
            }, 50);
        });
    }
    fetchPending = true;
    try {
        const resp = await fetch(COMPOSITOR_PSYCHOMETRICS_URL, {
            signal: AbortSignal.timeout(FETCH_TIMEOUT),
        });
        if (!resp.ok) return cache; // keep stale data over nothing
        cache = await resp.json();
        lastFetchTime = now;
    } catch {
        // Network failure — return stale cache if available
    } finally {
        fetchPending = false;
    }
    return cache;
}

// ── Accessors ──────────────────────────────────────────────────

/**
 * Get per-agent psychometrics for a specific agent.
 * @param {string} agentId
 * @returns {Object|null}
 */
export function getAgentPsychometrics(agentId) {
    if (!cache || !cache.agents) return null;
    return cache.agents[agentId] || null;
}

/**
 * Get all per-agent psychometrics.
 * @returns {Object} — { agentId: psychometrics, ... }
 */
export function getAllAgentPsychometrics() {
    return cache?.agents || {};
}

/**
 * Get mesh-level psychometrics (the mesh's own psychology).
 * @returns {Object|null}
 */
export function getMeshPsychometrics() {
    return cache?.mesh || null;
}

/**
 * Check whether psychometrics data has loaded (any agent reporting).
 * @returns {boolean}
 */
export function hasData() {
    if (!cache || !cache.agents) return false;
    return Object.values(cache.agents).some(
        a => a && !a.error && a.emotional_state
    );
}

/**
 * Get the full cached payload.
 * @returns {Object|null}
 */
export function getRawCache() {
    return cache;
}
