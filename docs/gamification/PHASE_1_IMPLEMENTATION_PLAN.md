# Phase 1 Implementation Plan — Gamification

**Status:** implementation-ready blueprint; no production code is authorized by this document.

**System of record:** the current Mufasa Node/Express application only.

**Implementation sequence:** Gamification → Workout Intelligence → Yoga & Gymnastics

## 1. Overall objective

Add an optional, server-authoritative reward layer to existing workflows so verified healthy actions can earn XP, points, achievements, badges, milestones, streaks, titles, levels, and progression. Feature writes remain authoritative: completing a workout, logging nutrition, or saving an assessment must succeed even when gamification is disabled or temporarily unavailable.

The system rewards consistency, safe improvement, learning, technique, participation, recovery, and community. It does not reward extreme volume, rapid weight change, calorie restriction, pain tolerance, unsafe skills, or raw competition without caps and eligibility controls.

## 2. Architectural fit

Use the existing CommonJS service/repository pattern and the current `server.js` composition root. Do not add another server, runtime, database, Firebase project, SQLite file, Python process, or browser-side award authority.

```text
Current authenticated route
  -> current domain service validates and commits action
  -> gamification event adapter records an immutable fact (best effort/outbox)
  -> evaluator matches published policy/rule versions
  -> append-only XP/points ledger + award records
  -> deterministic projections (summary, streaks, levels, milestones)
  -> authenticated read APIs
  -> existing public/ runtime renders optional progress UI
```

### Invariants

1. The domain write commits before its event can earn a reward.
2. Clients never submit XP, points, badge IDs, level, rarity, or verification state.
3. `(subjectUserId, idempotencyKey)` is unique; replay creates no duplicate value.
4. Ledgers and awards are append-only. Corrections are reversals/revocations.
5. Every outcome identifies its source event and exact policy/rule version.
6. Projections are disposable and reproducible from immutable records.
7. Gamification errors cannot turn a successful domain action into an error response.
8. Private nutrition, health, precise location, and assessment details are not copied into events or public surfaces.

## 3. Current systems reused

| Current system | Reuse |
|---|---|
| `server.js` | Existing app composition, authentication, membership, authorization, response envelopes, rate limiting, audit patterns, and route mounting. |
| `src/services/sessionService.js` | Authoritative session start, rep recording, and completion source. |
| `src/services/generatedWorkoutService.js` and `generatedWorkoutProgressionService.js` | Generated-plan activation, completion, and progression facts. |
| `src/services/steppingIntoGreatnessService.js`, walking/trail services | Completed walking, run-club, distance, and trail facts; never raw GPS traces. |
| `src/services/challengeService.js` | Accepted, deduplicated push-up results and challenge participation. |
| `src/services/nutritionService.js` | Logged entries and goal/mission completion; emit booleans/bands rather than sensitive values where possible. |
| `src/services/userDataService.js`, profile/intake routes | Profile completion, bodyweight-update occurrence, and assessment completion facts. |
| `src/repositories/userStore.js` and `POCKET_PT_DATA_DIR` conventions | Atomic/versioned JSON persistence conventions for the current deployment. Gamification receives dedicated stores, not fields scattered through user records. |
| `src/services/memberHomeService.js` | Compose gamification summaries into member home without calculating rewards. |
| `public/` | Active frontend source for summary cards, catalogue, progress, and contextual unlock notifications. |
| Existing tests and Node test runner | Service, API, restart, security, and browser contract style. |

## 4. Legacy assets consumed

Only normalize the four seed datasets in `public/new/`: `FitnessMVP_Actions.csv`, `FitnessMVP_Badges.csv`, `FitnessMVP_Criteria.csv`, and `FitnessMVP_Tiers.csv`. Produce reviewed JSON under `data/gamification/` with source checksum, import version, reviewer, and disabled-by-default status. CSVs are provenance, never runtime input.

Do not copy or execute the legacy Express/SQLite server, routers, schemas, Firebase configuration, Python scripts, Docker artifacts, or alternate frontend. Unsupported rules remain quarantined with a reason; legacy decimal points become integer subunits or an approved rounded integer policy.

## 5. Target modules and schemas

```text
data/gamification/
  action-policies.json
  achievements.json
  achievement-rules.json
  badge-catalog.json
  levels.json
  seasons.json
  streak-definitions.json
  titles.json
src/gamification/
  eventTypes.js
  validators.js
  eventService.js
  policyService.js
  achievementEvaluator.js
  streakProjector.js
  levelService.js
  projectionService.js
  leaderboardService.js
src/repositories/
  gamificationEventStore.js
  gamificationLedgerStore.js
  gamificationAwardStore.js
  gamificationProjectionStore.js
  gamificationDefinitionStore.js
```

Persistent entities are defined in `EVENT_MODEL.md` and `ACHIEVEMENT_SYSTEM.md`. All records include `schemaVersion`; definitions also include semantic `definitionVersion`, effective dates, lifecycle state, and content revision.

## 6. Implementation order

1. **Decisions and normalization:** approve economy, UTC/user-day policy, privacy, backfill boundary, minors/community rules; normalize and validate seeds.
2. **Foundation:** identifiers, clocks, schemas, event vocabulary, append-only stores, atomic multi-store write strategy, flags, and observability.
3. **Shadow event production:** instrument one authoritative completion at a time, starting with workout completion. Record/evaluate without visible rewards.
4. **Reward core:** versioned policies, ledger, evaluator, awards, streaks, levels, projection rebuild, and correction tools.
5. **Read APIs:** summary, ledger, achievements, streaks, catalogue, and opt-in leaderboard.
6. **Frontend foundation:** member-home progress, achievement catalogue, accessible unlock queue, privacy controls, and graceful unavailable states.
7. **Feature expansion:** generated workouts; walking/trails/run club; push-up challenge; nutrition; check-ins/profile/assessments.
8. **Backfill:** only approved, verifiable historic facts with dry-run reconciliation.
9. **Limited rollout:** staff → opt-in cohort → staged percentages → general availability.
10. **Future adapters:** reserve names for yoga and gymnastics but emit nothing until their current-platform features exist.

## 7. Backend changes

### Event capture

Each authoritative service calls a narrow adapter after commit with a server-built idempotency key such as `workout.completed:<sessionId>`. Where the current file persistence cannot atomically commit both domain data and events, append a durable domain outbox marker in the same authoritative record when practical, then drain it. Otherwise use best-effort emission plus a reconciliation job that derives missing events from committed records. Never emit before commit.

### Evaluation and ledgers

The event service validates type/version, strips unknown fields, stores the event, and returns `duplicate` for an existing key. The evaluator loads definitions effective at `occurredAt`, updates aggregate projections, appends point/XP entries, awards qualifying achievements, and emits projection notifications. Failures are retryable by cursor. A dead-letter record contains safe metadata, not payload dumps.

### Persistence

Follow existing data-directory conventions with separate versioned JSON/NDJSON stores initially. Writes use temp-file + fsync/rename or the repository's established atomic mechanism and an in-process write queue. Enforce bounded reads, backups, corruption detection, and restart recovery. Keep repository interfaces datastore-neutral for a later current-platform persistence change; Phase 1 does not introduce a new database.

### Flags and operations

Independent server flags: `GAMIFICATION_EVENT_CAPTURE`, `GAMIFICATION_EVALUATION`, `GAMIFICATION_READ_API`, `GAMIFICATION_NOTIFICATIONS`, `GAMIFICATION_LEADERBOARDS`, and per-source flags. Default off until seeded/verified. Health exposes counts, lag, last cursor, duplicate rate, evaluation failures, and projection checksum without user data. Admin-only commands support validate, shadow compare, rebuild, backfill dry-run, and approved reversal.

## 8. Frontend changes

Only active `public/` files are later implementation targets.

* Add a reusable progress model/runtime that fetches authenticated server projections; do not calculate rewards locally.
* Member home: lifetime level/XP progress, current healthy-habit streak, recent unlocks, and a link to details.
* Achievement view: category filters, earned date, tier progress, hidden placeholders, rarity labels, accessible icon text, and season status.
* Contextual pages: after an existing successful action, refresh summary and show at most one queued toast; the action success UI never waits for it.
* Leaderboards: off by default; explicit opt-in, pseudonymous display name, cohort size threshold, report/block controls, and “participation over rank” language.
* Respect reduced motion, screen readers, keyboard use, contrast, localization, and notification mute controls.
* Do not show weight-loss races, calorie-deficit scoring, shame copy, streak-loss punishment, or false real-time unlocks.

## 9. APIs

All `/api/me/*` endpoints require current authentication and membership rules unless product explicitly designates a safe catalogue public.

| Method/path | Contract |
|---|---|
| `GET /api/me/gamification/summary` | Lifetime XP, level/title, point balances, season summary, selected streaks, recent awards, projection timestamp/version. |
| `GET /api/me/gamification/ledger?kind=&cursor=&limit=` | Cursor-paginated, safe point/XP history; no raw event payload. |
| `GET /api/me/gamification/achievements?category=&state=&cursor=` | Earned/in-progress catalogue merged with user projections. |
| `GET /api/me/gamification/streaks` | Current/longest count, next eligible day, grace status, timezone policy. |
| `GET /api/gamification/catalog?version=` | Published, safe metadata and levels; hidden criteria omitted. |
| `GET /api/me/gamification/seasons/current` | User season XP/points, participation, dates, and reset explanation. |
| `GET /api/gamification/leaderboards/:boardId?cursor=` | Opt-in eligible rows only; minimum cohort/privacy checks. |
| `PUT /api/me/gamification/preferences` | Visibility, leaderboard opt-in, selected title, notification/motion choices; optimistic version. |

There is **no client event-ingestion or award endpoint**. Internal adapters call services directly. Administrative definition publication and correction endpoints are deferred until they receive a separate authorization/audit design.

Responses use existing envelopes, stable error codes, `projectionAsOf`, and `catalogVersion`. Lists use opaque cursors and capped limits. ETags may be added to catalogue/summary.

## 10. Service contracts

* `record(eventDraft) -> { eventId, disposition }`: validate, minimize, deduplicate, append.
* `evaluate(eventId) -> EvaluationResult`: deterministic rule/policy match and append outcomes.
* `replay({ fromCursor, toCursor, dryRun })`: rebuild/compare without changing immutable input.
* `getSummary(userId)`: read projection only.
* `reverse({ ledgerEntryId, reason, correctionRunId })`: authorized compensating entry.
* `publishDefinitions(candidate)`: offline/admin-controlled validation, checksum, immutable publication.

Use dependency-injected clock/ID/store/definition provider for deterministic tests. No service imports `server.js` or browser modules.

## 11. Testing

* JSON schema and semantic validation for unique IDs, references, versions, intervals, disabled legacy items, and safe numeric ranges.
* Table-driven event validation and minimization tests for every type/version.
* Idempotency, duplicate concurrency, append-only, reversal conservation, cursor resume, and projection checksum tests.
* Rule tests for AND/OR, count, sum, distinct count, streak, personal improvement, effective versions, repeat periods, hidden awards, and revoked definitions.
* Time tests: user-local midnight, DST, leap day, timezone changes, late/offline events, season boundaries, and grace days.
* Integration tests prove events occur only after committed domain writes and domain success survives evaluator failure.
* API tests: auth, membership, cross-user isolation, pagination, invalid query, privacy redaction, response shape, and disabled flag behavior.
* Persistence tests: restart, partial writes, corruption quarantine, backup recovery, replay after interruption, and concurrent append.
* Browser tests: loading/empty/error states, reduced motion, keyboard/screen-reader semantics, toast rate limiting, and no workflow blockage.
* Abuse tests: forged IDs, replay, impossible values, rapid duplicate submissions, self-referral, GPS spoof indicators, challenge outliers, and cap enforcement.

## 12. Rollout strategy

1. Publish baseline metrics and snapshot/backup current data.
2. Deploy stores and definitions with every flag off.
3. Enable capture in shadow mode for staff; compare source counts daily.
4. Enable evaluation with outputs invisible; rebuild twice and compare checksums.
5. Enable read APIs/UI for internal accounts, then a voluntary 5% cohort.
6. Add event sources individually with 24–72 hour observation gates.
7. Enable notifications after ledger/award accuracy meets thresholds.
8. Enable opt-in leaderboards last, only after privacy and moderation sign-off.
9. Expand 25% → 50% → 100% based on error, lag, duplication, support, and safety metrics.

No historical award is visible until backfill owner, date range, source reliability, and reconciliation report are approved. Communicate that Phase 1 rewards healthy participation and has no cash value.

## 13. Rollback strategy

Disable notifications and UI first, then evaluation, then affected event-source capture. Existing domain flows remain live. Preserve immutable events and outcomes for audit. Rebuild projections from the last verified cursor after repair. Incorrect value is corrected through equal-and-opposite ledger entries and award revocation records; never delete or hand-edit. Roll back code with expand-only stores left dormant. Restore store backups only for physical corruption, followed by event/outbox reconciliation. A rollback drill must demonstrate that a workout completion still succeeds with every gamification component unavailable.

## 14. Acceptance criteria

1. All outputs trace to one immutable event and immutable published definition version.
2. Replaying any event produces zero additional ledger entries or non-repeatable awards.
3. Two full rebuilds yield identical projection checksums and balances.
4. Existing workflows and existing tests behave identically with flags off and remain successful during simulated gamification failures.
5. No browser request can grant itself value; cross-user reads and mutations are denied.
6. Event payloads exclude raw GPS routes, medical answers, meal text, exact bodyweight, tokens, contact details, and referral targets.
7. Streak/day/season/timezone semantics pass documented boundary fixtures.
8. Initial definitions pass product, fitness-safety, content, privacy, accessibility, and economy review.
9. Caps and anomaly controls prevent excessive volume from creating unbounded rewards.
10. UI is optional, accessible, non-punitive, truthful about projection delay, and never blocks a core action.
11. Backfill is deterministic, resumable, dry-run verified, and explicitly approved.
12. Rollout dashboards and rollback runbook have named owners and tested thresholds.

## 15. Explicit non-goals

Cash value, purchasable XP, loot boxes, wagering, public-by-default rankings, punitive demotion, medical diagnosis, calorie-deficit competition, rewards for pain/exhaustion, unverified client events, and any revival of legacy runtime infrastructure are outside Phase 1.
