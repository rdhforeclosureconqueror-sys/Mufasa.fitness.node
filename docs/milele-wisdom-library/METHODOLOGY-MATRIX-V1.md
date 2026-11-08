# Milele Wisdom — Comparative Methodology Matrix v0.1

This document is an **analytical scaffold**, not a claim that either educator made any particular statement. Direct lectures have not yet been transcribed and timestamp-verified.

## Working comparison
| Research dimension | Dr. Sebi: question for source review | Dr. Llaila O. Afrika: question for source review | Milele Fit decision rule |
|---|---|---|---|
| Food origin | Does he distinguish wild, cultivated, and hybrid plants? How? | Does he distinguish traditional, industrial, and culturally adapted diets? | Record the specific criteria, never infer a rule from a slogan |
| Processing | Which processing steps are accepted or rejected? | Which cooking, preparation, and industrial methods are discussed? | Judge a scanned food from its actual ingredients and processing evidence |
| Minerals and nutrients | What role is assigned to minerals? | What role is assigned to nutrient balance and digestion? | Separate historical concepts from verified nutrient amounts |
| Botanical selection | Which traits identify a suitable plant? | How are herbs classified, prepared, or combined? | Treat proposed botanical uses as hypotheses until safety and efficacy are evaluated |
| Observation | What experiences or comparisons support conclusions? | What observations and sources support conclusions? | Label anecdote, observation, mechanism, and experiment separately |
| Contradictions | Are food lists and explanations consistent across recordings? | Do recommendations vary across lectures or contexts? | Preserve disagreement; do not average incompatible rules |

## Research workflow
1. Identify original, freely accessible recording and its provenance.
2. Record a timestamped short quote or accurate paraphrase with context.
3. Extract one testable rule or observation per record.
4. Search other recordings for confirming examples and counterexamples.
5. Mark DIRECT_SOURCE only after original playback verification.
6. Mark RECONSTRUCTED_PRINCIPLE only with at least two independent supporting passages and a documented contradiction search.
7. Mark MILELE_HYPOTHESIS when extending a rule to a new food; never imply the educator personally endorsed the extension.
8. Publish a food recommendation only after separate ingredient verification and appropriate safety review.

## Proposed data model
Each claim: claim_id, speaker, source_id, url, timestamp_start, timestamp_end, paraphrase, claim_type, evidence_type, classification_rule, supporting_claim_ids, contradicting_claim_ids, attribution_confidence, research_status, reviewer, reviewed_at.
Each food evaluation: barcode, product_identity_confidence, label_source, ingredient_evidence, nutrient_evidence, historical_principle_refs, deterministic_standard_version, uncertainties, coach_explanation.

## First product evaluation: South Forty mango/pineapple/lime bar
- Physical label supplied by owner: mango, pineapple, lime juice; 45 calories, 8 g total sugars, 0 g added sugars, 1 g fiber per 14 g bar.
- The earlier database NOVA 4 classification conflicts with a simple three-fruit ingredient list and should be flagged for verification, not treated as settled.
- **Historical interpretation:** PENDING. No timestamp-verified passage from either educator has been mapped to this exact product or its processing method.
- **Milele evaluation:** Nutrient facts may be displayed with label provenance. Historical food classification and any final approval score remain unassigned pending evidence.
- **AI conversation:** May explain the verified label and explicitly say which methodology questions remain open; must not invent historical positions.

## Acceptance tests for later implementation
- A source without a timestamp cannot generate a DIRECT_SOURCE response.
- A missing ingredient list cannot be filled from an AI guess.
- An unsupported NOVA classification cannot independently justify a negative food approval.
- Conflicting sources must be visible in the internal audit record.
- An AI hypothesis never becomes a demonstrated health benefit without independent evaluation.
