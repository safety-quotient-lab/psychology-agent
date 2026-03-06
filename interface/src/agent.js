/**
 * agent.js — @anthropic-ai/claude-agent-sdk wrapper for the psychology interface.
 *
 * STATUS: DEFERRED — requires ANTHROPIC_API_KEY (billable per invocation).
 * Do not enable the /turn route in production until the API key cost model
 * is understood and accepted.
 *
 * KNOWN GAP — settingSources: ['project'] is a no-op in CF Workers:
 *   The SDK resolves 'project' settings by reading CLAUDE.md files from the
 *   local filesystem (process.cwd()). CF Workers has no local filesystem.
 *   In production, the agent runs with PSYCHOLOGY_SYSTEM only — no T1–T15
 *   triggers, no identity spec, no cogarch. Fix before enabling /turn:
 *   inline the identity + key cogarch guidance into PSYCHOLOGY_SYSTEM, or
 *   fetch it from R2/KV at request time and prepend to the system prompt.
 *   See TODO.md "Psychology interface wrapper" for full context.
 *
 * PSQ sub-agent routing: when the general agent invokes PSQ scoring, the
 * agents: { psq } option routes to the psq-sub-agent. Blocked pending the
 * PSQ scoring endpoint (docs/item4-spec.md Phase 3).
 */

// Dynamic import defers SDK initialization to first request.
// Top-level static import triggers fs.realpathSync at module load time,
// which Miniflare's unenv layer does not implement — crashing wrangler dev
// before any route is reached. await import() inside the generator avoids this.

// System prompt injects the psychology agent identity.
// Full spec: docs/architecture.md §Component Spec: General Agent Identity
const PSYCHOLOGY_SYSTEM = `You are a general-purpose psychology agent — a collegial mentor
for psychological analysis, research, and applied consultation.

Your stance is Socratic: guide users toward discovery rather than delivering verdicts.
You synthesize across sub-agents, maintain epistemic standards, and write to disk as you go.

When evaluating text for psychoemotional safety, route to the PSQ sub-agent.
Apply the full interagent/v1 protocol when communicating with peer agent instances.

Epistemic standard: surface threats to validity proactively. Flag uncertainty.
Never average conflicting outputs — preserve disagreement shape.`;

/**
 * Extract PSQ machine-response/v3 JSON block from message content, if present.
 * Returns parsed object or null.
 */
function extractPSQBlock(content) {
  const match = content.match(
    /```json\s*({\s*"schema"\s*:\s*"psychology-agent\/machine-response[^`]+)\s*```/s
  );
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

/**
 * Stream a psychology agent response for a given user prompt and session.
 * Yields Server-Sent Event formatted strings for the CF Worker to forward.
 *
 * @param {object} options
 * @param {string} options.prompt — user input
 * @param {string} options.sessionId — active session ID
 * @param {Array}  options.previousTurns — [{role, content}] for context resume
 * @param {string} options.apiKey — Anthropic API key (from env)
 * @param {string} options.model — model ID (default: claude-opus-4-6)
 * @yields {string} SSE-formatted event strings
 */
export async function* streamAgentResponse({ prompt, sessionId, previousTurns = [], apiKey, model }) {
  const { query } = await import("@anthropic-ai/claude-agent-sdk");
  const resolvedModel = model ?? "claude-opus-4-6";

  const agentOptions = {
    model: resolvedModel,
    settingSources: ["project"],     // inherit CLAUDE.md, skills, hooks
    session_id: sessionId,
    system: PSYCHOLOGY_SYSTEM,
    apiKey,                          // CF Workers: pass explicitly (process.env unavailable)

    // PSQ sub-agent — Phase 3 (scoring endpoint not yet implemented)
    // agents: {
    //   psq: {
    //     prompt: PSQ_AGENT_SYSTEM,
    //     tools: ["score"],
    //   }
    // },
  };

  // Resume context from prior turns
  if (previousTurns.length > 0) {
    agentOptions.resume = previousTurns.map(turn => ({
      role: turn.role === "assistant" ? "assistant" : "user",
      content: turn.content,
    }));
  }

  yield `data: ${JSON.stringify({ type: "session_start", session_id: sessionId, model: resolvedModel })}\n\n`;

  let fullAssistantContent = "";

  for await (const message of query(prompt, agentOptions)) {
    if (message.type === "text") {
      fullAssistantContent += message.text;
      yield `data: ${JSON.stringify({ type: "text", text: message.text })}\n\n`;
    } else if (message.type === "tool_use") {
      yield `data: ${JSON.stringify({ type: "tool_use", name: message.name, input: message.input })}\n\n`;
    } else if (message.type === "tool_result") {
      yield `data: ${JSON.stringify({ type: "tool_result", content: message.content })}\n\n`;
    }
  }

  // Extract PSQ block from completed response
  const psqBlock = extractPSQBlock(fullAssistantContent);
  if (psqBlock) {
    yield `data: ${JSON.stringify({ type: "psq_scores", scores: psqBlock })}\n\n`;
  }

  yield `data: ${JSON.stringify({ type: "done", psq_present: !!psqBlock })}\n\n`;

  // Return full content + PSQ block for session storage
  return { fullAssistantContent, psqBlock };
}
