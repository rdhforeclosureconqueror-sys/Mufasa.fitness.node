# Kettlebell Challenge commitment/recovery phase — merge review

## Summary

This phase establishes the behavioral foundation **Commit → Train → Recover → Return → Measure**. Kettlebell enrollment now collects a one-to-four-workout weekly commitment, the same number of unique preferred weekdays and a start date. The server persists an eight-week schedule with visible recovery days, explicit workout states, makeup eligibility, safe rescheduling primitives, commitment summaries and comeback tracking.

The phase intentionally does not allocate final exercises to A/B/C/D sessions and does not touch camera, checkpoint, rep-counting, form or voice engines.

## Scope

Intended outcomes:

* server-authoritative enrollment validation;
* deterministic one-to-four-day weekly schedule generation;
* explicit workout/recovery/makeup/comeback states;
* weekly commitment score/streak projections;
* preservation of original and actual dates;
* basic recovery-spacing protection;
* owner-scoped rescheduling route;
* mobile-first enrollment and weekly schedule presentation; and
* automated unit, persistence, route, authorization and responsive-contract coverage.

## Files Changed

| Path | Purpose and important modifications |
| --- | --- |
| `src/program-engine/challengeCommitmentScheduler.js` | Adds deterministic enrollment normalization, eight-week schedule generation, state refresh, rescheduling safety, idempotent completion projection and weekly commitment summaries. Reuses `scheduleEngine.dateKey`. |
| `src/services/challengeEngineService.js` | Requires validated kettlebell enrollment, persists commitment/schedule data in the existing challenge store, refreshes missed/makeup states, returns commitment projections and performs owner-scoped rescheduling. |
| `server.js` | Passes enrollment input to the existing join service and adds the authenticated reschedule route. |
| `config/route-authorization-contract.js` | Classifies the reschedule route as authenticated, owner-scoped and server-validated. |
| `public/challenge-page.js` | Replaces immediate kettlebell join with commitment/day/start-date enrollment and renders the participant's current week, recovery guidance, score, streak and comeback count. |
| `public/challenges.css` | Adds touch-sized selectors, narrow-screen stacked schedule, keyboard focus treatment and safe-area-aware sticky CTA. |
| `test/kettlebell-commitment-scheduler.test.js` | Covers frequency variants, validation, recovery, makeup, dates, idempotency, safety and weekly streaks. |
| `test/kettlebell-commitment-routes-ui.test.js` | Exercises actual public/protected routes, authorization classification and mobile CSS/markup contracts. |
| `test/challenge-engine.test.js` | Updates kettlebell joins to provide enrollment and proves persistence round trips and validation. |
| `docs/kettlebell-challenge-architecture-audit.md` | Adds the commitment/recovery/comeback behavioral architecture to the durable audit. |

## Architecture Decisions

1. **Weekly commitment is the adherence unit.** `commitmentSummary.weeks` compares required versus completed workouts; recovery entries do not participate.
2. **Availability does not define programming.** The scheduler creates weekly session slots but does not invent exercise allocations for one-to-four-day variants.
3. **Server owns validation and persistence.** Client controls are usability aids; the service independently rejects invalid frequency, weekdays and dates.
4. **Dates remain truthful.** Workout entries retain `originalPlannedDate`, current `plannedDate`, `rescheduledFrom`, `missedAt` and `actualCompletionDate`.
5. **Comeback is distinct.** Recovered sessions use `comeback_completed`; summary exposes a separate comeback count.
6. **Recovery is visible but non-mandatory.** Recovery entries include one informational tip and no completion state/checklist.
7. **No duplicate rewards authority.** This phase does not award Comeback XP. Future rewards must enter the existing gamification event/policy pipeline after workout completion correlation exists.

## Existing Infrastructure Reused

* reusable challenge definition, service and runtime persistence;
* `src/program-engine/scheduleEngine.js` date normalization and the program-engine ownership boundary;
* existing challenge join/active routes and authentication/rate limiting;
* existing authorization contract;
* existing challenge page and CSS delivery;
* existing XP/gamification infrastructure remains the sole future reward authority.

No workout, camera, pose, checkpoint, rep, form, timer or voice engine was created or modified.

## Data Model Changes

Kettlebell participation adds:

* `commitment.workoutsPerWeek` — integer 1–4;
* `commitment.preferredWeekdays` — unique weekday names, count equal to commitment;
* `commitment.startDate`, `durationWeeks`, `promisedWorkouts`, `confirmedAt`;
* `commitmentSchedule[]` with `scheduleSessionId`, `weekNumber`, `weekday`, `type`, `state` and date/audit fields;
* recovery entries with informational `recoveryTip`; and
* active projection `commitmentSummary` with promised/completed totals, percentage score, commitment streak, comeback count and per-week status.

Explicit states introduced by this phase:

* `scheduled`, `due_today`, `recovery`, `makeup_available`, `missed`, `rescheduled`, `completed`, `comeback_completed`;
* weekly `in_progress`, `weekly_commitment_kept`, `weekly_commitment_missed`.

No migration is required for existing non-kettlebell challenges. Existing kettlebell participations without commitment data are displayed as legacy rather than silently fabricated.

## Routes / APIs

| Method | Path | Purpose | Authorization | Persistence |
| --- | --- | --- | --- | --- |
| `GET` | `/challenges/:slug` | Existing challenge shell used by enrollment/current week UI. | Public shell | None |
| `GET` | `/api/challenges/:slug` | Existing published challenge definition lookup. | Public | None |
| `POST` | `/api/me/challenges/:slug/join` | Existing join route now accepts and validates commitment enrollment for the kettlebell challenge. | Required; authenticated user self; challenge rate limit | Writes participation, confirmation and 56 schedule entries atomically to existing challenge runtime store |
| `GET` | `/api/me/challenges/active/current` | Existing active projection now refreshes commitment states and returns commitment summary. | Required; private/no-store | Persists derived missed/makeup transitions when time changes them |
| `PATCH` | `/api/me/challenges/:userChallengeId/commitment-sessions/:sessionId/reschedule` | Safely moves an eligible session to a recovery date in the same challenge week. | Required; participation ownership; challenge rate limit | Atomically updates owner participation schedule |

There is deliberately no client-callable “complete commitment” route in this phase. Completion must later be correlated from the authoritative workout session rather than trusted as a standalone client claim.

## UI Changes

Unaffiliated users see a focused enrollment form with:

* one-to-four-day commitment choices;
* preferred weekday selector limited to the chosen count;
* start date;
* explicit eight-week promise text; and
* a primary confirmation CTA.

Enrolled users see Commitment Score, promised/completed workouts, commitment streak, comeback count, a seven-day current-week schedule and lightweight recovery teaching.

## Mobile Behavior

* At `max-width: 600px`, the seven-day schedule becomes a vertical list.
* Frequency/day selectors have a 52px minimum height and visible keyboard focus.
* The primary CTA becomes full-width and sticky above `safe-area-inset-bottom`.
* Schedule content uses `overflow-wrap:anywhere`; form fieldsets use `min-width:0`.
* Controls use native radio, checkbox and date inputs; no hover-only behavior exists.

Automated static responsive checks passed for the 600px breakpoint contract, touch size, stacked schedule, safe-area handling and overflow guards. A real browser screenshot/geometry test was not run because this repository environment has no Playwright/Puppeteer or Chromium binary. This is an explicit verification gap, not a claim of rendered-device validation.

## Business Logic

* Weekly commitment must be 1–4; five or more is rejected.
* Preferred weekdays must be valid, unique and equal the weekly count.
* Every seven-day challenge week contains exactly the chosen workout count; all other dates are recovery.
* A past planned workout remains `makeup_available` until its challenge week ends, then becomes `missed`.
* Makeup stays within the same challenge week, cannot share a challenge workout date and cannot create three consecutive kettlebell workout dates.
* Rescheduling swaps the recovery slot to the original date so the schedule retains seven unique daily rows.
* Completion retains original and actual dates and is idempotent in the scheduler model.
* Planned recovery never breaks commitment streak.
* Commitment, comeback and performance metrics remain separate.

## Tests Added

### `test/kettlebell-commitment-scheduler.test.js`

Proves:

* exact schedules for one, two, three and four days;
* visible recovery generation;
* rejection of more than four days and invalid day counts;
* missed-to-makeup transition;
* original/actual date preservation;
* comeback completion and duplicate completion idempotency;
* same-day collision and three-consecutive-day prevention; and
* recovery-safe weekly commitment streaks.

### `test/kettlebell-commitment-routes-ui.test.js`

Proves:

* challenge shell and definition routes return 200 through a live test server;
* protected join/reschedule routes resolve and return 401 without authentication rather than 404;
* authorization contract is owner-scoped; and
* mobile markup/CSS contracts exist.

### `test/challenge-engine.test.js`

Adds persisted schedule round-trip and invalid enrollment coverage while retaining existing challenge progress/XP tests.

## Tests Run

* `npm run lint` — **passed** (`selfcheck ok`).
* `npm run security:validate-routes` — **passed**; authorization contract matched all 284 runtime routes.
* `git diff --check` — **passed**.
* Focused new/changed suites: `node --test test/kettlebell-commitment-scheduler.test.js test/challenge-engine.test.js test/kettlebell-commitment-routes-ui.test.js` — **22 passed, 0 failed, 0 skipped** after correcting two test-harness/assertion defects found on the first run.
* Relevant regression command: `node --test test/challenge-engine.test.js test/kettlebell-commitment-scheduler.test.js test/kettlebell-commitment-routes-ui.test.js test/generic-challenge-controller.test.js test/generic-exercise-sequence-engine.test.js test/form-engine.test.js test/workout-form-runtime.test.js test/workout-coach-runtime.test.js test/gamification-session-integration.test.js test/phase20-workout-persistence-auth.test.js test/phase17-start-workout-trace.test.js test/workout-plan-builder.test.js test/timed-workout-progression.test.js test/challenge-aware-routes.test.js test/security-route-matrix.test.js` — **111 passed, 0 failed, 0 skipped**.
* Environment warnings during live-server tests: no trail provider, pilot login password, production auth secret or super-admin bootstrap allowlist were configured. These did not affect the exercised public/unauthenticated route assertions.

## Route Verification

Live ephemeral server verification exercised:

* `GET /challenges/8-week-kettlebell-strength-power` → 200;
* `GET /api/challenges/8-week-kettlebell-strength-power` → 200 with expected slug;
* unauthenticated `POST /api/me/challenges/8-week-kettlebell-strength-power/join` → 401;
* unauthenticated `PATCH /api/me/challenges/x/commitment-sessions/y/reschedule` → 401.

Authenticated enrollment/reschedule business behavior is covered directly at the service/persistence layer. Full authenticated HTTP success-path verification is deferred because the local login environment is intentionally unconfigured.

## Manual Verification

* Reviewed generated schedules for seven unique date rows after rescheduling.
* Reviewed enrollment semantics and weekly schedule copy in source.
* No rendered browser/manual device verification was possible because no browser runtime is installed.

## Regression Risk

* Kettlebell join now requires enrollment fields; callers that previously posted an empty body receive a validated 400. The challenge page was updated in the same change.
* Existing challenge daily progress/streak fields remain in the service for other challenges and backward compatibility. Kettlebell UI now presents commitment metrics instead.
* Active reads can persist time-derived makeup/missed state transitions, increasing writes at date boundaries.
* Rescheduling exists before live workout completion correlation; no completion or XP route was exposed to avoid a second authority.

## Known Limitations

* Final A/B/C/D programming is not allocated; source/addendum approval is still required.
* Baseline, midpoint and final benchmark protocols are not implemented.
* The reschedule UI is not exposed yet; only the owner-scoped service/route foundation exists.
* `completeCommitmentSession` is a tested domain primitive but is not wired to session completion yet.
* Comeback XP/badges are not awarded until the existing gamification pipeline can consume authoritative completion events idempotently.
* Existing legacy daily `currentStreak` remains stored but is not the user-facing kettlebell adherence metric.
* Real browser mobile geometry and screenshot verification remain unavailable in this environment.

## Unresolved Questions

* Approved A/B/C/D exercise allocation for one-to-four-day commitments.
* Whether challenge weeks are permanently anchored to start date or should use locale calendar-week boundaries.
* Whether two consecutive training days are acceptable for every phase; this phase only prohibits three consecutive days.
* Exact comeback XP/badge policy and idempotency key once session correlation exists.
* Baseline/final benchmark durations, eligible movements and ballistic competency gate.

## Security / Data Integrity Notes

* Server rejects invalid frequency, duplicate/unknown weekdays and invalid dates.
* Rescheduling requires authenticated participation ownership and remains inside the same challenge week.
* Client-supplied challenge/session IDs are resolved against persisted owner state.
* No workout prescription is accepted through enrollment or query parameters.
* No new XP write exists, preventing duplicate or client-authored comeback rewards.
* Future workout completion correlation must use one idempotency key across history, challenge and gamification.

## Merge Readiness

**READY WITH KNOWN LIMITATIONS**

The behavioral data foundation, persistence, routes and mobile contract have deterministic automated coverage, and 111 relevant regression tests pass. It is limited intentionally: no final workout allocation, completion correlation, comeback reward, benchmark or browser-rendered mobile verification is claimed.

## Recommended Next Phase

Approve the one-to-four-day weekly programming allocation addendum, then implement a server-authoritative challenge-session resolver that maps a scheduled commitment slot to the existing workout plan/session runtime. Correlate normal workout completion back to `completeCommitmentSession` with one idempotency key before exposing comeback actions or rewards.
