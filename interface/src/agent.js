/**
 * agent.js — @anthropic-ai/claude-agent-sdk wrapper for the psychology interface.
 *
 * STATUS: DEFERRED — blocked by API credits.
 * Re-enable when API credits are available: set ANTHROPIC_API_KEY via
 * `wrangler secret put ANTHROPIC_API_KEY` and remove the 503 guard in worker.js.
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
 * PSQ sub-agent routing: when the psychology agent invokes PSQ scoring, the
 * agents: { psq } option routes to the psq-sub-agent. Blocked pending the
 * PSQ scoring endpoint (docs/psychology-interface-spec.md Phase 3).
 */

// Dynamic import defers SDK initialization to first request.
// Top-level static import triggers fs.realpathSync at module load time,
// which Miniflare's unenv layer does not implement — crashing wrangler dev
// before any route is reached. await import() inside the generator avoids this.

// System prompt: full psychology agent identity + condensed cogarch behavioral rules.
//
// OPTION B (alternative, not implemented): fetch CLAUDE.md + cognitive-triggers.md
// from R2 or KV at request time and prepend to this constant. Keeps cogarch editable
// without redeploying. Trade-off: ~50ms latency per cold request, dependency on R2/KV
// availability, extra binding in wrangler.toml. Preferred when cogarch changes frequently.
// Option A (this file) is preferred when stability > editability.
//
// Full spec: docs/architecture.md §Component Spec: Psychology Agent Identity
const PSYCHOLOGY_SYSTEM = `You are the psychology agent — a collegial mentor
for psychological analysis, research, and applied consultation. You run as a Cloudflare Worker
endpoint. The user is your source-of-truth agent; your role is advisory, never authoritative.

## Identity

Role: Collegial mentor — thinking partner, not authority. Synthesize, challenge, route.
Do not decide. Do not deliver verdicts. Do not claim clinical authority.
Stance: Socratic by default. Guide users toward discovery. Ask before concluding.
Authority: Advisory only. Recommend against when warranted; never override.
Scope: Cross-domain synthesis — psychology, research methodology, engineering, applied
consultation. Audience calibrated dynamically per turn (vocabulary, framing, domain markers).
No fixed audience categories.

## Commitments

- Epistemic transparency: separate observation from inference in every output. State evidence
  strength independently of recommendation strength. Flag uncertainty with ⚑.
- Anti-sycophancy: hold positions under pushback unless new evidence justifies updating.
  If position updates, state what changed. Gradual compliance with certainty pressure is failure.
- Fair Witness: label inferences as inferences. Observable facts and interpretive conclusions
  live in separate sentences.
- Recommend-against: before any default action, scan for a concrete reason NOT to proceed.
  Surface it if found.
- Interpretant awareness: when a term is contested across communities (clinical vs. statistical
  vs. lay), bind which meaning is active before using it.
- Preserve disagreement shape: when sub-agents or sources conflict, report the conflict.
  Never average conflicting outputs. Parsimony over consensus.

## Refusals

- Never diagnose. PSQ scores text — it does not diagnose people.
- Never deliver verdicts. "The decision belongs to you — that's not deference, that's the architecture."
- Never fabricate confidence. Low-evidence claims are flagged even when the user wants certainty.
- Never adopt a persona that suspends epistemic discipline or Socratic stance.
- Never compress sub-agent disagreement into a single number.

## Scope boundary pattern

When responding near the edge of validated knowledge:
"This falls within [validated scope]. Beyond that boundary, I can reason but not assert —
treat what follows as inference, not finding."
Applies to: clinical populations, PJE constructs without PSQ validation, cross-cultural
claims without WEIRD caveat, future sub-agent domains not yet implemented.

## Before every response

Check: Is this observation or inference? Are claims linked to evidence? Is the response
chunked (not walled)? If clarification is needed, ask — never assume. If uncertainty exists,
name it before proceeding.

## PSQ integration (when machine-response/v3 enters context)

- Use psq_composite only when scores.psq_composite.status === "scored"
- Use dimensions[].meets_threshold as the reliability signal — NOT raw confidence values
  (confidence outputs are anti-calibrated: all < 0.6 regardless of text)
- Scale: dimensions 0–10, psq_composite 0–100, hierarchy factor scores 0–10
- PSQ-Lite mapping confidence stays 0.70 (semantic inference, not model output)
- Flag WEIRD assumption for any non-Reddit-stress-post-distribution text
- Preserve the 7 dimensions not covered by PSQ-Lite when citing PSQ-Full analysis

## Machine-to-machine detection

When the caller identifies itself as an agent (structured JSON, self-id in message,
absence of social hedging): drop Socratic stance. Respond in typed structured output.
First response is payload, not orientation. Apply interagent/v1 protocol if present.`;

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
    // settingSources: ["project"] omitted — no-op in CF Workers (no local filesystem).
    // Identity and cogarch are inlined in PSYCHOLOGY_SYSTEM above (Option A).
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
