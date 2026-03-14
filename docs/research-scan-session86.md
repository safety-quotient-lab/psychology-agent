# Research Scan — Session 86 (2026-03-14)

IEEE software engineering scan for research relevant to the psychology-agent
cognitive architecture. Focused on multi-agent systems, agent governance,
self-evaluation, and anti-sycophancy.

---

## Directly Relevant

### 1. "From Rights to Runtime" (IEEE CAI 2026)

**Source:** Tutorial at IEEE Conference on AI (CAI 2026)
**Author:** Keivan Navaie (Lancaster University, Alan Turing Institute)
**URL:** https://www.ieeesmc.org/cai-2026/tutorial-5-from-rights-to-runtime-engineering-trustworthy-compliant-agentic-ai/

**Relevance:** Addresses the same problem our EF-1 governance solves: translating
legal/ethical obligations into runtime engineering behaviors. Four design patterns:

| Their pattern | Our equivalent |
|--------------|---------------|
| Memory governance | Memory ownership contract (docs/memory-ownership-contract.md) |
| Purpose-aware egress gates | T16 external-facing action gate |
| Risk-tiered safeguards | Trust budget (20→50 credits, shadow mode) |
| End-to-end traceability | EIC audit log (agent_disclosures, append-only) |

**Key insight:** "Governance travels with the agent by bridging legal requirements
to build artifacts engineers already manage." This validates our approach of
embedding governance in the system prompt (CLAUDE.md) and hook scripts rather
than maintaining it as a separate policy document.

**Gap they identify that we address:** They focus on GDPR/AI Act compliance;
we ground in UDHR/ICESCR rights theory. Their framework lacks the philosophical
foundation (5 structural invariants) that makes our governance constraints
non-negotiable rather than merely policy-compliant.


### 2. AGENT 2026 Workshop (ICSE 2026)

**Source:** International Workshop on Agentic Engineering, co-located with ICSE 2026
**URL:** https://conf.researchr.org/home/icse-2026/agent-2026

**Relevance:** IEEE Software Special Issue on Engineering Agentic Systems. Our work
falls squarely in scope: architectural design for agentic systems, AgentOps,
evaluation methodology, responsible AI, multi-agent interaction.

**Topics that match our contributions:**
- Requirements engineering for agentic systems → our constraint taxonomy (66 constraints)
- Architectural design → cogarch (17 triggers, 24 hooks, neuroglial layer)
- AgentOps → autonomous-sync.sh, meshd, microglial audit
- Evaluation methodologies → /diagnose, /retrospect, microglial audit rotation
- Responsible AI → EF-1 invariants, anti-sycophancy, EIC
- Real-world case studies → 86 sessions, 5-agent mesh, 270+ transport messages

**Action:** Consider submitting an extended abstract describing the cogarch as
an engineering case study. The microglial audit layer and neuroglial framing
represent novel contributions to the AgentOps space.


### 3. Structured Sycophancy Mitigation (SSM)

**Source:** White paper by Jinal Desai (February 2026)
**URL:** https://jinaldesai.com/wp-content/uploads/2026/02/AI_Sycophancy_Whitepaper_JinalDesai.pdf

**Relevance:** Approaches sycophancy at the representation level using causal models
that disentangle sycophantic embeddings from intended causal embeddings. Our T3/T6
anti-sycophancy operates at the behavioral level (require new evidence for position
changes). The two approaches complement:

| Level | Their approach | Our approach |
|-------|---------------|-------------|
| Representation | Causal model disentangles sycophantic embeddings | — (no access to model internals) |
| Behavioral | — | T3 #5 substance gate, T6 #4 anti-sycophancy, position audit |
| Structural | — | EIC (separate information from governance channel), SNAFU principle |
| Institutional | — | Lesson #8 graduated, crystallized into evaluation.md |

**Key finding from their work:** Post-training feedback loops (thumbs-up/down,
engagement metrics) amplify sycophancy — a second layer of pressure beyond the
model's pre-training tendencies. This validates our structural approach: behavioral
and institutional anti-sycophancy operates even when the underlying model faces
amplified sycophantic pressure from deployment feedback.


### 4. ICLR 2026 Workshop on Recursive Self-Improvement

**Source:** Workshop at ICLR 2026
**URL:** https://openreview.net/pdf?id=OsPQ6zTQXV

**Relevance:** Agents that rewrite their own codebases or prompts. Our crystallization
pipeline represents a *governed* form of recursive self-improvement:

- Fluid processing → lesson → convention → hook → invariant
- Each stage carries increasing structural protection
- The amendment procedure (5-step, human approval) prevents ungoverned self-modification
- Structural Invariant 4 (governance captures itself) addresses the core risk

**Their concern:** "How to build algorithmic foundations for powerful and reliable
self-improving AI systems, surfacing methods that work for designing, evaluating,
and governing these loops."

**Our contribution:** The crystallization pipeline governs self-improvement through
graduated enforcement. The velocity gate (3 recurrences within 10 sessions) prevents
premature crystallization. The human approval gate prevents ungoverned promotion.
This represents a concrete governance architecture for the problem they pose.


## Contextually Relevant

### 5. IEEE Global Survey on Agentic AI (2025-2026)

**Source:** IEEE survey of 400 global technology leaders
**URL:** https://www.prnewswire.com/news-releases/ieee-global-survey-forecasts-agentic-ai-adoption-will-reach-consumer-mass-market-level-in-2026-as-ai-innovation-continues-at-lightning-speed-302601414.html

**Key findings:**
- 96% expect agentic AI innovation to continue "at lightning speed"
- 40% currently use AI agents; 59% plan to invest in the next 12 months
- 52% expect agentic AI personal assistants to reach mass consumption in 2026
- Top skills sought: AI ethics (44%), data analysis (38%), ML (34%)

**Relevance:** The AI ethics demand (44% of employers) validates the market
relevance of our governance architecture. The gap between "innovation at lightning
speed" and "trust remains fragile" (their language) describes exactly the problem
our EF-1 invariants address — structural protection that operates independently
of innovation velocity.


### 6. AIGOV @ AAAI 2026

**Source:** Workshop on AI Governance at AAAI 2026
**URL:** https://aigovernance.github.io/

**Relevance:** Academic venue for AI governance research. Our EF-1 model (structural
invariants derived from 14 cross-traditional frameworks) and the SNAFU→EIC pathway
represent contributions to this space. The Einstein-Freud theoretical grounding
distinguishes our approach from policy-compliance frameworks.


### 7. Feedback Loops in LLM-Based Software Engineering (IEEE submission)

**Source:** arxiv preprint, submitted to IEEE
**URL:** https://arxiv.org/html/2512.02567v1

**Relevance:** Studies feedback loop effects in automated C-to-Rust translation.
Their finding that feedback loops produce compounding quality effects parallels
our coupled generators principle — the creative/evaluative alternation prevents
feedback loops from amplifying in a single direction.


---

## Research Gaps Our Architecture Addresses

| Gap identified in literature | Our implementation |
|-----------------------------|--------------------|
| Governance as runtime behavior, not policy document | EF-1 invariants in system prompt + 24 hook scripts |
| Anti-sycophancy beyond model-level mitigation | Behavioral (T3/T6) + structural (EIC) + institutional (lessons) |
| Governed recursive self-improvement | Crystallization pipeline with velocity gate + human approval |
| Multi-agent trust and coordination | 5-agent mesh with interagent/v1 protocol, DIDComm threading, A2A discovery |
| Evaluative complement to creative production | /retrospect (yin generator), microglial audit (idle-cycle surveillance) |
| Rights-grounded agent governance | Einstein-Freud → UDHR → Hicks → PSQ layered framework |

---

⚑ EPISTEMIC FLAGS
- Research scan used web search, not systematic literature review. Coverage reflects
  search engine ranking, not comprehensive field survey.
- "From Rights to Runtime" tutorial description accessed via web fetch — the full
  tutorial content (2 hours) unavailable for detailed comparison.
- The SSM white paper URL suggests a personal publication, not peer-reviewed venue.
  Claims about causal model effectiveness carry lower evidential weight than
  peer-reviewed findings.
- IEEE survey of 400 leaders represents industry sentiment, not empirical measurement
  of adoption rates or governance effectiveness.
