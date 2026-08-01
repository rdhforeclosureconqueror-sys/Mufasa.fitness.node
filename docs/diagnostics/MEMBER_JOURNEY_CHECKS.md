# Designated member journey checks

An operator with `ops.read_observability` designates one **existing** member through `PUT /api/admin/diagnostics/member-journey/designation`. Invalid or nonexistent IDs are rejected and do not create user records. Only the stored designation is inspected; ordinary report bodies cannot substitute arbitrary evidence. Responses contain a masked diagnostic reference, never the raw ID.

GET inspection is read-only and compares the user store, program projection, gamification projection, Greatness journey, and Push-Up member summary. It never saves, repairs, replays, or awards. Each step distinguishes `STEP_COMPLETED`, `MEMBER_HAS_NOT_COMPLETED`, `MEMBER_EVIDENCE_UNAVAILABLE`, and `STEP_OPTIONAL`, separately from platform capability. Zero workouts for a new member is an incomplete member step, not a backend defect.

Any state-producing acceptance fixture must be a separately approved workflow using normal member APIs; ordinary diagnostics never mutate the designated member.
