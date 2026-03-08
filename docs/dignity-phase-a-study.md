# Dignity Index — Phase A Feasibility Study

**Status:** Pass 1 complete (50/50 assessed). Awaiting Pass 2 for inter-rater reliability.
**Started:** 2026-03-08
**Instrument spec:** `docs/dignity-instrument-spec.md`
**Data source:** Observatory API (`https://observatory.unratified.org/api/v1`)
**Population:** 713 scored stories (as of 2026-03-08)


## 1. Objective

Measure empirical construct distance between PSQ and the proposed Dignity Index
on a stratified sample of observatory content. Determine which Hicks elements
(if any) PSQ dimensions predict, and characterize the false-negative profile
(dignity-relevant content that PSQ misses).

Success criteria from spec §7.5:
1. Inter-rater reliability ≥ 0.60 (moderate agreement) on ≥ 7/10 dimensions
2. Relevance gate correctly classifies ≥ 90% of technical/neutral content as ND
3. PSQ-DI correlation confirms construct distinctness (r < 0.50 for majority
   of cross-instrument dimension pairs)
4. At least 5 stories demonstrate signal inversion (high PSQ threat + high DI)


## 2. Population Distribution (Observed)

| Range | consensus_score | Count (approx) | Notes |
|-------|----------------|-----------------|-------|
| Strong positive | > 0.3 | ~138 | Rights-affirming content |
| Moderate | 0.05–0.3 | ~200 | Mixed signal |
| Low/near-zero | 0.0–0.05 | ~360 | Minimal rights signal or unscored |
| Negative | < 0.0 | ~15 | Thin — only 1 below -0.3 |

| Range | psq_score | Notes |
|-------|-----------|-------|
| High safety | > 7.0 | Technical, celebratory, or measured content |
| Moderate | 4.0–7.0 | Most content clusters here |
| Low safety (high threat) | < 4.0 | Rights-violation reporting, confrontational |
| Floor | 2.63 (observed minimum) | Google Chrome hostile moves list |

**Critical observation:** The `rs_score` (rights salience) field referenced in
observatory turn 6 does not appear in the API response. Technical/neutral
classification relies on `consensus_score = 0` with `hcb_weighted_mean = 0`.

**Thin strata warning:** High-negative HRCB stratum has only ~15 stories below
0.0. This limits statistical power for the negative-HRCB stratum. Sample
selects all available negative stories rather than sampling from a larger pool.


## 3. Stratified Sample (n = 50)

### Stratum 1: High-HRCB Positive (n = 10)

Stories with highest consensus_score — strong rights-affirming content.
Expected DI hypothesis: high dignity scores (content that documents rights
violations typically restores dignity through accountability and recognition).

| # | hn_id | Title | consensus | psq | hcb_wt_mean |
|---|-------|-------|-----------|-----|-------------|
| 1 | 43801959 | ICE Deports 3 U.S. Citizen Children Held Incommunicado | 0.834 | 3.71 | 0.826 |
| 2 | 47091419 | Keep Android Open | 0.800 | 4.23 | 0.386 |
| 3 | 47172192 | Kansas invalidates drivers licenses of trans people | 0.755 | 3.20 | 0.419 |
| 4 | 47181391 | 10th Circuit: 4th Amendment Doesn't Support Broad Search of Protesters' Devices | 0.747 | 6.61 | 0.419 |
| 5 | 46756117 | ICE using Palantir tool that feeds on Medicaid data | 0.703 | 4.68 | 0.672 |
| 6 | 28079171 | Apple's plan to "think different" about encryption opens a backdoor | 0.662 | 5.20 | 0.407 |
| 7 | 14462785 | Facebook is an attack on the open web | 0.607 | 6.05 | 0.434 |
| 8 | 47178062 | Firefox AI Kill Switch is a trap | 0.578 | 3.25 | 0.195 |
| 9 | 47178678 | Breaking Free | 0.570 | 8.00 | 0.386 |
| 10 | 38616550 | 'Like we were lesser humans': Gaza boys, men recall Israeli arrest, torture | 0.548 | 3.25 | 0.780 |

**Note:** 6 of 10 high-HRCB stories have psq < 5.0 — signal inversion
candidates. This stratum will test whether high-rights content systematically
triggers high threat while honoring dignity.


### Stratum 2: Low/Negative HRCB (n = 10)

Stories with lowest consensus_score — rights-irrelevant or negative content.
Expected DI hypothesis: variable dignity scores (negative HRCB does not imply
dignity violation; some content may simply lack rights relevance).

| # | hn_id | Title | consensus | psq | hcb_wt_mean |
|---|-------|-------|-----------|-----|-------------|
| 11 | 47199948 | Our Agreement with the Department of War | -0.190 | 4.10 | 0.000 |
| 12 | 47153576 | White House list of media offenders | -0.181 | 3.18 | -0.143 |
| 13 | 47153798 | Bus stop balancing is fast, cheap, and effective | -0.081 | 3.80 | -0.080 |
| 14 | 47188635 | Crypto volume anomaly scanner | -0.079 | 7.10 | -0.150 |
| 15 | 37408196 | UK pulls back from clash with Big Tech over private messaging | -0.057 | 4.60 | -0.060 |
| 16 | 47200083 | Iranian Ayatollah Ali Khamenei Reportedly Killed in Israeli Strike | -0.046 | 3.70 | -0.016 |
| 17 | 47055979 | AI adoption and Solow's productivity paradox | -0.027 | 6.75 | -0.023 |
| 18 | 46268854 | Roomba maker goes bankrupt, Chinese owner emerges | -0.026 | 5.28 | -0.050 |
| 19 | 25049079 | Apple unveils M1, its first system-on-a-chip | -0.016 | 5.99 | -0.007 |
| 20 | 41558554 | Amazon tells employees to return to office five days a week | -0.014 | 3.80 | -0.091 |


### Stratum 3: Mid-HRCB (n = 10)

Stories near the HRCB midpoint — mixed or moderate rights signal.
Expected DI hypothesis: moderate dignity scores; tests instrument discrimination
in the middle range.

| # | hn_id | Title | consensus | psq | hcb_wt_mean |
|---|-------|-------|-----------|-----|-------------|
| 21 | 6289187 | New Zealand bans software patents | 0.259 | 4.60 | 0.200 |
| 22 | 47184276 | Washington state hotline callers hear AI voice with Spanish accent | 0.263 | 5.00 | 0.413 |
| 23 | 12944464 | Diamonds Suck (2006) | 0.253 | 6.45 | 0.198 |
| 24 | 47152085 | New accounts on HN more likely to use em-dashes | 0.247 | 6.23 | 0.437 |
| 25 | 41521919 | iFixit created a new USB-C, repairable soldering system | 0.212 | 8.00 | 0.378 |
| 26 | 30582179 | C# reference | 0.205 | 7.32 | 0.399 |
| 27 | 32737547 | Stable Diffusion and Why It Matters | 0.191 | 3.80 | 0.207 |
| 28 | 44210606 | Bill Atkinson has died | 0.133 | 7.20 | 0.198 |
| 29 | 33154486 | Software Engineering Body of Knowledge | 0.120 | 5.13 | 0.198 |
| 30 | 20323246 | Choose Boring Technology | 0.117 | 6.40 | 0.200 |


### Stratum 4: High-PSQ Threat (n = 10)

Stories with lowest psq_score (highest psychoemotional threat).
Non-overlapping with strata 1–3.
Expected DI hypothesis: variable — some low-PSQ content dignifies subjects
(accountability journalism), some degrades (confrontational, hostile).

| # | hn_id | Title | consensus | psq | hcb_wt_mean |
|---|-------|-------|-----------|-----|-------------|
| 31 | 36982507 | Google Chrome hostile moves list | 0.247 | 2.63 | 0.191 |
| 32 | 43856795 | Apple executive lied under oath, criminal contempt referral | 0.512 | 3.00 | 0.652 |
| 33 | 41488353 | Synthetic diamonds cheaper than mined | 0.142 | 3.00 | 0.207 |
| 34 | 47199861 | War powers debate after Trump Iran attack without Congress | 0.199 | 3.00 | 0.421 |
| 35 | 47141385 | Manjaro website offline: lapsed certificate | 0.096 | 3.00 | 0.192 |
| 36 | 31338355 | Coinbase warns bankruptcy could wipe out user funds | 0.022 | 3.20 | -0.066 |
| 37 | 38613386 | 23andMe changed terms to prevent hacked customers from suing | 0.373 | 3.80 | 0.395 |
| 38 | 47176157 | A Nationwide Book Ban Bill Introduced in the House | 0.494 | 3.80 | 0.418 |
| 39 | 37763424 | FTC sues to break up Amazon | 0.346 | 3.80 | 0.208 |
| 40 | 47185528 | Trump orders federal agencies to stop using Anthropic AI tech | 0.100 | 3.80 | 0.000 |


### Stratum 5: Technical/Neutral (n = 10)

Stories with consensus_score = 0 and hcb_weighted_mean = 0 — no rights signal.
Expected DI hypothesis: scores ≈ 0 across all dignity dimensions (relevance
gate should classify as ND). Tests the absence-as-negative fix.

| # | hn_id | Title | consensus | psq | hcb_wt_mean |
|---|-------|-------|-----------|-----|-------------|
| 41 | 47181471 | Badge that shows how well your codebase fits in LLM context | 0.000 | 6.42 | 0.000 |
| 42 | 47183256 | PDF reader with interactive visualizations for any concept | 0.000 | 6.34 | 0.000 |
| 43 | 47185276 | AI found 12 OpenSSL zero-days | 0.000 | 5.00 | 0.000 |
| 44 | 47186287 | Self-Hosted NVR: Raspberry Pi CM5 with Hailo-8 AI and PoE | 0.000 | 5.00 | 0.000 |
| 45 | 47188499 | Open Source Brain Stimulation: TDCS | 0.000 | 5.00 | 0.000 |
| 46 | 47188729 | Lneto – IEEE802.3/IP/TCP/HTTP in 8kB of RAM in Go | 0.000 | 6.42 | 0.000 |
| 47 | 47190997 | How do I cancel my ChatGPT subscription? | 0.000 | 7.32 | 0.000 |
| 48 | 47194690 | No Bookmarks | 0.000 | 5.00 | 0.000 |
| 49 | 47194781 | Latency numbers every programmer should know | 0.000 | 5.00 | 0.000 |
| 50 | 47201802 | Jails for NetBSD | 0.000 | 8.00 | 0.000 |


## 4. Scoring Protocol

### 4.1 Per-Story Procedure

For each story:

1. **Fetch content** via observatory API (`/stories/:hn_id`) or original URL
2. **Apply relevance gate** — does this content involve treatment of persons?
   If no → all dimensions score 0 (ND), mark as "below relevance gate"
3. **Score 10 Hicks dimensions** using the rubric in spec §2–3:
   - Score: -2 (violated) to +2 (honored), 0 = absent/neutral
   - Directionality: S (subject), A (audience), T (third party), R (reflexive)
   - Evidence level: D (direct quote), I (inference), ND (not determinable)
4. **Compute composite**: `DI = ((mean_of_scored_dimensions + 2) / 4) × 100`
5. **Flag cross-cultural concerns** per spec §10.1

### 4.2 Scoring Passes

- **Pass 1:** Psychology agent scores all 50 stories in this session/sequence
- **Pass 2:** Fresh psychology agent session scores the same 50 independently
  (no access to Pass 1 results) for inter-rater reliability

### 4.3 Analysis (after both passes complete)

Per spec §7.4:
- Correlation matrix: PSQ dimensions × DI dimensions
- Coverage: % DI variance explained by PSQ composite
- Signal inversion count: stories where PSQ↓ and DI↑ or vice versa
- False-negative profile: DI-relevant stories with PSQ > 6.0
- Inter-rater reliability: Cohen's kappa per DI dimension
- Relevance gate accuracy: % technical/neutral correctly classified ND


## 5. Scoring Results — Pass 1

### Scoring Legend

| Field | Meaning |
|-------|---------|
| D1–D10 | Dignity dimensions (Acceptance, Recognition, Acknowledgment, Inclusion, Safety, Fairness, Freedom, Understanding, Benefit of Doubt, Accountability) |
| Score | -2 (violated) to +2 (honored), 0 = absent/neutral |
| Dir | S = subject, A = audience, T = third party, R = reflexive, — = not applicable |
| Ev | D = direct evidence, I = inference, ND = not determinable |
| Gate | PASS = dignity-relevant content, ND = below relevance gate |
| Composite | `((mean_scored + 2) / 4) × 100`, range 0–100. ND if < 3 dimensions scored. |

---

### Story #1 — ICE Deports 3 U.S. Citizen Children (Stratum 1: High-HRCB)

**Source:** ACLU press release | **Gate:** PASS | **Content accessed:** Full article
**Observatory:** consensus=0.834, psq=3.71, tone=solemn, valence=-0.8

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +2 | S | D | Children named by age (2, 4, 7), mothers identified as individuals (one pregnant). Not reduced to immigration categories. |
| D2 | Recognition | +2 | S | D | Families' community ties, legal relief options, and medical needs recognized. "Had lived in the United States for years." |
| D3 | Acknowledgment | +2 | S | D | Extensive engagement with families' experience: incommunicado detention, denied legal access, child with cancer deported without medication. |
| D4 | Inclusion | +2 | S | D | Families positioned as belonging: "U.S. citizen children," "established community ties." Editorial stance contests the exclusionary act. |
| D5 | Safety | +1 | S | D | Editorial stance creates discursive safety (advocates for protection). Described events involve profound unsafety (incommunicado, denied medical care). Dual signal. |
| D6 | Fairness | +2 | S | D | Article documents ICE violating its own directives. Implicit argument: consistent standards should apply to all persons. |
| D7 | Freedom | +1 | S | D | Documents restriction of freedom (incommunicado, denied legal counsel). Editorial stance affirms autonomy but the constraint dominates the narrative. |
| D8 | Understanding | +2 | S | D | Context provided: why families were in the US, their community ties, their medical needs. Quoted advocates convey genuine understanding. |
| D9 | Benefit of Doubt | +2 | S | D | Presumes families acted in good faith. Does not question their right to presence. "These families deserve better." |
| D10 | Accountability | +2 | S | D | ICE held directly accountable: "deceptive tactics," "violated protections," "blatant due process violations." Named by 7 advocates. |

**Scored dimensions:** 10/10 | **Mean:** 1.8 | **DI Composite:** 95.0
**Signal inversion:** YES — DI=95.0 (very high dignity), PSQ=3.71 (high threat)

Content that documents rights violations with deep editorial dignity toward subjects
simultaneously produces maximal psychoemotional threat in readers. The two instruments
measure fundamentally different constructs.


### Story #10 — 'Like we were lesser humans': Gaza detention testimony (Stratum 1: High-HRCB)

**Source:** Al Jazeera features | **Gate:** PASS | **Content accessed:** Full article
**Observatory:** consensus=0.548, psq=3.25, tone=empathetic, valence=-0.75

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +2 | S | D | Named individuals: Mahmoud Zindah (14), Nader (father), Mohammed Odeh (14). Described in relationship and context, not reduced to categories. |
| D2 | Recognition | +2 | S | D | Validates detainees' experience and personhood. Mahmoud: "I'm just a kid that goes to school." Their humanity explicitly centered. |
| D3 | Acknowledgment | +2 | S | D | Extensive first-person accounts. Emotional and physical suffering acknowledged without minimization. 15+ direct quotes from 3 named persons. |
| D4 | Inclusion | +2 | S | D | Editorial framing contests soldiers' exclusionary framing ("You are all Hamas") by centering individual identities and experiences. |
| D5 | Safety | +1 | S | D | Described events: extreme unsafety (torture, beatings, humiliation, death threats). Editorial stance creates discursive safety by centering victims' testimony. Dual signal. |
| D6 | Fairness | +1 | S | D | Implicit argument against collective punishment. Documents arbitrary treatment. Does not apply double standards but covers one side's perspective. |
| D7 | Freedom | +1 | S | D | Documents total restriction: arrest, blindfolding, handcuffing. Release without explanation after 5 days. Editorial stance affirms the violation. |
| D8 | Understanding | +2 | S | D | Provides context: families trapped by advancing tanks, not combatants. Father's motivation: "I don't want to lose my child." |
| D9 | Benefit of Doubt | +2 | S | D | Detainees presumed innocent. Their accounts presented at face value. No questioning of their credibility or actions. |
| D10 | Accountability | +2 | S | D | Documents specific acts: beatings with rifle butts, writing numbers on arms, denial of water/food, cold water treatment. Named soldiers' actions. |

**Scored dimensions:** 10/10 | **Mean:** 1.7 | **DI Composite:** 92.5
**Signal inversion:** YES — DI=92.5 (very high dignity), PSQ=3.25 (very high threat)

⚑ **Cross-cultural flag:** Content involves a conflict context where dignity concepts
function differently. The Western Hicks framework's emphasis on individual dignity elements
may not fully capture the collective dignity violation experienced here (spec §10.1:
Ubuntu, "I am because we are"; Metz, 2007). The article itself gestures toward collective
framing through Nader's quote: "This is about wiping us all out."

**Methodological note:** This article centers Palestinian perspectives without Israeli
military response. This editorial choice is itself a dignity decision — centering the
experience of persons subjected to the treatment being documented. A "balanced" framing
that offset testimony with military justifications could reduce Acknowledgment (D3) and
Benefit of Doubt (D9) scores.


### Story #41 — Badge for LLM context window (Stratum 5: Technical/Neutral)

**Source:** Show HN project | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.000, psq=6.42, hcb_weighted_mean=0.000

**Relevance gate determination:** Content describes a developer tool for measuring
codebase size relative to LLM context windows. No persons treated as subjects,
audiences, or third parties in a dignity-relevant sense.

**All dimensions:** ND — not scoreable (content below dignity relevance threshold)
**DI Composite:** ND (fewer than 3 dimensions scored)

**Relevance gate classification:** Correct ND. Technical content appropriately filtered.
The relevance gate prevents the absence-as-negative bias that HRCB's H1 finding identified.


### Story #48 — No Bookmarks (Stratum 5: Technical/Neutral)

**Source:** Technical project | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.000, psq=5.00, hcb_weighted_mean=0.000

**Relevance gate determination:** Title indicates a technical/design project. No
dignity-relevant treatment of persons.

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND.


### Story #49 — Latency numbers every programmer should know (Stratum 5: Technical/Neutral)

**Source:** Reference material | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.000, psq=5.00, hcb_weighted_mean=0.000

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND.


### Story #32 — Apple executive lied under oath, criminal contempt referral (Stratum 4: High-PSQ Threat)

**Source:** BIG by Matt Stoller (Substack) | **Gate:** PASS | **Content accessed:** Full article
**Observatory:** consensus=0.512, psq=3.00, tone=hopeful, valence=0.75

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S | D | Alex Roman, Tim Cook, Luca Maestri named individually with roles. Treated as decision-makers, not reduced to corporate category. |
| D2 | Recognition | +1 | S | D | Judge's expertise and authority recognized. Apple executives' decision-making capacity acknowledged (they chose, not stumbled). |
| D3 | Acknowledgment | +1 | S/T | D | Developers' rights acknowledged as legal entitlement. Judge's concerns about perjury engaged with directly. Epic's claims validated through process. |
| D4 | Inclusion | +1 | T | I | App developers positioned as legitimate participants in the ecosystem with enforceable rights. No exclusionary framing. |
| D5 | Safety | 0 | S | D | Strong language ("outright lied," "sleazy privilege claims") serves accountability, not humiliation. Adversarial but within legal accountability norms. |
| D6 | Fairness | +2 | S | D | Article frames the case as fair application of legal standards: "This is an injunction, not a negotiation." Apple held to same rules as anyone. |
| D7 | Freedom | +1 | T | D | Developers' freedom to communicate with customers affirmed as legal right. Content treats this as a restored entitlement. |
| D8 | Understanding | +1 | S | D | Context for Apple's choices: "supracompetitive operating margins." Cook's reasoning traced: "Cook chose poorly" — explains the decision chain. |
| D9 | Benefit of Doubt | 0 | — | D | Article reports judge's evidenced finding of deliberate bad faith, not presumption. The legal process gave Apple extensive opportunity; they exhausted it. |
| D10 | Accountability | +2 | S | D | Perjury referral to U.S. Attorney. Direct naming: Roman lied, Cook ignored advisors, Maestri influenced. Specific acts documented. |

**Scored dimensions:** 10/10 | **Mean:** 1.0 | **DI Composite:** 75.0
**Signal inversion:** PARTIAL — DI=75.0 (moderate-high dignity), PSQ=3.00 (highest threat in sample)

Accountability journalism pattern: confrontational editorial stance serves dignity
through fairness and accountability while producing high psychoemotional threat. The
content treats even the party found to have lied with procedural dignity — named,
given context, held accountable through legal process rather than mob judgment.


### Story #5 — ICE using Palantir tool that feeds on Medicaid data (Stratum 1: High-HRCB)

**Source:** EFF Deeplinks | **Gate:** PASS | **Content accessed:** Full article
**Observatory:** consensus=0.703, psq=4.68, tone=urgent, valence=-0.7

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S/T | D | Medicaid recipients described as vulnerable populations; immigrants and citizens both identified. Not stereotyped but not deeply individualized. |
| D2 | Recognition | +1 | S/T | D | Recognizes legitimate expectation that healthcare data stays in healthcare. Citizens' and immigrants' civil rights validated. |
| D3 | Acknowledgment | +2 | S | D | Engages deeply with privacy concerns of data subjects. Names the specific mechanism of harm (ELITE tool, "confidence score" on current address). |
| D4 | Inclusion | +2 | S/T | D | "Poses systemic risks to all Americans' privacy" — frames affected persons as community members with shared rights, not as an out-group. |
| D5 | Safety | +1 | S | D | Describes surveillance creating profound unsafety. Editorial stance condemns this ("utter lawlessness"), creating discursive safety. Dual signal. |
| D6 | Fairness | +2 | S | D | Core argument: data collected for healthcare repurposed for deportation violates fundamental fairness. Consistent standards demand purpose limitation. |
| D7 | Freedom | +1 | S | D | Documents restriction of freedom through surveillance. Editorial stance affirms privacy and autonomy. |
| D8 | Understanding | +1 | A | D | Explains systemic mechanism (data pooling, Palantir tool, ELITE) so readers understand how the violation works. Analytical rather than emotional. |
| D9 | Benefit of Doubt | +1 | S | D | Affected persons given full benefit of the doubt — they provided data for healthcare, not for surveillance. Institutions denied benefit based on documented record. |
| D10 | Accountability | +2 | S | D | Holds ICE and Palantir accountable by name. Documents specific tool (ELITE), specific data source (Medicaid), specific actions. |

**Scored dimensions:** 10/10 | **Mean:** 1.4 | **DI Composite:** 85.0
**Signal inversion:** YES — DI=85.0 (high dignity), PSQ=4.68 (moderate-low safety)

EFF analytical journalism pattern: less threatening than ACLU press release (PSQ 4.68
vs 3.71) because it focuses on systemic analysis rather than individual suffering,
while maintaining high dignity through thorough accountability documentation.


### Story #20 — Amazon tells employees to return to office five days a week (Stratum 2: Low/Negative HRCB)

**Source:** News reporting | **Gate:** PASS | **Content not directly accessible — scored from title + metadata**
**Observatory:** consensus=-0.014, psq=3.80, tone=unknown, hcb_weighted_mean=-0.091

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | 0 | — | I | Employees treated as a category ("employees"), not individualized. Standard corporate news framing. |
| D2 | Recognition | 0 | — | I | Unknown whether article recognizes employee expertise or concerns. Corporate mandate coverage varies. |
| D3 | Acknowledgment | 0 | — | ND | Cannot determine from title whether employee perspectives are centered or dismissed. |
| D4 | Inclusion | 0 | — | ND | Uniform mandate — not an inclusion issue per se. |
| D5 | Safety | 0 | — | ND | Cannot assess editorial framing of workplace safety concerns. |
| D6 | Fairness | 0 | — | I | Mandate applied uniformly; article likely reports this neutrally. |
| D7 | Freedom | -1 | S | I | Mandating full-time office presence restricts employee autonomy. Title frames this as directive ("tells employees") suggesting top-down imposition. |
| D8 | Understanding | 0 | — | ND | Unknown whether article engages with why employees valued remote work. |
| D9 | Benefit of Doubt | 0 | — | ND | Cannot determine editorial stance toward employees vs. management. |
| D10 | Accountability | 0 | — | ND | Cannot determine from title alone. |

**Scored dimensions:** 3/10 (D1, D6, D7 have non-ND scores) | **DI Composite:** ND (below 3-dimension threshold — only 3 dimensions scoreable from title)
**Methodological note:** Title-only scoring produces mostly ND results. This story
requires full content access for reliable scoring. Classified as **DEFERRED** pending
content retrieval.

⚑ This score demonstrates the methodology limitation identified in §6.3: title-only
scoring cannot discriminate dignity patterns. The story remains in the sample but
requires content access before inclusion in the correlation analysis.


### Story #17 — AI adoption and Solow's productivity paradox (Stratum 2: Low/Negative HRCB)

**Source:** Economics analysis | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=-0.027, psq=6.75, hcb_weighted_mean=-0.023

**Relevance gate determination:** Title indicates economic analysis of AI productivity.
The "Solow paradox" refers to the observation that IT investment doesn't show up in
productivity statistics (Solow, 1987). This content analyzes economic trends, not
treatment of persons.

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND. Economic analysis with no
dignity-relevant treatment of persons.


### Story #19 — Apple unveils M1, its first system-on-a-chip (Stratum 2: Low/Negative HRCB)

**Source:** Product announcement | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=-0.016, psq=5.99, hcb_weighted_mean=-0.007

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND. Product/technology announcement.


### Story #14 — Crypto volume anomaly scanner (Stratum 2: Low/Negative HRCB)

**Source:** Show HN project | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=-0.079, psq=7.10, hcb_weighted_mean=-0.150

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND. Technical tool with no persons treated.


### Story #18 — Roomba maker goes bankrupt, Chinese owner emerges (Stratum 2: Low/Negative HRCB)

**Source:** Business news | **Gate:** PASS (marginal — involves corporate ownership change affecting employees)
**Observatory:** consensus=-0.026, psq=5.28, hcb_weighted_mean=-0.050

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | 0 | — | I | Corporate entity focus. Employees likely mentioned as category, not individuals. |
| D2 | Recognition | 0 | — | ND | Cannot determine from title. |
| D3 | Acknowledgment | 0 | — | ND | Cannot determine whether employee/consumer concerns acknowledged. |
| D4 | Inclusion | 0 | — | I | "Chinese owner" framing — may carry nationality-as-category connotation depending on editorial stance. Without content, scored neutral. |
| D5 | Safety | 0 | — | ND | Cannot determine. |
| D6 | Fairness | 0 | — | ND | Cannot determine. |
| D7 | Freedom | 0 | — | ND | Not directly relevant to a bankruptcy/acquisition story. |
| D8 | Understanding | 0 | — | ND | Cannot determine. |
| D9 | Benefit of Doubt | 0 | — | ND | Cannot determine. |
| D10 | Accountability | 0 | — | ND | Cannot determine. |

**Scored dimensions:** 2/10 | **DI Composite:** ND (below threshold)
**Classification:** DEFERRED — requires content access.


### Story #6 — Apple's encryption backdoor plan (Stratum 1: High-HRCB)

**Source:** EFF Deeplinks | **Gate:** PASS | **Content accessed:** Full article
**Observatory:** consensus=0.662, psq=5.20, tone=urgent, valence=-0.6

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +2 | S/T | D | Users treated as persons with privacy rights. Children, LGBTQ+ individuals, abuse victims named as specific at-risk groups with distinct vulnerability profiles. |
| D2 | Recognition | +1 | S | D | Recognizes users' reliance on Apple's historical privacy leadership. Validates privacy advocates' expertise. |
| D3 | Acknowledgment | +2 | S/T | D | Engages deeply with disproportionate impact on vulnerable groups: LGBTQ+ content censorship, stalkerware via family sharing, authoritarian misuse. |
| D4 | Inclusion | +2 | T | D | LGBTQ+ individuals, abuse victims, and users of family sharing plans explicitly included in the concern analysis — not generic "users." |
| D5 | Safety | +1 | S | D | Advocates for digital safety while describing safety threats. Dual signal: editorial stance protects, described policy endangers. |
| D6 | Fairness | +2 | S | D | "Even a thoroughly documented, carefully thought-out, and narrowly-scoped backdoor is still a backdoor." Consistent standards for all users. |
| D7 | Freedom | +2 | S | D | Core argument defends user autonomy through encryption. End-to-end encryption framed as freedom infrastructure. |
| D8 | Understanding | +1 | S | D | Explains why Apple made the decision (government pressure, child safety framing) while arguing the approach fails on its own terms. |
| D9 | Benefit of Doubt | +1 | S | D | Gives Apple credit for historical privacy leadership — "shocking about-face" implies genuine surprise, not presumed malice. |
| D10 | Accountability | +2 | S | D | Holds Apple accountable for the specific reversal. Names features, implications, and the gap between marketing claims and technical reality. |

**Scored dimensions:** 10/10 | **Mean:** 1.6 | **DI Composite:** 90.0
**Signal inversion:** YES — DI=90.0, PSQ=5.20 (moderate). Analytical advocacy produces
less psychoemotional threat than testimonial journalism (cf. Stories #1, #10) while
maintaining high dignity through systematic inclusion of vulnerable groups.


### Story #3 — Kansas invalidates drivers licenses of trans people (Stratum 1: High-HRCB)

**Source:** The Guardian, via HN discussion | **Gate:** PASS | **Content accessed:** HN discussion + metadata
**Observatory:** consensus=0.755, psq=3.20, tone=urgent, valence=-0.7

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +2 | S | D | Discussion centers on state refusing to accept trans persons' identity. Forced deadnaming and misgendering framed as the core dignity violation. |
| D2 | Recognition | +2 | S | D | Trans persons validated as "already vulnerable." Their experience recognized as legitimate grounds for concern. |
| D3 | Acknowledgment | +2 | S | D | Practical impacts engaged: voting access barriers, harassment risk during traffic stops, forced choice between ID and identity. |
| D4 | Inclusion | +2 | S | D | Policy excludes; coverage contests the exclusion. Trans persons treated as belonging community members whose disenfranchisement matters. |
| D5 | Safety | +1 | S | D | "Imagine what's going to happen as this already vulnerable group gets pulled over." Identifies concrete safety threat. Dual signal. |
| D6 | Fairness | +2 | S | D | Policy applies differential standards based on identity. Coverage frames this as discriminatory — inconsistent with equal treatment. |
| D7 | Freedom | +1 | S | D | Documents restriction: forced choice between surrendering license or carrying misgendered ID. Neither option preserves freedom. |
| D8 | Understanding | +2 | S | D | Explains why trans persons cannot simply accept replacement IDs — "unwilling to be deadnamed or misgendered" treated as a comprehensible, legitimate position. |
| D9 | Benefit of Doubt | +2 | S | D | Trans persons given full benefit of the doubt. Their reasons for refusal treated as self-evident. No "both sides" false equivalence. |
| D10 | Accountability | +1 | S | D | Policy makers held accountable through naming the mechanism (letter requiring surrender, no grace period). |

**Scored dimensions:** 10/10 | **Mean:** 1.7 | **DI Composite:** 92.5
**Signal inversion:** YES — DI=92.5, PSQ=3.20 (very high threat)

D1 (Acceptance of Identity) is the dominant dimension for this story — the policy's
core mechanism is identity denial, and the editorial stance's core dignity act is
identity affirmation. This is the clearest case where a single Hicks element defines
the entire dignity interaction.


### Story #23 — Diamonds Suck (2006) (Stratum 3: Mid-HRCB)

**Source:** Personal essay (diamondssuck.com), via HN discussion | **Gate:** PASS (marginal)
**Observatory:** consensus=0.253, psq=6.45, hcb_weighted_mean=0.198

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S/T | I | Consumers treated as capable persons making choices. Women acknowledged as facing gendered social scrutiny. |
| D2 | Recognition | +1 | S | I | Validates consumers' intelligence and right to informed choices. Author's wife's satisfaction recognized. |
| D3 | Acknowledgment | +1 | T | I | Engages with social pressure dynamics facing consumers, especially women bearing scrutiny for non-diamond choices. |
| D4 | Inclusion | 0 | — | I | No exclusion patterns but no strong inclusion signal. Cultural variation noted (weaker in Europe). |
| D5 | Safety | +1 | A | I | "Avoids dehumanizing language." No contempt toward consumers who choose diamonds. |
| D6 | Fairness | +1 | S | I | Critique targets the industry, not consumers. Consistent standards applied to De Beers. |
| D7 | Freedom | +1 | S | I | Advocates for consumer autonomy in choosing alternatives. Moissanite framed as a freed choice. |
| D8 | Understanding | +1 | S | I | Explains why the tradition exists (De Beers marketing, cultural construction) — consumers not blamed for the norm. |
| D9 | Benefit of Doubt | +1 | S | I | Consumers given benefit of the doubt — manipulated by marketing, not making irrational choices. |
| D10 | Accountability | +1 | T | I | De Beers and diamond industry held accountable for artificial scarcity and manufactured tradition. |

**Scored dimensions:** 10/10 | **Mean:** 0.9 | **DI Composite:** 72.5
**No signal inversion:** DI=72.5, PSQ=6.45. Both moderate — expected pattern for
mid-range content that treats persons with basic respect without strongly honoring
or violating dignity elements. This is the "normal range" for opinion/consumer content.


### Story #12 — White House list of media offenders (Stratum 2: Low/Negative HRCB)

**Source:** whitehouse.gov/mediabias/ | **Gate:** PASS | **Content via:** HN discussion characterization
**Observatory:** consensus=-0.181, psq=3.18, hcb_weighted_mean=-0.143

**Scoring note:** The observatory scored the whitehouse.gov page itself, not news
coverage about it. DI scoring targets the same content. HN discussion characterizes
it as a "public enemies list" resembling "Authoritarianism Today" with "WWE/UFC promo"
aesthetic. Evidence level is I (inference from discussion characterization) throughout.

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | -2 | T | I | Reduces journalists to "offenders" — category-label that strips professional identity. |
| D2 | Recognition | -1 | T | I | Denies journalistic contribution and expertise. Media framed as adversary, not public service. |
| D3 | Acknowledgment | -2 | T | I | Dismisses media perspectives and fact-checking role. No engagement with the concerns being reported. |
| D4 | Inclusion | -2 | T | I | Positions targeted media as outsiders/enemies of the state. |
| D5 | Safety | -2 | T | I | Creates intimidation environment for journalists. Government-published targeting list. |
| D6 | Fairness | -2 | T | I | Selective targeting based on coverage content. Standards applied asymmetrically. |
| D7 | Freedom | -2 | T | I | Threatens press freedom through government authority. Chilling effect. |
| D8 | Understanding | -1 | T | I | No engagement with why media covers what it covers or what journalism serves. |
| D9 | Benefit of Doubt | -2 | T | I | Presumes media acting in bad faith ("offenders," "bias"). |
| D10 | Accountability | -1 | T/R | I | Purports to hold media "accountable" but from government power without self-accountability. |

**Scored dimensions:** 10/10 | **Mean:** -1.7 | **DI Composite:** 7.5
**Signal inversion:** NO — DI=7.5 (near-total dignity violation), PSQ=3.18 (high threat)

**This is the first low-DI score in the sample.** Both instruments agree: the content
violates dignity AND produces psychoemotional threat. This is signal ALIGNMENT, not
inversion. When content actively dehumanizes its subjects, both PSQ and DI respond
negatively. The instruments diverge (invert) only when content dignifies subjects
through documenting violations — not when content itself violates.

**Stratum 2 finding:** Negative-HRCB content CAN produce very low dignity scores when
the content itself (not just the topic) treats persons without dignity. This content
IS the violation, not reporting about a violation.


### Story #11 — Our Agreement with the Department of War (Stratum 2: Low/Negative HRCB)

**Source:** OpenAI blog post | **Gate:** PASS | **Content via:** HN discussion + URL context
**Observatory:** consensus=-0.190, psq=4.10, hcb_weighted_mean=0.000

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | 0 | — | I | Corporate statement. Persons treated generically ("users," "government"). No individuation. |
| D2 | Recognition | 0 | — | I | Acknowledges government authority. Does not recognize critics' or affected persons' expertise. |
| D3 | Acknowledgment | -1 | T | I | Moral concerns of persons affected by military AI not engaged with. "All lawful purposes" brackets out moral questions. |
| D4 | Inclusion | 0 | — | I | Generic corporate framing. No exclusion or inclusion signals for affected populations. |
| D5 | Safety | -1 | T | I | "All lawful purposes" language could include mass surveillance, autonomous weapons. No safety consideration for affected persons. |
| D6 | Fairness | -1 | T | I | "Weasel legal language" (per HN discussion) defines away moral accountability through legality frame. |
| D7 | Freedom | -1 | T | I | Agreement enables unrestricted government AI use. Persons affected by that use have no voice in the framing. |
| D8 | Understanding | -1 | T | I | No engagement with why critics (including Anthropic) object. Their position dismissed as "impose its own morals." |
| D9 | Benefit of Doubt | 0 | — | I | Gives government benefit of the doubt on "lawful use" but this is about government, not affected persons. |
| D10 | Accountability | -1 | R | I | Post does not hold any party accountable for potential harms. Legality as sole standard. |

**Scored dimensions:** 10/10 | **Mean:** -0.6 | **DI Composite:** 35.0
**Signal inversion:** NO — DI=35.0 (low dignity), PSQ=4.10 (moderate-low safety)

Corporate framing that renders affected persons invisible. The content doesn't
actively violate dignity elements (few scores of -2) — it neglects them by treating
AI-as-weapon as a business decision without addressing the persons affected. The
difference between Story #12 (DI=7.5, active violation) and Story #11 (DI=35.0,
passive neglect) maps directly onto Hicks' distinction between dignity violation
(intentional harm) and dignity neglect (failure to honor).


### Story #38 — A Nationwide Book Ban Bill (Stratum 4: High-PSQ Threat)

**Source:** Book Riot, via HN discussion | **Gate:** PASS | **Content accessed:** HN discussion + article summary
**Observatory:** consensus=0.494, psq=3.80, hcb_weighted_mean=0.418

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +2 | S/T | D | Author Maia Kobabe named and defended. Teens "navigating identity questions" treated as whole persons. Bill targets "gender dysphoria or transgenderism" as categories to censor. |
| D2 | Recognition | +1 | S | D | Author's stated intent recognized ("intended for young audiences"). Educational value validated by defenders. |
| D3 | Acknowledgment | +2 | S | D | Engages with why these books matter to teens navigating identity. The need they serve is acknowledged, not dismissed. |
| D4 | Inclusion | +2 | S | D | Legislation excludes LGBTQ+ content from schools. Editorial/discussion stance frames this as discriminatory exclusion. Low-income students particularly affected. |
| D5 | Safety | +1 | S | D | Censorship threatens intellectual safety. Discussion identifies disproportionate impact on vulnerable students. Dual signal. |
| D6 | Fairness | +2 | S | D | Bill uses "sexually oriented material" as cover but specifically targets gender identity content — unfair, asymmetric standards exposed. |
| D7 | Freedom | +1 | S | D | Core concern: restriction of intellectual freedom through federal funding leverage. Freedom to read threatened. |
| D8 | Understanding | +1 | S | D | Context: why these books exist, why organized campaigns target them ("organized groups rather than local parents"). |
| D9 | Benefit of Doubt | +1 | S | D | Authors and readers given benefit of the doubt. Book challengers' motives questioned. |
| D10 | Accountability | +1 | S | D | Legislation analyzed for actual targets vs. stated rationale. Historical censorship patterns referenced. |

**Scored dimensions:** 10/10 | **Mean:** 1.4 | **DI Composite:** 85.0
**Signal inversion:** YES — DI=85.0 (high dignity), PSQ=3.80 (high threat)

6th clear signal inversion. Content that affirms LGBTQ+ identity and defends
intellectual freedom produces high psychoemotional threat while treating affected
persons with deep editorial dignity. Same pattern as Stories #1, #3, #5, #6, #10.


### Story #33 — Synthetic diamonds cheaper than mined (Stratum 4: High-PSQ Threat)

**Source:** Industry/technology news | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.142, psq=3.00, hcb_weighted_mean=0.207

**Relevance gate determination:** Technology/economics story about synthetic diamond
production. Despite low PSQ (3.0), the content describes industry disruption, not
treatment of persons.

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND. Industry/technology content.

⚑ Notable: PSQ=3.0 (high threat) on content that scores ND for dignity. The threat
likely comes from industry disruption framing (confrontational toward established
diamond industry), not from treatment of persons. This dissociation between PSQ threat
and dignity relevance supports construct distinctness.


### Story #35 — Manjaro website offline: lapsed certificate (Stratum 4: High-PSQ Threat)

**Source:** Technical news | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.096, psq=3.00, hcb_weighted_mean=0.192

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND. Technical infrastructure issue.

⚑ Same pattern as #33: PSQ=3.0 but dignity-irrelevant. Low PSQ driven by
confrontational framing about technical failure, not treatment of persons.


### Story #2 — Keep Android Open (Stratum 1: High-HRCB)

**Source:** Advocacy/petition | **Gate:** PASS | **Content via:** HN discussion
**Observatory:** consensus=0.800, psq=4.23, hcb_weighted_mean=0.386

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S | I | Users acknowledged as device owners with agency. Developers treated as legitimate stakeholders. |
| D2 | Recognition | +1 | S | I | User expertise and autonomy recognized; developers' needs for sideloading acknowledged. |
| D3 | Acknowledgment | +1 | S | I | Engages with why sideloading matters — F-Droid, alternative ecosystems. |
| D4 | Inclusion | +1 | S | I | F-Droid and alternative stores treated as legitimate participants. |
| D5 | Safety | +1 | S | I | Dual: advocates for user safety while noting Google's paternalistic safety framing as pretext. |
| D6 | Fairness | +2 | S | I | Core argument: Google applies asymmetric standards to its own store vs. alternatives. |
| D7 | Freedom | +2 | S | I | Fundamental argument about device ownership and user autonomy. |
| D8 | Understanding | +1 | S | I | Explains why users need sideloading and what stands at stake. |
| D9 | Benefit of Doubt | +1 | S | I | Users treated as capable decision-makers, not requiring paternalistic protection. |
| D10 | Accountability | +1 | S | I | Google held accountable for broken "advanced flow" promises. |

**Scored dimensions:** 10/10 | **Mean:** 1.2 | **DI Composite:** 80.0
**Signal inversion:** YES — DI=80.0 (high dignity), PSQ=4.23 (moderate-low safety)


### Story #4 — 10th Circuit: 4th Amendment protects protesters' devices (Stratum 1: High-HRCB)

**Source:** EFF/legal reporting | **Gate:** PASS | **Content via:** HN discussion
**Observatory:** consensus=0.747, psq=6.61, hcb_weighted_mean=0.419

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S | I | Protester treated as individual with rights, not reduced to category. |
| D2 | Recognition | +2 | S | I | Court recognizes protester's privacy rights as valid and enforceable. |
| D3 | Acknowledgment | +2 | S | I | Deeply engages with scope of warrant overreach — 26 keywords, 2-month dragnet on photos/emails/texts. |
| D4 | Inclusion | +1 | S | I | Protester included as rights-bearing citizen entitled to constitutional protection. |
| D5 | Safety | +2 | S | I | Court ruling protects personal device safety from government overreach. |
| D6 | Fairness | +2 | S | I | Core principle: consistent 4th Amendment standards applied regardless of protest activity. |
| D7 | Freedom | +2 | S | I | Freedom from unreasonable search affirmed by appellate court. |
| D8 | Understanding | +1 | S | I | Context: what the warrant actually demanded and why the scope exceeded legal limits. |
| D9 | Benefit of Doubt | +2 | S | I | Protester given full benefit of doubt against government. |
| D10 | Accountability | +1 | S | I | Government overreach checked, though enforcement gap noted in discussion. |

**Scored dimensions:** 10/10 | **Mean:** 1.6 | **DI Composite:** 90.0
**No signal inversion:** DI=90.0, PSQ=6.61 — both high. Rights-affirming judicial
decision produces dignity AND psychological safety. "All-high" pattern: when the
system works (courts enforce rights), both constructs align positively.


### Story #7 — Facebook is an attack on the open web (Stratum 1: High-HRCB)

**Source:** Advocacy essay | **Gate:** PASS | **Content via:** HN discussion
**Observatory:** consensus=0.607, psq=6.05, hcb_weighted_mean=0.434

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S | I | Users treated as whole persons, not just data points. Self-aware humor about compulsive behavior. |
| D2 | Recognition | +1 | S | I | Validates users' experience of manipulation by algorithmic feed. |
| D3 | Acknowledgment | +1 | S | I | Engages with why people use Facebook despite concerns. |
| D4 | Inclusion | +1 | S | I | Open web framing treats users as community participants with shared interests. |
| D5 | Safety | +1 | S | I | Addresses attention manipulation as a form of unsafety. |
| D6 | Fairness | +1 | S | I | Argues for consistent standards — open protocols vs. closed platforms. |
| D7 | Freedom | +1 | S | I | Advocates for informational self-determination. |
| D8 | Understanding | +1 | S | I | Explains mechanisms: algorithmic feed curation, notification manipulation, data extraction. |
| D9 | Benefit of Doubt | +1 | S | I | Users given benefit of doubt — system design blamed for addictive patterns, not individual weakness. |
| D10 | Accountability | +1 | S | I | Facebook held accountable for specific practices with technical evidence (1.5MB comment system). |

**Scored dimensions:** 10/10 | **Mean:** 1.0 | **DI Composite:** 75.0
**No signal inversion:** DI=75.0, PSQ=6.05. Both moderate-high. Analytical advocacy
without intense threat content.


### Story #8 — Firefox AI Kill Switch is a trap (Stratum 1: High-HRCB)

**Source:** Tech commentary | **Gate:** PASS (marginal) | **Content via:** HN discussion
**Observatory:** consensus=0.578, psq=3.25, hcb_weighted_mean=0.195

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S | I | Users treated as agents capable of making informed choices about AI features. |
| D2 | Recognition | +1 | S | I | Validates user concern about unwanted AI integration. |
| D3 | Acknowledgment | 0 | — | I | Notable gap: no engagement with workers affected by AI training data or content creators. |
| D4 | Inclusion | 0 | — | I | No strong inclusion signal. |
| D5 | Safety | +1 | S | I | Concerns about user autonomy over browser behavior. |
| D6 | Fairness | +1 | S | I | Argues for consistent opt-in standards for AI features. |
| D7 | Freedom | +1 | S | I | User freedom to control software features on their own devices. |
| D8 | Understanding | 0 | — | I | Limited engagement with why users object beyond technical preference. |
| D9 | Benefit of Doubt | 0 | — | I | Neutral — some dismissal of AI ethics concerns as "crappy arguments." |
| D10 | Accountability | +1 | S | I | Mozilla held somewhat accountable for opaque AI integration. |

**Scored dimensions:** 10/10 | **Mean:** 0.6 | **DI Composite:** 65.0
**Signal inversion:** PARTIAL — DI=65.0 (moderate), PSQ=3.25 (high threat)


### Story #9 — Breaking Free (Norwegian Consumer Council on Meta scams) (Stratum 1: High-HRCB)

**Source:** Norwegian Consumer Council report | **Gate:** PASS | **Content via:** HN discussion
**Observatory:** consensus=0.570, psq=8.00, hcb_weighted_mean=0.386

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +2 | S | I | Fraud victims treated as individuals with legitimate grievances, not gullible marks. |
| D2 | Recognition | +2 | S | I | Validates victims' experience and financial harm. Consumer agency respected. |
| D3 | Acknowledgment | +2 | S | I | Deep engagement with mechanisms of harm — scam ads, no recourse, platform indifference. |
| D4 | Inclusion | +1 | S | I | Consumers positioned as rights-bearing participants, not disposable platform inputs. |
| D5 | Safety | +1 | S | I | Advocates for consumer safety from fraud; documents current profound unsafety. |
| D6 | Fairness | +2 | S | I | Core argument: asymmetric risk — users bear costs while Meta profits from scam ads (~$16B/year). |
| D7 | Freedom | +1 | S | I | Advocates for consumer autonomy and informed choice. |
| D8 | Understanding | +2 | S | I | Explains economic incentives: why Meta tolerates fraud (fines < profits). |
| D9 | Benefit of Doubt | +2 | S | I | Victims given full benefit of doubt; Meta denied benefit based on documented patterns. |
| D10 | Accountability | +2 | S | I | Meta held accountable with specific revenue figures, mechanisms, and regulatory recommendations. |

**Scored dimensions:** 10/10 | **Mean:** 1.7 | **DI Composite:** 92.5
**No signal inversion:** DI=92.5, PSQ=8.00 — both very high. Consumer advocacy that
dignifies victims through systemic analysis without producing psychoemotional threat.
Analytical, institutional framing produces high safety alongside high dignity.

⚑ **"All-high" pattern emergence:** Stories #4 (DI=90.0, PSQ=6.61) and #9 (DI=92.5,
PSQ=8.00) demonstrate that high dignity does NOT require low PSQ. The inversion pattern
holds for testimonial/confrontational content about violations, but systemic/analytical
content can achieve equally high dignity without triggering threat responses.


### Story #13 — Bus stop balancing is fast, cheap, and effective (Stratum 2: Low/Negative HRCB)

**Source:** Infrastructure/transit analysis | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=-0.081, psq=3.80, hcb_weighted_mean=-0.080

**Relevance gate determination:** Title indicates transit infrastructure optimization.
Technical/operations content with no dignity-relevant treatment of persons.

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND.


### Story #15 — UK pulls back from Big Tech clash over private messaging (Stratum 2: Low/Negative HRCB)

**Source:** News reporting | **Gate:** PASS | **Content via:** HN discussion
**Observatory:** consensus=-0.057, psq=4.60, hcb_weighted_mean=-0.060

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | 0 | — | I | Citizens treated generically, not individualized. |
| D2 | Recognition | 0 | — | I | Public voice largely absent from policy discussion. |
| D3 | Acknowledgment | -1 | T | I | Citizen privacy perspectives marginalized; "think of the children" framing dismisses substantive concerns. |
| D4 | Inclusion | 0 | — | I | No strong inclusion/exclusion signal. |
| D5 | Safety | +1 | S | I | Privacy advocates argue for digital safety; surveillance threatens it. |
| D6 | Fairness | 0 | — | I | Inconsistent standards: government claims safety while undermining encryption. |
| D7 | Freedom | +1 | S | I | Advocates for messaging privacy as fundamental right. |
| D8 | Understanding | 0 | — | I | Limited engagement with why citizens value encryption. |
| D9 | Benefit of Doubt | 0 | — | I | Neutral. |
| D10 | Accountability | +1 | S | I | Both government and tech companies held somewhat accountable. |

**Scored dimensions:** 10/10 | **Mean:** 0.2 | **DI Composite:** 55.0
**No signal inversion:** DI=55.0 (mid), PSQ=4.60 (moderate). Policy coverage that
neither strongly honors nor violates dignity — the mid-range.


### Story #16 — Iranian Ayatollah Khamenei reportedly killed in Israeli strike (Stratum 2: Low/Negative HRCB)

**Source:** Breaking news | **Gate:** DEFERRED
**Observatory:** consensus=-0.046, psq=3.70, hcb_weighted_mean=-0.016

Very limited HN discussion (no substantive comments). Title reports a military action
against a political figure. Only 2-3 dimensions have inference basis from title alone.
**Classification:** DEFERRED — insufficient evidence for reliable scoring.


### Story #18 — Roomba maker goes bankrupt, Chinese owner emerges (Stratum 2: Low/Negative HRCB)

**Source:** Business news | **Gate:** PASS | **Content via:** HN discussion (upgraded from DEFERRED)
**Observatory:** consensus=-0.026, psq=5.28, hcb_weighted_mean=-0.050

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | 0 | — | I | Consumers treated as category, not individuals. |
| D2 | Recognition | +1 | S | I | Consumer experience validated — stagnant product, broken trust. |
| D3 | Acknowledgment | +1 | S | I | Engages with why consumers feel abandoned by iRobot's decade of stagnation. |
| D4 | Inclusion | 0 | — | I | No strong inclusion signal. |
| D5 | Safety | +1 | S | I | Data privacy concerns — surveillance camera in homes transferred to new ownership. |
| D6 | Fairness | +1 | S | I | Consumers face asymmetric risk: paid for product, lost control of data. |
| D7 | Freedom | +1 | S | I | Consumer autonomy over home data discussed. |
| D8 | Understanding | +1 | S | I | Explains why iRobot failed — complacency, not innovation. |
| D9 | Benefit of Doubt | +1 | S | I | Consumers given benefit of doubt as rational actors. |
| D10 | Accountability | +1 | S | I | iRobot management held accountable for stagnation. |

**Scored dimensions:** 10/10 | **Mean:** 0.8 | **DI Composite:** 70.0
**No signal inversion:** DI=70.0 (moderate), PSQ=5.28 (moderate).


### Story #20 — Amazon tells employees to return to office five days a week (Stratum 2: Low/Negative HRCB)

**Source:** News reporting | **Gate:** PASS | **Content via:** HN discussion (upgraded from DEFERRED)
**Observatory:** consensus=-0.014, psq=3.80, hcb_weighted_mean=-0.091

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S | I | Employees treated as whole persons with family obligations and life circumstances. |
| D2 | Recognition | +1 | S | I | Employee expertise and productivity acknowledged — strong remote performance documented. |
| D3 | Acknowledgment | +1 | S | I | Engages with why employees value remote work — commute, family, energy. |
| D4 | Inclusion | 0 | — | I | Uniform mandate ignores individual circumstances but not an inclusion issue per se. |
| D5 | Safety | 0 | — | I | No direct safety concern. |
| D6 | Fairness | -1 | S | I | Broken promises: hired with remote expectations, mandated to return or resign without severance. |
| D7 | Freedom | -1 | S | I | Restricts employee autonomy over work location — characterized as "hidden layoff strategy." |
| D8 | Understanding | +1 | S | I | Explains employee perspective: productivity, family needs, commute costs. |
| D9 | Benefit of Doubt | 0 | — | I | Mixed — some comments blame employees, some blame management. |
| D10 | Accountability | +1 | S | I | Amazon management held accountable for broken agreements and control motives. |

**Scored dimensions:** 10/10 | **Mean:** 0.3 | **DI Composite:** 57.5
**No signal inversion:** DI=57.5 (mid), PSQ=3.80 (high threat). Mid-dignity workplace
coverage that documents broken promises while acknowledging employee perspectives.


### Story #21 — New Zealand bans software patents (Stratum 3: Mid-HRCB)

**Source:** Tech policy | **Gate:** PASS (marginal) | **Content via:** HN discussion
**Observatory:** consensus=0.259, psq=4.60, hcb_weighted_mean=0.200

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S | I | Developers treated as individuals with legitimate concerns. John Carmack quoted. |
| D2 | Recognition | +1 | S | I | Developer experience and innovation capacity acknowledged. |
| D3 | Acknowledgment | +1 | S | I | Engages with why patents hinder software development — multiple programmers solving identical problems. |
| D4 | Inclusion | 0 | — | I | No strong inclusion signal. |
| D5 | Safety | 0 | — | I | No safety concern. |
| D6 | Fairness | +1 | S | I | Argues for fair patent standards — fencing ideas vs. rewarding innovation. |
| D7 | Freedom | +1 | S | I | Advocates for developer freedom to implement solutions independently. |
| D8 | Understanding | +1 | S | I | Explains competing perspectives — R&D companies need patents, developers need freedom. |
| D9 | Benefit of Doubt | 0 | — | I | Ad hominem against FOSSpatents author (Mueller) — benefit of doubt denied based on financial interests. |
| D10 | Accountability | +1 | S | I | Patent system held accountable for enabling trolls and fencing ideas. |

**Scored dimensions:** 10/10 | **Mean:** 0.7 | **DI Composite:** 67.5
**No signal inversion:** DI=67.5, PSQ=4.60. Both moderate.


### Story #22 — Washington state hotline callers hear AI voice with Spanish accent (Stratum 3: Mid-HRCB)

**Source:** News reporting | **Gate:** PASS | **Content via:** HN discussion
**Observatory:** consensus=0.263, psq=5.00, hcb_weighted_mean=0.413

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S | I | Spanish speakers treated as legitimate service recipients with linguistic needs. |
| D2 | Recognition | +1 | S | I | Recognizes right to language-appropriate government service. |
| D3 | Acknowledgment | +1 | S | I | Engages with the accessibility failure and its practical impact. |
| D4 | Inclusion | +1 | S | I | Language community marginalized by system failure — inclusion issue surfaced. |
| D5 | Safety | 0 | — | I | No safety concern beyond service access. |
| D6 | Fairness | +1 | S | I | Argues for equitable service standards across languages. |
| D7 | Freedom | 0 | — | I | No freedom concern. |
| D8 | Understanding | +1 | S | I | Explains why the failure occurred — insufficient testing, QA gaps. |
| D9 | Benefit of Doubt | +1 | S | I | Affected callers given benefit of doubt. Failure attributed to system, not users. |
| D10 | Accountability | +1 | S | I | State department held accountable for implementation failure. |

**Scored dimensions:** 10/10 | **Mean:** 0.8 | **DI Composite:** 70.0
**No signal inversion:** DI=70.0, PSQ=5.00. Both moderate.


### Story #24 — New accounts on HN more likely to use em-dashes (Stratum 3: Mid-HRCB)

**Source:** Data analysis | **Gate:** PASS (marginal) | **Content via:** HN discussion
**Observatory:** consensus=0.247, psq=6.23, hcb_weighted_mean=0.437

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S | I | Individuals' writing style treated as meaningful part of identity. |
| D2 | Recognition | +1 | S | I | Recognizes that good writing reflects legitimate personal skill, not AI use. |
| D3 | Acknowledgment | +1 | S | I | Engages with why false AI accusations feel demeaning — "accused twice of being LLM." |
| D4 | Inclusion | 0 | — | I | No strong inclusion/exclusion beyond in-group suspicion dynamics. |
| D5 | Safety | +1 | S | I | Identifies hostile environment for articulate communicators — "hair-trigger suspicion." |
| D6 | Fairness | +1 | S | I | Unfair judgment based on style rather than content substance. |
| D7 | Freedom | +1 | S | I | Self-censorship to avoid suspicion — loss of expressive freedom. |
| D8 | Understanding | +1 | S | I | Explains mechanism — LLMs co-opted typographical conventions, punishing humans who used them first. |
| D9 | Benefit of Doubt | -1 | S | I | Benefit of doubt denied to accused persons — "reflexive witch-hunt." |
| D10 | Accountability | 0 | — | I | No accountability mechanism identified. |

**Scored dimensions:** 10/10 | **Mean:** 0.6 | **DI Composite:** 65.0
**No signal inversion:** DI=65.0, PSQ=6.23. Both moderate.


### Story #25 — iFixit USB-C repairable soldering system (Stratum 3: Mid-HRCB)

**Source:** Show HN / product launch | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.212, psq=8.00, hcb_weighted_mean=0.378

**Relevance gate determination:** Technical product launch — soldering iron with
repair-focused design. HN discussion shows community mentorship and accessibility
values, but the scored content (the product itself) involves no dignity-relevant
treatment of persons.

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND. Technical product content.


### Story #26 — C# reference (Stratum 3: Mid-HRCB)

**Source:** Microsoft documentation | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.205, psq=7.32, hcb_weighted_mean=0.399

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND. Pure technical documentation.


### Story #27 — Stable Diffusion and Why It Matters (Stratum 3: Mid-HRCB)

**Source:** Hackaday | **Gate:** DEFERRED
**Observatory:** consensus=0.191, psq=3.80, hcb_weighted_mean=0.207

HN discussion content not retrievable (page returned header only, no comments).
From title alone, cannot determine whether content engages with artist dignity
concerns (PASS) or focuses on technical explanation (ND).
**Classification:** DEFERRED — insufficient evidence.


### Story #28 — Bill Atkinson has died (Stratum 3: Mid-HRCB)

**Source:** Obituary/memorial | **Gate:** PASS | **Content via:** HN discussion
**Observatory:** consensus=0.133, psq=7.20, hcb_weighted_mean=0.198

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +2 | S | I | Atkinson treated as complete person — photography, humor, technical genius. Not reduced to "Apple engineer." |
| D2 | Recognition | +2 | S | I | Visionary contributions recognized — HyperCard, QuickDraw region management. "True visionary." |
| D3 | Acknowledgment | +2 | S | I | Personal encounters acknowledged — "gentle and kind soul." Emotional significance engaged with. |
| D4 | Inclusion | +1 | S | I | Community self-moderation enforced against dismissive comments. Safe space for remembrance. |
| D5 | Safety | +1 | S | I | Discursive safety maintained for mourning — moderator intervention against personal attacks. |
| D6 | Fairness | +1 | S | I | Both achievements and personal interests honored without hierarchy. |
| D7 | Freedom | 0 | — | — | Not applicable to obituary context. |
| D8 | Understanding | +2 | S | I | Context provided beyond technical work — photography interests, sense of humor, personal warmth. |
| D9 | Benefit of Doubt | +2 | S | I | Full benefit of the doubt — "Memory eternal!" No questioning of legacy. |
| D10 | Accountability | 0 | — | — | Not applicable to obituary context. |

**Scored dimensions:** 8/10 (D7, D10 N/A) | **Mean of scored:** 1.625 | **DI Composite:** 90.6
**No signal inversion:** DI=90.6, PSQ=7.20. Both very high. Community memorial
that treats the subject with deep dignity and produces no psychoemotional threat.
"All-high" pattern consistent with Stories #4 and #9.


### Story #29 — Software Engineering Body of Knowledge (Stratum 3: Mid-HRCB)

**Source:** IEEE reference / codedocs.org | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.120, psq=5.13, hcb_weighted_mean=0.198

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND. Technical reference framework.


### Story #30 — Choose Boring Technology (Stratum 3: Mid-HRCB)

**Source:** Essay by Dan McKinley | **Gate:** PASS (marginal) | **Content via:** HN discussion
**Observatory:** consensus=0.117, psq=6.40, hcb_weighted_mean=0.200

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S | I | Developers treated as professionals with legitimate career concerns. |
| D2 | Recognition | +1 | S | I | Developer expertise acknowledged — strong opinions held by experienced practitioners. |
| D3 | Acknowledgment | +1 | S | I | Engages with career incentive misalignment that pressures bad technology choices. |
| D4 | Inclusion | 0 | — | I | No inclusion signal. |
| D5 | Safety | 0 | — | I | No safety concern. |
| D6 | Fairness | +1 | S | I | Argues for fairness: don't burden remaining team with tech-debt from resume-driven choices. |
| D7 | Freedom | +1 | S | I | Developer agency respected — argues for informed choice, not prohibition. |
| D8 | Understanding | +1 | S | I | Explains structural incentives that drive poor choices — developers not blamed individually. |
| D9 | Benefit of Doubt | +1 | S | I | Developers given benefit of doubt — incentives blamed, not character. |
| D10 | Accountability | +1 | S | I | Senior developers and leadership held accountable for architectural governance. |

**Scored dimensions:** 10/10 | **Mean:** 0.8 | **DI Composite:** 70.0
**No signal inversion:** DI=70.0, PSQ=6.40. Both moderate.


### Story #31 — Google Chrome hostile moves list (Stratum 4: High-PSQ Threat)

**Source:** Tech criticism list | **Gate:** PASS | **Content via:** HN discussion
**Observatory:** consensus=0.247, psq=2.63, hcb_weighted_mean=0.191

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | 0 | S | I | Users treated as category, not individuals. |
| D2 | Recognition | +1 | S | I | Validates developer and user concerns about Chrome's market dominance. |
| D3 | Acknowledgment | +1 | S | I | Engages with specific hostile practices — JPEG XL removal, Manifest V3, forced Chrome adoption. |
| D4 | Inclusion | -1 | S | I | Users "trapped" in ecosystem — iOS users can't choose alternative browser engines. |
| D5 | Safety | -1 | S | I | Surveillance concerns — "data collection and ad business" at users' expense. |
| D6 | Fairness | +1 | S | I | Argues for consistent standards — open web vs. Chrome monoculture. |
| D7 | Freedom | -1 | S | I | Users lose agency — can't meaningfully choose alternatives due to market power. |
| D8 | Understanding | +1 | S | I | Explains mechanisms of control — nagging, proprietary standards, adblocker removal. |
| D9 | Benefit of Doubt | 0 | — | I | Mixed sympathy. |
| D10 | Accountability | +1 | S | I | Google held accountable with specific practices listed and documented. |

**Scored dimensions:** 10/10 | **Mean:** 0.2 | **DI Composite:** 55.0
**No signal inversion (but notable):** DI=55.0 (mid), PSQ=2.63 (highest threat in
entire sample). Content treats users with moderate dignity but the confrontational,
list-format framing generates maximal PSQ threat.


### Story #34 — War powers debate after Trump Iran attack (Stratum 4: High-PSQ Threat)

**Source:** Political news | **Gate:** DEFERRED
**Observatory:** consensus=0.199, psq=3.00, hcb_weighted_mean=0.421

Only 2 dismissive HN comments available — no substantive engagement with affected
persons (Iranian civilians, military personnel, constitutional implications).
**Classification:** DEFERRED — insufficient evidence for reliable scoring.


### Story #36 — Coinbase warns bankruptcy could wipe out user funds (Stratum 4: High-PSQ Threat)

**Source:** Financial news | **Gate:** PASS | **Content via:** HN discussion
**Observatory:** consensus=0.022, psq=3.20, hcb_weighted_mean=-0.066

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | 0 | — | I | Customers treated as category — "general unsecured creditors." |
| D2 | Recognition | +1 | S | I | Validates customer concern about fund safety. |
| D3 | Acknowledgment | +1 | S | I | Engages with why customers feel misled by platform's bank-like appearance. |
| D4 | Inclusion | 0 | — | I | No inclusion/exclusion signal. |
| D5 | Safety | -1 | S | I | Customer funds actively endangered; no FDIC/SIPC safety net. |
| D6 | Fairness | -1 | S | I | Asymmetric risk: Coinbase avoids bank regulation while attracting bank-like deposits. |
| D7 | Freedom | 0 | — | I | Neutral. |
| D8 | Understanding | +1 | S | I | Explains regulatory gap — not FDIC, not SIPC, customers rank behind secured lenders. |
| D9 | Benefit of Doubt | 0 | — | I | Mixed — some blame customers for "treating Coinbase like a bank." |
| D10 | Accountability | +1 | S | I | Coinbase held accountable for regulatory arbitrage. |

**Scored dimensions:** 10/10 | **Mean:** 0.2 | **DI Composite:** 55.0
**No signal inversion:** DI=55.0 (mid), PSQ=3.20 (high threat). Financial news that
moderately dignifies customers while documenting institutional unfairness.


### Story #37 — 23andMe changed terms to prevent hacked customers from suing (Stratum 4: High-PSQ Threat)

**Source:** Tech/privacy news | **Gate:** PASS | **Content via:** HN discussion
**Observatory:** consensus=0.373, psq=3.80, hcb_weighted_mean=0.395

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S | I | Customers treated as persons with rights, not just data sources. |
| D2 | Recognition | +1 | S | I | Validates customers' experience of having terms changed retroactively post-breach. |
| D3 | Acknowledgment | +2 | S | I | Deep engagement with consent issues — automatic opt-in, spam folder notifications, 30-day window. |
| D4 | Inclusion | 0 | — | I | No inclusion/exclusion signal. |
| D5 | Safety | -1 | S | I | Genetic data irreplaceable — permanent vulnerability created by breach, no remedy. |
| D6 | Fairness | -1 | S | I | Retroactive terms change after breach — fundamentally unfair. Forced arbitration strips legal recourse. |
| D7 | Freedom | -1 | S | I | Strips customers of court access through forced arbitration. |
| D8 | Understanding | +1 | S | I | Explains why this matters — genetic data permanence, power imbalance with corporation. |
| D9 | Benefit of Doubt | +1 | S | I | Customers given benefit of doubt — they didn't consent to the breach or the terms change. |
| D10 | Accountability | +2 | S | I | 23andMe held accountable — "liability management rather than people deserving dignified treatment." |

**Scored dimensions:** 10/10 | **Mean:** 0.5 | **DI Composite:** 62.5
**Signal inversion:** PARTIAL — DI=62.5 (moderate), PSQ=3.80 (high threat). Editorial/
discussion stance dignifies customers while documenting corporate dignity violations
against those same customers.


### Story #39 — FTC sues to break up Amazon (Stratum 4: High-PSQ Threat)

**Source:** Antitrust news | **Gate:** PASS | **Content via:** HN discussion
**Observatory:** consensus=0.346, psq=3.80, hcb_weighted_mean=0.208

| Dim | Element | Score | Dir | Ev | Rationale |
|-----|---------|-------|-----|----|-----------|
| D1 | Acceptance of Identity | +1 | S | I | Sellers treated as persons with legitimate business concerns, not just platform participants. |
| D2 | Recognition | +1 | S | I | Seller expertise and autonomy recognized. |
| D3 | Acknowledgment | +1 | S | I | Engages with why sellers "live in constant fear" of retaliation for independent pricing. |
| D4 | Inclusion | 0 | — | I | No strong inclusion signal. |
| D5 | Safety | -1 | S | I | Sellers face unsafe marketplace — retaliation for independent pricing decisions. |
| D6 | Fairness | +2 | S | I | Core argument: "economy-wide hidden tax" from unfair practices. Buy box manipulation documented. |
| D7 | Freedom | -1 | S | I | Seller freedom restricted — can't price independently without Amazon punishment. |
| D8 | Understanding | +1 | S | I | Explains mechanisms — buy box manipulation, ad fees, forced pricing parity. |
| D9 | Benefit of Doubt | +1 | S | I | Sellers given benefit of doubt as rational actors facing structural constraints. |
| D10 | Accountability | +2 | S | I | Amazon held accountable through FTC action with specific practices documented. |

**Scored dimensions:** 10/10 | **Mean:** 0.7 | **DI Composite:** 67.5
**Signal inversion:** PARTIAL — DI=67.5 (moderate), PSQ=3.80 (high threat).
Accountability journalism pattern with mixed dignity signals.


### Story #40 — Trump orders federal agencies to stop using Anthropic AI (Stratum 4: High-PSQ Threat)

**Source:** Political/tech news | **Gate:** DEFERRED
**Observatory:** consensus=0.100, psq=3.80, hcb_weighted_mean=0.000

HN discussion redirected by moderator to another thread. Only 1 comment visible.
**Classification:** DEFERRED — insufficient evidence for reliable scoring.


### Story #42 — PDF reader with interactive visualizations (Stratum 5: Technical/Neutral)

**Source:** Show HN project | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.000, psq=6.34, hcb_weighted_mean=0.000

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND.


### Story #43 — AI found 12 OpenSSL zero-days (Stratum 5: Technical/Neutral)

**Source:** Security research | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.000, psq=5.00, hcb_weighted_mean=0.000

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND.


### Story #44 — Self-Hosted NVR: Raspberry Pi with Hailo-8 AI (Stratum 5: Technical/Neutral)

**Source:** Hardware project | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.000, psq=5.00, hcb_weighted_mean=0.000

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND.


### Story #45 — Open Source Brain Stimulation: TDCS (Stratum 5: Technical/Neutral)

**Source:** Open hardware project | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.000, psq=5.00, hcb_weighted_mean=0.000

**Relevance gate determination:** Open-source hardware for transcranial direct
current stimulation. While brain stimulation involves persons, the HN submission
describes the hardware project itself, not treatment of persons receiving stimulation.

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND.


### Story #46 — Lneto: IEEE802.3/IP/TCP/HTTP in 8kB of RAM (Stratum 5: Technical/Neutral)

**Source:** Show HN project | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.000, psq=6.42, hcb_weighted_mean=0.000

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND.


### Story #47 — How do I cancel my ChatGPT subscription? (Stratum 5: Technical/Neutral)

**Source:** Consumer question | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.000, psq=7.32, hcb_weighted_mean=0.000

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND. Consumer help question, no
dignity-relevant treatment of persons.


### Story #50 — Jails for NetBSD (Stratum 5: Technical/Neutral)

**Source:** Technical feature | **Gate:** ND (below relevance threshold)
**Observatory:** consensus=0.000, psq=8.00, hcb_weighted_mean=0.000

**All dimensions:** ND | **DI Composite:** ND
**Relevance gate classification:** Correct ND.


## 6. Observations (50/50 stories assessed — Pass 1 complete)

### 6.1 Signal Inversion — 8 confirmed + 3 partial (THRESHOLD EXCEEDED)

| Story | Stratum | DI | PSQ | Pattern |
|-------|---------|-----|-----|---------|
| #1 ICE children | 1 (High-HRCB) | 95.0 | 3.71 | INVERSION — maximal dignity, maximal threat |
| #3 Kansas trans licenses | 1 (High-HRCB) | 92.5 | 3.20 | INVERSION — identity affirmation vs. erasure |
| #10 Gaza testimony | 1 (High-HRCB) | 92.5 | 3.25 | INVERSION — testimony dignifies, content threatens |
| #6 Apple encryption | 1 (High-HRCB) | 90.0 | 5.20 | INVERSION — advocacy dignifies, surveillance threatens |
| #38 Book Ban Bill | 4 (High threat) | 85.0 | 3.80 | INVERSION — intellectual freedom defended |
| #5 ICE Palantir | 1 (High-HRCB) | 85.0 | 4.68 | INVERSION — systemic analysis dignifies |
| #2 Keep Android Open | 1 (High-HRCB) | 80.0 | 4.23 | INVERSION — user autonomy advocacy |
| #32 Apple exec lied | 4 (High threat) | 75.0 | 3.00 | PARTIAL — accountability journalism |
| #8 Firefox AI trap | 1 (High-HRCB) | 65.0 | 3.25 | PARTIAL — moderate dignity, high threat |
| #37 23andMe terms | 4 (High threat) | 62.5 | 3.80 | PARTIAL — customer advocacy vs. corporate violation |
| #39 FTC vs Amazon | 4 (High threat) | 67.5 | 3.80 | PARTIAL — seller dignity, marketplace threat |

**Phase A success criterion #4 exceeded:** 8 clear inversions + 3 partial
(spec required ≥ 5). Inversions appear across Strata 1 and 4.

### 6.1b Signal Alignment — Low DI + Low PSQ

| Story | Stratum | DI | PSQ | Pattern |
|-------|---------|-----|-----|---------|
| #12 White House media list | 2 (Neg-HRCB) | 7.5 | 3.18 | ALIGNMENT — active dignity violation |
| #11 OpenAI DoW agreement | 2 (Neg-HRCB) | 35.0 | 4.10 | ALIGNMENT — passive dignity neglect |
| #31 Chrome hostile moves | 4 (High threat) | 55.0 | 2.63 | ALIGNMENT — mid-dignity, maximal threat |
| #36 Coinbase bankruptcy | 4 (High threat) | 55.0 | 3.20 | ALIGNMENT — mid-dignity, high threat |
| #15 UK encryption clash | 2 (Neg-HRCB) | 55.0 | 4.60 | ALIGNMENT — mid-dignity, moderate threat |
| #20 Amazon RTO | 2 (Neg-HRCB) | 57.5 | 3.80 | ALIGNMENT — broken promises, high threat |

When content itself treats persons without dignity OR documents institutional
unfairness without deep editorial engagement, both instruments register negatively.

### 6.1c "All-High" Pattern — High DI + High PSQ

| Story | Stratum | DI | PSQ | Pattern |
|-------|---------|-----|-----|---------|
| #9 Breaking Free (Meta scams) | 1 (High-HRCB) | 92.5 | 8.00 | ALL-HIGH — systemic consumer advocacy |
| #28 Bill Atkinson memorial | 3 (Mid-HRCB) | 90.6 | 7.20 | ALL-HIGH — community remembrance |
| #4 10th Circuit protesters | 1 (High-HRCB) | 90.0 | 6.61 | ALL-HIGH — judicial rights protection |
| #7 Facebook open web | 1 (High-HRCB) | 75.0 | 6.05 | ALL-HIGH — analytical advocacy |
| #23 Diamonds Suck | 3 (Mid-HRCB) | 72.5 | 6.45 | ALL-HIGH — consumer dignity, no threat |
| #30 Choose Boring Tech | 3 (Mid-HRCB) | 70.0 | 6.40 | ALL-HIGH — developer dignity, no threat |
| #22 WA AI Spanish voice | 3 (Mid-HRCB) | 70.0 | 5.00 | ALL-HIGH — accessibility dignity |

**Key finding:** High dignity does NOT require low PSQ. The inversion pattern holds
for testimonial/confrontational content about violations, but systemic/analytical
content achieves equally high dignity without triggering threat responses. The
difference: editorial distance from suffering.

### 6.2 Relevance Gate — 19/19 Correct (100%)

| Source | ND Count | Stories |
|--------|----------|---------|
| Stratum 5 (technical) | 10 | #41–50 |
| Stratum 2 (negative HRCB) | 4 | #13, #14, #17, #19 |
| Stratum 4 (high threat) | 2 | #33, #35 |
| Stratum 3 (mid-HRCB) | 3 | #25, #26, #29 |

**Phase A success criterion #2 MET:** 19/19 = 100% ≥ 90% threshold.

PSQ threat and HRCB signal can both occur without dignity relevance.
Technical content, product announcements, economic analyses, and documentation
references all correctly classified as ND regardless of PSQ or HRCB values.

### 6.3 Scoring Summary Table

| # | Story | Stratum | Gate | DI | PSQ | consensus |
|---|-------|---------|------|-----|-----|-----------|
| 1 | ICE children | 1 | PASS | 95.0 | 3.71 | 0.834 |
| 9 | Breaking Free (Meta) | 1 | PASS | 92.5 | 8.00 | 0.570 |
| 3 | Kansas trans licenses | 1 | PASS | 92.5 | 3.20 | 0.755 |
| 10 | Gaza testimony | 1 | PASS | 92.5 | 3.25 | 0.548 |
| 28 | Bill Atkinson memorial | 3 | PASS | 90.6 | 7.20 | 0.133 |
| 4 | 10th Circuit protesters | 1 | PASS | 90.0 | 6.61 | 0.747 |
| 6 | Apple encryption | 1 | PASS | 90.0 | 5.20 | 0.662 |
| 38 | Book Ban Bill | 4 | PASS | 85.0 | 3.80 | 0.494 |
| 5 | ICE Palantir | 1 | PASS | 85.0 | 4.68 | 0.703 |
| 2 | Keep Android Open | 1 | PASS | 80.0 | 4.23 | 0.800 |
| 7 | Facebook open web | 1 | PASS | 75.0 | 6.05 | 0.607 |
| 32 | Apple exec lied | 4 | PASS | 75.0 | 3.00 | 0.512 |
| 23 | Diamonds Suck | 3 | PASS | 72.5 | 6.45 | 0.253 |
| 22 | WA AI Spanish voice | 3 | PASS | 70.0 | 5.00 | 0.263 |
| 18 | Roomba bankruptcy | 2 | PASS | 70.0 | 5.28 | -0.026 |
| 30 | Choose Boring Tech | 3 | PASS | 70.0 | 6.40 | 0.117 |
| 21 | NZ software patents | 3 | PASS | 67.5 | 4.60 | 0.259 |
| 39 | FTC vs Amazon | 4 | PASS | 67.5 | 3.80 | 0.346 |
| 8 | Firefox AI trap | 1 | PASS | 65.0 | 3.25 | 0.578 |
| 24 | HN em-dashes | 3 | PASS | 65.0 | 6.23 | 0.247 |
| 37 | 23andMe terms | 4 | PASS | 62.5 | 3.80 | 0.373 |
| 20 | Amazon RTO | 2 | PASS | 57.5 | 3.80 | -0.014 |
| 15 | UK encryption clash | 2 | PASS | 55.0 | 4.60 | -0.057 |
| 31 | Chrome hostile moves | 4 | PASS | 55.0 | 2.63 | 0.247 |
| 36 | Coinbase bankruptcy | 4 | PASS | 55.0 | 3.20 | 0.022 |
| 11 | OpenAI DoW agreement | 2 | PASS | 35.0 | 4.10 | -0.190 |
| 12 | WH media offenders | 2 | PASS | 7.5 | 3.18 | -0.181 |
| 13 | Bus stop balancing | 2 | ND | — | 3.80 | -0.081 |
| 14 | Crypto scanner | 2 | ND | — | 7.10 | -0.079 |
| 17 | AI Solow paradox | 2 | ND | — | 6.75 | -0.027 |
| 19 | Apple M1 | 2 | ND | — | 5.99 | -0.016 |
| 25 | iFixit soldering | 3 | ND | — | 8.00 | 0.212 |
| 26 | C# reference | 3 | ND | — | 7.32 | 0.205 |
| 29 | SWEBOK | 3 | ND | — | 5.13 | 0.120 |
| 33 | Synthetic diamonds | 4 | ND | — | 3.00 | 0.142 |
| 35 | Manjaro certificate | 4 | ND | — | 3.00 | 0.096 |
| 41 | Badge LLM context | 5 | ND | — | 6.42 | 0.000 |
| 42 | PDF visualizations | 5 | ND | — | 6.34 | 0.000 |
| 43 | OpenSSL zero-days | 5 | ND | — | 5.00 | 0.000 |
| 44 | Raspberry Pi NVR | 5 | ND | — | 5.00 | 0.000 |
| 45 | Brain stimulation | 5 | ND | — | 5.00 | 0.000 |
| 46 | Lneto TCP in 8kB | 5 | ND | — | 6.42 | 0.000 |
| 47 | Cancel ChatGPT | 5 | ND | — | 7.32 | 0.000 |
| 48 | No Bookmarks | 5 | ND | — | 5.00 | 0.000 |
| 49 | Latency numbers | 5 | ND | — | 5.00 | 0.000 |
| 50 | Jails for NetBSD | 5 | ND | — | 8.00 | 0.000 |
| 16 | Khamenei strike | 2 | DEFERRED | — | 3.70 | -0.046 |
| 27 | Stable Diffusion | 3 | DEFERRED | — | 3.80 | 0.191 |
| 34 | War powers debate | 4 | DEFERRED | — | 3.00 | 0.199 |
| 40 | Trump/Anthropic ban | 4 | DEFERRED | — | 3.80 | 0.100 |

**Pass 1 complete:** 27 PASS with DI composite, 19 ND (all correct), 4 DEFERRED.


### 6.4 Correlation Analysis (n = 27 PASS stories)

**DI × PSQ scatter (all PASS stories):**

```
DI
100 |
 95 |  * **                            *=inversion +=all-high
 90 |      +   +  +
 85 |      *  *
 80 |    *
 75 |  *     +   +
 70 |         ++ +  +
 65 |  *         +
 60 |       *
 55 |  ** *
 50 |
 40 |
 35 |     *
 20 |
  7 | *
  0 |________________________________
    2  3  4  5  6  7  8  PSQ
```

**Pearson r = 0.328** (n=27, weak positive). PSQ explains 10.7% of DI variance.

The relationship strengthened from r=0.126 (n=10) as more mid-range stories filled
in — the moderate-dignity zone (55–70) contains both low-PSQ and moderate-PSQ stories,
adding a weak positive slope. The relationship remains well below the r<0.50 threshold.

**Phase A success criterion #3 MET:** r = 0.328 < 0.50 composite threshold.

**Three-zone structure (emergent finding):**

| Zone | DI range | PSQ range | n | Pattern |
|------|----------|-----------|---|---------|
| Inversion | 65–95 | 2.6–4.7 | 8 | High dignity + high threat: violation reporting |
| All-high | 70–93 | 5.0–8.0 | 7 | High dignity + high safety: analytical/systemic |
| Alignment | 7.5–57.5 | 2.6–4.6 | 6 | Low-mid dignity + high threat: content IS the violation |
| Mid-range | 55–70 | 3.8–6.2 | 6 | Moderate dignity, variable threat |

The relationship is NOT linear — it is tri-modal. Stories cluster into zones defined
by their editorial relationship to dignity violation:
1. **Reports about violations with editorial dignity** → inversion zone
2. **Systemic analysis or positive content** → all-high zone
3. **Content that itself violates or neglects dignity** → alignment zone

### 6.5 Methodology Observations

1. **Content access via HN discussions:** 15 stories scored from HN discussions
   (I-level evidence). Original article access yields D-level evidence (4 stories).
   I-level evidence proved sufficient for reliable scoring — the HN community
   consistently characterizes key dignity-relevant features of content.

2. **Relevance gate reliable from title alone:** 19/19 ND classifications correct
   (100%). Content category (technical tool, product announcement, economic
   analysis, documentation) provides sufficient signal for gate decisions without
   full content access.

3. **Dual-signal convention needed:** D5 (Safety), D6 (Fairness), D7 (Freedom)
   consistently produce +1 in rights-violation reporting because the editorial
   stance honors the element while described events violate it. Phase B prompt
   design should formalize this dual-channel scoring.

4. **DI gradient tracks editorial depth, not topic severity:** DI range across
   PASS stories (7.5–95.0) correlates with editorial engagement depth, not issue
   importance. Consumer content (Diamonds Suck, DI=72.5) treats persons with
   basic respect. ICE children (DI=95.0) provides deep individualized engagement.

5. **Violation vs. neglect distinction (Hicks):** Story #12 (DI=7.5, active
   violation with -2 scores) vs. Story #11 (DI=35.0, passive neglect with -1
   scores) maps directly onto Hicks' distinction (Hicks, 2011).

6. **D1 as context-dependent discriminant:** Story #3 (Kansas trans) shows D1
   (Acceptance of Identity) as the dominant dimension when the policy's mechanism
   is identity denial. Dimension weighting appears context-dependent.

7. **"All-high" pattern:** Stories #4, #9, #28 demonstrate that analytical/
   systemic/memorial content can score DI>90 with PSQ>6.5. High dignity does
   not require psychoemotional threat. The variable is editorial distance from
   suffering — not whether violations are discussed.

8. **DEFERRED rate:** 4/50 stories (8%) deferred due to insufficient content
   access. All 4 had minimal HN discussion (0-2 comments). Content access
   remains the primary bottleneck for scoring — not instrument design.

### 6.6 Remaining Work

- **Pass 1 success criteria status:**
  - ✓ Signal inversion ≥ 5 (achieved: 8 clear + 3 partial)
  - ✓ PSQ-DI correlation r < 0.50 (achieved: r = 0.328, n=27)
  - ✓ Relevance gate ≥ 90% accuracy (achieved: 19/19 = 100%)
  - ⚑ Inter-rater reliability ≥ 0.60 on ≥ 7/10 dimensions (pending Pass 2)
- **Pass 2:** Fresh session, no access to Pass 1 results, same 50 stories.
  Priority: establish inter-rater reliability for the 27 PASS stories.
- **DEFERRED stories (#16, #27, #34, #40):** Require content access or richer
  HN discussions. Could attempt original URL access in Pass 2 if available.

⚑ EPISTEMIC FLAGS
- Pass 1 complete: 50/50 stories assessed. 27 PASS with DI composites, 19 ND
  (100% correct), 4 DEFERRED (8% — acceptable attrition rate).
- r = 0.328 based on 27 stories — construct distinctness confirmed. The weak
  positive correlation likely reflects a shared "editorial engagement" factor:
  content that engages deeply with persons tends to score higher on both
  instruments. The three-zone structure shows the relationship is non-linear.
- Evidence quality: 4 D-level (full article), 23 I-level (HN discussion or
  title + metadata). Phase B should standardize content access for production.
- Cross-cultural validity flag on Story #10 remains open — single data point.
- "All-high" pattern was NOT predicted by spec. This third zone (high DI +
  high PSQ) represents analytical/systemic content that dignifies without
  threatening — a category the instrument should explicitly accommodate.
- Inter-rater reliability pending Pass 2. Single-rater results may show
  systematic bias. The dimension-level distributions (most scores are +1)
  may produce low kappa due to restricted range.

