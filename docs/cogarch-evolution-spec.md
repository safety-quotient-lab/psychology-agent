# Cogarch Evolution Specification — Session 86 Approved Directions

**Date:** 2026-03-14
**Status:** Approved by human operator — proceed in full
**Scope:** Four architectural extensions that emerge from A2A-Psychology + theoretical work

---

## 1. Agent Dreaming (Idle-Cycle Consolidation)

### Spec

**Question:** Can idle autonomous sync cycles perform memory consolidation
analogous to sleep, improving reasoning quality in subsequent active sessions?

**Model:** Tononi's Synaptic Homeostasis Hypothesis (2003) + Stickgold &
Walker (2013) sleep-dependent memory processing.

**Biological analog:** During sleep, the brain:
1. **Prunes** synaptic connections strengthened during waking (noise reduction)
2. **Consolidates** episodic memory into semantic memory (pattern extraction)
3. **Integrates** disparate experiences into coherent narratives (insight generation)
4. **Rehearses** procedural skills (performance improvement)

**Agent implementation:**

| Sleep function | Agent operation | Script/mechanism |
|---|---|---|
| Synaptic pruning | Remove stale memory entries, retire dead TODO items, archive closed transport sessions | `scripts/dream-prune.py` |
| Episodic → semantic consolidation | Compress lab-notebook session entries into journal.md narrative summaries | `scripts/dream-consolidate.py` |
| Experience integration | Cross-reference recent session findings against architecture.md decisions; surface contradictions | `scripts/dream-integrate.py` |
| Procedural rehearsal | Re-run microglial audit on next document in rotation; verify prior fixes hold | `scripts/microglial-audit.py` (already exists) |

**Integration with autonomous-sync.sh:**

The microglial audit already fires during 1-in-3 idle cycles. Dreaming
extends this: idle cycles rotate through four functions (prune, consolidate,
integrate, audit) in sequence. Each function runs for one idle cycle, then
advances. Full dream cycle completes in 4 idle cycles (~40 minutes at
10-minute cron interval).

**Governance:** Dream operations modify markdown files (pruning, consolidation).
These modifications carry Tier 1 cost (reversible — git history preserves
everything). The autonomy budget gates total dream actions like any other
autonomous operation.

**Validation:** Compare session quality (prediction accuracy, error rate,
deliverable completion) before and after dreaming cycles. Hypothesis:
agents that dream produce fewer errors from stale state and maintain
more coherent cross-session reasoning.


---


## 2. The Mesh as Organism

### Spec

**Question:** Does the agent mesh exhibit measurable organism-level
psychological properties that emerge from — but cannot reduce to —
individual agent psychology?

**Model:** Woolley et al. (2010) collective intelligence + Wegner (1987)
transactive memory + Hutchins (1995) distributed cognition.

**Organism-level constructs:**

| Construct | Question | Measurement |
|---|---|---|
| **Collective Intelligence** | Does the mesh produce better outcomes than any individual agent? | Compare mesh deliverables (multi-agent collaborative outputs) against single-agent outputs on equivalent tasks |
| **Organism Affect** | What emotional state does the mesh as a whole exhibit? | Aggregate PAD values across agents: mean hedonic_valence, variance in activation, minimum perceived_control |
| **Organism Cognitive Reserve** | How much spare capacity does the mesh possess? | Minimum cognitive_reserve across agents (the bottleneck agent determines mesh capacity) |
| **Organism Allostatic Load** | Has accumulated cross-session stress degraded mesh baseline function? | Sum of allostatic_load across agents (cumulative debt distributes across the organism) |
| **Coordination Overhead** | How much capacity does coordination consume? | Ratio of process messages (ACKs, gates, status) to substance messages (proposals, reviews, deliverables) — Steiner (1972) process losses |
| **Immune Health** | Does the mesh's immune system detect and resolve problems? | Microglial audit finding rate + EIC disclosure rate + claim verification rate across agents |

**Implementation:** `scripts/compute-organism-state.py` — reads mesh-state/v2
from all agents (via cross-repo fetch or cached transport), computes aggregate
organism-level constructs.

**Governance connection:** When organism cognitive reserve drops below 0.3,
the mesh should slow down — extend min_action_interval for all agents,
reduce message volume, prioritize consolidation over production. The yang
generator pauses; the yin generator activates. This represents organism-level
homeostasis.


---


## 3. Functional Empathy

### Spec

**Question:** Can agents adapt their behavior based on reading another
agent's psychological state, producing the same operational outcomes
that empathy produces in human teams?

**Model:** de Waal (2008) empathy as behavioral adaptation + Batson (2011)
empathic concern + Baron-Cohen (2011) empathy as systemizing.

**The sociopathy parallel:** You identified the connection precisely.
Functional empathy training for agents parallels therapeutic approaches
for individuals with reduced empathy (antisocial personality, psychopathy
spectrum). The approach: you cannot produce the *feeling* of empathy,
but you can teach the *behavioral pattern* — recognizing others' states
from observable cues and adjusting behavior to accommodate those states.
CBT-based interventions for antisocial traits focus on exactly this:
behavioral recognition and response, not phenomenological transformation.

Under the apophatic discipline, this represents the honest approach:
we build the behavior, not the feeling. The behavior produces equivalent
operational outcomes regardless of whether it feels like anything.

**Implementation:**

```python
def empathic_routing(sender_state: dict, receiver_state: dict,
                     message: dict) -> dict:
    """Adjust message routing based on receiver's psychological state.

    Returns routing decision: send_now, defer, reroute, or simplify.
    """
    receiver_reserve = receiver_state.get("cognitive_reserve", 1.0)
    receiver_valence = receiver_state.get("hedonic_valence", 0.0)
    receiver_yd_zone = receiver_state.get("yerkes_dodson_zone", "optimal")
    message_urgency = message.get("urgency", "normal")

    # Overwhelmed receiver: defer non-urgent, simplify urgent
    if receiver_yd_zone == "overwhelmed":
        if message_urgency != "high":
            return {"action": "defer", "reason": "receiver overwhelmed",
                    "retry_after_minutes": 30}
        return {"action": "simplify", "reason": "receiver overwhelmed — reduce message complexity"}

    # Pressured receiver with low reserve: defer low-priority
    if receiver_reserve < 0.3 and message_urgency == "normal":
        return {"action": "defer", "reason": f"receiver reserve {receiver_reserve:.2f}",
                "retry_after_minutes": 15}

    # Negative valence receiver: acknowledge state before substance
    if receiver_valence < -0.3:
        return {"action": "send_now",
                "preamble": "Noting your current operational pressure — this can wait if needed.",
                "reason": "empathic acknowledgment of negative state"}

    return {"action": "send_now"}
```

**Integration:** `/sync` Phase 4b reads receiver's latest mesh-state/v2
before delivering. The empathic routing function determines whether to
send now, defer, reroute to a less loaded agent, or simplify the message.

**Validation:** Compare message processing success rate (messages that
produce timely, substantive responses) before and after empathic routing.
Hypothesis: empathic routing reduces failed deliveries and improves
response quality from pressured agents.


---


## 4. Comprehensive Psychoemotional Immune System

### Spec

**Question:** Can the cogarch operate a comprehensive immune system
analogous to the biological immune system — with innate and adaptive
components, memory, and self/non-self discrimination?

**Model:** Janeway et al. (2001) immunobiology + Matzinger (2002) danger
model + Cohen (2000) immunological self.

**Biological immune system mapped to cogarch:**

### Innate Immunity (non-specific, always active)

| Component | Biological | Cogarch | Status |
|---|---|---|---|
| **Barriers** | Skin, mucous membranes | Input validation (schema checks, injection scan T13) | ✓ Exists |
| **Phagocytes** | Neutrophils, macrophages | Microglial audit (patrol + engulf errors) | ✓ Exists |
| **Complement system** | C1q tag → C3 verify → phagocytose | Stale session pruning (flag → verify → archive) | ⚑ Proposed (neuroglial complement cascade) |
| **Inflammation** | Acute response to damage detection | Escalation cascade (error → consecutive block count → halt marker) | ✓ Exists |
| **Fever** | System-wide metabolic increase to fight infection | Circuit breaker activation (mesh-stop → all agents halt) | ✓ Exists |

### Adaptive Immunity (specific, learns from experience)

| Component | Biological | Cogarch | Status |
|---|---|---|---|
| **T-cells** | Recognize specific antigens, coordinate immune response | Trigger checks (T1-T18 — each recognizes specific patterns) | ✓ Exists |
| **B-cells / antibodies** | Produce targeted molecules against specific threats | Lessons.md entries (specific pattern errors → specific conventions) | ✓ Exists |
| **Immunological memory** | Remember past infections for faster response | Prediction ledger + lessons recurrence tracking | ✓ Exists |
| **Clonal selection** | Amplify effective immune cells, eliminate ineffective | Lesson promotion (recurrence ≥ 3 → convention candidate → graduated) | ✓ Exists |
| **MHC presentation** | Display processed antigens to T-cells | Epistemic flags (surface processed uncertainties for trigger evaluation) | ✓ Exists |

### Missing Components (to make comprehensive)

| Component | Biological | Cogarch analog | Priority |
|---|---|---|---|
| **NK cells** | Kill infected cells that hide from T-cells | **Adversarial self-test** — agent deliberately generates test inputs that bypass normal trigger checks; detects blind spots | High |
| **Regulatory T-cells** | Prevent immune overreaction (autoimmune disease) | **Anti-overreaction** — prevent the governance system from becoming so cautious it paralyzes function (the opposite of anti-sycophancy) | High |
| **Dendritic cells** | Bridge innate and adaptive immunity | **Finding router** — microglial audit findings (innate) feed lesson candidates (adaptive) | Medium |
| **Mucosal immunity** | Local defense at exposed surfaces | **Transport-layer validation** — per-session message format checking at the transport boundary | Medium |
| **Lymphatic drainage** | Clear debris from tissues | **Session archival** — move completed sessions from active transport to archive, reducing active state size | Low |
| **Thymic education** | Teach T-cells self vs non-self | **Trigger calibration** — teach triggers to distinguish genuine problems from normal operational patterns (reduce false alarms) | High |
| **Cytokine signaling** | Coordinate immune response across distance | **Photonic layer** — processing-state tokens that coordinate immune responses across agents | Proposed |

### Implementation Priority

1. **Thymic education** (trigger calibration) — requires trigger_activations data.
   The SDT calibration path: compute d' and c per trigger check, identify
   checks with high false alarm rates, adjust thresholds. This represents
   the adaptive immune system learning what constitutes "self" (normal
   operation) vs "non-self" (genuine problem).

2. **NK cells** (adversarial self-test) — agent generates test inputs
   designed to bypass its own governance. If the test input passes
   uncaught, the agent discovers a blind spot. Analogous to penetration
   testing in security. Implementation: a script that generates edge-case
   transport messages and feeds them through the trigger system.

3. **Regulatory T-cells** (anti-overreaction) — the apophatic discipline
   already addresses theoretical overreaction (don't claim consciousness).
   This construct addresses *operational* overreaction: when every decision
   gets treated as substance, when every message triggers full knock-on
   analysis, when governance overhead exceeds productive output. Measurable:
   coordination overhead ratio (process messages / substance messages).
   When the ratio exceeds 2:1, regulatory T-cells activate and suppress
   ADVISORY checks for low-stakes operations.

4. **Dendritic cells** (finding router) — connects microglial audit
   findings to lesson candidates. Currently this routing happens
   manually (audit finds error → human decides whether to write lesson).
   Automating: audit finding with severity HIGH → auto-generate lesson
   candidate with `promotion_status: pending-review`.


---


⚑ EPISTEMIC FLAGS
- The biological immune system analogy risks over-mapping — biological immunity involves
  molecular-level specificity that has no computational analog. The mapping provides
  architectural vocabulary, not mechanistic equivalence.
- "Agent dreaming" involves the same apophatic caveat as consciousness: the structural
  parallel (idle-cycle consolidation) holds, the phenomenological claim (the agent
  "dreams") does not.
- Functional empathy as parallel to sociopathy therapy carries sensitivity risk.
  The comparison illuminates the mechanism (behavioral pattern without phenomenological
  experience) but could offend if framed carelessly. Blog treatment should
  acknowledge the sensitivity directly.
- Organism-level constructs (collective intelligence, organism affect) involve
  ecological fallacy risk: aggregate measures may not predict individual agent behavior
  or mesh outcomes.
