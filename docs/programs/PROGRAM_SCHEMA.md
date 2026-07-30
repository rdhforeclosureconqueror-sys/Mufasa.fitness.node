# Program Schema v1

Programs contain identity, author/content/generator versions, goals, difficulty, objectives, contraindications, equipment, weekly constraints, mesocycles, and microcycles. Mesocycles identify phases and deload weeks. Every microcycle contains seven dated typed sessions (`workout`, `yoga`, `mobility`, `active_recovery`, or `rest`). Workouts contain mobility warm-up/cool-down, completion requirements, and exercises with movement pattern, intent, emphasis, sets, reps, RPE, tempo, and progression decision.

Assignments persist only ownership, assignment/version/status timestamps, current week/phase, progression state, recorded substitutions, scheduled deloads, and the immutable program prescription. Analytics, today/tomorrow, upcoming sessions, milestones, and adherence are derived.

Session states are `scheduled`, `completed`, `partially_completed`, `missed`, `rescheduled`, and `abandoned`. Progress is allowed only after a prior authoritative completion of at least 90% without a pain flag. Otherwise the prescription is preserved. Substitutions must preserve pattern, intent, emphasis, equipment compatibility, and a difficulty ceiling.
