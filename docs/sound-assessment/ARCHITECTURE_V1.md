# Milele Fit Sound Assessment — Architecture v1

Status: DESIGN CONTRACT — implementation must be phased and validated before customer use.

## Product flow
Apartment/Residential Wellness → Sound Assessment.
1. Quick Assessment: 10 items, target 2–3 minutes.
2. Quick result: compact directional Sound Profile, lower confidence ceiling, CTA to Deep Assessment.
3. Deep Assessment: 25 items, target 5–7 minutes; may reuse the user's Quick answers only when item IDs and wording are identical.
4. Deep result: state profile + confidence/consistency + current-vs-desired gaps + activation direction + Sound Session Recipe.
5. Results use progressive disclosure: concise summary first; expandable sections for deeper interpretation.
6. Practitioner view receives the session recipe. Customer view receives understandable wellness/spiritual language, not internal scoring mechanics.

## Measurement contract
Do NOT score “which chakra is broken.” Measure reported human state, then translate that state through a separate sound-practice layer.

Dimensions:
- GR Grounding/Regulation — present/stable ↔ scattered/overstimulated.
- EF Emotional Flow — fluid/accessible ↔ numb, rigid, suppressed, stuck.
- AG Agency/Energy — capable/mobilized ↔ depleted, powerless, indecisive.
- CO Connection/Openness — connected/receptive ↔ guarded, isolated, emotionally heavy.
- EX Expression — authentic/communicative ↔ inhibited, withholding.
- CL Clarity/Insight — clear/discerning ↔ foggy, conflicted, mentally noisy.
- SP Spiritual/Meaning Connection — connected to meaning/lineage/nature/transcendence ↔ disconnected.
- AR Activation/Regulation — underactivated ↔ regulated ↔ overactivated. AR is directional/moderating, not a chakra.

Question classes mirror the proven Garvey mechanics as a starting architecture:
- ID identity/baseline = 1.0
- BH behavior = 1.0
- SC scenario = 1.25
- ST stress = 1.5
- DS desired state = 1.0
- option primary signal = +2; secondary = +1

These weights are a starting hypothesis, not automatically validated for this new instrument. They must pass the balance audit below before launch.

## Quick vs Deep
Quick and Deep MUST use one scoring/output contract.
Quick:
- exactly 10 items;
- broad directional coverage;
- no high-confidence claim from sparse evidence;
- result labels directional/preliminary;
- CTA: “Go Deeper” to 25-item assessment.

Deep:
- exactly 25 items;
- multiple independent observations per major construct;
- includes reverse/consistency pairs;
- includes current-vs-desired evidence;
- supports stronger confidence and recipe specificity.

## Anti-bias / balance gate
This is a hard release gate because prior assessment work exposed dimension-distribution failures.

For EACH bank and mode:
1. Compute maximum possible score per dimension from actual option mappings and class multipliers.
2. Normalize raw score by that dimension's max possible.
3. Audit option-position distribution: A/B/C/D positions cannot systematically map to the same dimension.
4. Audit primary and secondary mapping counts by dimension.
5. Audit weighted opportunity by dimension, not just raw item counts.
6. Simulate all-A, all-B, all-C, all-D and randomized response sets.
7. No dimension may win merely because it has more scoring opportunities.
8. Verify reverse pairs and desired pairs are directionally coherent.
9. Fail closed when a bank is malformed, a dimension has zero opportunity, or mappings are missing.
10. Store scoring_version + bank_version with every result.

## Core scoring pipeline
answers
→ normalize question schema
→ raw dimension contributions
→ max-possible opportunity calculation
→ per-dimension normalization (0–100)
→ activation direction
→ contradiction/consistency analysis
→ completion
→ confidence
→ current-vs-desired gap
→ primary/secondary state profile
→ sound-strategy translation
→ session recipe
→ compact result + expandable interpretation.

Confidence must incorporate mode. Quick mode has a configurable confidence ceiling until empirical calibration is available. Deep mode may use completion + consistency but must not imply clinical certainty.

## Sound strategy layer
The scoring engine outputs state. A separate deterministic rule layer maps state to sound practice.

Seven bowl roles:
C Root / grounding
D Sacral / flow
E Solar / agency
F Heart / connection
G Throat / expression
A Third Eye / clarity
B Crown / spiritual connection

There are 21 unique two-bowl pairings. Each pairing record must include:
- stable ID and public name;
- bowls/notes;
- interval;
- associated dimensions;
- element/spiritual symbolism;
- intended experiential direction;
- underactivation use;
- overactivation use;
- anchor suitability;
- accent suitability;
- transition suitability;
- cautions / when not to choose as opening foundation;
- suggested pulse/rhythm;
- bija/mantra pairing;
- closing/grounding sequence;
- short customer description;
- long practitioner interpretation.

Recipe output:
- starting state;
- desired state;
- primary + secondary dimensions;
- activation direction;
- anchor bowl;
- partner bowl;
- primary pairing ID;
- accent sequence;
- rhythm/pulse;
- energy arc;
- bija/mantra;
- closing sequence;
- practitioner intention;
- confidence + consistency;
- explanation/reason codes.

Default design principle: grounding is favored when overactivation/scattering is strong, but it is NOT an unconditional rule. Rule ordering must be explicit and testable.

## Result UX — progressive disclosure
Above the fold:
- “Your Sound Profile”
- 1–2 sentence summary
- primary intention
- recommended two-bowl foundation
- confidence label appropriate to Quick/Deep
- Quick-only “Go Deeper” CTA

Expandable sections:
- Why this pairing
- What your answers suggest
- Your activation pattern
- Your sound journey
- Bowl-by-bowl meaning
- Rhythm / entrainment approach
- Spiritual symbolism
- Practitioner notes (authorized view only)
- Scoring transparency / version info

Do not flood the initial page.

## Data contract
Persist at minimum:
assessment_id, user/member ID when available, mode quick|deep, bank_id, bank_version, scoring_version, started_at, completed_at, answers, dimension_raw, dimension_max_possible, dimension_normalized, activation, contradiction, consistency, completion, confidence, current_desired_gaps, primary_dimension, secondary_dimension, recipe_id/version, reason_codes.

Do not persist unsupported medical diagnoses. This is a wellness/sound-practice assessment.

## 21-pair library gate
The recommendation engine MUST NOT ship until all 21 pair records exist and every selectable recipe resolves to a valid pair. No generated-on-the-fly spiritual interpretation in the scoring path; use versioned curated content.

## Validation program
Pre-launch:
- schema tests;
- scoring math tests;
- max-opportunity tests;
- answer-position bias tests;
- dimension-distribution tests;
- malformed-bank fail-closed tests;
- deterministic recipe tests;
- Quick/Deep contract parity;
- accessibility/mobile tests;
- progressive-disclosure tests.

Pilot:
- completion time/drop-off;
- test/retest stability where appropriate;
- Quick→Deep agreement;
- internal consistency only where construct/item design supports it;
- participant usefulness ratings;
- practitioner recipe usefulness;
- adverse/confusing result review;
- revise weights from evidence, not intuition.

## First-failure diagnostics
Every phase exposes machine-readable diagnostics:
STATUS: PASS|WARN|FAIL
FIRST_FAILURE: stable failure code or NONE
STAGE: assessment stage
DETAIL: concise actionable detail
assessmentMode, bankVersion, scoringVersion, questionCount, answeredCount, missingMappings, dimensionOpportunity, confidenceInputs, recipeVersion.

Phase panels are temporary development views. Final integration consolidates them into ONE Sound Assessment Debug panel available only through the established debug/admin mechanism.

First-failure order:
BOOT → BANK_LOAD → BANK_SCHEMA → QUESTION_RENDER → ANSWER_CAPTURE → SCORE_RAW → MAX_OPPORTUNITY → NORMALIZE → CONSISTENCY → ACTIVATION → PROFILE → PAIR_LIBRARY → RECIPE → RESULT_RENDER → PERSISTENCE → DEEP_HANDOFF.

## Acceptance definition
No phase is “done” because a page renders. It is done only when its contract tests pass, its first-failure output is meaningful, and affected readiness evidence is recorded under repository policy. Human UX/visual acceptance remains human-only.
