# CODEX HANDOFF — Milele Fit Sound Assessment

Read first:
- docs/sound-assessment/ARCHITECTURE_V1.md
- AGENTS.md
- existing residential/community pages and debug conventions.
Reference architecture only (do not modify): Garvey assessment-core patterns for scoring, max-possible normalization, contradictions, confidence, output contracts and progressive disclosure.

## Non-negotiables
- This lives in Mufasa.fitness.node / Milele Fit, NOT Garvey.
- Call it an Assessment, never a quiz.
- Quick = 10 items; Deep = 25.
- One scoring/output contract; two evidence depths.
- Measure human state first; translate to bowls second.
- Seven state dimensions + independent activation/regulation moderator.
- All 21 two-bowl pair records must be curated/versioned before recommendations ship.
- Never let answer position or unequal scoring opportunity predetermine a winner.
- Results are concise first, details expandable.
- Build first-failure diagnostics from Phase 0 onward.
- Temporary phase debug panels must converge into one final Sound Assessment Debug panel.
- Do not claim medical diagnosis or scientific validation that has not been established for this instrument.

## Phase plan

### Phase 0 — Readiness + contract
Create/select the canonical:false readiness development card per AGENTS.md using npm run readiness:update. Record this architecture as evidence. Add a feature flag; no customer route yet.
Acceptance: readiness card active; contract/version constants exist; diagnostics returns BOOT PASS.

### Phase 1 — Domain + 21-pair content model
Implement dimension definitions, activation states, bowl definitions and schema for 21 pair records. Populate all 21 curated records.
Acceptance: 21/21 unique unordered pairs; no missing notes/dimensions/content; pair-library debug stage PASS.

### Phase 2 — Scoring kernel
Implement pure functions modeled on Garvey mechanics: normalization, max-possible opportunity, question class multipliers, primary/secondary contributions, completion, contradiction/consistency and confidence.
Acceptance: deterministic unit tests; zero-opportunity/malformed mappings fail closed.

### Phase 3 — Balance auditor
Build bank-audit utility that reports per-dimension primary count, secondary count, weighted opportunity, option-position distribution, max possible and simulated all-A/B/C/D/random outcomes.
Acceptance: CI fails on structural dominance or missing mappings. Store audit artifact.

### Phase 4 — Quick 10 bank
Author exactly 10 short items with balanced coverage and activation evidence. Run Phase 3 audit. Quick confidence is explicitly capped/configured.
Acceptance: mobile completion flow; no unanswered submission; audit PASS; target completion measured in pilot, not assumed.

### Phase 5 — Quick result + progressive disclosure
Build compact Sound Profile and expandable sections. Add Go Deeper CTA preserving assessment identity/session linkage.
Acceptance: above-fold summary stays compact; details keyboard accessible; debug shows PROFILE and RESULT_RENDER.

### Phase 6 — Deep 25 bank
Author exactly 25 items across ID/BH/SC/ST/DS, including reverse/consistency and desired-state relationships. Reuse Quick answers only for identical stable item IDs.
Acceptance: balance audit PASS; reverse/desired pair integrity PASS; Quick→Deep handoff verified.

### Phase 7 — Recipe engine
Deterministic mapping from normalized state + activation + desired state to anchor/partner/accent/rhythm/closing sequence. Return reason codes.
Acceptance: fixture matrix covers under/regulated/overactivation; every output resolves to one of 21 pair IDs; no unreachable pair records without explicit rationale.

### Phase 8 — Persistence + practitioner view
Persist versioned assessment result and recipe. Add authorized practitioner detail while customer sees safe concise interpretation.
Acceptance: version round-trip; authorization tests; no internal/admin diagnostics exposed to ordinary users.

### Phase 9 — Apartment/Community integration
Add Sound Assessment CTA to residential wellness Sound Bath experience and Community Hub wellness entry. Preserve existing routes and membership behavior.
Acceptance: links work on mobile; no apartment/property name hardcoding; feature flag supports rollback.

### Phase 10 — Consolidated diagnostics
Replace phase-local debug surfaces with ONE Sound Assessment Debug panel following repository FIRST FAILURE conventions.
Required fields: STATUS, FIRST_FAILURE, STAGE, DETAIL, mode, bank/scoring/recipe versions, question/answer counts, missing mappings, dimension opportunity, confidence inputs.
Acceptance: injected failures demonstrate correct first failure at each pipeline stage; Copy Report works with fallback.

### Phase 11 — Pilot telemetry / calibration
Collect consented, minimal telemetry: completion/drop-off, Quick→Deep agreement, retest behavior where appropriate, user usefulness and practitioner usefulness. Do not silently change scoring.
Acceptance: versioned calibration report; any weight change requires new scoring_version and regression audit.

### Phase 12 — Release gate
Run full tests/readiness validation; browser/mobile technical QA; leave human visual/UX acceptance for authorized human approval.
Acceptance: npm run readiness:validate PASS; no unresolved first failure; feature flag release decision documented.

## Codex review instructions
At the end of EACH phase:
1. Review changed files against architecture.
2. Run targeted + regression tests.
3. Run bank balance audit when banks/scoring changed.
4. Fix failures before proceeding.
5. Update readiness evidence via npm run readiness:update.
6. Report: changed files, tests, FIRST FAILURE status, known risks, human checks still required.
Do not duplicate debug panels across completed phases; consolidate progressively.

## Suggested stable failure codes
SA_BOOT_MISSING
SA_BANK_LOAD
SA_BANK_SCHEMA
SA_MAPPING_MISSING
SA_DIMENSION_ZERO_OPPORTUNITY
SA_POSITION_BIAS
SA_WEIGHT_DOMINANCE
SA_ANSWER_MISSING
SA_SCORE_INVALID
SA_NORMALIZE_INVALID
SA_CONSISTENCY_INVALID
SA_ACTIVATION_INVALID
SA_PROFILE_INVALID
SA_PAIR_MISSING
SA_RECIPE_UNRESOLVED
SA_RESULT_RENDER
SA_PERSISTENCE
SA_DEEP_HANDOFF
