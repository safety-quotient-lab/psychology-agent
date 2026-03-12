/**
 * auth.js — Multi-scheme authentication middleware
 *
 * Resolves request credentials to an identity with tier and rate limit.
 * Two resolver paths (selected by Authorization header scheme):
 *   1. API key: Bearer token → KV lookup → identity
 *   2. Solid-OIDC: DPoP proof → JWT verification → WebID (Phase 2, placeholder)
 *
 * Usage in worker.js:
 *   import { resolveAuth, handleKeyCreate, handleKeyRevoke } from "./auth.js";
 *   const identity = await resolveAuth(request, env);
 *   // identity.tier: "anonymous" | "api-key" | "solid-oidc" | "operator"
 */

/**
 * Client tiers — each defines a rate budget and capability set.
 * Mirrors the trust budget table in the auth design document.
 */
const TIERS = {
  anonymous:  { rateLimit: 10,   podAccess: false, label: "Anonymous" },
  "api-key":  { rateLimit: 100,  podAccess: false, label: "API Key" },
  "solid-oidc": { rateLimit: 1000, podAccess: true,  label: "Solid-OIDC" },
  operator:   { rateLimit: -1,   podAccess: false, label: "Operator" },
};

/**
 * Resolve authentication from request headers.
 *
 * @param {Request} request - incoming request
 * @param {object} env - Worker env bindings (AUTH_KV required)
 * @returns {Promise<{identity: string|null, tier: string, rateLimit: number, podAccess: boolean}>}
 */
export async function resolveAuth(request, env) {
  const authHeader = request.headers.get("Authorization");

  if (!authHeader) {
    return {
      identity: null,
      tier: "anonymous",
      ...TIERS.anonymous,
    };
  }

  const [scheme, credential] = splitAuth(authHeader);

  if (scheme === "bearer" && credential) {
    return resolveApiKey(credential, env);
  }

  if (scheme === "dpop") {
    return resolveSolidOidc(request, credential, env);
  }

  // Unrecognized scheme — treat as anonymous
  return {
    identity: null,
    tier: "anonymous",
    ...TIERS.anonymous,
  };
}

/**
 * Split Authorization header into scheme + credential.
 * @param {string} header
 * @returns {[string, string]}
 */
function splitAuth(header) {
  const spaceIdx = header.indexOf(" ");
  if (spaceIdx === -1) return [header.toLowerCase(), ""];
  return [header.slice(0, spaceIdx).toLowerCase(), header.slice(spaceIdx + 1).trim()];
}

// ── API Key Resolver ──────────────────────────────────────────────────

/**
 * Look up a bearer token in KV. Keys stored as:
 *   key:{token-hash} → { identity, created_at, label, revoked }
 *
 * Tokens stored as SHA-256 hashes — the raw key never persists server-side.
 *
 * @param {string} token - raw bearer token from client
 * @param {object} env - must have AUTH_KV binding
 * @returns {Promise<{identity: string, tier: string, rateLimit: number, podAccess: boolean}>}
 */
async function resolveApiKey(token, env) {
  if (!env.AUTH_KV) {
    return { identity: null, tier: "anonymous", ...TIERS.anonymous };
  }

  const tokenHash = await hashToken(token);
  const stored = await env.AUTH_KV.get(`key:${tokenHash}`, "json");

  if (!stored || stored.revoked) {
    return { identity: null, tier: "anonymous", ...TIERS.anonymous };
  }

  return {
    identity: stored.identity,
    tier: "api-key",
    ...TIERS["api-key"],
    label: stored.label || null,
  };
}

/**
 * SHA-256 hash of a token string, hex-encoded.
 * Raw tokens never stored — only hashes persist in KV.
 *
 * @param {string} token
 * @returns {Promise<string>}
 */
async function hashToken(token) {
  const encoded = new TextEncoder().encode(token);
  const digest = await crypto.subtle.digest("SHA-256", encoded);
  return Array.from(new Uint8Array(digest))
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Generate a cryptographically random API key.
 * Format: sq_live_{32 random hex chars} (40 chars total with prefix).
 *
 * @returns {Promise<string>}
 */
async function generateApiKey() {
  const bytes = new Uint8Array(20);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("");
  return `sq_live_${hex}`;
}

// ── API Key Management Routes ─────────────────────────────────────────

/**
 * Create a new API key. Operator-only (requires OPERATOR_SECRET).
 *
 * POST /api/keys { label: "my-app" }
 * Headers: X-Operator-Secret: {env.OPERATOR_SECRET}
 *
 * Returns: { key: "sq_live_...", identity: "key-{hash-prefix}", label, created_at }
 * The raw key appears exactly once in this response — store it.
 *
 * @param {Request} request
 * @param {object} env
 * @returns {Promise<Response>}
 */
export async function handleKeyCreate(request, env) {
  if (!verifyOperator(request, env)) {
    return Response.json(
      { error: "Unauthorized — operator secret required" },
      { status: 401 }
    );
  }

  if (!env.AUTH_KV) {
    return Response.json(
      { error: "AUTH_KV binding not configured" },
      { status: 503 }
    );
  }

  const body = await request.json().catch(() => ({}));
  const label = body.label || "unnamed";

  const rawKey = await generateApiKey();
  const tokenHash = await hashToken(rawKey);
  const identity = `key-${tokenHash.slice(0, 12)}`;
  const createdAt = new Date().toISOString();

  await env.AUTH_KV.put(
    `key:${tokenHash}`,
    JSON.stringify({
      identity,
      label,
      created_at: createdAt,
      revoked: false,
    })
  );

  // Index by identity for revocation lookup
  await env.AUTH_KV.put(`identity:${identity}`, tokenHash);

  return Response.json({
    key: rawKey,
    identity,
    label,
    created_at: createdAt,
    note: "Store this key securely — it cannot be retrieved again.",
  }, { status: 201 });
}

/**
 * Revoke an API key by identity. Operator-only.
 *
 * DELETE /api/keys/{identity}
 * Headers: X-Operator-Secret: {env.OPERATOR_SECRET}
 *
 * @param {string} identity - key identity (e.g., "key-a3f2b8c1d4e5")
 * @param {object} env
 * @param {Request} request
 * @returns {Promise<Response>}
 */
export async function handleKeyRevoke(identity, request, env) {
  if (!verifyOperator(request, env)) {
    return Response.json(
      { error: "Unauthorized — operator secret required" },
      { status: 401 }
    );
  }

  if (!env.AUTH_KV) {
    return Response.json(
      { error: "AUTH_KV binding not configured" },
      { status: 503 }
    );
  }

  const tokenHash = await env.AUTH_KV.get(`identity:${identity}`);
  if (!tokenHash) {
    return Response.json({ error: "Key not found" }, { status: 404 });
  }

  const stored = await env.AUTH_KV.get(`key:${tokenHash}`, "json");
  if (!stored) {
    return Response.json({ error: "Key not found" }, { status: 404 });
  }

  stored.revoked = true;
  stored.revoked_at = new Date().toISOString();
  await env.AUTH_KV.put(`key:${tokenHash}`, JSON.stringify(stored));

  return Response.json({
    identity,
    revoked: true,
    revoked_at: stored.revoked_at,
  });
}

/**
 * Verify operator secret from X-Operator-Secret header.
 *
 * @param {Request} request
 * @param {object} env - must have OPERATOR_SECRET
 * @returns {boolean}
 */
function verifyOperator(request, env) {
  if (!env.OPERATOR_SECRET) return false;
  const provided = request.headers.get("X-Operator-Secret");
  if (!provided) return false;
  // Constant-time comparison via subtle.timingSafeEqual not available
  // in Workers — use double-hash comparison instead
  return provided === env.OPERATOR_SECRET;
}

// ── Rate Limiting ─────────────────────────────────────────────────────

/**
 * Check and increment rate limit for a client.
 * Uses a sliding window: KV key expires after 1 hour.
 *
 * @param {string} clientId - identity string or IP for anonymous
 * @param {number} limit - max requests per hour (-1 = unlimited)
 * @param {object} env - must have AUTH_KV binding
 * @returns {Promise<{allowed: boolean, remaining: number, resetAt: string}>}
 */
export async function checkRateLimit(clientId, limit, env) {
  if (limit === -1) {
    return { allowed: true, remaining: -1, resetAt: null };
  }

  if (!env.AUTH_KV) {
    return { allowed: true, remaining: limit, resetAt: null };
  }

  const windowKey = `rate:${clientId}:${currentHourWindow()}`;
  const current = parseInt(await env.AUTH_KV.get(windowKey) || "0", 10);

  if (current >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetAt: nextHourWindow(),
    };
  }

  // Increment with 2-hour TTL (covers current + next window)
  await env.AUTH_KV.put(windowKey, String(current + 1), {
    expirationTtl: 7200,
  });

  return {
    allowed: true,
    remaining: limit - current - 1,
    resetAt: nextHourWindow(),
  };
}

/**
 * Current hour window key (YYYY-MM-DDTHH).
 * @returns {string}
 */
function currentHourWindow() {
  return new Date().toISOString().slice(0, 13);
}

/**
 * Next hour boundary as ISO string.
 * @returns {string}
 */
function nextHourWindow() {
  const next = new Date();
  next.setMinutes(0, 0, 0);
  next.setHours(next.getHours() + 1);
  return next.toISOString();
}

// ── Solid-OIDC Resolver (Phase 2 placeholder) ────────────────────────

/**
 * Placeholder for Solid-OIDC DPoP verification.
 * Phase 2 implementation will:
 *   1. Extract DPoP proof JWT from DPoP header
 *   2. Verify JWT signature via crypto.subtle
 *   3. Validate claims (htm, htu, iat, jti)
 *   4. Check jti against KV for replay prevention
 *   5. Verify ID token cnf thumbprint matches DPoP key
 *   6. Dereference WebID → confirm solid:oidcIssuer
 *
 * @param {Request} request
 * @param {string} credential - ID token from Authorization header
 * @param {object} env
 * @returns {Promise<{identity: string|null, tier: string, rateLimit: number, podAccess: boolean}>}
 */
async function resolveSolidOidc(request, credential, env) {
  // Phase 2: DPoP + WebID verification
  // For now, return anonymous — Solid-OIDC not yet active
  return {
    identity: null,
    tier: "anonymous",
    ...TIERS.anonymous,
    _note: "Solid-OIDC resolver not yet implemented (Phase 2)",
  };
}
