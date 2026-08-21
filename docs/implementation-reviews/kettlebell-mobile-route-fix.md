# Kettlebell Mobile Route Fix

Date: 2026-08-21

## Root cause

The dashboard ran on the separately hosted static frontend, `https://mufasafitsite.onrender.com`, but constructed the active-challenge CTA as `/challenges/8-week-kettlebell-strength-power`. Relative navigation therefore asked the **frontend static service** for a clean Express route. That route exists only in the Node service (`server.js`: `GET /challenges/:slug`), not as a static file. The frontend host consequently returned its plain `Not Found` fallback before the Node challenge handler could run. This is a deployment-topology/route-resolution defect, not a CSS or iOS-specific defect.

There was no mobile-only CTA branch: the same anchor and assignment in `public/dashboard.js` served all viewport sizes. The browser performed ordinary anchor navigation; the failing host selection resulted from the same-origin relative clean URL.

## URL evidence

- Exact broken relative URL: `/challenges/8-week-kettlebell-strength-power`
- Exact broken absolute URL on the observed dashboard: `https://mufasafitsite.onrender.com/challenges/8-week-kettlebell-strength-power`
- Exact corrected relative URL: `/challenge.html?slug=8-week-kettlebell-strength-power`
- Exact corrected absolute URL: `https://mufasafitsite.onrender.com/challenge.html?slug=8-week-kettlebell-strength-power`
- Host: same origin as the dashboard; no query parameters other than the canonical `slug`.

## Files changed and route trace

1. `public/dashboard.js` passes the API-returned canonical slug to the shared route contract.
2. `public/challenge-route-contract.js` creates `/challenge.html?slug=<encoded slug>` and reads that same slug on the destination page. It retains parsing support for the Node service's `/challenges/:slug` URL.
3. `public/challenge.html` loads the contract and canonical API client and identifies `https://mufasa-fitness-node.onrender.com` as the intended backend.
4. `public/challenge-page.js` reads the contracted query slug and sends definition, active enrollment, commitment, activity, and start-workout calls through `MaatApiClient` to the Node backend rather than accidentally sending them to the static frontend.
5. `server.js` already registers `GET /challenges/:slug`, `GET /api/challenges/:slug`, the authenticated commitment routes, and static middleware. The corrected static-host URL is served by `express.static` locally and by the frontend deployment as the concrete `challenge.html` file.
6. `test/kettlebell-dashboard-link-contract.test.js` uses the URL produced by the shared generator itself, requests it from the real Express app, recovers its slug, and requests the matching challenge definition. It rejects a 404 or slug drift.

End-to-end: dashboard `GET /api/me/challenges/active/current` → canonical slug → `/challenge.html?slug=8-week-kettlebell-strength-power` on the frontend → `challenge.html` → `challenge-page.js` → backend `GET /api/challenges/8-week-kettlebell-strength-power` and `GET /api/me/challenges/active/current` → Week 1 commitment cards → authenticated `POST /api/me/challenges/:userChallengeId/commitment-sessions/:sessionId/start-workout` → `/workout.html?sessionId=...`.

## Route contract evidence

| Source | Generated URL | Expected route | Result |
|---|---|---|---|
| Dashboard active challenge CTA | `/challenge.html?slug=8-week-kettlebell-strength-power` | `GET /challenge.html` (static frontend document) | PASS locally; production pending deployment |
| Challenge definition | `/api/challenges/8-week-kettlebell-strength-power` | `GET /api/challenges/:slug` | PASS locally |
| Challenge exercise education | `/api/exercises/:exerciseId` | `GET /api/exercises/:exerciseId` | PASS in full regression suite |
| Start Workout | `/api/me/challenges/:userChallengeId/commitment-sessions/:sessionId/start-workout` | `POST /api/me/challenges/:userChallengeId/commitment-sessions/:sessionId/start-workout` | PASS locally |

## Host and navigation audit

- `public/dashboard.html` and `public/api-client.js` intentionally map browser API calls from `mufasafitsite.onrender.com` to `mufasa-fitness-node.onrender.com`.
- `fitness.js`, `exercise-library.js`, `profile-write-runtime.js`, diagnostics scripts, and their tests contain the backend hostname for API/assets or diagnostics; none constructs this CTA.
- No `localhost`, alternate Render host, `window.location`, `location.href`, `window.open`, touch-handler, iOS branch, PWA, or responsive-template code constructs the dashboard challenge CTA.
- `location.href` remains in the challenge page only for the server-authoritative workout runtime handoff and login navigation, not for opening the challenge.

## Deployment state

### Local

- Branch before this fix commit: `work`
- Starting commit: `69ed3e7`
- Reported prior commit `dd723c33176fc7172d73288d7a6631002caf611e`: **does not exist in this local object database**, and therefore is not on the current branch.

### Remote

- Configured Git remote: **NO** (`git remote -v` returned no entries).
- Was `dd723c...` pushed: **UNKNOWN**; this checkout provides no remote evidence.
- Is `dd723c...` on Render's deployed branch: **UNKNOWN**.

### Production

- Live frontend host: `https://mufasafitsite.onrender.com`
- Intended backend host: `https://mufasa-fitness-node.onrender.com`
- Production commit/build: **UNKNOWN**. Outbound HTTPS probes were blocked by the environment proxy with HTTP 403 before reaching Render.
- The fix is not claimed deployed or physically verified. A normal Git environment must push this fix commit to the branch connected to the frontend Render service, confirm a successful deployment, and repeat the iPhone Safari flow.

## Tests and mobile status

- Added a connected URL generation → served page → recovered slug → challenge API contract test.
- Existing challenge route, Week 1 canonical workout, commitment ownership, exercise education, workout handoff/integration, and security tests remain in the full suite.
- `npm run lint`: PASS.
- `node --test test/kettlebell-dashboard-link-contract.test.js test/kettlebell-commitment-routes-ui.test.js test/kettlebell-workout-integration.test.js`: 9 passed, 0 failed.
- `npm test`: 1,186 passed, 0 failed, 0 skipped.
- `npm run test:e2e:mobile`: not executed; `npx` received HTTP 403 while downloading Playwright.
- Playwright mobile specification is retained at `e2e/kettlebell-challenge-mobile.spec.js`.
- Rendered browser executed: NO. Browser/live requests are blocked by HTTP 403 in this environment; Node contract tests are not represented as physical-mobile verification.

## Known limitations and merge readiness

Local implementation and automated checks are merge-ready. Production is not verified and will remain broken until the commit is pushed and the correct frontend service deploys it. After deployment, verify the response URL, status, build metadata, authenticated Week 1 cards, exercise education, and Start Workout on a physical iPhone. Do not begin benchmark work until that verification passes.
