# Phase 6 — Final Safety Validator

## Purpose and boundary

The Final Safety Validator is the deterministic, fail-closed last veto between a Phase 5 session blueprint and any future Pocket PT delivery path. It does not repair a session, select replacement activities, diagnose a participant, call AI, persist data, render UI, or integrate with Leader Within. It reports a safe decision and required action; a caller must not deliver a `BLOCK`, `REGENERATE`, or `REGRESS_OR_REDUCE` result.

## Input

`validateYouthFitnessSessionSafety(profile, program, sessionBlueprint, options)` consumes the resolved Phase 3 profile, validated Phase 4 program, Phase 5 blueprint, and optional deterministic context. Standalone JSON is not trusted. Participant, profile, program, week, session code, age band, and training level are reconciled across all three aggregates. `planAndValidateYouthFitnessSession` is an optional plan-then-validate helper; the validator remains independently callable.

## Output and rule-result model

The result contains `ok`, `status`, `decision`, safe `errors` and `warnings`, `coach_review_required`, `required_actions`, `blocked_reasons`, `rule_results`, `validated_at`, and `validator_version` 1. Statuses are `SAFE_TO_DELIVER`, `SAFE_WITH_WARNINGS`, `COACH_REVIEW_REQUIRED`, `BLOCKED_UNSAFE`, `INVALID_SESSION`, and `REGENERATE_REQUIRED`. Decisions are `ALLOW`, `ALLOW_WITH_WARNINGS`, `REQUIRE_COACH_REVIEW`, `BLOCK`, `REGENERATE`, and `REGRESS_OR_REDUCE`. `ok` means no hard rule failed; it does not erase coach review.

Each rule records `rule_id`, `name`, `status` (`PASS`, `WARN`, `FAIL`, or `NOT_APPLICABLE`), `severity` (`HARD`, `WARNING`, or `INFO`), safe `message`, and `evidence_class`. Phase 6 uses `CONSERVATIVE_PROGRAM_POLICY`, not scientific certainty. Every hard failure prevents `ALLOW`; callers receive stable codes, never stack traces.

## Fail-closed validation categories

### Identity, structure, registry, equipment, and level

Missing or incoherent profile/program/session identity, unsupported ages 10–17, unknown bands/levels, and orphan weeks/slots fail closed. Every item must have a canonical ID, match the Phase 2 registry, be active/available and administrator approved, and retain canonical metadata. Free-text and marked AI-generated activities are rejected. Registry equipment must occur in the profile list; no substitution is silent. Minimum activity level cannot exceed profile level. Age never promotes level.

### Prohibited prescriptions and prescription bounds

Actual output is checked for 1RM testing, maximal lifting/barbell squats, forced repetitions/technical failure, power cleans, snatches, bench-press testing, powerlifting/bodybuilding programs, punishment running/push-ups/burpees, vomiting/collapse challenges, push-through-pain or destructive effort language, weight-loss competitions/calorie compensation, dehydration, and arbitrary water loading. Clearly negated educational prohibitions are not treated as prescriptions.

Phase 5 bounds are rechecked: one or two sets, at most 12 repetitions, bounded timed work, 30–90 seconds rest, and a technical-quality stop rule. Missing or malformed values require regeneration or regression/reduction rather than silent correction.

### Pain/readiness and recent stress/impact

Pain requires an explicit flag, non-diagnostic adult/coach note, and `COACH_REVIEW_REQUIRED`; no diagnosis, treatment, or promise to fix pain is produced. Poor sleep plus low energy warns without documented workload reduction. Significant soreness requires review without reduction. Recent impact checking is conservative workload management, not injury prediction: repeated moderate/high impact warns, while high jump volume under severe fatigue fails.

### Instruction completeness and claims/language

Activities require registry name/classification, setup/instructions, two to four cues, common errors, stop conditions, quality rule, and evidence/rule provenance. The validator detects medical diagnosis/treatment, injury prediction/universal prevention, guaranteed weight loss, calorie compensation, moralizing/shaming, punishment, “no pain no gain,” and destructive challenge language. Explicitly negated educational mentions remain allowed.

## Safe error codes and system boundary

Codes include `safety_profile_missing`, `safety_program_missing`, `safety_session_missing`, `safety_reference_mismatch`, `safety_unsupported_age`, `safety_invalid_training_level`, registry approval/availability/unknown codes, `safety_equipment_unavailable`, `safety_training_level_exceeded`, `safety_prohibited_prescription`, `safety_prescription_out_of_bounds`, `safety_stop_rule_missing`, `safety_instruction_missing`, `safety_pain_requires_review`, `safety_recent_impact_conflict`, claims/language codes, `safety_ai_generated_activity_detected`, and `safety_validation_incomplete`.

Validation is read-only: no profile, program, or blueprint mutation; network/AI call; persistence; browser/UI side effect; or Leader Within dependency. Phase 5 local validation remains defense in depth; Phase 6 is the cross-aggregate final delivery decision.

## Not in Phase 6 and next phase

Phase 6 adds no UI/API delivery, persistence/migration, adaptation engine, long-term memory decision, assessment execution, coach override UI, gamification, or Leader Within bridge. Next is **Phase 7 — Progression, Regression & Adaptation**, as a separate reviewed phase.
