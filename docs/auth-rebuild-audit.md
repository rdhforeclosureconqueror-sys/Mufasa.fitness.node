# Auth Rebuild Audit

## OLD AUTH REFERENCES FOUND
- Legacy backend routes in `server.js`: `/api/auth/pilot-login`, `/api/auth/pilot-session`, `/api/auth/bridge`, and `/api/me` using bearer tokens from bridge-issued identities.
- Legacy frontend auth/session bootstrap in `public/index.html`: bridge claim generation, pilot auto-session creation, backend bridge token refresh, and implicit pilot-mode sign-in.
- Legacy tests validating pilot login/session behavior: `test/pilot-login.test.js` and pilot-mode shell assumptions in `test/auth-shell-guard.test.js`.

## FILES TO KEEP
- `server.js` (replace auth routes with a clean contract while keeping unrelated APIs).
- `public/index.html` (replace login shell while preserving app runtime modules).
- `test/auth-shell-guard.test.js` (repurpose for clean-login assertions).
- `test/pilot-login.test.js` (repurpose to backend auth contract tests).

## FILES TO REMOVE OR BYPASS
- Bypass legacy backend auth routes by retiring pilot and bridge routes.
- Remove frontend pilot auto-login bootstrap and bridge claims/token refresh paths.

## FRONTEND AUTH ENTRY POINTS
- New login form submit handler in `public/index.html` posting to `/api/auth/login`.
- New boot-time token validation path using `/api/auth/me`.
- Logout action clearing frontend state and returning to login screen.

## BACKEND AUTH ENTRY POINTS
- `POST /api/auth/login`
- `GET /api/auth/me`
- `POST /api/auth/logout`

## TOKEN STORAGE LOCATIONS
- `localStorage.popa_auth_token`
- `localStorage.popa_auth_user`
- in-memory `window.APP_AUTH.token`

## PROTECTED ROUTES
- Existing protected APIs still guarded by `requireAuth` and bearer token middleware (e.g. `/api/me/profile`, `/api/sessions`, `/api/avatar/upload`).
- `/api/auth/me` now requires a valid bearer token.

## RISKS
- Existing tests or tooling depending on `/api/auth/bridge` may fail unless explicitly opted in.
- Frontend modules that previously expected bridge semantics now rely solely on `window.APP_AUTH.token`.
- Profile enrichment still depends on existing backend profile APIs; partial user metadata may resolve from defaults.
