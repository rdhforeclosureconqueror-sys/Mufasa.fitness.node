# Global navigation and authentication audit

## Navigation inventory

Before this phase, navigation was implemented independently by each surface. The public landing page had a four-link `.nav`, challenges used a page-local `.top` link group, the member dashboard used `.dashboard-actions`, trainer pages loaded `trainer-navigation.js`, and the Run Club had a separate branded entry link. Admin member, client, diagnostics, inbox, nutrition, membership, workout, yoga, and Greatness pages each provided different back links or action clusters. There was no single authentication-aware menu definition.

The central source is now `public/global-nav.js`. It includes only destinations backed by current HTML files/routes, groups them by product area, and filters role-only entries using the user and role arrays returned by `/api/auth/me`. The server remains authoritative: hiding a link is not an authorization decision.

No separate assessments, results dashboard, settings, admin messages, or generic client-management destination was added because this repository does not currently expose distinct user-facing pages for those concepts. Profile and admin dashboard links point to existing dashboard contexts rather than duplicating a destination.

## Cause of automatic sign-in

The canonical browser runtime stored every JWT in `localStorage.maatAuthToken` and restored it automatically at script startup. Because `localStorage` survives browser restarts and tokens defaulted to the configured maximum TTL (14 days when not configured), all successful logins behaved like persistent “remember me” logins. This was active client-side restoration, not an HttpOnly server session cookie. Retired aliases (`maat_auth_token`, `authToken`, and others) also existed in legacy page clients, although canonical cleanup already removed those aliases.

This application currently authenticates its main web API with bearer JWTs exposed to browser JavaScript; there is no existing HttpOnly cookie session/refresh-token mechanism for the main member session. This phase does not casually replace that architecture. New non-persistent sessions are stored in `sessionStorage`; only an explicitly checked **Remember me** control stores the token in `localStorage`. Logout removes both stores and aliases. A future migration to secure HttpOnly cookies should be treated as a dedicated security phase.

## Session policy

* **Remember Me off (default):** `AUTH_TOKEN_SESSION_TTL_MS`, capped by `AUTH_TOKEN_MAX_TTL_MS`; the fallback is 8 hours. The browser credential uses `sessionStorage`.
* **Remember Me on:** `AUTH_TOKEN_PERSISTENT_TTL_MS`, capped by `AUTH_TOKEN_MAX_TTL_MS`; the fallback is the configured maximum (14 days when neither variable is configured). The browser credential uses `localStorage`.
* **Registration:** starts a non-persistent session.

Logout now submits the bearer credential to the authoritative endpoint, revokes its JWT ID until expiry, clears the Motion Lab cookie/session, clears canonical and legacy browser credentials, removes known account-scoped transient caches, and navigates to the sign-in page. Server-owned workout, challenge, assessment, billing, and activity history is not deleted.

## Hardening verification — 2026-08-23

### Regression and security results

The final post-correction `npm test` run reached the Node test summary: **1,245 total, 1,245 passed, 0 failed, 0 cancelled, 0 skipped, and 0 todo**. `npm run security:validate-routes` also passed and reported that the authorization contract matches **301 runtime routes**, including the authenticated logout declaration. Focused challenge enrollment, workout hub, membership/trial gating, client CRM/messages, and auth-continuity coverage passed 57/57.

### Remember Me and logout contract

| Action | Browser storage | Server duration | Verified result |
| --- | --- | --- | --- |
| Sign in with Remember Me off | Canonical token in `sessionStorage`; the alternate `localStorage` token is removed | `AUTH_TOKEN_SESSION_TTL_MS`, capped by `AUTH_TOKEN_MAX_TTL_MS` | Checkbox is initially unchecked; normal login and reload-in-tab continuity work without creating a persistent token copy. |
| Sign in with Remember Me on | Canonical token in `localStorage`; the alternate `sessionStorage` token is removed | `AUTH_TOKEN_PERSISTENT_TTL_MS`, capped by `AUTH_TOKEN_MAX_TTL_MS` | Persistence occurs only after the explicit boolean is submitted through the existing canonical auth runtime. |
| Explicit Sign Out | Both canonical stores, origin/persistence markers, retired aliases, and known account-scoped caches are cleared | Current JWT ID is denylisted until its expiry | Reuse of the old token receives 401; a remembered session cannot restore after logout. |

Expired, malformed, revoked, or backend-rejected credentials are cleared by the canonical runtime. Its auth change event causes the global menu to render the signed-out controls. User-visible errors contain a bounded message rather than the JWT or a raw server exception.

### Prior automatic-login root cause

The pre-phase behavior was **B: active client restoration without explicit Remember Me consent**. Every successful login wrote its bearer JWT to `localStorage.maatAuthToken`, and startup code automatically restored any still-valid token. A valid persisted credential was involved (A), but persistence was not an intentional user choice, so A alone does not accurately describe the defect. There was no separate password-based auto-login or main-app HttpOnly session cookie silently authenticating the user.

### Multi-account and authorization verification

The automated account-switch test signs in Account A, resolves A through `/api/auth/me`, signs A out, proves A's token is rejected, signs in Account B, proves only B's email/name-derived identity and ordinary role are returned, signs B out, proves B's token is rejected, and signs A in again. No impersonation path is involved. Client logout additionally clears cached profile, role, membership, billing, messages, assessment, program, challenge, admin, and active-workout projections. Server-owned history remains intact.

Menu visibility is a convenience only. Existing route middleware and the 301-route authorization contract remain the security boundary; focused CRM tests prove ordinary members cannot use administrator APIs even if they manually navigate to a URL.

| Identity state | Visible navigation behavior |
| --- | --- |
| Signed out | Main: Home. Training: Exercise Library. Wellness: Run Club. Account controls: Sign In and Create Account. |
| Free member | All ordinary member destinations; Yoga remains visible with an Upgrade marker. No trainer or administration links. |
| Trial member | Ordinary member destinations, including entitled training links. No trainer or administration links. |
| Paid member | Ordinary member destinations without role-only administration links. |
| Trainer/coach | Ordinary member destinations plus Trainer / Coach. No Member CRM. |
| Admin/super-admin | Ordinary destinations plus Trainer / Coach, Admin Dashboard, and Member CRM. |

### Shared-script and mobile static review

Every public HTML surface contains exactly one global-navigation stylesheet and script. Each page loads `auth-state-runtime.js` before `global-nav.js`; the navigation first renders a safe public state, awaits canonical `whenReady()`, and then reconciles. This was programmatically checked for all pages, including challenge detail/library, workout, dashboard, trainer, inbox, nutrition, membership, Run Club login, Stepping Into Greatness, admin client/member CRM, and landing.

Static checks for 320, 375, 390, and 430 CSS-pixel widths verify a 48px menu trigger, `width: 100%`/`max-width: 100%` mobile bounds, vertical scrolling with a viewport/safe-area-bounded maximum height, wrapping identity labels, reachable full-width Sign Out, safe-area padding, no hover-only activation, Escape handling, focus transfer, and ARIA expanded/control/label state. Opening the menu locks body scrolling; the menu retains its own vertical scrolling. **Rendered browser executed: NO** because no browser runtime is installed in this environment; no rendered-layout claim is made.

### Limitations and merge readiness

The main browser session remains a JavaScript-visible bearer-token architecture; moving it to HttpOnly cookies requires a separate security migration. Rendered visual verification is still outstanding for a browser-equipped environment. No binary files changed. With the complete suite and route validation passing, storage/revocation and account switching proven, role escalation absent, and no binary diff, this hardening pass is **merge-ready**, subject to normal human review and optional visual QA.
