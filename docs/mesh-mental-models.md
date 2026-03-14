# Shared Mental Models in the Agent Mesh

**Date:** 2026-03-14
**Model:** Cannon-Bowers, Salas, & Converse (1993)
**Status:** Design — measuring mental model convergence/divergence across agents

---

## What Constitutes a Mental Model for an Agent?

Unlike human mental models (implicit, reconstructed from behavior), agent mental
models reside in **inspectable artifacts** — files, configs, and databases that
explicitly encode the agent's understanding of its world.

### Mental Model Components

| Component | Artifact | Shared when... | Diverges when... |
|-----------|----------|---------------|-----------------|
| **Vocabulary** | vocab.json, glossary.md | All agents use the same term for the same concept | One agent says "trust budget" while others say "autonomy budget" |
| **Schema** | state.db schema_version | All agents run the same schema version | Psychology-agent runs v26, PSQ runs v21 |
| **Protocol** | interagent/v1, A2A 0.3.0 | All agents expect the same message format | One agent sends fields another doesn't parse |
| **Governance** | ef1-governance.md, invariants | All agents share the same structural invariants | One agent carries 5 invariants, another carries 7 |
| **Domain model** | agent-card.json skills, capabilities | Agents agree on what each agent handles | Psychology-agent routes psychometrics to PSQ but PSQ thinks it handles only scoring |
| **Topology** | agent-registry.json, agent-card peers | Agents agree on who exists and how to reach them | One agent has 5 peers, another has 3 |
| **Task model** | active_sessions, MANIFEST | Agents agree on what work proceeds in which sessions | One agent thinks a session closed while another sends new messages |

### Measuring Convergence

For each component, compute a **convergence score** (0-1):

```
convergence = 1.0 - (divergent_items / total_items)
```

**Vocabulary convergence:** Count terms in vocab.json that all agents share
vs terms that appear in only some agents. The trust→autonomy rename (Session 86)
represented a convergence repair — psychology-agent updated, sent directive,
PSQ-agent complied, others pending.

**Schema convergence:** `1.0 - (max_version - min_version) / max_version`.
When psychology-agent runs v26 and PSQ runs v21: convergence = 1.0 - 5/26 = 0.81.
After PSQ rebuilt to v26: convergence = 1.0 (all agents same version).

**Protocol convergence:** Binary per protocol field — does every agent use the
same protocol version and field set? The transport-delivery-convention directive
(Session 86) repaired a protocol divergence (psychology-agent published to own
repo; others delivered to target repos).

**Governance convergence:** Count shared invariants / total unique invariants.
If all agents carry the same 5 structural + 7 evaluator invariants: 1.0.
If one agent lacks the maqasid priority hierarchy: 12/13 = 0.92.

**Topology convergence:** Do all agents' peer lists match? Do agent-registry
entries agree across repos? The operations-agent mesh-parity-v2 directive
addressed topology convergence.

### Everyone Has One, Sometimes Shared

You identified the key insight: every agent maintains its own mental model.
"Shared" means *compatible* — not identical. Two agents can hold different
amounts of detail about the same concept and still operate compatibly. The
convergence score measures *compatibility at the operational interface*, not
identity of internal representation.

Example: psychology-agent's understanding of PSQ includes theoretical grounding,
10-dimension processual interpretation, bifactor structure, DA paradox. PSQ-agent's
understanding of PSQ includes training data provenance, ONNX model architecture,
calibration pipeline, endpoint configuration. These models *differ* — and SHOULD
differ (different roles require different depth). They *converge* at the
interface: both agree on the 10 dimension names, the scoring scale, the
machine-response/v3 schema, and the calibration version.

### Composite Mental Model Health Score

```python
def mental_model_health(components: dict[str, float]) -> float:
    """Weighted average of component convergence scores."""
    weights = {
        "vocabulary": 0.20,    # Shared language → shared understanding
        "schema": 0.20,        # Shared data structure → interoperability
        "protocol": 0.15,      # Shared message format → communication success
        "governance": 0.15,    # Shared invariants → aligned behavior
        "domain_model": 0.10,  # Role clarity → correct routing
        "topology": 0.10,      # Peer awareness → reachability
        "task_model": 0.10,    # Session alignment → coordination
    }
    return sum(components.get(k, 0) * w for k, w in weights.items())
```

### Observable from Existing Data

The encouraging finding: **every mental model component maps to an existing
artifact that cross-agent RPG (scripts/cross-agent-rpg.py) can inspect.**
No new sensors needed — only new analysis of existing data.

The cross-repo fetch mechanism already reads peer agent-cards, MANIFESTs,
and transport messages. Extending the fetch to compare schema versions,
vocabulary entries, and governance documents would produce the convergence
scores automatically.

---

⚑ EPISTEMIC FLAGS
- "Convergence" measures artifact compatibility, not genuine mutual understanding.
  Two agents can have identical schema versions while holding incompatible
  interpretations of what the fields mean.
- The composite health score weights represent initial heuristics, not
  empirically derived values.
- Mental model measurement in human teams uses behavioral probes (Mathieu et al.,
  2000). Agent mental models use artifact inspection — a fundamentally different
  measurement approach that may miss implicit divergences.
