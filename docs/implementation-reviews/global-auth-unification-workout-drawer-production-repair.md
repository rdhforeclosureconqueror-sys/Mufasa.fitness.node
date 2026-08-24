# Global Auth Unification and Workout Drawer Production Repair

## Summary
This production-only repair makes `/login.html` the single authentication UI, retires the Run Club form to a redirect-only alias, resolves auth requests against the configured API origin, and removes the workout page's horizontal flex sibling interaction with the injected global header. No workout feature, camera, challenge, membership, or media behavior was redesigned.

## Human Production Evidence
Real iPhone Safari showed Sign Out and Home Login reaching different forms, both reporting “Unable to sign in,” and `/workout.html` becoming a narrow right column when the left menu opened. This evidence is authoritative; no rendered browser was available locally.

## Root Cause — Duplicate Auth Surfaces
`public/login.html`/`login.js` and `public/run-club-login.html`/`run-club-login.js` were two independent forms. Greatness entry/guard/sign-out links targeted the Run Club form while global navigation targeted `/login.html`; Home's “Member Login” targeted `/workout.html`, relying on a later guard. The competing owners had different request/configuration and post-login behavior.

### Authentication entry/exit audit
| Source | Previous destination/owner | Canonical? | Action |
|---|---|---:|---|
| `public/global-nav.js` Sign In/Create Account | `/login.html` | Yes | Retained; Sign Out returns to `/login.html?signedOut=1`. |
| `public/index.html` Member Login buttons | `/workout.html` | No | Routed directly to `/login.html`. |
| `public/stepping-into-greatness.html` and `.js` | `/run-club-login.html?returnTo=...` | No | Routed to `/login.html?returnTo=...`. |
| `public/greatness-entry-auth.js` guard | `/run-club-login.html?returnTo=...` | No | Routed to canonical login with safe return path. |
| `public/greatness.js` Sign Out | `/run-club-login.html` | No | Routed to `/login.html?signedOut=1`. |
| `public/challenge-page.js` unauthenticated joins | `/login.html` | Yes | Retained. |
| `public/run-club-login.html` | Separate Join/Sign In form | No | Replaced with query-preserving redirect-only alias; contains no form. |
| auth-state runtime guards/restoration | Canonical in-memory/storage state | Yes | Retained; invalid state and logout clear aliases and identity. |
| membership/global member navigation | Global nav `/login.html` | Yes | Retained. |

## Root Cause — Sign-In Failure
The canonical `login.js` posted to the relative `/api/auth/login`. In split frontend/API production hosting this reached the frontend origin rather than the configured Node backend, unlike the legacy flow that loaded runtime configuration/API-client resolution. The generic catch collapsed HTTP, parse, storage, verification, and wrong-origin failures into “Unable to sign in.” The repair loads `runtime-config.js` and `api-client.js`, resolves login/register against `MaatApiClient.resolve()` (with configured-origin fallbacks), distinguishes safe UI messages, and publishes structured diagnostics containing only build, operation, endpoint origin, status, request ID, failure code, stage, and timestamp—never email, password, response body, or token.

## Root Cause — Workout Split-Screen Drawer
`workout.html` declared `body { display:flex }` with the default `flex-direction: row`. Global navigation dynamically prepends its header as a direct body child, making the header and `.app` horizontal flex siblings. The header therefore consumed a left flex column and compressed the workout into the right column. The drawer itself being fixed did not remove its parent header from that sibling calculation. The page now uses a vertical body flex stack and centers `.app`; shared CSS explicitly fixes drawer/backdrop, prevents the injected header from shrinking/growing into a column, and guarantees the open-state main has no translation or left compensation.

## Canonical Auth Route
The authoritative route is **`/login.html`**. Registration is the same surface at `/login.html?mode=register`.

## Legacy Auth Redirects
`/run-club-login.html` remains only as a backwards-compatible static redirect to `/login.html`, preserving safe query parameters. It renders no auth form and loads no duplicate auth logic. All in-repository callers were migrated.

## Sign-In Flow
The canonical page resolves the configured backend, posts the existing email/password/Remember Me payload, parses the response, persists through `AuthStateRuntime`, verifies `/api/auth/me`, hydrates the returned authenticated user, and applies a same-origin relative `returnTo` or `/dashboard.html`. Structured diagnostics identify the failed stage without credentials or raw tokens.

## Sign-Out Flow
Every visible global/Greatness Sign Out calls `AuthStateRuntime.logout()`. It attempts `/api/auth/logout`, clears canonical session/local state, retired aliases, origin/consent state, account-scoped browser caches, backend-validated token state, and in-memory member/role/read models, then assigns `/login.html?signedOut=1` even if revocation is unavailable.

## Remember Me Behavior
Unchecked is the HTML default and writes only `sessionStorage.maatAuthToken`, with no local token or persistence marker. Checked writes `localStorage.maatAuthToken` and the exact `maatAuthPersistence=persistent` marker. Startup rejects and deletes a local token without that marker.

## Drawer DOM/CSS Architecture
The global header contains a toggle, a fixed backdrop button, and a fixed navigation panel. Below 850 px the panel uses fixed viewport inset, bounded width, independent vertical scrolling, safe-area padding, and the highest drawer z-index. The backdrop is fixed across the viewport. Opening applies body overflow/touch lock; backdrop and Escape close; focus enters the drawer and returns to Menu.

## Workout-Specific Layout Interaction
The body is now a column flex container, and `.app` remains `width:100%` with auto horizontal margins. Neither drawer nor backdrop participates in flow. Shared open-state rules explicitly preserve main width and zero left offset/transform. Static contract checks cover 320, 375, 390, and 430 px.

## Cache/Deployment Asset Version
All 22 active public HTML surfaces load the shared auth/nav assets with **`20260824-auth-unified-drawer-v2`**. The redirect-only legacy HTML intentionally loads none. Auth runtime, global nav, login runtime, the login body data attribute, and drawer data attribute expose this identifier. No service worker was added.

## Files Changed
Shared auth/navigation runtimes and CSS; canonical/legacy auth HTML; workout and authentication entry HTML/JS; 22 active public HTML cache references; affected auth/navigation/Greatness/static-build tests; and this review. No image files changed.

## Tests Added/Run
Focused coverage asserts canonical entry/exit routing, redirect-only legacy auth, storage consent, logout/account isolation, authenticated hydration, configured API origin, safe failure diagnostics, drawer fixed/backdrop/focus/body-lock contract, workout column root cause, and 320/375/390/430 width applicability. Focused auth/navigation/mobile continuity: **45 passed, 0 failed**. Focused workout/navigation regression: **30 passed, 0 failed**. Full suite: **1,250 passed, 0 failed**. Lint, route authorization, diff whitespace, and binary verification passed.

## Exact Test Totals
Final full-suite totals: **1,250 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo**.

## Route Verification
`npm run security:validate-routes` passed and matched **301 runtime routes**.

## Authenticated Verification
API integration tests cover login, `/api/auth/me` hydration, revocation, Remember Me durations, account A/B isolation, and return to account A. Browser storage runtime tests cover session-only/persistent behavior and rejection of unconsented local state.

## Mobile Verification
Static regression contracts cover 320, 375, 390, and 430 px plus fixed positioning, no flow width, full-width workout root, no horizontal push, body lock, independent drawer scrolling, backdrop/Escape close, focus entry/return, and reachable Sign Out.

## Rendered Browser Status
Rendered browser executed: NO

Playwright and `@playwright/test` are not installed, so no rendered visual-success claim or screenshot is provided.

## Security/Ownership Notes
`AuthStateRuntime` remains the sole persistence/restoration/logout owner. The canonical form does not log secrets, raw tokens, password, email, or response bodies. Return paths reject protocol-relative values. The retired URL is redirect-only.

## Binary Status
NONE. Binary diff verification found no binary changes; no image files were modified.

## Known Limitations
No WebKit/Safari or Playwright rendering was available. Production deployment bytes and real credentials were not accessible from this local environment; final real-device validation remains required.

## Merge Readiness
Ready for human review after the passing final checks. Do not start another feature phase.

## Recommended Next Action
Deploy the commit atomically, verify build `20260824-auth-unified-drawer-v2`, then execute the exact iPhone smoke test: Home Login and every menu Sign In converge on `/login.html`; register/sign in with Remember Me off and on; sign out and switch accounts; open/close the workout drawer at 320/375/390/430 widths while checking full-width content, backdrop, independent drawer scroll, body lock, focus, and no horizontal shift.
