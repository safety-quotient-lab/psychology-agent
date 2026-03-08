# Dignity Index — Phase A Feasibility Study

**Status:** In progress — sample selected, scoring underway
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


## 6. Preliminary Observations (5 stories scored)

### 6.1 Signal Inversion Confirmed

Both high-HRCB stories demonstrate signal inversion:

| Story | DI | PSQ | Inversion? |
|-------|-----|-----|------------|
| #1 ICE children | 95.0 | 3.71 | YES — maximal dignity, maximal threat |
| #10 Gaza testimony | 92.5 | 3.25 | YES — maximal dignity, maximal threat |

The content that most honors its subjects' dignity simultaneously produces the most
psychoemotional threat in readers. This validates the construct distance hypothesis:
PSQ and DI measure fundamentally different things, and using PSQ as a proxy for DI
would invert the signal on the most important content.

### 6.2 Relevance Gate Functions

3/3 technical/neutral stories correctly classified as ND. The relevance gate
prevents the HRCB H1 problem (absence-as-negative).

### 6.3 Methodology Observations

1. **Content access required:** Scoring from titles alone produces weak, mostly-neutral
   scores due to insufficient evidence. Rigorous scoring requires fetching the actual
   article. The two stories scored with full content show strong, differentiated profiles.

2. **Directionality dual signal:** D5 (Safety), D6 (Fairness), and D7 (Freedom)
   consistently produce dual signals in rights-violation reporting: the editorial
   stance honors the element while the described events violate it. The current
   rubric handles this with +1 (present) — acknowledging the editorial channel
   upholds dignity while the described reality threatens it. This dual-signal
   pattern may warrant a formal scoring convention.

3. **Evidence quality:** Full-article scoring yields predominantly D (direct evidence)
   scores because quoted testimony provides explicit textual grounding. Title-only
   scoring yields I (inference) or ND.

### 6.4 Remaining Work

- Score remaining 45 stories (requires content fetching for each)
- Focus next on Stratum 2 (negative HRCB) and Stratum 4 (high threat) to test
  whether low-HRCB content shows lower dignity scores or different patterns
- Pass 2 (independent re-scoring) for inter-rater reliability
- Full correlation matrix after all 50 scored

⚑ EPISTEMIC FLAGS
- Sample scored: 5/50 (10%). Preliminary observations may not hold across full sample.
- 2/5 stories scored from full content; 3/5 scored from title only (relevance gate check).
- Signal inversion confirmed on only 2 stories — spec requires ≥ 5 for Phase A success.
- Cross-cultural validity flag raised on Story #10 — Hicks framework may underweight
  collective dignity violations in conflict contexts.

