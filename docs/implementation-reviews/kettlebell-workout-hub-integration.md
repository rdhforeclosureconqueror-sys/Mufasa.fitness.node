# Kettlebell Workout Hub Integration

## Summary
The 8-Week Kettlebell Strength & Power Challenge now hands an owner-scoped deterministic runtime to the existing `/workout.html` Pocket PT / Ma’at 2.0 hub. The former full-page kettlebell presentation was replaced by a workout-source adapter: it selects the challenge, projects Today’s Workout, its education cards, and commitment workout dates, then delegates camera and speech to the hub.

## Scope
This phase establishes discovery, handoff, selection, schedule/detail projection, and the intro/countdown start contract. It deliberately excludes pose checkpoints, rep qualification/counting, camera tempo validation, and form scoring.

## Existing Workout Hub Audit
- **Shell/URL:** `public/workout.html`, served as `/workout.html`.
- **Entry points:** the inline hub bootstrap plus `workout-runtime.js`, `workout-progression-runtime.js`, `workout-performance-runtime.js`, `runtime-orchestrator.js`, and `button-runtime.js`.
- **API client:** `public/api-client.js`, configured by `__MAAT_RUNTIME_CONFIG__.backendOrigin` and responsible for auth header propagation.
- **Selector/programs:** `#workoutSelect`, inline canonical selection, `fitness.js`, current-program APIs, static templates, and recommendation projection.
- **Calendar/Today:** `#calendarView`, `#workoutPlanView`, `calendar.js`/inline retention hydration; recommendations remain separate.
- **Camera:** the existing `#connectBtn`, `workout-runtime.js`, pose runtime, and the hub’s `getUserMedia` lifecycle.
- **Voice/coach:** `workout-coach-runtime.js` and `coach-runtime.js`, controlled by the existing Workout Voice and Guided Coach toggles.
- **Exercise rendering/start:** canonical selection is displayed in `#workoutPlanView`; `#startBtn` owns the hub start affordance.
- **Persistence/completion:** owner-scoped session service endpoints persist runtime progress and perform idempotent authoritative completion with commitment correlation and server-owned rewards.

## Root Cause of Workout Unavailable Error
`public/kettlebell-workout-runtime.js` called `window.MaatApiClient.request(...)`, but `public/workout.html` did not load `public/api-client.js`. On Safari the deferred adapter reached its load callback with `MaatApiClient` undefined, producing the observed `.request` exception. The shell now loads the existing canonical client before the deferred adapter. The adapter defensively diagnoses a missing client, logs structured context, and renders a stable friendly message rather than a raw exception. No second client was introduced.

## Architecture Decisions
Pocket PT remains the only workout execution surface. `kettlebell-workout-runtime.js` is now an adapter into existing hub DOM/controllers, not an overlay or camera/timer engine. The deterministic runtime ID remains the correlation key; canonical workout content remains server-projected.

## Challenge → Workout Handoff
The challenge starts/resumes the server runtime first, then navigates to `/workout.html` with runtime, source, enrollment, and commitment-session identifiers. These are correlation hints only; the browser cannot submit a prescription.

## Workout Selector Integration
An owned, successfully resolved challenge runtime adds and preselects “8-Week Kettlebell Strength & Power Challenge.” Existing choices remain intact. The option is not exposed without an owner-authorized runtime response, and recommendations are not activated.

## Calendar Integration
The adapter reads the owner-scoped current challenge projection and filters its single commitment schedule to workout entries. Scheduled, completed, and today states are displayed. Recovery entries are intentionally excluded from mandatory workout status. A date retains its commitment-session identity.

## Today’s Workout Projection
The current runtime’s canonical workout supplies title, week, duration, purpose, activity count, order, and prescription. It is placed in the existing Today’s Workout container and scrolled into view on challenge handoff.

## Exercise Card Projection
Cards use `activity.education.media`, which the backend derives through `data/challenges/kettlebellExerciseEducation.js`. They display sets/rounds, work/reps, rest, tempo, and a canonical cue. The full card is a button opening Movement Intelligence. No JPG filename appears in frontend code.

## Camera Integration
No camera manager was added. Connect Camera remains the existing Pocket PT control. Basic challenge start does not call `getUserMedia`; denial or lack of support therefore cannot discard canonical state, and the UI explicitly says camera is optional.

## Guided Coach Integration
Start delegates to `WorkoutCoachRuntime.prepareSet` and `workStarted`. Existing persisted Workout Voice/Guided Coach controls govern narration. The canonical exercise object supplies name, prescription/tempo, and education. The existing coach implements the sequential 3–2–1 countdown.

## Start / Resume Behavior
The server start route deterministically creates or resumes `kb_<enrollment>_<commitment-session>`. Direct refresh reads that owner-scoped runtime. The first saved exercise index is restored; pressing the existing Start Workout button persists countdown and working phases around the existing coach intro.

## Server Authority
Session GET/PATCH and completion routes validate ownership and canonical bounds. The adapter never constructs exercises, changes order, accepts completion, or awards progress. Tempo is displayed and passed to the coach but is not camera-validated.

## Routes / APIs
- `POST /api/me/challenges/:userChallengeId/commitment-sessions/:sessionId/start-workout`
- `GET /api/sessions/:id`
- `PATCH /api/sessions/:id/runtime-progress`
- `POST /api/sessions/:id/complete`
- `GET /api/me/challenges/8-week-kettlebell-strength-power/current`

## Data Model Changes
None. Existing source metadata, canonical workout snapshot, runtime progress, commitment schedule, and completion correlation are reused.

## Ownership / Security
All challenge, runtime, schedule, progress, and completion reads/writes remain authenticated and owner-scoped. A guessed or cross-user runtime/enrollment is not projected. Query parameters do not grant authority.

## Mobile Behavior
Cards collapse to one column and calendar dates to two columns below 600px. Controls are full-card touch targets; existing safe-area and overflow rules remain. Contract coverage includes 320, 375, 390, and 430 px expectations.

## Accessibility
Today’s Workout has an associated heading; cards are labeled buttons; status updates use `role=status`; load failure uses `role=alert`; the education view is a native dialog with a close control; images retain registry alt text.

## Tests Added
`test/kettlebell-workout-hub-integration.test.js` covers client order, handoff, selector/detail/calendar/media contracts, coach/camera reuse, resume, and safe errors. The previous kettlebell runtime UX contract was updated to reject a standalone camera engine.

## Tests Run
- `node --test test/kettlebell-workout-hub-integration.test.js test/kettlebell-commitment-routes-ui.test.js test/kettlebell-workout-runtime-ux.test.js`
- Full suite and lint results are recorded in the final delivery.

## Route Verification
Local authenticated route tests validate join/reschedule/start, attacker denial, runtime completion, and idempotent duplicate completion. Production was not mutated.

## Authenticated Verification
The fixture-auth integration uses distinct owner and attacker tokens and passes the owner start/completion plus cross-user denial path.

## Rendered Browser Status
Rendered browser executed: NO. Playwright browser availability was not assumed; CI-ready mobile coverage remains in `e2e/kettlebell-workout-runtime-mobile.spec.js` and requires fixture updates for the unified hub.

## Binary Status
No binary file was added, copied, renamed, regenerated, or modified.

## Regression Risks
The large legacy inline workout bootstrap can re-render Today’s Workout or calendar after challenge projection. The adapter runs after hub load and uses the capture phase for the challenge Start action, but future hub extraction should provide a formal workout-source registry rather than shared DOM integration.

## Known Limitations
Calendar clicks report whether a different challenge date must be opened from the challenge page rather than switching/starting that session in place. This phase starts the first incomplete exercise but does not implement set advancement/completion UI, pose checkpoints, rep recognition, or tempo validation. Rendered iPhone Safari verification remains required after deployment.

## Merge Readiness
Code, focused route/security tests, documentation, and binary checks are required before merge. Deployment verification remains a human/release activity.

## Recommended Next Phase
**Canonical Movement Checkpoints + Pose-State Contract**: define server-approved exercise-specific movement stages and an integration boundary for the existing pose runtime without adding a second workout or camera engine.
