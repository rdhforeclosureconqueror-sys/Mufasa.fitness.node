# First Reward and Gamification Acceptance

Policy `1.0.0` makes `workout.completed` the simplest first reward journey: a clean member completes one authoritatively persisted workout, receives 100 base XP, qualifies for `achievement.workout.1_completed` (“1 Workout”), receives its 50 lifetime-XP achievement reward and `badge.workout.1_completed`, and crosses the level-2 threshold of 100 XP. The presentation layer can queue XP, level, achievement, and badge celebrations. Event/source idempotency and one-time achievement semantics prevent replay duplication.

Yoga completion produces 75 XP. Active policy has no diet, program-start, week, mesocycle, deload, program-completion, or program-milestone action. Those events must not be described as rewarding. Canonical details and launch test instructions are in `data/launch/reward-trigger-matrix.v1.json`; registered and intentionally non-rewarding events are in `data/launch/gamification-event-matrix.v1.json`.

