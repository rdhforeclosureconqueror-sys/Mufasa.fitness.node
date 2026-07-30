# Gamification Event Model

## 1. Purpose

An event is an immutable, minimal, server-authored fact that an authoritative current-platform workflow has already accepted. Events describe behavior; they never contain reward values or assert that an achievement was earned.

## 2. Canonical envelope

```json
{
  "eventId": "evt_01...",
  "eventType": "workout.completed",
  "schemaVersion": 1,
  "occurredAt": "2026-07-30T18:04:12.000Z",
  "recordedAt": "2026-07-30T18:04:12.120Z",
  "actorUserId": "user_123",
  "subjectUserId": "user_123",
  "source": "session-service",
  "sourceEntity": { "type": "session", "id": "session_456", "version": 3 },
  "idempotencyKey": "workout.completed:session_456",
  "correlationId": "req_789",
  "causationEventId": null,
  "verification": { "status": "verified", "method": "authoritative-write", "riskFlags": [] },
  "payload": { "durationBand": "20_to_44_min", "completionMode": "guided" }
}
```

Required fields are immutable. `occurredAt` is the domain occurrence time; `recordedAt` is receipt time. The server derives user identity from auth/domain records. Events allow-list payload keys, bound strings/numbers, reject non-finite values, and contain no XP/points, exact GPS, auth token, health narrative, meal text, contact data, or public display name.

## 3. Event catalogue

All types start at schema version 1. “Reward signal” is input to policy; it is not guaranteed value.

| Event type | Authoritative trigger and safe payload | Idempotency key | Healthy reward signal / controls |
|---|---|---|---|
| `workout.started` | Persisted session start; mode, planned category | `workout.started:<sessionId>` | Analytics/participation only; no XP initially to deter abandoned starts. |
| `workout.completed` | Session transitions once to completed; duration band, exercise count band, generated flag | `workout.completed:<sessionId>` | Base completion XP; daily cap; minimum credible duration/action. |
| `workout.technique_feedback_completed` | Approved form-learning flow completed; exercise ID, feedback category, evidence level | `technique.feedback:<sessionId>:<exerciseId>:<revision>` | Learning/technique, not perfect scores or training through pain. |
| `generated_workout.completed` | Active generated workout committed complete; plan/week/day IDs | `generated.completed:<planId>:<dayId>` | Same completion pool as workout to prevent double base XP; may progress separate milestone. |
| `workout.personal_best_recorded` | Service confirms comparable prior history; metric type and percentage-improvement band | `workout.pb:<sessionId>:<metric>` | Capped improvement bonus; exclude unsafe/implausible jumps and raw maximum chasing. |
| `habit.day_qualified` | Derived once from eligible events for a streak definition/local date | `habit.day:<definitionVersion>:<userId>:<localDate>` | Drives streak; derived events grant no base points unless explicitly designed. |
| `streak.milestone_reached` | Streak projector crosses configured milestone | `streak.milestone:<definitionVersion>:<userId>:<count>` | Milestone award only; no repeated processing reward. |
| `walking.activity_completed` | Walking service accepts completed activity; distance/duration bands, source confidence | `walking.completed:<activityId>` | Moderate capped distance/participation; minimum movement plausibility. |
| `walking.distance_milestone_reached` | Lifetime verified walking distance crosses threshold | `walking.distance:<definitionVersion>:<userId>:<threshold>` | One-time milestone; never per-step unbounded XP. |
| `running.activity_completed` | Current run/run-club record accepted; distance/duration bands, club boolean | `running.completed:<activityId>` | Capped participation; pace does not determine base reward. |
| `running.distance_milestone_reached` | Lifetime verified running distance threshold crossed | `running.distance:<definitionVersion>:<userId>:<threshold>` | One-time safe-distance progression. |
| `trail.activity_completed` | Trail activity saved complete; canonical trail ID, distance band, completion confidence | `trail.completed:<activityId>` | Trail participation/diversity; no precise coordinates. |
| `trail.unique_completed` | First verified completion of canonical trail | `trail.unique:<userId>:<trailId>` | Discovery milestone; canonical IDs prevent aliases. |
| `run_club.participated` | Scheduled club activity attendance accepted; activity ID | `runclub.participated:<activityId>:<userId>` | Community participation, capped per event/day; ranking irrelevant. |
| `pushup_challenge.participated` | Deduplicated challenge result accepted; challenge/variant, verification status | `pushup.participated:<submissionId>:<userId>` | Participation XP; no reward proportional to unlimited reps. |
| `pushup.personal_best_recorded` | Comparable verified result improves safely; improvement band | `pushup.pb:<submissionId>:<metric>` | Capped PR/milestone reward; cooldown and anomaly review. |
| `nutrition.entry_logged` | Nutrition entry persisted; meal category only | `nutrition.logged:<entryId>` | Small/capped consistency signal; no calories/macros copied. |
| `nutrition.calories_logged_day` | Daily journal reaches product-defined completeness, not calorie target | `nutrition.calories-day:<userId>:<localDate>:<policyVersion>` | Logging completeness only; never rewards low intake/deficit. |
| `nutrition.protein_goal_met` | Current service determines personalized approved goal met; local date | `nutrition.protein:<userId>:<localDate>:<goalVersion>` | Once/day and bounded; contraindication/goal-policy eligibility. |
| `nutrition.water_goal_met` | Approved hydration goal met; local date | `nutrition.water:<userId>:<localDate>:<goalVersion>` | Once/day; maximum logged water is never rewarded. |
| `nutrition.mission_completed` | Weekly mission commits complete; mission ID/category | `nutrition.mission:<userId>:<missionInstanceId>` | Education/balanced habit; prevent overlap double reward. |
| `checkin.completed` | Check-in record committed; check-in type, completeness boolean | `checkin.completed:<checkinId>` | Consistency/reflective habit; answers excluded. |
| `bodyweight.updated` | Authenticated valid update committed; source/confidence, no weight value | `bodyweight.updated:<measurementId>` | Logging consistency with weekly cap; never direction/magnitude of change. |
| `assessment.completed` | Assessment committed with required sections; assessment type/version | `assessment.completed:<assessmentId>` | Learning/baseline participation; result/medical answers excluded. |
| `challenge.joined` | User explicitly joins a current-platform challenge instance | `challenge.joined:<challengeId>:<userId>` | Usually zero or small one-time participation; completion is separate. |
| `challenge.completed` | Challenge service accepts completion | `challenge.completed:<challengeInstanceId>:<userId>` | Safe criteria and fixed reward; no extreme-volume multiplier. |
| `community.encouragement_given` | Moderated supported interaction accepted | `community.encouragement:<interactionId>` | Low daily-capped community credit; exclude self/blocked/spam. |
| `referral.qualified` | Server confirms referred member's required consent and qualifying non-financial milestone | `referral.qualified:<referralId>:<policyVersion>` | One-time capped points; no contact data, self-referral, or client assertion. |
| `profile.completed` | Required non-sensitive profile fields transition incomplete→complete | `profile.completed:<userId>:<requirementsVersion>` | One-time onboarding reward; sensitive fields never required solely for XP. |
| `login.daily_authenticated` | First authenticated active app use on local day, not token refresh | `login.daily:<userId>:<localDate>` | Very small/capped; cannot maintain core activity streak alone. |
| `yoga.session_completed` | **Reserved:** future current-platform yoga service accepts safe session | `yoga.completed:<sessionId>` | Inactive until Phase 3; participation/learning, not flexibility extremes. |
| `yoga.technique_milestone` | **Reserved:** approved future evidence crosses learning milestone | `yoga.technique:<sessionId>:<skill>:<thresholdVersion>` | Coach-reviewed criteria and confidence gate. |
| `gymnastics.skill_milestone` | **Reserved:** qualified future workflow verifies prerequisite-safe mastery | `gymnastics.skill:<assessmentId>:<skillId>:<level>` | No award for self-asserted advanced skills; coach/equipment/safety gates. |

## 4. Versioning and compatibility

`eventType + schemaVersion` defines a permanent contract. Never change the meaning, units, required fields, or enum semantics in place. Add optional fields only when old consumers safely ignore them; otherwise publish version 2 and retain the v1 decoder. Definition versions declare which event schemas they accept. Upcasters are pure, tested views and never rewrite stored events. Unknown future types/versions are quarantined, not guessed.

## 5. Event flow through the reward engine

1. **Authenticate/authorize:** the existing route resolves the current user and validates the request.
2. **Commit domain action:** the current service writes the workout/activity/nutrition/etc. result.
3. **Construct fact:** a server-side adapter maps the committed entity into the minimal event envelope and deterministic key.
4. **Persist/deduplicate:** validator checks schema/limits; event store atomically appends or returns the existing ID.
5. **Dispatch by cursor:** evaluator claims the next event. Retries resume from durable state; processing is at least once and effects are idempotent.
6. **Verify eligibility:** reject/quarantine unverified, impossible, reversed, disallowed, or ineligible facts; apply source trust and risk flags.
7. **Select definitions:** use only published policies/rules whose effective interval contains `occurredAt` and whose accepted schema includes the event.
8. **Update aggregates:** deterministically update counts, sums, distinct sets, milestones, and local-day streak projections.
9. **Append outcomes:** write XP/point ledger entries and award/revocation records with unique effect keys such as `<eventId>:<policyVersion>:<effect>`.
10. **Project:** recompute balance, level, title eligibility, achievement progress, season stats, and leaderboard eligibility.
11. **Notify:** enqueue a deduplicated optional unlock notification after persistence; frontend receipt is not evidence of award.
12. **Observe/reconcile:** record safe metrics. Scheduled reconciliation compares committed source entities, event counts, cursor lag, and projection checksum.

## 6. Derived events and loops

Derived events identify `causationEventId`, are produced only by named projectors, and cannot match policies intended for source events unless explicitly allowed. A dependency graph is validated acyclic at definition publication. For example, `workout.completed` may qualify `habit.day_qualified`, which may cause `streak.milestone_reached`; the milestone cannot generate another eligible habit day.

## 7. Late, corrected, and deleted domain data

Late events retain true `occurredAt` and can replay affected projections within a bounded window. A timezone history selects the zone effective on occurrence; absent history uses recorded account timezone, then UTC, with provenance. Domain corrections emit `source.corrected`/`source.invalidated` internal facts referencing the original. The engine appends reversals/revocations and replays impacted projections. It never mutates the original event.

## 8. Verification and anti-abuse

Verification statuses: `verified`, `provisional`, `rejected`, `revoked`. Methods include `authoritative-write`, `device-assisted`, `provider-verified`, `moderator-approved`, and `derived`. Reward policies state permitted methods. Rate/distance/duration/rep bounds, daily source caps, duplicate entity IDs, cooldowns, historical plausibility, self-referral detection, and anomaly scoring can hold value as provisional. A hold is neutral and appealable; it must not label a user publicly.

## 9. Event store schema

| Field | Constraint |
|---|---|
| `eventId` | Globally unique, opaque, immutable. |
| `eventType`, `schemaVersion` | Registered pair. |
| `occurredAt`, `recordedAt` | ISO timestamps; bounded future skew. |
| `actorUserId`, `subjectUserId` | Internal IDs; actor may differ only for approved service/admin flows. |
| `source`, `sourceEntity` | Registered source and bounded stable entity reference. |
| `idempotencyKey` | Unique within subject; deterministic, max length, no secrets. |
| `verification` | Status/method/risk codes from enums. |
| `payload` | Type-specific allow-list and size ceiling. |
| `correlationId`, `causationEventId` | Optional traceability; no cyclic causation. |

## 10. Acceptance tests per event

Every event adapter must prove: authoritative success produces exactly one event; failed/no-op writes produce none; retry produces no duplicate; actor/subject cannot be forged; payload contains only allow-listed safe data; boundary values validate; reversal is traceable; evaluation outage does not fail the domain response; and replay yields the same outcomes.
