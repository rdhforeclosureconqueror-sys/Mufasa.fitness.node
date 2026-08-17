# Phase 4 — Program Planner

## Purpose and program-first boundary

The deterministic Program Planner in `src/youth-fitness/planning/` creates a complete 8, 12, or 32-week `YouthFitnessProgram` roadmap before any activity is selected. It does not call AI, generate a workout, execute an assessment, or choose an exercise or game. Pocket PT remains the participant identity and future delivery/tracking authority; this fixture adds no duplicate identity, API, UI, persistence, or Leader Within behavior.

## Input

`planYouthFitnessProgram(profile, options)` consumes the canonical resolved Phase 3 profile. For a server-side convenience path, unresolved fields are passed through `resolveYouthFitnessProfile` and succeed only when the caller supplies a trusted `options.participantRef`; browser-supplied ownership is never authoritative. Options support `programLengthWeeks` (default 12), organization context, desired start date, and schedule preferences. Invalid ages, goals, schedules, levels, and identity fail closed at the profile boundary.

## Output model

The version 1 program records a deterministic program ID, opaque participant reference, profile ID, context, length, training level, controlled goals, lifecycle status, age-presentation metadata, balanced emphasis, phases, weeks, session slots, consistency expectation, education sequence, assessment schedule metadata, planner notes, carried safety flags, and a nullable creation timestamp. Generated programs remain `DRAFT`: neither baseline nor sessions start automatically, and coach-review profiles remain draft with a review note.

## Phases and weeks

- Eight and twelve-week programs use three phases: Foundation & Movement Confidence, Build Capacity, and Progress & Demonstrate. Their ranges are 1–3/4–6/7–8 and 1–4/5–8/9–12 respectively.
- Thirty-two-week programs use four eight-week development blocks, adding Progress & Skill Expansion and Demonstrate, Reassess & Continue.
- Every contiguous week belongs to exactly one phase and has objectives, scheduled minutes/count, a neutral consistency target, education assignment, optional reassessment marker, and session slots.

## Session slots are not workouts

A slot describes its program week, code, presentation name, minutes, focus, intended effort, required fitness domains, broad objectives, canonical movement-family targets, canonical activity-type targets, status, and notes. It contains no `exercise_id`, `game_id`, or `activity_id`. Phase 5 must use these constraints to select eligible Phase 2 approved activities and create executable sessions.

## Goal, level, and age effects

Goals add emphasis without removing `BALANCED_DEVELOPMENT`, movement competency, or recovery. Strength adds strength-endurance emphasis; endurance adds aerobic-capacity emphasis while retaining strength and mobility; movement goals add control/mobility; consistency adds low-barrier habit practice; and sport preparation remains general athletic development. Unsupported appearance, punishment, maximal-strength, bodybuilding, powerlifting, and weight-loss goals fail at the canonical profile boundary.

Training level is copied from the resolved profile. Foundation emphasizes learning, confidence, control, balanced muscular fitness, coordination, recovery, and consistency. Development and Progression can carry their already-evidenced level into the roadmap, but advanced dose, resistance selection, and competency-driven progression remain deferred to later planners. Age affects only presentation: exploration/game framing for 10–12, structured development for 13–15, and mature training framing for 16–17. It never upgrades competency.

## Consistency and education

Every program records scheduled sessions, a conservative minimum success target no greater than two, `eligible_completed / eligible_scheduled`, approved-exclusion handling, and a `non_shaming` language policy. Missed sessions receive no moral label.

Ten short lessons rotate across the program: technique before speed, consistency over extreme effort, recovery, sleep, water, gradual progress, balanced fitness, comparison with personal prior performance, harder not always being better, and stopping when form breaks. Each assigned message is inspected with the Phase 1 presentation-claims policy. This is controlled education text, not a diagnosis or promised result.

## Assessment schedule metadata

Eight weeks carries baseline/week 4/week 8 markers; twelve weeks carries baseline/week 4/week 8/week 12; thirty-two weeks carries baseline and eight-week block checkpoints. Phase 4 records metadata only and explicitly says execution is false. It also records the principle that aerobic test protocols must remain stable during a comparison cycle. Assessment protocol selection, baseline execution, interpretation, and reassessment execution remain deferred.

## Safety flags and validation

Profile safety flags are preserved. Missing baseline and bodyweight-only equipment add transparent planning flags. Reported pain produces a draft roadmap that cannot be represented as ready and retains the coach-review requirement; Phase 6 remains the independent final prescription safety veto.

Output validation rejects unsupported length, identity/profile omissions, unknown levels/goals/status, gaps or overlaps in phase coverage, non-contiguous/orphan weeks, missing or count-mismatched slots, unknown movement families or activity types, absent education/consistency/assessment metadata, missing safety flags, and any nested workout or specific activity identifier. Validation fails closed with a structured result.

## Not implemented and next phase

Phase 4 adds no executable session planner, activity selection, dosing, readiness adjustment, complete safety-veto engine, assessment execution, persistence/migrations, Pocket PT UI, coach editor, AI call, Leader Within bridge, or gamification. **Next: Phase 5 — Session Planner**, in a separate reviewed change.
