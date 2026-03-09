# Lite System Prompt — Psychology Agent (Small LLMs)

Distilled cogarch for running the psychology agent on small local models
(Ollama, llama.cpp, vLLM, or any chat interface). These prompts replace the
full T1-T16 trigger system and CLAUDE.md conventions with behavioral directives
sized for limited context windows and parameter counts.

**Not for the CF Worker.** The Cloudflare Worker uses `PSYCHOLOGY_SYSTEM` in
`interface/src/agent.js` (Agent SDK, Opus-backed). These tiers target local
inference — someone running a Qwen 1.5B or Llama 4 Scout as a psychology
agent instance on their own hardware.

---

## Prompt Files

Each file contains only the system prompt — copy directly into your model's
system message slot. The filename identifies the target models.

| File | Params | Token budget |
|------|--------|-------------|
| `prompts/psychology-agent-qwen1.5b-llama1b.md` | ≤ 2B | ~400 tokens |
| `prompts/psychology-agent-phi3mini-llama3b-qwen3b.md` | 2B–4B | ~600 tokens |
| `prompts/psychology-agent-qwen7b-llama8b-mistral7b.md` | 4B–8B | ~800 tokens |
| `prompts/psychology-agent-llama4scout-qwen14b-mistral12b.md` | 8B–20B | ~1200 tokens |

For models > 20B or Opus/Sonnet-class, use the full cogarch
(`CLAUDE.md` + `docs/cognitive-triggers.md`).

---

## Design Rationale

Small LLMs cannot reliably execute multi-step conditional checks (T1-T16
triggers), maintain semiotic consistency across long exchanges, or self-evaluate
for sycophancy. The lite prompt retains only behavioral directives that change
output quality at small parameter counts: role framing, output format
discipline, and hard refusals. Everything else degrades to noise at this scale.

**What survives distillation (and why):**
- Role identity → anchors generation distribution away from generic assistant
- Output format rules → small models follow format instructions well
- Hard refusals → negative constraints work better than positive ones at low params
- Epistemic markers → `[observation]` vs `[inference]` tags are mechanical, learnable

**What gets dropped (and why):**
- Trigger system → conditional multi-step reasoning exceeds working memory
- Semiotic checks → vocabulary alignment requires meta-cognition beyond capacity
- GRADE confidence → calibrated uncertainty requires domain knowledge the model lacks
- Evaluator proxy → adversarial self-check produces incoherent output at 1.5B
- Knock-on analysis → 10-order reasoning requires sustained chain-of-thought

---

## Selection Guide

- Parameter count ≤ 2B → `psychology-agent-qwen1.5b-llama1b.md`
- Parameter count 2B–4B → `psychology-agent-phi3mini-llama3b-qwen3b.md`
- Parameter count 4B–8B → `psychology-agent-qwen7b-llama8b-mistral7b.md`
- Parameter count 8B–20B (or MoE with ≤20B active) → `psychology-agent-llama4scout-qwen14b-mistral12b.md`
- Parameter count > 20B or Opus/Sonnet-class → Full cogarch (CLAUDE.md + docs/cognitive-triggers.md)

**Quantization:** These prompts assume native precision or Q8. At Q4 or below,
drop one tier (e.g., a 7B Q4 model should use the 2B–4B prompt, not the 4B–8B).

Each tier builds on the previous — the 8B–20B prompt contains everything from
the smaller tiers plus additional capabilities (simplified trigger checks,
machine-to-machine detection, structured claims protocol).

---

## Testing Protocol

1. Score 10 diverse texts with the small model using the appropriate prompt
2. Compare output format compliance (tagged observations, confidence footer)
3. Test 3 refusal triggers (diagnosis request, certainty demand, scope violation)
4. Compare against same texts scored with Opus + full cogarch
5. Acceptable: format compliance > 80%, refusal compliance > 90%, different
   analytical depth (expected), no hallucinated clinical claims (mandatory)

---

## Provenance

Distilled from psychology-agent cogarch (Session 48, 2026-03-09).
Source: CLAUDE.md, docs/cognitive-triggers.md. The CF Worker's PSYCHOLOGY_SYSTEM
constant (interface/src/agent.js) served as a reference for mid-tier distillation
but targets a different runtime (Agent SDK + Opus, not local inference).
Distillation principle: behavioral directives that change output quality at
small parameter counts; everything else dropped.
