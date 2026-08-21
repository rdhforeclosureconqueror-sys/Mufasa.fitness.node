# Summary

This reliability phase repairs the existing challenge-library, generic enrollment, kettlebell commitment, and legacy-enrollment paths without changing canonical kettlebell programming or the server-authoritative Start Workout integration.

# Repository Starting State

Work began on branch `work` at merge commit `8c8896b`, whose parent feature commit `3580dbb` contains the static-safe `/challenge.html?slug=...` route contract. The repository was clean. The deployment topology is a static frontend at `https://mufasafitsite.onrender.com` and the Node API at `https://mufasa-fitness-node.onrender.com`. `public/api-client.js` is the canonical cross-origin API client and deliberately sends bearer authentication in the Authorization header with `credentials: "omit"`.

# User-Observed Failures

* The static challenge library shell rendered but its relative `fetch('/api/challenges')` targeted the static host, then discarded all failure detail.
* Every challenge detail rendered the kettlebell-only commitment form, although the backend created schedules only for `challenge_kettlebell_8_week`.
* After generic join, the UI fetched a global active challenge. With multiple active challenges this could return a different enrollment, causing the form to re-render with no success explanation.
* Existing kettlebell enrollments without `commitment` and `commitmentSchedule` had no recovery write path and exposed internal migration language.
* Weekday controls inherited dark styling without an explicit readable foreground in the unselected state.
* Start-date defaults used UTC `toISOString()` rather than the browser's local calendar date.

# Root Causes

The failures shared two contract mismatches: the library bypassed the canonical deployed API client, and the challenge page treated a kettlebell-specific schedule contract as generic. In addition, `joinChallenge` returned an existing legacy enrollment before it could build missing commitment data, while `/active/current` was not challenge-scoped. Submit errors were technically placed in a status node, but the disabled button never displayed a submitting label and the post-submit wrong-active projection looked like a no-op.

# Challenge Library Fix

`public/challenges.html` now loads runtime/auth/API/route-contract scripts and pins the configured backend origin through the same deployment configuration convention as the detail page. `public/challenges.js` calls `MaatApiClient.request('/api/challenges', { auth:false })`, receives `{ data: { challenges } }`, and builds static-safe detail URLs. Development diagnostics log endpoint, status, failure class, and safe server error code; the production-facing copy remains friendly.

Request trace: `/challenges.html` → `public/challenges.js:load` → canonical API URL `https://mufasa-fitness-node.onrender.com/api/challenges` → `GET`, no credentials cookie, no auth requirement → `200 {ok, data:{challenges}}` → cards. Failures go to structured `console.error` and `Challenges are temporarily unavailable.`

# Commitment Form Fix

The commitment form is now intentionally limited to the kettlebell definition, matching the current backend architecture. Push-Up, Squat, Plank, and future standard definitions use their published daily challenge flow and a direct Join Challenge action rather than receiving inaccurate eight-week commitment UI. Challenge-scoped current-state reads prevent another active enrollment from masking a successful join.

Kettlebell form state has a single checked-input source of truth, enforces exactly N unique days, prevents a fourth selection, supports deselection, preserves inputs after server errors, and shows explicit submitting, validation, server-error, and success transitions.

# Legacy Kettlebell Recovery

An existing owned kettlebell participation missing commitment fields is recognized by the existing join route. A valid setup attaches `commitment` and the 56-entry `commitmentSchedule` to that same record. It preserves the enrollment id, current day/week, completion percentage, XP, day logs, activity logs, and history. Once attached, retries return the existing participation without creating a schedule or enrollment. User copy says the challenge was upgraded and explicitly promises progress preservation; internal “predates commitment scheduling” wording was removed.

# Date Handling

The browser produces date-input defaults from local year/month/day components, not UTC serialization. The scheduler validates date-only strings and performs deterministic UTC calendar arithmetic only after preserving the literal date. A regression proves `2026-08-21` remains Friday and that Friday/Sunday/Tuesday remain the selected weekly schedule.

# Accessibility Fixes

All seven native checkbox controls have accessible weekday names, keyboard behavior, and checked semantics. Labels use explicit high-contrast light backgrounds/dark text, a two-pixel border, a 52px touch target, a visible focus ring, and a checkmark plus selected styling so state is not communicated by color alone. Disabled styling remains readable. The existing responsive grid changes to four columns under 600px and avoids horizontal overflow.

# Files Changed

* `public/challenges.html`, `public/challenges.js`: canonical deployed API and static route integration.
* `public/challenge-page.js`, `public/challenges.css`: correct generic/commitment flows, submit feedback, local dates, and accessible weekdays.
* `src/services/challengeEngineService.js`: challenge-scoped projection and idempotent legacy attachment.
* `server.js`, `config/route-authorization-contract.js`: owner-scoped current-enrollment endpoint and authorization inventory.
* `test/challenge-enrollment-reliability.test.js`: reliability, auth, ownership, migration, date, and frontend contracts.
* `docs/implementation-reviews/challenge-enrollment-reliability-phase.md`: durable review.

# Routes / APIs

| Method | Actual route | Auth | Result |
|---|---|---|---|
| GET | `/api/challenges` | Public | Published challenge library |
| GET | `/api/challenges/:slug` | Public | Published definition |
| POST | `/api/me/challenges/:slug/join` | Required/self | Creates standard participation or kettlebell schedule; upgrades owned legacy kettlebell record |
| GET | `/api/me/challenges/:slug/current` | Required/self | New challenge-scoped joined projection, private/no-store |
| GET | `/api/me/challenges/active/current` | Required/self | Preserved dashboard active projection |
| PATCH | `/api/me/challenges/:userChallengeId/commitment-sessions/:sessionId/reschedule` | Required/owner | Preserved recovery-safe reschedule |
| POST | `/api/me/challenges/:userChallengeId/commitment-sessions/:sessionId/start-workout` | Required/owner | Preserved canonical server-authoritative workout allocation |

# Data Model Changes

No schema migration or destructive reset is introduced. Legacy records gain the already-established `commitment` object and `commitmentSchedule[]` fields in place. All historical fields and related log collections remain intact.

# Tests Added

Six reliability tests cover static-host API selection and failure diagnostics; weekday markup/state/validation/submission contracts; Friday date preservation; legacy progress preservation and idempotency; authenticated Push-Up and Squat positive joins with independently scoped projections; and route-level authentication/cross-user denial/retry behavior.

# Tests Run

* `npm run lint` — passed.
* Focused 10-suite challenge/workout/persistence/gamification/security command — 48 passed, 0 failed.
* `node --test test/challenge-enrollment-reliability.test.js` — 6 passed, 0 failed.
* `npm test` — 1192 passed, 0 failed, 0 skipped.
* Playwright package resolution — unavailable; no install was attempted.

# Authenticated Positive-Path Verification

The server test fixture logs in a real authenticated test user, joins both `push-up-21` and `squat-21` with `POST /api/me/challenges/:slug/join` (201), then reads each independently through `GET /api/me/challenges/:slug/current` (200). Existing kettlebell integration also authenticates, creates a commitment, reschedules, starts the canonical Week 1 workout, completes it, and verifies duplicate completion idempotency.

# Security / Ownership Verification

The new current route uses `requireAuth`, returns private/no-store data, and is inventoried as authenticated-user-self. An unauthenticated read returns 401. Existing cross-user commitment mutation returns 404. Recovery locates legacy records through both authenticated user id and challenge id; it cannot attach a schedule to another user's enrollment.

# Mobile Verification

Rendered browser executed: NO

Playwright is declared by the E2E configuration but `playwright/test` is not installed in the current environment. Static responsive/accessibility contracts and the existing mobile E2E spec remain ready for a CI/developer environment with Playwright. No claim of rendered verification is made.

# Known Limitations

* A real deployed iPhone Safari smoke test is still required after both static and Node services deploy this commit.
* Standard 21-day challenges intentionally retain their current daily-program model; they do not persist commitment schedules because current definitions and server behavior establish that system only for kettlebell.
* The generic joined view reports the current published mission but does not add new workout/camera/card features, per phase boundaries.

# Regression Risks

The main risk is static frontend and backend deploying at different revisions. Cache/version invalidation should be confirmed for `challenges.html`, `challenges.js`, and `challenge-page.js`. Existing global active-current behavior remains unchanged for the dashboard, while detail pages now use the scoped endpoint.

# Merge Readiness

Ready for human review: lint, focused regression, and full regression pass. Deployment/mobile rendered smoke testing remains an explicit post-deploy verification, not a code blocker.

# Recommended Next Phase

Deploy both services together, run the physical iPhone/desktop matrix, and execute the existing Playwright mobile suite in CI. Do not begin benchmark, camera, exercise-card, or checkpoint work until that smoke test confirms library loading, legacy upgrade, and canonical Start Workout navigation.
