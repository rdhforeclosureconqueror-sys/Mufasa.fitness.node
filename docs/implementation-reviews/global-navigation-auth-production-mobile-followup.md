# Global Navigation/Auth Production Mobile Follow-up

## Summary
This follow-up corrects the production auto-login and phone navigation regressions without changing workout, camera, challenge, calendar, selector, rep, or coaching runtimes. Persistent authentication now requires an explicit Remember Me consent marker, and phone navigation is a fixed overlay drawer with a backdrop.

## Production Evidence
The authoritative iPhone Safari report showed an account restored without intentional Remember Me consent and an open menu occupying a left layout column while compressing workout content. A direct deployment probe from this environment returned HTTP 403 from the Render frontend, so the deployed bytes could not be independently captured here.

## Root Cause of Auto-Login
`refreshAuthStatus()` restored a stored token and then called `setCanonicalAuthState()` without a persistence choice. `persistToken()` treated an omitted choice (`null`) as persistent, so a session-scoped login was silently copied into `localStorage` during validation or startup restoration. In addition, startup accepted the canonical local token without requiring the `maatAuthPersistence=persistent` consent marker. The exact restoring source was `public/auth-state-runtime.js`: `getStoredToken()` plus the eager `restoreCanonicalAuthState()` call at bundle startup, with `whenReady()`, `pageshow`, and storage-event bridges reaching the same path.

## Root Cause of Split Mobile Layout
At the phone breakpoint `.maat-nav-panel` only changed `max-width`; it retained a normal-flow, full-width panel beneath the header. On pages whose outer shell used flex/grid behavior this panel could become a layout participant and present as a left column. There was no dedicated backdrop element and no mobile fixed-position drawer rule.

## Storage Restoration Audit
- `sessionStorage.maatAuthToken` is preferred and remains valid only for the current browser session.
- `localStorage.maatAuthToken` is accepted only when `localStorage.maatAuthPersistence` is exactly `persistent`.
- An unconsented canonical local token is rejected and removed.
- Retired aliases (`maat_auth_token`, `mufasa_auth_token`, `authToken`, and `pocket_pt_auth_token`) are never restored and are removed during explicit logout/invalid-session cleanup.
- No frontend cookie restoration or service worker exists in `public`; API authentication remains bearer-token based.
- Redacted diagnostics expose storage source, consent, rejected-unconsented-token status, legacy restoration status, restore result, and frontend bundle identifier through `window.__MAAT_AUTH_RESTORE_DIAGNOSTICS__` and safe diagnostics. They never expose a raw token.

## Cache/Deployment Audit
Express sends no-store headers for HTML and JavaScript. Stylesheets may be cacheable, so every public HTML surface now pins `auth-state-runtime.js`, `global-nav.js`, and `global-nav.css` to `20260824-auth-mobile-followup-v1`; `login.js` is pinned on pages that load it. Both runtime scripts publish the same build identifier for client verification. No service worker was found. The prior HTML used inconsistent dates/versions, so stale deployment/cache could plausibly have contributed to different live bytes, but the HTTP 403 probe means that contribution could not be proven from this environment.

## Files Changed
- `public/auth-state-runtime.js`
- `public/global-nav.js`
- `public/global-nav.css`
- All 23 public HTML entry surfaces that load the global auth/navigation assets (cache token only)
- `test/auth-continuity-runtime.test.js`
- `test/global-navigation-auth.test.js`
- `test/mobile-auth-continuity.test.js`
- `test/phase32-account-nutrition-journal.test.js`
- `test/stepping-into-greatness-dashboard.test.js`
- `test/token-lifecycle-trace.test.js`
- This review

## Auth Behavior Before/After
**Before:** an omitted persistence argument defaulted to persistent, validation could promote a session token to local storage, and any canonical local token was eligible for startup restoration.

**After:** omitted or false persistence is session-only; browser restart loses it. Only explicit true writes both the token and consent marker to local storage. Startup requires both. Logout attempts server revocation, clears both stores and aliases, clears account-scoped cached state and in-memory identity, and remains signed out.

## Mobile Drawer Behavior Before/After
**Before:** the mobile panel remained normal-flow and full-width with no backdrop.

**After:** at widths below 850 px the panel is fixed to the left viewport edge, bounded to `min(86vw, 360px)`, independently scrollable, safe-area padded, and above a fixed full-screen backdrop. The page remains full width; the body is scroll locked with horizontal overflow disabled. Backdrop and Escape close it, focus enters on open, and focus returns to the Menu button on close. Labels wrap and the account controls remain in the drawer scroll region.

## Security/Ownership
The canonical runtime remains the sole restoration owner. The fix does not add token transport, cookies, URL tokens, or secret-bearing diagnostics. Logout still calls `/api/auth/logout` before local cleanup and cleanup completes even if the network is unavailable.

## Tests Added
Regression coverage now includes fresh signed-out startup, explicit Remember Me OFF storage, simulated browser restart, Remember Me ON restoration, rejection of an unconsented local token, redacted source/build diagnostics, logout cleanup, multi-account switching, fixed overlay/backdrop/focus CSS/JS contracts, and consistent production asset versioning.

## Tests Run
- Focused auth/navigation/workout group: 41 passed, 0 failed.
- Updated legacy auth/cache compatibility group: 26 passed, 0 failed after fixture updates.
- Lint/selfcheck: passed.
- Route authorization validation: passed; 301 runtime routes.
- `git diff --check`: passed.
- Full suite: final result recorded below.

## Full Test Totals
`npm test` passed **1,247 tests**: 1,247 passed, 0 failed, 0 cancelled, 0 skipped, 0 todo.

## Route Validation
`npm run security:validate-routes` passed and matched **301 runtime routes**.

## Rendered Browser Status
Rendered browser executed: **NO**. Playwright and `@playwright/test` are not installed in this repository, so no visual-success claim is made. The 320, 375, 390, and 430 px requirements are enforced by the shared phone breakpoint contract but were not browser-rendered here.

## Known Limitations
- Direct production asset verification was blocked by HTTP 403 from the execution environment.
- No rendered Safari/Playwright run was possible locally.
- The release must deploy the updated public directory; source changes alone cannot invalidate a separately deployed stale artifact.

## Merge Readiness
**Ready to merge.** The final full suite passed. Deploy the cache-busted public assets together and complete the noted real-device smoke check.

## Commit Hash
Implementation commit: `3558e6546d01d51c983252a0461a4211ff515b98`. The review-only follow-up commit is the branch HEAD reported in the delivery response.

## Recommended Next Phase
Deploy this commit, confirm the published build identifier on a real iPhone Safari device, then execute only the production smoke matrix for Remember Me OFF/ON, logout/account switching, and drawer behavior at 320/375/390/430 px. Do not expand product scope during that verification.
