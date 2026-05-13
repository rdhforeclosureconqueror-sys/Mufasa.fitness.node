# Auth Migration Note

## Old auth retired
- Frontend no longer calls legacy auth routes (`/api/auth/bridge`, `/api/auth/pilot-login`, `/api/auth/pilot-session`).
- The default user entrypoint is now explicit email/password login.

## New login route
- `POST /api/auth/login`
- Session validation route: `GET /api/auth/me`
- Logout route: `POST /api/auth/logout`

## Required environment variables
- `PILOT_LOGIN_PASSWORD` (required for login success)
- `LOGIN_SEED_EMAIL` (required to make the pilot login principal explicit)
- `AUTH_TOKEN_SECRET` (required; must not be a default/dev-only value)
- `ALLOWED_ORIGINS` (required in pilot/production mode)
- `AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS` or `AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS` (required for deterministic super-admin bootstrap)
- `ENABLE_TTS_NO_AUTH=false`
- `AUTH_BRIDGE_ALLOW_MANUAL=false`
- `AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE=false`
- `ADMIN_EMAILS` (required to preserve admin/operator access behavior)

See `docs/pilot-auth-environment.md` for the Phase 3 pilot/production preflight contract.
