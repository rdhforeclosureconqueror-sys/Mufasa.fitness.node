# MUFASA PHASE D — AUTHORITATIVE HISTORICAL FORM FINDINGS

## Role
Independent reviewer. Do not merge during review. Return GO or CHANGES REQUIRED with exact repo evidence.

## Baseline
Built from current `main` after Phase C PR #697 merged with corrective PR #698 underneath it.

## Goal
Allow Mufasa to truthfully recall prior camera/form findings only when the approved workout form engine actually produced deterministic evidence and that evidence was persisted with the authenticated workout record.

## Canonical path
1. `public/workout-form-runtime.js` performs approved post-set analysis.
2. Only `analysisStatus=completed` observations with `status=needs_attention` are projected into minimized findings.
3. Findings are held only for the current workout in `__POCKETPT_FORM_FINDINGS_CURRENT_WORKOUT__`, capped at 24.
4. `public/dashboard-runtime.js` adds those findings to the existing authenticated `POST /api/workouts/track` completion payload.
5. `validateWorkoutTracking()` validates and strips the payload down to the allowed finding schema.
6. Existing `userDataService.appendWorkoutTracking()` persists the validated tracking object in the member's canonical workout history.
7. `coachContextService` exposes a bounded `formHistory` projection to Mufasa.

## Stored finding schema
- exerciseId
- setIndex
- ruleId
- status (`needs_attention` only)
- affectedFramePercentage
- maximumConsecutiveDurationMs
- confidence
- recordedAt (supporting metadata)
- source (`workout_form_runtime`)

The canonical workout record timestamp remains the authoritative historical ordering/time source.

## Explicitly forbidden
- raw pose packets/keypoints
- image frames
- video/audio URLs or recordings
- free-form LLM-created form findings
- converting a low formScore into a specific historical fault
- storing `good` observations as problems
- treating unsupported/insufficient analysis as a finding

## Review requirements
1. Verify only approved completed form analysis can enter historical findings.
2. Verify only `needs_attention` observations are published/persisted.
3. Verify in-memory findings are bounded and cleared only after authenticated workout persistence succeeds.
4. Verify a failed `/api/workouts/track` call does not erase pending findings before retry.
5. Verify the server validator strips arbitrary fields and rejects non-`needs_attention` status.
6. Verify `appendWorkoutTracking()` stores validated `formFindings` through the existing canonical workout history rather than a new database/store.
7. Verify `coachContextService.formHistory` is bounded, current-user-only, and contains no raw camera media.
8. Verify an ordinary workout without camera/form evidence produces an empty form history rather than invented faults.
9. Verify Phase C journey context, recent workout/reps, recovery, program, gamification, yoga and challenge context still work.
10. Run `node --test test/mufasa-phase-d-historical-form-findings.test.js`, relevant workout-form/retention/AI-coach suites, then the full repository suite.

## GO criteria
GO only if Mufasa can reference a prior specific form issue solely from canonical persisted deterministic evidence and no raw camera data or second form-memory authority is introduced.

## Known boundary
The exact natural-language label Mufasa uses is still based on the deterministic exercise/rule IDs and existing exercise intelligence. If a reviewer finds a rule ID that is not understandable enough for member-facing explanation, recommend a deterministic metadata label projection rather than allowing the LLM to invent the meaning.

## Next phase after GO
Phase E — identify and expose the canonical last-run/GPS summary. Do not infer a run from generic activity distance.