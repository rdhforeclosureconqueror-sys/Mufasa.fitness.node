# Kettlebell Scheduled Workout Integration — Merge Readiness

## Summary
Connected owner-scoped scheduled challenge sessions to the existing workout session runtime, exact completion correlation, comeback state, and existing gamification event/XP pipeline. Added rescheduling controls and a maintainable rendered-mobile Playwright specification.

## Scope
This phase integrates commitment scheduling, canonical challenge programming, workout persistence, completion, comeback rewards, rescheduling UI, recovery presentation, route security, and mobile E2E coverage. It does not rebuild any existing engine.

## Files Changed
- `src/services/challengeEngineService.js`, `src/services/sessionService.js`, `server.js`: authoritative handoff and completion correlation.
- `src/gamification/eventService.js`, `src/gamification/eventTypes.js`, `data/gamification/xp-policy.json`: comeback event and reward.
- `public/challenge-page.js`, `public/challenges.css`: start/reschedule mobile UI.
- `config/route-authorization-contract.js`: protected start route.
- `test/kettlebell-workout-integration.test.js`, `test/kettlebell-commitment-routes-ui.test.js`: domain and authenticated route coverage.
- `playwright.config.js`, `e2e/kettlebell-challenge-mobile.spec.js`, `package.json`: rendered-mobile runner/specification.

## Architecture Decisions
The browser sends only enrollment and commitment-session identity. The challenge service validates ownership, resolves challenge/week/ordinal, selects the existing canonical challenge day, and supplies exercise IDs and prescriptions to the existing session service. Source metadata is persisted on the workout. Exact IDs—not exercise names or dates—drive completion.

## Existing Infrastructure Reused
Challenge definitions/phase data, commitment scheduler, `sessionService`, user-store workout persistence, gamification event store, XP policy/projectors, auth middleware, route rate limiting, and challenge UI shell.

## Data Model Changes
Workout sessions now optionally persist `sourceMetadata` and `canonicalWorkout`. Commitment sessions persist `startedAt`, `workoutSessionId`, `actualCompletionAt`, `actualCompletionDate`, `completedOnPlannedDay`, `makeup`, and `recoveredMissedCommitment`; `originalPlannedDate` is never rewritten.

## Routes/APIs
- `POST /api/me/challenges/:userChallengeId/commitment-sessions/:sessionId/start-workout` resolves and starts the canonical workout.
- Existing owner-scoped `PATCH .../reschedule` remains server-authoritative.
- Existing `POST /api/sessions/:id/complete` performs exact source correlation and returns idempotent duplicate success for challenge-origin sessions.

## UI Changes
Workout cards expose **Start Workout** and **Reschedule**. The reschedule dialog lists remaining recovery slots and relays server validation in neutral language. Recovery cards remain visible, informational, and reward-free.

## Mobile Behavior
Cards stack at phone widths; action controls have 48px minimum height; the dialog is viewport-bounded; action buttons share available width; safe-area behavior from the prior enrollment CTA remains.

## Business Logic
Normal completion becomes `completed`; late/missed/rescheduled completion in the same challenge week becomes `comeback_completed`. A reschedule swaps the workout into a recovery slot without changing historical original date. Unsafe three-day sequences, collisions, out-of-week dates, elapsed opportunities, and completed sessions are rejected by the server.

## Comeback Reward
A recovered commitment emits `commitment.comeback.completed` through the existing gamification event store. Policy `1.0.0` grants **25 XP** in category `commitment_comeback`, separate from the ordinary 100 XP `workout.completed` event. Its stable idempotency key is `commitment.comeback.completed:<workoutSessionId>`, so retries yield one event and one award.

## Tests Added
Three domain transition tests cover canonical resolution/normal completion; makeup/comeback/duplicate rewards; invalid collision, completed-session reschedule, ownership, recovery adherence, and unresolved fourth-session programming. An authenticated live-server route test covers join, reschedule, attacker rejection, start, canonical response, complete, and duplicate complete. The Playwright spec covers 320/375/390/430px, overflow, schedule/recovery rendering, CTAs, reschedule dialog, and control bounds.

## Tests Run
- `node --test test/kettlebell-workout-integration.test.js test/kettlebell-commitment-scheduler.test.js test/gamification-session-integration.test.js`: **14 passed, 0 failed**.
- Selected affected regression command (challenge, scheduler, generic controller, workout delivery/progression/persistence/form/plan, gamification events/session/XP, routes): **80 passed, 0 failed**.
- `npm run lint`: **1 check passed, 0 failed**.
- `npm test`: **1,177 passed, 0 failed** (66.68 seconds).
- `npm run test:e2e:mobile`: **0 executed, 1 environment failure**; npm registry returned HTTP 403 while acquiring Playwright.

## Route Verification
Public challenge page and definition API return 200. Enrollment, reschedule, and start-workout routes reject unauthenticated requests. Authorization contract declares owner-self protection for start and reschedule.

## Authenticated Route Verification
A real test server issued owner and attacker tokens. Owner join/reschedule/start/complete and duplicate-complete passed. Attacker start against the owner's enrollment returned 404. The returned canonical workout was `kb_day_1` with server-owned exercise IDs.

## Manual Verification
Code-level UI inspection and automated DOM contract checks passed. No manual visual claim is made because no browser binary executed.

## Rendered Browser Verification
**Rendered browser executed: NO.** The repository previously had no Playwright/Puppeteer/Cypress dependency or installed browser. The phase adds Playwright config/spec and `npm run test:e2e:mobile`, but this environment blocked package acquisition with `403 Forbidden - GET https://registry.npmjs.org/playwright`. Consequently, none of 320, 375, 390, or 430px was actually rendered here. A network-enabled developer/CI environment can run the command; Playwright may first require `npx playwright install --with-deps chromium`.

## Regression Risk
Moderate. Session persistence gains optional source fields and challenge-source completion becomes retry-idempotent; generic sessions retain their existing duplicate-completion conflict. Canonical allocation maps weekly commitment ordinal to the existing approved weekly challenge workout ordinal.

## Known Limitations
Rendered browser execution is blocked in this environment. The fourth weekly commitment has no approved fourth canonical workout and deliberately returns `PROGRAMMING_ALLOCATION_UNAVAILABLE` rather than inventing a prescription.

## Unresolved Questions
Product/programming must approve a fourth weekly A/B/C/D allocation before 4-session/week workouts can start. Confirm whether the 25 XP comeback reward should remain uncapped or receive a future category cap.

## Security/Data Integrity Notes
All writes require auth and owner scope. Client prescriptions are ignored. Completion rejects conflicting workout correlation, retains planned/actual truth, and uses stable event identities for both ordinary completion and comeback. Unauthorized lookup is non-enumerating (404).

## Merge Readiness
**READY WITH KNOWN MOBILE-VERIFICATION LIMITATION**, with the documented full regression result green. Required normal, makeup, duplicate, gamification, reschedule, route, and ownership evidence is green.

## Recommended Next Phase
Approve authoritative four-day programming allocation, then execute the committed mobile suite in browser-enabled CI and perform accessibility/one-hand usability review on physical iOS/Android devices.
