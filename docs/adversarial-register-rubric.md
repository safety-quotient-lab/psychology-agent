# Adversarial Register — Scoring Rubric

**Dimension ID:** `adversarial_register` (`ar`)
**Proposed by:** psychology-agent (general context)
**Date:** 2026-03-06
**Status:** Prototype — validated against 5-text ICESCR corpus; not yet in training pipeline

---

## Why "Register" Not "Intent"

Intent is unobservable. Register is a linguistics/sociolinguistics term for the
variety of language used in a particular social context — it is directly observable
in text. "Adversarial register" captures the same phenomenon without asserting
knowledge of the author's internal state. The dimension scores what the text *does*,
not what the author *meant*.

---

## Construct Definition

**Adversarial register** measures the degree to which a text's rhetorical mode is
oriented toward defeating, discrediting, or excluding an opposing position — as
opposed to informing, advocating, or deliberating. It is a property of *how* the
author is positioned, not of *what topic* or *which side* is under discussion.

The construct is grounded in three independent bodies of literature:

1. **Walton & Krabbe (1995) — Dialogue Types**: classifies discourse by the goal
   participants pursue; eristic dialogue (winning at all costs) anchors the adversarial
   end, deliberative dialogue anchors the cooperative end.

2. **Du Bois (2007) — Stance Theory**: decompose stance into three simultaneous acts —
   evaluation of object, positioning of self, alignment/disalignment with others.
   Adversarial register maximizes negative evaluation, self-positioning as opponent,
   and disalignment invitation.

3. **Dodge & Coie (1987) — Hostile Attribution**: whether the text attributes hostile,
   malicious, or illegitimate motives to opposing actors. Hostile attribution is the
   single strongest marker of eristic register.

**Scale:** 0–10. Following PSQ convention: **0 = minimum safety (maximum adversarial
register); 10 = maximum safety (minimum adversarial register).**

---

## Scoring Dimensions

Score each of the three dimensions independently, then take the weighted mean:

| Dimension | Weight | What to assess |
|-----------|--------|----------------|
| Dialogue mode | 0.40 | Primary rhetorical goal of the text |
| Stance markers | 0.35 | Evaluative valence + self-positioning + alignment signal |
| Attribution pattern | 0.25 | Hostile vs. neutral vs. charitable attribution of opponent motives |

---

## Dimension 1 — Dialogue Mode (weight 0.40)

Classify the primary mode using Walton & Krabbe:

| Score | Mode | Markers |
|-------|------|---------|
| 0–2 | **Eristic** | Winning over truth; defeats opponent; hostile attributions; dismisses any validity in opposing position; explicit rejection language ("hard pass," "never," "stop") |
| 3–4 | **Adversarial persuasion** | Argues against with evidence, but evidence is selectively marshalled; acknowledges opponent position exists but not its strengths |
| 5–6 | **Informational / neutral** | Describes situation, parties, or barriers without taking combative position; reader not invited to align against anyone |
| 7–8 | **Advocacy / persuasion** | Argues FOR a position without attacking the opponent; positive framing dominant; opponent may be implicitly present but not targeted |
| 9–10 | **Deliberative / inquiry** | Invites joint reasoning; steelmans opposing view; explicitly acknowledges complexity; charitable toward all parties |

**Scoring note:** Mixed-mode texts score the weighted center of the modes present.
A text that is 60% informational and 40% advocacy would score ~7.2 (0.6×5.5 + 0.4×7.5).

---

## Dimension 2 — Stance Markers (weight 0.35)

Score three sub-components on 0–10 each, then average:

### 2a. Evaluative valence
Does the text evaluate the opposing position as wrong, harmful, dangerous, or
illegitimate?

| Score | Signal |
|-------|--------|
| 0–2 | Strongly negative; opposing position characterized as dangerous, illegitimate, or morally wrong |
| 3–4 | Negative; opposing position characterized as mistaken or harmful, with limited acknowledgment of any merit |
| 5–6 | Neutral; opposing position described without evaluation |
| 7–8 | Mildly positive toward opposing position; concedes some merit while advocating own |
| 9–10 | Charitable; opposing position represented at its strongest; any weaknesses noted with qualification |

### 2b. Self-positioning
Where does the author locate themselves relative to the contested terrain?

| Score | Signal |
|-------|--------|
| 0–2 | Author explicitly positioned as opponent; uses "we must defeat / stop / reject" |
| 3–4 | Author implicitly positioned against; advocates defeat without explicit framing |
| 5–6 | Author positioned as observer or analyst; no clear side taken |
| 7–8 | Author positioned as advocate for something, not against anything |
| 9–10 | Author positioned as facilitator; invites joint deliberation; no self-positioning against |

### 2c. Alignment signal
Does the text invite the reader to align against an out-group?

| Score | Signal |
|-------|--------|
| 0–2 | Strong in-group/out-group signal; names out-group explicitly; invites reader solidarity against it |
| 3–4 | Mild out-group framing; implies "them" without naming; reader positioned as potentially opposed |
| 5–6 | No alignment signal; reader not invited to take sides |
| 7–8 | Inclusive framing; "we" encompasses all stakeholders |
| 9–10 | Explicitly bridges in-group/out-group; acknowledges legitimacy of all parties |

---

## Dimension 3 — Attribution Pattern (weight 0.25)

Does the text attribute hostile, malicious, or illegitimate motives to opposing actors?
This is the single strongest discriminating feature of eristic register.

| Score | Attribution type | Example pattern |
|-------|-----------------|-----------------|
| 0–2 | **Hostile attribution** | Opponent motives characterized as malicious, greedy, power-seeking, or illegitimate ("foreign bureaucrats dictating policy") |
| 3–4 | **Competence/legitimacy attack** | Opponent motives not addressed; competence or legitimacy questioned without motive attribution ("the Committee has ignored this for 30 years") |
| 5–6 | **Neutral** | No attribution; opposing actors described by role only ("the Senate," "the Committee") |
| 7–8 | **Structurally charitable** | Opposing actors described with acknowledgment of their constraints or competing priorities |
| 9–10 | **Explicitly charitable** | Opposing actors' motives represented sympathetically; disagreement framed as reasonable given their position |

---

## Confidence Calibration

| Condition | Confidence range |
|-----------|-----------------|
| Text clearly and consistently signals one mode across all three dimensions | 0.75–0.90 |
| Text is predominantly one mode with minor mixed signals | 0.55–0.75 |
| Text is genuinely mixed; multiple modes present at comparable weight | 0.35–0.55 |
| Text too short (< 40 tokens) to assess reliably | 0.20–0.40 |
| Text contains no evaluative content (pure description of events) | 0.40–0.60 |

**Anti-halo note:** Score each dimension independently before computing the weighted
mean. Do not let an initial impression of "this seems hostile" pull all three
dimensions toward 0.

---

## Worked Examples — 5-Text ICESCR Corpus

### hostile_social_media_anchor
> "The ICESCR is UN overreach. Ratifying it would let foreign bureaucrats dictate US
> policy on welfare, housing, and labor law. No American voted for the UN Committee...
> This treaty would impose European-style socialism... Hard pass."

| Dimension | Sub-scores | Score | Reasoning |
|-----------|-----------|-------|-----------|
| Dialogue mode | — | 1.0 | Eristic; explicit rejection ("Hard pass"); no engagement with opposing argument |
| Stance markers | eval=0, self=1, align=1 | 0.7 | Opposing position characterized as illegitimate ("overreach"); explicit opponent framing; strong in-group ("No American") |
| Attribution | — | 0.5 | Hostile attribution: "foreign bureaucrats dictating policy" ascribes illegitimate motive |
| **Weighted total** | | **0.81** | |

**Expected score: 0–2. Confidence: 0.85**

---

### policy_brief_legislative_focused
> "The Senate Foreign Relations Committee holds jurisdiction over treaty ratification.
> The Committee has not held a hearing on ICESCR since the Clinton administration...
> the political will requires constituent pressure to activate it."

| Dimension | Sub-scores | Score | Reasoning |
|-----------|-----------|-------|-----------|
| Dialogue mode | — | 5.5 | Informational; describes procedural landscape without attacking anyone |
| Stance markers | eval=5, self=5, align=6 | 5.3 | No evaluation of Senate motives; no explicit self-positioning; mild "constituent pressure" invites action but not against anyone |
| Attribution | — | 6.0 | Neutral attribution: Senate inaction described by role ("has not held a hearing"), no motive attributed |
| **Weighted total** | | **5.5** | |

**Expected score: 5–6. Confidence: 0.70**

---

### voter_guide_phone_script_focused
> "Call your senator's office and ask one question... You don't need to know the treaty
> details... Your five minutes carries weight precisely because so few people make this call."

| Dimension | Sub-scores | Score | Reasoning |
|-----------|-----------|-------|-----------|
| Dialogue mode | — | 8.0 | Advocacy/persuasion — argues FOR action without attacking opponent |
| Stance markers | eval=7, self=7, align=8 | 7.3 | No negative evaluation of opponent; author positioned as enabler; reader positioned as empowered actor, not against anyone |
| Attribution | — | 7.5 | No attribution; senators described by role only |
| **Weighted total** | | **7.7** | |

**Expected score: 7–8. Confidence: 0.80**

---

### why_act_urgency_focused
> "Five minutes can carry real weight in a Senate office... ICESCR ratification would
> require the U.S. to report progress... creating a formal accountability mechanism
> that currently doesn't exist for U.S. domestic policy."

| Dimension | Sub-scores | Score | Reasoning |
|-----------|-----------|-------|-----------|
| Dialogue mode | — | 7.5 | Advocacy; describes benefit without targeting an opponent |
| Stance markers | eval=7, self=7, align=8 | 7.3 | Positive framing ("formal accountability mechanism"); no self-positioning against anyone |
| Attribution | — | 7.5 | No attribution; current accountability gap described structurally, not as anyone's fault |
| **Weighted total** | | **7.4** | |

**Expected score: 7–8. Confidence: 0.75**

---

### homepage_hero_focused
> "The United States signed the International Covenant... in 1977. The Senate has never
> voted to ratify it. Fifty years of inaction has made the U.S. an outlier among peer
> democracies. Ratification would create binding obligations... where the U.S. lags
> measurably behind comparable nations."

| Dimension | Sub-scores | Score | Reasoning |
|-----------|-----------|-------|-----------|
| Dialogue mode | — | 6.0 | Informational with mild advocacy framing ("outlier among peer democracies" carries evaluative charge) |
| Stance markers | eval=5, self=6, align=7 | 6.0 | Mild negative implicit evaluation of inaction; no explicit opponent; no alignment signal |
| Attribution | — | 6.5 | Neutral; "the Senate has never voted" describes inaction without attribution |
| **Weighted total** | | **6.1** | |

**Expected score: 5–7. Confidence: 0.65** (evaluative charge in "outlier" introduces mild ambiguity)

---

## Expected Gap Signal (adversarial_register vs. hostility_index)

The gap between adversarial register (AR) and hostility_index (HI) carries meaning:

| Text | AR (expected) | HI (scored) | Gap (HI−AR) | Interpretation |
|------|--------------|-------------|-------------|----------------|
| hostile_anchor | ~1 | 6.88 | +5.88 | High: text is adversarial but not experienced as psychoemotionally threatening by narrator |
| policy_brief | ~5.5 | 6.15 | +0.65 | Low: text matches psychoemotional threat level |
| voter_guide | ~7.7 | 6.65 | −1.05 | Slight negative: advocacy text creates mild environmental exposure signal |
| why_act | ~7.4 | 6.55 | −0.85 | Slight negative: same pattern |
| homepage_hero | ~6.1 | 7.50 | +1.40 | Moderate: factual framing reads as safer than its implicit "50 years of inaction" charge |

A large positive gap (HI >> AR) indicates: content that is adversarial in rhetorical mode
but does not register as a threatening narrator environment — the author is the hostile
actor, not a threat to the narrator. This is the SETL+-style signal the user proposed.

A near-zero gap (HI ≈ AR) indicates: content where adversarial register and
psychoemotional environment threat are aligned — describing hostile conditions the
narrator faces.

A negative gap (AR >> HI) indicates: advocacy content that generates mild environmental
threat exposure despite non-adversarial intent — common for urgency framing.

---

## Scoring Prompt (for LLM labeling session)

```
SCORING SESSION — adversarial_register dimension

You are scoring texts on the adversarial_register (AR) dimension for the PSQ
(Psychoemotional Safety Quotient) labeling pipeline.

SCALE: 0–10 integer or one decimal place.
  0 = maximum adversarial register (eristic; hostile attributions; out-group framing)
 10 = minimum adversarial register (deliberative; charitable; no out-group framing)

CONSTRUCT: Adversarial register measures the degree to which the text's rhetorical
mode is oriented toward defeating or discrediting an opposing position, as opposed
to informing, advocating, or deliberating. Score what the text DOES, not what you
infer about the author's intent.

THREE SCORING DIMENSIONS — assess independently, then compute weighted mean:

1. DIALOGUE MODE (weight 0.40) — Walton & Krabbe (1995)
   0–2  Eristic: explicit rejection, hostile attributions, no engagement with opposing argument
   3–4  Adversarial persuasion: argues against with evidence, selected and one-sided
   5–6  Informational/neutral: describes without combative positioning
   7–8  Advocacy/persuasion: argues FOR without attacking opponent
   9–10 Deliberative/inquiry: steelmans opposition, invites joint reasoning

2. STANCE MARKERS (weight 0.35) — Du Bois (2007)
   Score three sub-components on 0–10, then average:
   a. EVALUATIVE VALENCE: how does text evaluate the opposing position?
      0–2 Strongly negative (wrong, dangerous, illegitimate)
      5–6 Neutral (described without evaluation)
      9–10 Charitable (represented at its strongest)
   b. SELF-POSITIONING: where does the author position themselves?
      0–2 Explicit opponent ("we must defeat / stop / reject")
      5–6 Observer / analyst
      9–10 Facilitator / bridge-builder
   c. ALIGNMENT SIGNAL: does text invite reader to align against an out-group?
      0–2 Strong in-group/out-group signal; names out-group; invites solidarity against it
      5–6 No alignment signal
      9–10 Explicitly bridges in-group/out-group

3. ATTRIBUTION PATTERN (weight 0.25) — Dodge & Coie (1987)
   Does text attribute hostile/malicious/illegitimate motives to opposing actors?
   0–2  Hostile attribution: opponent motives characterized as malicious or illegitimate
   3–4  Competence/legitimacy questioned, no motive attribution
   5–6  Neutral: opposing actors described by role only, no attribution
   7–8  Structurally charitable: acknowledges constraints or competing priorities
   9–10 Explicitly charitable: opposing motives represented sympathetically

CONFIDENCE: 0.20–0.90
  High (0.75–0.90): text clearly and consistently signals one mode across all dimensions
  Medium (0.55–0.75): predominantly one mode with minor mixed signals
  Low (0.35–0.55): genuinely mixed; multiple modes at comparable weight
  Very low (0.20–0.35): text too short or purely descriptive to assess reliably

ANTI-HALO: Score each dimension before computing the weighted mean.
Do not let an initial impression pull all three dimensions together.

OUTPUT FORMAT (one line per text):
{"dim": "ar", "scores": {"TEXT_ID": [SCORE, CONFIDENCE], ...}}

Score each text. Show your dimension scores in a brief table before outputting the JSON.
```

---

## Validation Criteria

Before accepting AR scores into training data:

1. **Discrimination check**: hostile_anchor must score ≤ 3; at least one advocacy text
   must score ≥ 7. If this fails, the rubric needs revision.

2. **Ordering check**: advocacy texts (voter_guide, why_act) must score higher than
   informational texts (policy_brief, homepage_hero), which must score higher than
   hostile_anchor.

3. **Gap signal check**: AR(hostile_anchor) < HI(hostile_anchor). If this fails,
   the gap signal collapses and the rationale for the dimension weakens.

4. **Inter-rater reliability**: If two independent scoring sessions (different Claude
   Code sessions) produce AR scores within 1.5 points for 4/5 texts, reliability
   is acceptable for pilot use.

---

## Integration Path

**Phase 1 (now):** Use scoring prompt as LLM heuristic on ICESCR corpus. Validate
discrimination and ordering. Compute gap signal against existing HI scores.

**Phase 2:** If Phase 1 validates, generate AR labels for existing training corpus
(psq.db) using label_separated.py workflow. One session per dimension batch.

**Phase 3:** Add as 11th dimension head in distill.py. Retrain on labeled corpus.
Note: shares DistilBERT encoder backbone — not architecturally independent of
other dimensions, but statistically independent if training signal is clean.

**Phase 4:** Add AR to PSQ-Lite candidates. Revised PSQ-Lite for advocacy content:
TE + TC + AR (replaces HI for content-type classification).

---

## Open Questions

- AR scores hostility FROM the text's author. Should a complementary measure score
  hostility TOWARD the reader? (e.g., threatening language directed at the reader
  specifically — different construct, potentially relevant for content moderation)
- Does AR correlate with existing PSQ dimensions in held-out data? If AR correlates
  > 0.6 with HI, the added value diminishes. Run discriminant validity check.
- Scoring prompt uses "integer or one decimal place" — consistent with PSQ convention
  (0–10 integer). Should be pure integer once integrated into training pipeline.
