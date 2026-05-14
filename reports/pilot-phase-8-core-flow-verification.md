# Phase 8 — Core Fitness Flow Verification

Date: 2026-05-14  
Branch: `work`  
Scope: Phase 8 only — verification and evidence collection for the controlled pilot journey.  
Change posture: report-only. No product features, auth/session/payment changes, avatar/3D changes, data edits, package-lock edits, or legacy/shadow frontend edits were made.

## Executive summary

Phase 8 is **PARTIAL / ready for human review**.

Automated backend and static verification cover the required pilot flow APIs, route registration, feature gates, and operational checks. The main limitation is that this environment did not include browser automation, so browser-only visual checks are marked **manual required** rather than claimed as fully verified. No blocking pilot-flow bug was discovered during this verification pass.

## Files changed

| File | Reason |
| --- | --- |
| `reports/pilot-phase-8-core-flow-verification.md` | Phase 8 required evidence report. |

## Files intentionally not changed

No changes were made to `server.js`, `public/`, `src/`, root-level legacy/shadow frontend files, `data/`, `package-lock.json`, avatar/3D files, or payment expansion files.

## Verification environment notes

- No browser automation tool was available in this run. Browser-only checks are explicitly marked **PARTIAL** with “manual required” notes.
- API verification was based on the existing Node test suite and static route inspection.
- The local default `npm run ops:preflight` failed due to missing local pilot/production environment variables, as documented. The documented Phase 3 minimal passing command was then run and passed.
- `npm run pilot:nonsecurity-checks` invokes selfcheck and the full Node test suite internally after its static checks.

## Evidence table

| Step | Route/page/API | Auth required? | Expected result | Evidence source: test/manual/script/static inspection | Result: PASS/PARTIAL/FAIL | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | `/` root app page | No for shell | App/root page loads with avatar disabled by default. | Static inspection + tests | PARTIAL | Server root injects `__ENABLE_AVATAR_FEATURE__` from the avatar feature flag, which defaults false; `/avatar-runtime.js` returns `FEATURE_DISABLED` when disabled. Browser visual confirmation is manual required because no browser automation was available. |
| 2 | `POST /api/auth/login` | No | Login succeeds using pilot auth env. | `npm test` / `test/pilot-login.test.js` | PASS | Existing tests set `PILOT_LOGIN_PASSWORD`, submit pilot credentials, and assert 200 with token and normalized pilot email. |
| 3 | `GET /api/auth/me` | Yes | Returns current user. | `npm test` / `test/pilot-login.test.js` + static inspection | PASS | Existing tests assert valid token returns user identity and missing/invalid token returns 401. |
| 4 | `GET /api/me/profile` | Yes | Profile loads. | `npm test` / `test/pilot-login.test.js`, `test/session-api.test.js` | PASS | Existing tests assert protected profile route rejects missing token and succeeds with valid token; default normalized profile shape is covered. |
| 5 | `PUT /api/me/profile` | Yes | Profile save works without avatar. | `npm test` / `test/session-api.test.js` | PASS | Existing test explicitly covers profile save while avatar is disabled by default. |
| 6 | `POST/GET /api/client-intake` | Yes | Client intake can be saved and loaded. | `npm test` / `test/retention-api.test.js` | PASS | Retention flow test saves client intake and reloads it. |
| 7 | `POST/GET /api/goals-baseline` | Yes | Goals/baseline can be saved and loaded. | `npm test` / `test/retention-api.test.js` + static route inspection | PASS | Test saves goals/baseline and verifies stored user state; static route inspection confirms GET route. |
| 8 | `GET /api/programs/current` | Yes | Current program route responds. | Static inspection + adjacent `npm test` program assignment coverage | PASS | Server registers authenticated current-program route. Existing retention test assigns a program and verifies program persistence; direct current-route status is route-inspected. |
| 9 | `/exercise-library.html`, `public/exercise-db/*` | No for static page/assets | Exercise library static page/assets are available. | Static inspection command | PASS | `public/exercise-library.html` and `public/exercise-db/index.json` exist; local index contained 873 exercises and exercise asset files are present. |
| 10 | `GET /api/exercises/index`, `/api/exercises/search`, `/api/exercises/:slug` | No | Exercise API index/search/detail works if available. | Static inspection + diagnostics/test coverage | PASS | Server registers all three exercise API routes; diagnostics tests hit index/search. Local static inspection confirmed index availability. Detail route is available when slug metadata includes JSON. |
| 11 | `POST /api/sessions` | Yes | Authenticated session create works. | `npm test` / `test/session-api.test.js` | PASS | Existing session API test starts a session, asserts 201, and verifies persistence. |
| 12 | `POST /api/sessions/:id/reps` | Yes | Authenticated rep update works. | `npm test` / `test/session-api.test.js` | PASS | Existing test starts a session, posts rep update, asserts 200, and verifies one persisted rep update. |
| 13 | `POST /api/sessions/:id/complete` | Yes | Authenticated session complete works. | `npm test` / `test/session-api.test.js` | PASS | Existing test completes a session, asserts 200, summary reps, ended timestamp, and event command. |
| 14 | `GET /api/me/history`, dashboard data via progress route | Yes | Dashboard/history route returns updated data. | `npm test` / `test/session-api.test.js`, `test/retention-api.test.js` | PASS | Existing tests complete a session and assert `/api/me/history` has completed session data; retention test asserts progress dashboard returns updated workout/reward data. |
| 15 | `POST/GET /api/check-ins` | Yes | Weekly check-in can be saved and loaded. | `npm test` / `test/retention-api.test.js` | PASS | Existing retention flow test saves a weekly check-in, loads check-ins, and asserts count is 1. |
| 16 | `GET /api/progress/dashboard` | Yes | Progress dashboard responds. | `npm test` / `test/retention-api.test.js` | PASS | Existing retention flow test asserts 200 plus workouts completed, reward summary, streak, weekly review, coach messages, and progress narrative fields. |
| 17 | `GET /api/me/membership` | Yes | Membership route returns inactive/free if no membership. | `npm test` / `test/billing-api.test.js` | PASS | Existing billing test asserts authenticated no-membership response is inactive/free with null Stripe fields. |
| 18 | `POST /api/billing/create-checkout-session` | Yes | Billing checkout rejects when Stripe env is missing and works with mocked/test-safe Stripe config if tests support it. | `npm test` / `test/billing-api.test.js` | PASS | Existing tests assert missing Stripe env returns `BILLING_CONFIG_MISSING` without calling the Stripe client, and mocked config returns a checkout URL using server-side price id. |
| 19 | `/api/admin/diagnostics/report`, `/api/admin/diagnostics/recent` | Yes, admin/ops permission | Admin diagnostics rejects unauthenticated/non-admin and accepts admin token. | `npm test` / `test/diagnostics-api.test.js` | PASS | Existing diagnostics test asserts unauthenticated 401, non-admin 403, and admin token success for report/recent routes. |
| 20 | `POST /api/speak` | Conditional | TTS behavior documented for `ENABLE_TTS_NO_AUTH=false` and upstream env availability. | Static inspection | PASS | Route requires auth when `ENABLE_TTS_NO_AUTH=false`; it requires non-empty text and proxies to `AIVOICE_URL`/`OPENVOICE_UPSTREAM_URL` or default upstream with optional `AIVOICE_API_KEY`. Upstream live availability was not exercised. |
| 21 | `POST /command` | Legacy compatibility varies by action/config | Legacy fallback remains available but is not required for main pilot journey. | `npm test` / `test/session-api.test.js`, `test/session-write-client.test.js` | PASS | Existing tests verify legacy `/command` adapter for session start/rep update with deprecation headers and client fallback behavior. |
| 22 | Required project checks | N/A | `npm test`, lint, pilot checks, and ops preflight results recorded. | Required commands | PARTIAL | Tests, lint, and pilot nonsecurity checks passed. Local default `npm run ops:preflight` failed due missing env, then documented Phase 3 env command passed. |

## Command results

| Command | Result | Evidence / notes |
| --- | --- | --- |
| `git status --short` | PASS | Clean before report creation; produced no entries. |
| `npm test` | PASS | 151 tests passed, 0 failed. |
| `npm run lint` | PASS | `scripts/selfcheck.js` reported `✅ selfcheck ok`. |
| `npm run pilot:nonsecurity-checks` | PASS | Static pilot checks passed, lint passed, and nested full test suite passed. |
| `npm run ops:preflight` | EXPECTED LOCAL FAIL | Failed with missing local pilot env: bootstrap super-admin, auth token secret, pilot login password, login seed email, TTS no-auth hardening, auth bridge hardening, and warnings for local origins/trust modes. This matches the documented behavior for missing hardening env. |
| Documented Phase 3 passing ops preflight command | PASS | Ran the documented minimal passing command with env vars from `docs/pilot-auth-environment.md`; preflight returned `ok:true`, no issues, no warnings, `readyForPilot:true`. |

## Test results detail

- `npm test`: **PASS** — 151 passing tests, 0 failing.
- `npm run lint`: **PASS** — selfcheck OK.
- `npm run pilot:nonsecurity-checks`: **PASS** — pilot static checks, lint, and nested full test suite passed.
- `npm run ops:preflight`: **PARTIAL** — local env intentionally incomplete; command failed with missing env issues.
- Phase 3 documented ops preflight command: **PASS** — hardened env sample passed.

## Core pilot flow status

**Overall: PARTIAL**

Rationale:
- Backend/API journey, persistence, auth protection, admin diagnostics, membership/billing guardrails, legacy fallback availability, and required command checks are verified by tests/static inspection.
- Browser-only visual confirmation for the app root and avatar-disabled user experience remains manual required because no browser automation was available in this environment.
- No blocking bug was found.

## Blocking issues

None found in Phase 8 verification.

## Non-blocking risks

1. Browser visual journey still needs human/manual confirmation because no browser automation was available.
2. `/api/speak` upstream availability was documented from route behavior but not live-tested against the external upstream/API key.
3. The default local shell environment is not pilot-ready for `ops:preflight`; operators must set the documented Phase 3 hardening env before pilot/production approval.
4. Exercise detail route depends on index entries with JSON metadata; static index/assets are present, but no new focused API detail test was added because Phase 8 stayed report-only.

## Rollback notes

This phase only adds a report. Rollback is safe by deleting:

```sh
rm reports/pilot-phase-8-core-flow-verification.md
```

No runtime code, data files, package manifests, frontend files, avatar/3D files, auth/session/payment behavior, or lockfiles were changed.

## Ready for human approval?

Yes — Phase 8 is ready for human approval as a **PARTIAL** verification report, with manual browser verification explicitly called out and no blocking issues identified.
