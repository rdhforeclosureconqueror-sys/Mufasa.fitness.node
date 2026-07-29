# Phase 2 — Deterministic Workout Intelligence Blueprint

## Objective

Upgrade the current deterministic workout builder with reviewed modular blocks, explicit ordering/time budgets, equipment substitutions, progression gates, shared cues and movement observations. Do not replace the current application, exercise authority, approval workflow, or user history. Do not call an LLM to make eligibility/safety decisions.

## Legacy inputs and disposition

| Input | Extract | Do not import |
|---|---|---|
| `01_lego_training_blocks.txt` | Block types, movement patterns, planes, intensity gears, ordering/session examples | Prose parser at runtime; vague dose as fact |
| `02_nasm_movement_basics.txt` | Reviewed vocabulary for actions, planes, checkpoints, programming phases | Brand authority, diagnosis or unverified claims |
| `03_nasm_overhead_squat_assessment.txt` | Five observation IDs and candidate strategy groupings | “Possible contributor” as diagnosis; person-specific text |
| `06_coach_cues_and_checklists.txt` | Candidate universal cue/checklist records | Unreviewed direct production strings |
| Gymnastics files | Later domain block/skill references only | Advanced skills into general unsupervised plans |

## Current modules and exact responsibilities

| Current module | Planned change |
|---|---|
| `exercise-generation/schema.json` and `schemas/*.json` | Add/version normalized movement vocabulary, substitution capabilities, dose eligibility and cue references without breaking v1 |
| `exercise-generation/sources/*.json` | Human-maintained canonical exercise facts; add records incrementally through existing review workflow |
| `exercise-generation/rules.json` | Add only capability/threshold references appropriate to reviewed movement analysis; preserve generated-artifact authority |
| `scripts/generate-exercise-profiles.js`, validators, review workspace | Compile and validate new fields; require reviewer decisions; maintain runtime parity/fingerprints |
| `src/services/generatedWorkoutService.js` | Orchestrate selection/assembly from a versioned plan request and block engine |
| `src/services/generatedWorkoutProgressionService.js` | Supply eligible progression/regression constraints from history; never mutate plan silently |
| `src/services/trainingAdaptationService.js` | Produce bounded adaptation inputs such as volume/intensity eligibility |
| `src/services/personalizationService.js` | Translate goal, availability, equipment and limitations into constraints |
| `src/services/sessionService.js` | Persist delivered block/exercise/rule versions and completion facts |
| `public/generated-workout-runtime.js`, `workout-runtime.js`, `workout-progression-runtime.js` | Render block rationale/order/time and explicit substitutions; no independent selection logic |
| `public/workout-coach-runtime.js`, `workout-form-runtime.js`, `rep-analysis-runtime.js`, `form-engine.js` | Resolve approved cue IDs/observations; retain confidence/unsupported states |
| `server.js` current generated-plan/progression/session routes | Version request/response contracts; do not add a legacy route namespace |

## Required schemas

### Training block

`blockId`, schema/content version, type (`warmup|skill|strength|accessory|conditioning|cooldown`), purpose, allowed movement patterns/planes, gear, duration range, exercise-slot rules, ordering constraints, fatigue cost, required/restricted equipment, audience/experience gates, contraindication tags, cue/checklist refs, reviewer/approval/provenance.

### Exercise capability

Extend the canonical exercise source with stable movement IDs, supported block types/gears, equipment capabilities, substitutions grouped by retained training intent, dose bounds by experience, prerequisite IDs, regression/progression edges, impact/balance/skill/fatigue attributes, exclusion tags and reviewed cue IDs. A substitution is valid only if its required intent/capability set matches—not merely the same muscle.

### Plan request and compiled plan

Request: goal, experience, minutes, days/context, equipment, preferences, passed prerequisites, exclusions/limitations, recent workload/recovery, locale. Compiled plan stores request/engine/content versions, blocks with allocated seconds, selected exercise/source versions, set/rep/time/rest/tempo, substitution choices, rationales, safety notes and deterministic seed/tie-break data.

### Movement observation

`observationId`, source (`self_report|ohsa_manual|movenet_rule`), view, side, severity, confidence/quality, measured/evidence refs, occurredAt, rule/model version, reviewer status. Observations restrict eligibility or select reviewed cues; they do not infer pathology.

## Deterministic assembly algorithm

1. Validate request; reject impossible/unsafe combinations and preserve explicit user exclusions.
2. Resolve capability snapshot and eligible exercises using equipment, experience, prerequisite, approval and limitation gates.
3. Select a template matching available time. Reserve transition/rest time, not just work time.
4. Allocate block seconds within declared bounds. If the minimum cannot fit, return a shorter supported template—never truncate safety/warm-up invisibly.
5. Enforce ordering DAG: warm-up/preparation before skill/power; high-skill and power before fatigue; cooldown last when present.
6. Fill slots to satisfy movement-pattern/plane/goal coverage, recovery conflicts and weekly volume constraints.
7. Select gear/dose from bounded rules. The legacy gears become IDs with explicit tempo, rep/set/rest ranges and eligibility.
8. Resolve equipment substitutions by capability equivalence and recompute dose/time.
9. Attach cue IDs and applicable non-diagnostic observations through the shared library.
10. Validate compiled invariants; persist engine/content versions and rationale. Same normalized input + same versions + same seed yields the same plan.

## Time and failure policy

Use seconds internally. Include setup, transitions and rest. Define tolerance (for example owner-approved ±5%, not assumed here). If no safe plan fits, return typed `NO_ELIGIBLE_TEMPLATE`, `INSUFFICIENT_EQUIPMENT`, or `PREREQUISITE_NOT_MET` with safe alternatives; never fill gaps with arbitrary exercises.

## API impact

Version fields are added compatibly to existing:

* `GET /api/me/generated-workout-plan`
* `GET /api/me/generated-workout-progression`
* `GET /api/me/training-adaptation`
* progression evaluate/accept endpoints
* generated-workout execution create/update/complete endpoints
* `POST /api/programs` and current program endpoints where they consume generated sessions

Any future “preview plan” endpoint must use current auth/membership/rate limits, return the same compiled schema as delivery, and have no side effects. Exercise index/detail APIs expose only approved runtime metadata.

## Testing

* JSON Schema validation, canonical ID/FK, cycle detection and generated artifact parity/fingerprint tests.
* Golden templates for 15/30/45/60/90 minutes, multiple goals/equipment/experience levels.
* Property tests: total time bound, ordering DAG, no excluded/unapproved exercise, prerequisite closure, deterministic output, valid dose and substitution intent.
* Pairwise coverage for gear × goal × experience × equipment; weekly recovery/volume boundary tests.
* OHSA observation tests: missing/low confidence, side/severity, non-diagnostic output and safe fallback.
* API auth/validation/version compatibility and execution round-trip tests.
* Existing `test/generated-workout-delivery.test.js`, progression, training-adaptation, plan-builder, metadata, form and session suites remain regression gates.
* Human review fixtures prove normalized rules match approved source meaning; generated review workspace remains mandatory.

## Acceptance criteria

1. No runtime dependency or import from `public/new/` and no alternate service.
2. Every plan validates, meets its declared time tolerance and ordering constraints, and cites content/engine versions.
3. Same input/version/seed is reproducible; every selection has machine-readable rationale.
4. Equipment substitutions retain declared intent and valid dose; exclusions/prerequisites are never bypassed.
5. Movement observations cannot become diagnoses and cannot create unsupported form findings.
6. Feature-off responses remain byte/contract compatible where required and the entire existing test suite passes.
7. Trainer review approves normalized blocks, movement vocabulary, dose bounds, substitutions and cues before publication.

## Rollout and rollback

Deploy schemas/compiler first, then shadow-generate beside current plans and compare validity/time/coverage. Enable internal reviewer previews, then a small cohort behind `ENABLE_WORKOUT_BLOCK_ENGINE`. Store engine version per plan so in-progress sessions remain replayable. Roll back by disabling new generation while continuing to render/complete already-issued versioned plans; never reinterpret an old plan under new rules.
