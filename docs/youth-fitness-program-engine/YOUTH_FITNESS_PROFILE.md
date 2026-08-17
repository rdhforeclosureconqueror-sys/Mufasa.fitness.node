# Phase 3 — Youth Fitness Profile

## Purpose and boundary

`YouthFitnessProfile` is the canonical, normalized state the future Program Planner consumes. Phase 3 validates profile state only: it does not call AI or create a program, workout, session, Pocket PT UI, persistence schema, safety-veto engine, or Leader Within integration.

## Identity boundary

The profile stores an opaque `participant_ref`, not another participant master. The resolver accepts that reference only through trusted server options. Browser input can request a create/update, but an authenticated server handler must authorize the Pocket PT subject and resolve its opaque reference before calling the resolver; a submitted `input.participant_ref` is never authoritative. Production resolution, guardian/coach authorization, consent, persistence, retention, and migration remain deferred.

## Canonical fields

The version 1 object contains `profile_id`, `participant_ref`, `age`, `age_band`, `goals`, `training_experience`, `training_level`, `program_context`, `schedule`, `equipment`, `assessment_profile`, `movement_needs`, `readiness`, `recent_training_summary`, `consistency`, `safety_flags`, `warnings`, `profile_status`, and `version`.

## Validation and policy

- **Age:** only integer numbers 10–17 are supported; input is never coerced. Ages 10–12 resolve to `10_12`, 13–15 to `13_15`, and 16–17 to `16_17`. Bands affect future presentation, not competency level.
- **Goals:** one or more controlled goals are required. The goal enum supports general fitness, strength, endurance, movement, coordination, mobility, athleticism, general sport preparation, and consistency. Unknown goals—including weight-loss, appearance, punishment, maximal-strength, bodybuilding, and powerlifting goals—fail closed. Duplicate recognized goals are normalized in first-seen order. Goals may influence future emphasis but never override balanced safety.
- **Experience and level:** experience is `NEW`, `BEGINNER`, `SOME_EXPERIENCE`, or `EXPERIENCED`. `NEW` and `BEGINNER` resolve to `FOUNDATION`. Without explicit competency evidence, every experience and age defaults to `FOUNDATION`; therefore an inexperienced 17-year-old remains Foundation. A recognized but unsupported requested advancement is conservatively downgraded with `TRAINING_LEVEL_DOWNGRADED`; an unknown level is rejected. Age alone never establishes advancement.
- **Program context:** `GENERAL_YOUTH_FITNESS` (default), `LEADER_WITHIN_MOVEMENT_SUPPORT`, and `SPORT_PREPARATION_GENERAL` are recognized labels. They do not implement Leader Within or sport-specific planning.
- **Schedule:** the conservative program-policy default is three 45-minute sessions. Phase 3 accepts one, two, or three sessions per week and 20–60 whole minutes; one supports documented low-frequency participation. More than three is rejected in V1. Preferred days are optional strings. These bounds are policy, not a claim that every youth must train exactly three times.
- **Equipment:** values come from the Phase 2 enum. Missing or empty equipment defaults to `BODYWEIGHT`; unknown values fail closed. Foundation does not require advanced equipment.
- **Assessment placeholder:** defaults to `baseline_completed: false`, empty fitness tests and movement observations, and no assessment date. It creates neither a global score nor diagnostic interpretation.
- **Movement needs:** controlled development categories cover ankle, hip, thoracic/shoulder, trunk, lower-extremity and landing control, plus general movement skill. Free-text anatomy and diagnostic labels are rejected rather than interpreted or sanitized.
- **Readiness:** energy 1–5, `NONE|MILD|SIGNIFICANT` soreness, `GOOD|FAIR|POOR` sleep quality, and boolean pain are stored. This snapshot is not medical screening and makes no diagnosis. Reported pain retains the profile but adds `PAIN_REPORTED_REQUIRES_COACH_REVIEW` and sets coach-review status.
- **Recent training placeholder:** stores an optional last-session time, controlled stress tags, a high-impact boolean, and a non-negative seven-day session count. It provides no session generation or training-memory engine.
- **Consistency:** eligible scheduled, eligible completed, and excluded counts must be non-negative integers; completed cannot exceed scheduled. Percentage is rounded to a whole number, returns `null` when scheduled is zero, and excludes the separate excluded count. It uses no failure, shame, or moral label.

## Status policy and fail-closed result

Statuses are `DRAFT`, `NEEDS_REQUIRED_FIELDS`, `READY_FOR_PROGRAM_PLANNING`, `COACH_REVIEW_REQUIRED`, and `UNSUPPORTED`. A valid minimal profile is ready; reported pain requires coach review; an unsupported age is unsupported. Missing or invalid required input returns `{ ok: false, error, message, field, profile_status }`, normally with `NEEDS_REQUIRED_FIELDS`. Successful resolution returns `{ ok: true, profile }`. No user-facing validation error escapes as an unhandled raw exception.

## Next phase

Phase 4 — Program Planner may consume only a successfully resolved canonical profile plus the existing evidence/rule and approved-activity authorities. Phase 3 does not silently begin that work.
