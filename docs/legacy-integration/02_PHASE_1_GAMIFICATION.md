# Phase 1 — Platform Gamification Blueprint

## Goal and non-goals

Build one auditable, event-driven system that can reward workouts, walking/trails/run-club activities, the push-up challenge, nutrition behavior, history and streaks. The four `FitnessMVP_*.csv` files are seeds, not production schemas or policy authority.

Non-goals: social currency, cash value, purchasable points, punitive streak loss, medical rewards, public leaderboards by default, or direct CSV reads at runtime.

## Preflight decisions

Product must approve point economy, badge text/art, timezone/day-boundary policy, backfill date, tier meaning, privacy/visibility, anti-abuse rules, minors policy, and whether points are informational or unlock anything. Engineering must verify current route/service drift before implementation.

## Current files affected

| Current area | Planned responsibility |
|---|---|
| `server.js` | Mount authenticated read APIs and internal event ingestion through current middleware/envelopes |
| `src/services/sessionService.js` | Emit session started/completed facts after committed state transitions |
| `src/services/generatedWorkoutService.js` and progression service | Emit generated-workout completion/progression facts |
| `src/services/steppingIntoGreatnessService.js` | Emit walking/trail/run-club facts after persisted activity completion |
| `src/services/challengeService.js` | Emit verified push-up challenge result facts |
| `src/services/nutritionService.js` | Emit nutrition mission/entry facts without rewarding sensitive nutrient values |
| `src/services/memberHomeService.js`, `src/services/userDataService.js` | Compose summary/history projections, not calculate awards ad hoc |
| `public/dashboard.html`, `public/dashboard-runtime.js`, `public/member-home-runtime.js` | Points/streak/recent unlock surfaces |
| `public/greatness.html/.js`, `public/push-up-challenge*`, `public/nutrition*`, `public/workout*` | Contextual progress/toasts fed by APIs; never award locally |
| `src/repositories/` | New durable event, award and projection stores following `POCKET_PT_DATA_DIR` conventions |
| `test/` | Unit, API, persistence/restart, authorization and cross-feature contract suites |

## Canonical model

### Event

Immutable fact: `eventId`, `eventType`, `schemaVersion`, `occurredAt`, `recordedAt`, `actorUserId`, `subjectUserId`, `source`, `sourceEntityType/id`, `idempotencyKey`, minimal typed `payload`, `verification`, `correlationId`. User-facing clients never submit award or point values. Event IDs/idempotency keys are unique.

Initial vocabulary should cover `workout.completed`, `training.minutes_recorded`, `walking.activity_completed`, `trail.activity_completed`, `run_club.activity_completed`, `pushup_challenge.completed`, `nutrition.mission_completed`, `habit.logged`, `personal_best.recorded`, and approved community facts. Map legacy action keys explicitly; do not silently equate unsupported events.

### Point policy and ledger

Policy: `actionPolicyId`, matching event type/conditions, integer `points`, caps, effective interval, version, approval. Ledger: immutable `ledgerEntryId`, user, event, policy version, points delta, reason, created time, optional reversal-of. Calculate decimal legacy values such as `0.1/minute` using integer subunits or a documented rounding rule. Never mutate balances; project them from ledger entries.

### Badge / achievement rule / award

Badge metadata is separate from its executable rule. Rules use typed operators (`gte`, `lte`, `count`, `streak`, `percent_delta`) and windows, not strings like `>=7`. Support AND/OR groups, eligibility, evidence type, policy version and effective dates. Award records are append-only and unique by user + badge + qualifying period/version where repeatable.

### Tier

Tier is a versioned status projection, not embedded in badge names. Define ordered tiers, qualification rule, evaluation cadence, grace/demotion policy and effective history. The legacy “Top 10%” comparator needs explicit percentile semantics and cohort privacy before use.

### Streak

`streakDefinition` specifies eligible events, user timezone, local-day boundary, grace/freeze policy and version. Projection stores current count, longest count, last qualified local date, recalculated-through cursor. Late/offline events trigger deterministic replay; DST and timezone changes need a declared policy.

## Database/schema changes and migration strategy

Recommended production entities (database tables when a database is selected; versioned JSON repository records only as an interim compatible with current persistence):

* `gamification_events`, unique `(subject_user_id, idempotency_key)`;
* `point_policies`, `point_ledger_entries`;
* `badges`, `achievement_rule_versions`, `badge_awards`;
* `tier_definitions`, `user_tier_history`;
* `streak_definitions`, `user_streak_projections`;
* `gamification_projection_cursors` and `gamification_migration_runs`.

Migration is expand→seed→shadow→backfill→verify→expose:

1. Add stores/tables and schema versions without UI/read-path changes.
2. Normalize the four CSVs into reviewed canonical JSON; record source checksums.
3. Deploy idempotent event consumers in shadow mode; compare projections without awards.
4. Backfill only owner-approved historical sources with deterministic idempotency keys and a migration ID. Never synthesize unavailable facts.
5. Rebuild projections twice and require identical checksums/counts.
6. Enable read API/limited UI; then event sources one at a time.
7. Enable awards/notifications last. Keep legacy history responses unchanged.

## Services and APIs

New internal modules: `src/gamification/eventService.js`, `policyService.js`, `achievementEvaluator.js`, `streakProjector.js`, `projectionService.js`, repositories, validators, and a transactional/outbox adapter if the eventual database supports it.

Proposed authenticated APIs:

* `GET /api/me/gamification/summary`
* `GET /api/me/gamification/ledger?cursor=&limit=`
* `GET /api/me/gamification/badges?status=&cursor=`
* `GET /api/me/gamification/streaks`
* `GET /api/gamification/catalog` (safe public metadata only)

No generic public `POST /events`. Feature services call the event service only after their authoritative write succeeds. Administrative policy publication requires existing authorization/audit patterns and a separate future design.

## Testing strategy

* Schema/fixture tests for normalized legacy seeds and unique IDs/FKs.
* Table-driven operator/window/AND/OR and effective-version tests.
* Property tests: replay order invariance where promised, idempotency, no double points/awards, reversal conservation.
* Time tests across DST, leap day, timezone change, late events and grace rules.
* Service/API auth, cross-user isolation, validation, pagination, rate-limit and response-envelope tests.
* Integration tests per event source and failure ordering (no event before authoritative completion).
* Persistence restart, corruption/atomic-write and projection rebuild tests under current file persistence; transaction/outbox tests for DB.
* Migration dry-run, partial interruption/resume, count/checksum reconciliation and rollback rehearsal.
* Browser accessibility and reduced-motion tests for badges/toasts; no layout dependency on gamification availability.
* Abuse tests for duplicate submissions, forged minutes, replayed challenge results and extreme values.

## Acceptance criteria

1. Every award/point is traceable to an immutable source event and exact policy version.
2. Reprocessing the same event produces zero extra points/awards; full projection rebuild is deterministic.
3. Cross-user access is denied and sensitive nutrition/location payloads are not copied into the ledger.
4. All existing feature tests pass with the flag off; feature completion succeeds when gamification is unavailable.
5. Owner-approved seed relationships validate; unsupported legacy criteria remain disabled and clearly reported.
6. Timezone/streak rules are documented and pass boundary fixtures.
7. Backfill dry-run and production reconciliation totals are signed off before visibility.
8. UI is accessible, optional, and truthful about pending/unverified events.

## Rollback

Feature flags independently disable event production, evaluation, notifications and UI. Rollback never deletes events or awards. Stop consumers, hide projections, deploy prior code, and record compensating ledger/award-revocation entries only under an approved correction run. Expand-only schema remains until retention approval; restore projections from event replay rather than hand editing. Gamification failure must never roll back a completed workout, trail activity, challenge or nutrition write.
