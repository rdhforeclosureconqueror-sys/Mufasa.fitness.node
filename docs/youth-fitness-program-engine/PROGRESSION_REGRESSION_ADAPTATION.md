# Phase 7 — Progression, Regression & Adaptation

## Purpose and boundaries

Phase 7 adds a deterministic, read-only decision layer after a program-bound session result. It adapts the next execution while keeping the Phase 4 roadmap stable by default. It does not render UI, persist results, execute assessments, integrate Leader Within, call AI, invent activities, or declare an adjusted blueprint safe. Phase 6 remains the final delivery veto.

## Canonical input and verification

`adaptYouthFitnessProgression(profile, program, sessionBlueprint, sessionResult, options)` requires a canonical Phase 3 profile, validated Phase 4 program, valid Phase 5 blueprint, canonical completion result, and Phase 6 result. When a Phase 6 result is not supplied, the engine reruns the validator. Profile, program, blueprint, week, session, and opaque participant references must agree, and the session must belong to the program. Standalone browser completion JSON is not trusted.

Options may supply validated recent session results, a recent-training summary, a minimum qualifying-session threshold of at least two, and deterministic Phase 6 options. Inputs are never mutated.

## Completion result, statuses, and qualities

The version 1 `SessionResult` records `YFSR-*` identity, blueprint/program/profile and participant references, week/code, status, quality, completed/skipped blocks, effort, post-session energy/soreness/pain, technique, reflection, coach notes, safety flags, completion time, and version.

Statuses are `COMPLETED`, `PARTIAL`, `SKIPPED`, `STOPPED_EARLY`, `BLOCKED_BY_SAFETY`, and `COACH_REVIEW_REQUIRED`. Qualities are `SUCCESSFUL`, `SUCCESSFUL_WITH_WARNINGS`, `TOO_EASY`, `TOO_HARD`, `FORM_BREAKDOWN`, `PAIN_REPORTED`, `FATIGUE_LIMITED`, `INCOMPLETE`, and `NOT_ASSESSED`. Unknown values fail closed. A safety-blocked result cannot claim successful quality, and a pain-related early stop requires an explicit coach-review safety flag. Skipping is neutral.

## Decision and output model

Exactly one primary decision is returned: `MAINTAIN`, `PROGRESS_ONE_VARIABLE`, `REGRESS`, `REDUCE_VOLUME`, `REDUCE_IMPACT`, `REPEAT_OBJECTIVE`, `SUBSTITUTE_LOWER_STRESS_ACTIVITY`, `REQUIRE_COACH_REVIEW`, `BLOCK_UNTIL_REVIEW`, `NO_CHANGE_SKIPPED_SESSION`, `DELAY_REASSESSMENT`, or `READY_FOR_REASSESSMENT`. Output contains auditable reason codes, adjustments, progression/regression metadata, safety flags, coach-review state, participant message, coach notes, rules applied, roadmap-change state, the unconditional Phase 6 revalidation requirement, and version.

## Progression and qualifying success

Progression requires at least two qualifying successful sessions, Phase 6 allowance, no pain, controlled/acceptable technique, non-excessive effort, and acceptable readiness/stress. A qualifying result is completed with `SUCCESSFUL`, policy-permitted `SUCCESSFUL_WITH_WARNINGS`, or `TOO_EASY`; it has no pain or review flag, controlled/acceptable technique, no too-hard effort, and no Phase 6 block/review/regress result. Skipped, incomplete, safety-blocked, pain, form-breakdown, and too-hard results never qualify.

Only one main variable changes. The engine prefers an eligible approved registry progression; without one it makes the small deterministic volume change of one repetition. It never invents a relationship, and youth V1 never progresses intensity and impact together.

## Regression, maintain, skipped, and readiness policies

Regression is normal, neutral, and non-shaming. Form breakdown uses an equipment- and level-eligible approved regression when available; otherwise the objective repeats. Fatigue, too-hard effort, low energy, poor sleep with low energy, or significant soreness prevents progression and reduces volume/increases rest. Repeated difficulty may flag coach review. Maintaining is the conservative default when a safe completion has not reached the qualifying threshold.

A skipped session produces `NO_CHANGE_SKIPPED_SESSION`, does not qualify, regress, moralize, or create a punishment/make-up workout. Recent high impact or repeated impact stress produces workload-management `REDUCE_IMPACT`; it does not predict injury.

## Pain policy

Pain prevents automatic progression and routes to supervising-adult/coach review. It does not diagnose, prescribe treatment, claim an exercise fixes pain, or advise pushing through pain. A Phase 6 failure blocks until review; roadmap change is considered only for that safety condition.

## Approved activity paths

Progression and regression relations come only from Phase 2 approved registry records. Candidate approval, availability, participant equipment, and minimum training level are verified. Foundation cannot receive an above-level activity. If no eligible approved relation exists, the engine maintains or changes volume/repeats the objective rather than inventing one.

## Next-session adjustments and safety revalidation

Every adjustment has a canonical type; session/block/activity target; nullable set, rep, duration, rest, and substitution changes; reason code; and `requires_safety_revalidation: true`. Adjustments are instructions, not delivered blueprints. Any resulting future blueprint **must pass the independently callable Phase 6 Final Safety Validator before delivery**; Phase 7 never marks it safe.

## Language and traceability

Participant messages recognize steady practice, frame regression as support for control/confidence, treat skipped sessions neutrally, and route pain to an adult. Shaming, punishment, destructive effort, diagnosis, and “push through pain” language are prohibited. Applied Phase 1 rules include pain override (`YT-R-002`), one-variable progression (`YT-R-006`), repeated qualifying success (`YT-R-007`), neutral regression (`YT-R-008`), non-medical readiness (`YT-R-009`), and fail-closed safety (`YT-R-015`). Adaptation thresholds are labeled `CONSERVATIVE_PROGRAM_POLICY`, not invented evidence.

## What Phase 7 does not do and next phase

Phase 7 adds no Pocket PT UI/API, completion collection, production persistence/migration, coach override interface, long-term analytics, assessment/reassessment execution, notification, gamification, AI, random workout generation, or Leader Within bridge. **Next: Phase 8 — Pocket PT Youth Program UI.**
