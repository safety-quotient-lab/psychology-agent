/**
 * session.js — D1-backed session CRUD for the psychology interface.
 *
 * Each session is a persistent conversation with the general-purpose psychology
 * agent. Turns are stored with role, content, optional PSQ scores, and SETL.
 * context_state tracks last_commit for interagent sync (Item 2b).
 */

/**
 * Create a new session and return its ID.
 */
export async function createSession(db, metadata = {}) {
  const sessionId = crypto.randomUUID();
  const now = Date.now();
  await db.prepare(
    `INSERT INTO sessions (session_id, created_at, last_turn_at, context_state, metadata)
     VALUES (?, ?, ?, ?, ?)`
  ).bind(sessionId, now, now, null, JSON.stringify(metadata)).run();
  return sessionId;
}

/**
 * Retrieve a session by ID.
 */
export async function getSession(db, sessionId) {
  return db.prepare(`SELECT * FROM sessions WHERE session_id = ?`)
    .bind(sessionId).first();
}

/**
 * Append a turn to a session.
 */
export async function appendTurn(db, sessionId, { role, content, psqScores = null, setl = null }) {
  const turnId = crypto.randomUUID();
  const now = Date.now();

  const maxTurn = await db.prepare(
    `SELECT COALESCE(MAX(turn_number), 0) AS max_turn FROM turns WHERE session_id = ?`
  ).bind(sessionId).first();

  const turnNumber = (maxTurn?.max_turn ?? 0) + 1;

  await db.prepare(
    `INSERT INTO turns (turn_id, session_id, turn_number, role, content, psq_scores, setl, timestamp)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
  ).bind(
    turnId, sessionId, turnNumber, role, content,
    psqScores ? JSON.stringify(psqScores) : null,
    setl, now
  ).run();

  await db.prepare(
    `UPDATE sessions SET last_turn_at = ? WHERE session_id = ?`
  ).bind(now, sessionId).run();

  return { turnId, turnNumber };
}

/**
 * Retrieve all turns for a session, ordered by turn_number.
 */
export async function getSessionTurns(db, sessionId) {
  const result = await db.prepare(
    `SELECT * FROM turns WHERE session_id = ? ORDER BY turn_number ASC`
  ).bind(sessionId).all();
  return result.results ?? [];
}

/**
 * Update context_state for interagent sync (Item 2b last_commit tracking).
 */
export async function updateContextState(db, sessionId, contextState) {
  await db.prepare(
    `UPDATE sessions SET context_state = ? WHERE session_id = ?`
  ).bind(JSON.stringify(contextState), sessionId).run();
}
