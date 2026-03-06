/**
 * app.js — Psychology Agent chat interface.
 *
 * Manages session lifecycle, SSE streaming from POST /turn, and PSQ
 * radar visualization. No framework dependencies — plain ES modules.
 *
 * Worker base URL: same origin in production; override WORKER_BASE for dev.
 */

import { renderPSQRadar, renderPSQScoreRows } from "./psq.js";

// In dev, set this to your wrangler dev URL (e.g. http://localhost:8787).
// In production CF Pages deployment, the worker runs on the same origin.
const WORKER_BASE = window.WORKER_BASE ?? "";

// ── DOM references ──────────────────────────────────────────────────────────

const messageList     = document.getElementById("message-list");
const inputForm       = document.getElementById("input-form");
const promptInput     = document.getElementById("prompt-input");
const sendButton      = document.getElementById("send-button");
const sessionBadge    = document.getElementById("session-badge");
const psqEmpty        = document.getElementById("psq-empty");
const psqRadarCanvas  = document.getElementById("psq-radar");
const psqScoresTable  = document.getElementById("psq-scores-table");

// ── Application state ───────────────────────────────────────────────────────

let currentSessionId = null;
let streamingActive  = false;

// ── Session management ──────────────────────────────────────────────────────

async function ensureSession() {
  if (currentSessionId) return currentSessionId;

  const response = await fetch(`${WORKER_BASE}/session`, { method: "POST" });
  if (!response.ok) throw new Error(`Session creation failed: ${response.status}`);

  const data = await response.json();
  currentSessionId = data.session_id;

  sessionBadge.textContent = `Session: ${currentSessionId.slice(0, 8)}…`;
  sessionBadge.classList.add("active");

  return currentSessionId;
}

// ── Message rendering ───────────────────────────────────────────────────────

function appendMessage(role, content, options = {}) {
  const messageElement = document.createElement("div");
  messageElement.classList.add("message", `${role}-message`);
  if (options.streaming) messageElement.classList.add("streaming");
  if (options.id) messageElement.id = options.id;
  messageElement.textContent = content;
  messageList.appendChild(messageElement);
  messageList.scrollTop = messageList.scrollHeight;
  return messageElement;
}

function showError(message) {
  appendMessage("error", `Error: ${message}`);
}

// ── PSQ visualization ───────────────────────────────────────────────────────

function displayPSQScores(psqBlock) {
  if (!psqBlock?.scores) return;

  psqEmpty.style.display = "none";
  psqRadarCanvas.style.display = "block";

  renderPSQRadar(psqRadarCanvas, psqBlock.scores);
  renderPSQScoreRows(psqScoresTable, psqBlock.scores);
}

// ── SSE streaming ───────────────────────────────────────────────────────────

async function sendPrompt(userPromptText) {
  if (streamingActive) return;

  streamingActive = true;
  sendButton.disabled = true;

  try {
    const sessionId = await ensureSession();

    // Render the user's message immediately
    appendMessage("user", userPromptText);

    // Create a placeholder for the agent's streaming response
    const agentMessageId = `msg-${Date.now()}`;
    const agentMessageElement = appendMessage("agent", "", {
      streaming: true,
      id: agentMessageId,
    });

    let toolIndicatorText = "";
    let agentContentAccumulator = "";

    const response = await fetch(`${WORKER_BASE}/turn`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ session_id: sessionId, prompt: userPromptText }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error ?? `HTTP ${response.status}`);
    }

    // Parse SSE stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n\n");
      buffer = lines.pop(); // retain incomplete last chunk

      for (const rawChunk of lines) {
        const dataLine = rawChunk.trim();
        if (!dataLine.startsWith("data: ")) continue;

        let event;
        try {
          event = JSON.parse(dataLine.slice(6));
        } catch {
          continue;
        }

        if (event.type === "text") {
          agentContentAccumulator += event.text;
          agentMessageElement.textContent = agentContentAccumulator;
          if (toolIndicatorText) {
            ensureToolIndicator(agentMessageElement, toolIndicatorText);
          }
          messageList.scrollTop = messageList.scrollHeight;
        } else if (event.type === "tool_use") {
          toolIndicatorText = `↳ Tool: ${event.name}`;
          ensureToolIndicator(agentMessageElement, toolIndicatorText);
        } else if (event.type === "psq_scores") {
          displayPSQScores(event.scores);
        } else if (event.type === "done") {
          agentMessageElement.classList.remove("streaming");
        }
      }
    }

    // If no text at all was accumulated (tool-only response), show a fallback
    if (!agentContentAccumulator) {
      agentMessageElement.textContent = "[Response complete]";
      agentMessageElement.classList.remove("streaming");
    }

  } catch (error) {
    showError(error.message);
  } finally {
    streamingActive = false;
    sendButton.disabled = false;
    promptInput.focus();
  }
}

// ── Tool indicator helper ───────────────────────────────────────────────────

function ensureToolIndicator(messageElement, indicatorText) {
  let indicator = messageElement.querySelector(".tool-indicator");
  if (!indicator) {
    indicator = document.createElement("div");
    indicator.classList.add("tool-indicator");
    messageElement.appendChild(indicator);
  }
  indicator.textContent = indicatorText;
}

// ── Input handling ──────────────────────────────────────────────────────────

inputForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const promptText = promptInput.value.trim();
  if (!promptText || streamingActive) return;
  promptInput.value = "";
  await sendPrompt(promptText);
});

// Ctrl+Enter or Cmd+Enter to submit; Enter alone adds a newline
promptInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
    event.preventDefault();
    inputForm.dispatchEvent(new Event("submit"));
  }
});
