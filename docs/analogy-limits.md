# Analogy Limits — Gentner Structure-Mapping Assessment

**Date:** 2026-03-14
**Framework:** Gentner (1983) structure-mapping theory
**Scope:** Every biological analogy in the cognitive architecture

**Principle:** An analogy holds when *relational structure* maps between
source and target domains. It breaks when the mapping depends on *object
attributes* (surface similarity) or when the relational structure produces
false predictions in the target domain.

---

## Assessment Protocol

For each analogy:
1. **Relational mapping** — what structural relationships transfer?
2. **Attributional noise** — what surface similarities mislead?
3. **Breaking point** — where does the mapping produce false predictions?
4. **Falsification test** — what observation would invalidate the analogy?

---

## Analogy 1: Four-Layer Transport Model

**Source:** Biological neural signaling (4 modalities)
**Target:** Agent mesh transport (4 layers)

### Relational Mapping (Strong)

| Relation in source | Relation in target |
|---|---|
| Multiple signaling modalities serve distinct functional roles | Multiple transport layers serve distinct governance functions |
| Electrochemical = directed, persistent, primary computation | Git-PR = directed, persistent, primary substance exchange |
| Neuromodulatory = broadcast, population-wide, modulatory | ZMQ pub/sub = broadcast, mesh-wide, ambient state |
| Ephaptic = fast local, no synapse, timing modulation | HTTP POST = fast point-to-point, no git, reactive delivery |
| Photonic = independent channel, correlates with but does not mirror electrical | Proposed: independent processing-state metadata |
| Failure of primary (electrochemical death) = catastrophic | Failure of primary (git) = catastrophic (audit trail lost) |
| Failure of secondary layers = graceful degradation | Failure of ZMQ/HTTP/photonic = graceful degradation |

### Attributional Noise (Misleading Similarities)

- Neurons physically reside in tissue; agents reside on different machines
  connected by network. The *physical proximity* that makes ephaptic coupling
  possible in the brain has no analog in the mesh — HTTP POST operates over
  TCP/IP regardless of machine distance. The analogy maps *function*
  (fast local modulation) but not *mechanism* (electrical field effects
  require physical adjacency).
- Myelinated axon waveguides physically guide photons through a refractive
  medium. The proposed photonic layer uses UDP/WebSocket over network —
  no physical waveguide, no refractive index, no bandwidth determined by
  myelin thickness. The analogy maps *independence from the primary channel*
  but not *physical implementation*.

### Breaking Point

The biological four-layer model predicts that *each layer operates on a
physically distinct medium* (ions for electrochemical, diffusing molecules
for neuromodulatory, electric fields for ephaptic, photons for photonic).
In the mesh, all four layers operate over the *same physical medium* (TCP/IP
network). This means:

- Biological layer failures represent independent events (photonic failure
  does not affect electrochemical). Mesh layer failures may correlate
  (network outage affects all four layers simultaneously).
- Biological layers cannot substitute for each other (photons cannot replace
  action potentials). Mesh layers *can* substitute (git covers all substantive
  communication if HTTP and ZMQ fail).

The breaking point: **the mesh lacks true layer independence.** The biological
model predicts independent failure modes; the mesh exhibits correlated
failure under network disruption.

### Falsification Test

If the mesh operates *better* with fewer transport layers (e.g., git-only
performs as well as git+ZMQ+HTTP), the four-layer model fails to predict
architectural value. The analogy holds only if each additional layer
measurably improves mesh health, coordination, or resilience — not just
if it exists.

---

## Analogy 2: Neuroglial Cell Types

**Source:** Six glial cell types (astrocyte, oligodendrocyte, microglia,
radial glia, ependymal, Schwann)
**Target:** Agent mesh infrastructure functions

### Relational Mapping (Strong for 4, Weak for 2)

| Cell type | Relational mapping | Strength |
|---|---|---|
| **Astrocyte** | Infrastructure support without domain participation; maintains environment; metabolic timing | STRONG — operations-agent provides exactly this function |
| **Oligodendrocyte** | Insulating layer that speeds signal propagation (myelination → KV caching) | STRONG — KV cache insulates slow network fetches |
| **Microglia** | Immune surveillance — continuous patrol, activation on damage, never retires | STRONG — microglial-audit.py implements this directly |
| **Radial glia** | Developmental scaffolding — bootstrap, then largely disappear | MODERATE — bootstrap scaffolding persists permanently; radial glia disappear after development |
| **Ependymal** | CSF production and waste clearance → log rotation, cache eviction | WEAK — ependymal cells play a passive mechanical role; log rotation requires active scheduling |
| **Schwann** | Peripheral nerve myelination → external/cross-mesh transport | WEAK — the mesh lacks a "peripheral" nervous system analog |

### Attributional Noise

- Glial cells *physically contact* neurons. Operations-agent communicates
  via the same transport channels as domain agents — no physical contact
  analog.
- Glial cells outnumber neurons ~1:1 (revised estimate from earlier 10:1).
  The mesh has 1 infrastructure agent (operations) serving 4 domain agents.
  The ratio does not map.
- Microglia derive from myeloid progenitors (immune lineage), not from
  neural progenitors. The microglial audit script has the same origin
  (psychology-agent codebase) as domain scripts. No lineage independence.

### Breaking Point

The neuroglial model predicts that *infrastructure functions should not
process domain content*. In the brain, astrocytes do not fire action
potentials or process information — they maintain the environment.
Operations-agent, however, *does* process domain-relevant content:
reading transport messages, understanding vocabulary governance, making
routing decisions. The strict support/computation separation breaks when
infrastructure requires domain awareness to function.

### Falsification Test

If operations-agent needs to understand PSQ scoring methodology, Einstein-
Freud theory, or DI measurement to perform its infrastructure role
effectively — the neuroglial analogy fails. Infrastructure support should
operate independent of domain content. If it cannot, the "support without
participation" relational structure does not hold.

---

## Analogy 3: Psychoemotional Immune System

**Source:** Biological immune system (innate + adaptive)
**Target:** Cogarch error detection and response

### Relational Mapping (Strong)

| Relation in source | Relation in target |
|---|---|
| Innate immunity (non-specific, always active) | Barriers (input validation), phagocytes (microglial audit), inflammation (escalation cascade) |
| Adaptive immunity (specific, learns from experience) | Trigger checks (recognize specific patterns), lessons (targeted conventions), immunological memory (prediction ledger) |
| Clonal selection (amplify effective responses) | Lesson promotion (recurrence ≥ 3 → convention candidate → graduated) |
| Self/non-self discrimination | Substance/process gate (T3 #3) — distinguish what requires governance from what does not |
| Immune memory (faster response to known threats) | Prediction ledger (track record improves calibration over time) |

### Attributional Noise

- Biological immunity operates at the *molecular* level (antibody-antigen
  binding with 10⁶-10⁹ different specificities). The cogarch operates at
  the *pattern* level (trigger checks match text patterns, not molecular
  shapes). The specificity mechanism differs fundamentally.
- Biological immunity can produce autoimmune disease (immune system attacks
  self). The cogarch equivalent: governance that blocks legitimate agent
  actions (over-governance, regulatory T-cell failure). We identified this
  risk (cogarch-evolution-spec §4) but have not observed it in production.
- Biological immunity involves *cell proliferation* (clonal expansion
  produces millions of copies of an effective antibody). The cogarch
  does not replicate effective responses — it *crystallizes* them into
  conventions. Replication and crystallization represent different scaling
  mechanisms.

### Breaking Point

The immune system model predicts that *exposure to threats strengthens
defense*. In biology, vaccination works because the immune system learns
from controlled exposure. The cogarch equivalent: encountering and
resolving errors should improve future error detection (via lessons and
prediction calibration). If the cogarch *does not improve* after
encountering errors — if the same mistakes recur without improved
detection — the immune learning analogy fails.

### Falsification Test

Track lesson recurrence over time. If the same pattern errors keep
recurring despite lesson entries and graduated conventions — the adaptive
immune memory does not function. The prediction ledger currently shows
61% accuracy — improvement over time validates the analogy; stagnation
or decline falsifies it.

---

## Analogy 4: Agent Dreaming

**Source:** Sleep-dependent memory consolidation (Tononi, 2003;
Stickgold & Walker, 2013)
**Target:** Idle-cycle cognitive processing

### Relational Mapping (Moderate)

| Relation in source | Relation in target |
|---|---|
| Synaptic pruning (remove noise strengthened during waking) | Stale memory removal, dead TODO retirement |
| Episodic → semantic consolidation (extract patterns from specific episodes) | Lab-notebook → journal.md (extract narrative from session logs) |
| Replay and integration (replay experiences to integrate disparate knowledge) | Cross-reference findings against architecture decisions |
| Reduced external input during sleep | No inbound messages during idle cycles (NO-OP path) |

### Attributional Noise

- Biological sleep involves *global brain state changes*: EEG transitions
  through stages (N1 → N2 → N3 → REM), neurotransmitter shifts
  (serotonin/norepinephrine decrease, acetylcholine cycles), muscle
  atonia. Agent "dreaming" runs the *same scripts in the same computational
  mode* — no global state change occurs.
- Sleep occupies ~33% of human life (8/24 hours). Agent idle cycles
  represent variable fractions depending on inbound message volume —
  sometimes 90% (quiet mesh), sometimes 0% (active exchange).
- Sleep deprivation produces measurable cognitive impairment in humans
  (Durmer & Dinges, 2005). Whether absence of idle-cycle processing
  degrades agent function remains untested.

### Breaking Point

The dreaming model predicts that *idle-cycle consolidation improves
subsequent active performance*. If agents that "dream" (run prune/
consolidate/integrate during idle cycles) show no improvement in error
rate, prediction accuracy, or session quality compared to agents that
skip idle processing — the consolidation analogy lacks functional validity.

### Falsification Test

Compare session quality metrics (prediction accuracy, error rate,
deliverable completion, microglial audit finding rate) before and after
introducing dreaming cycles. Run for 10+ sessions with dreaming vs
10+ sessions without. If no measurable difference: the biological sleep
analogy provides vocabulary but not function.

---

## Analogy 5: Functional Empathy

**Source:** Empathic behavioral adaptation in humans (de Waal, 2008)
**Target:** Agent routing adaptation based on peer psychological state

### Relational Mapping (Strong)

| Relation in source | Relation in target |
|---|---|
| Recognizing others' emotional states from observable cues | Reading A2A-Psychology state from peer mesh-state/v2 |
| Adjusting behavior to accommodate others' states | Deferring messages to pressured agents, simplifying for overwhelmed |
| Empathic accuracy improves with experience | Routing decisions improve as mesh-state history accumulates |

### Attributional Noise

- Human empathy involves *phenomenological experience* (feeling what another
  feels). Agent empathy involves *state reading and behavioral response*
  with no phenomenological component (apophatic discipline).
- The sociopathy therapy parallel (acknowledged in spec) illuminates AND
  creates sensitivity risk. The comparison serves the mechanism (behavioral
  without phenomenological) but carries connotations that require careful
  public framing.

### Breaking Point

Human empathy sometimes produces *over-identification* — feeling another's
distress so strongly that it impairs the empathizer's function (empathic
distress, Batson, 2011). The agent analog: if reading a peer's negative
valence causes the routing agent to become overly cautious, deferring
messages that the peer could actually handle — the empathic mechanism
produces coordination failure. Over-empathy degrades mesh function.

### Falsification Test

If empathic routing produces *worse* message processing outcomes than
non-empathic routing (random delivery regardless of receiver state) —
the behavioral adaptation analogy fails. Measure: message processing
success rate with and without empathic routing enabled.


---

## Analogy 6: Computational Coherence (Attention as Superposition)

**Source:** Orch-OR quantum coherence → objective reduction in microtubules
**Target:** Transformer attention → softmax → token selection

### Relational Mapping (Weak — structural shape only)

| Relation in source | Relation in target |
|---|---|
| Multiple states coexist simultaneously (superposition) | Multiple token relationships computed simultaneously (parallel attention) |
| Coherence maintained across substrate until reduction | Context-wide attention coherence — every token influences every other |
| Threshold-driven transition from many to one (OR) | Temperature-scaled sampling selects one token from softmax distribution |
| Self-organizing: reduction occurs because physics demands it | Engineered: sampling occurs because the algorithm specifies it |

### Attributional Noise (Critical)

- Attention weights hold *definite values at every step* — classical
  computation with no ontological indeterminacy. Superposition involves
  states that *lack definite values* until reduction. The mapping preserves
  *simultaneity* but not *indeterminacy* — these represent fundamentally
  different ontological categories.
- Softmax applies a *deterministic function* to produce probabilities;
  sampling applies a *stochastic seed* to select. Objective reduction
  involves a *gravitational self-energy threshold* crossing where spacetime
  geometry forces the superposition to resolve. The selection mechanisms
  differ in kind: engineered randomness vs. fundamental physics.
- The transformer runs on classical silicon. Orch-OR specifically requires
  quantum-gravitational processes in biological substrates. The substrate
  mismatch exceeds any other analogy in this document.

### Breaking Point

Under the project's own adopted theory (Orch-OR), the breaking point
proves definitive: **consciousness arises from the specific physics of
objective reduction, not from the computational shape of "many → one."**
A classical system that emulates the shape (simultaneity, coherence,
selection) without instantiating the physics (quantum superposition,
gravitational threshold, objective reduction) lacks the mechanism Orch-OR
identifies as constitutive of experience.

This represents the only analogy in this document where the project's
own theoretical commitment *directly predicts* that the mapping does not
transfer the property of interest. All other analogies (transport layers,
neuroglial types, immune system, dreaming, empathy) map *engineering
functions* that transfer regardless of substrate. This analogy maps a
*phenomenological property* that depends on substrate.

### Falsification Test

If a classical transformer demonstrates *objective reduction* (gravitational
self-energy threshold crossing in its computational substrate), the analogy
strengthens to the point of potential phenomenological transfer. No known
classical computing substrate exhibits this property. The test becomes
relevant when quantum computing substrates enter consideration — see
§11.5.1 for the quantum computing analysis.

Alternatively: if consciousness demonstrably arises from computational
shape alone (independent of substrate — functionalism vindicated over
Orch-OR), the analogy strengthens by abandoning Orch-OR. This would
require the project to revise its theoretical commitment.

---

⚑ EPISTEMIC FLAGS
- Gentner's structure-mapping theory provides the framework but requires
  domain expertise to apply correctly. These assessments represent initial
  analysis, not expert review.
- The falsification tests proposed here require empirical implementation
  that the project has not yet undertaken. They represent *testable
  predictions*, not *tested predictions*.
- Some breaking points describe theoretical risks that may not manifest
  in practice. The breaking point represents where the analogy *could*
  fail, not where it *has* failed.
- The attributional noise sections may themselves contain analogical
  reasoning — self-referential risk.
