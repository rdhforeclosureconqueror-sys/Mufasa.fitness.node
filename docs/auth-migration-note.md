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
- `ADMIN_EMAILS` (required to preserve admin/operator access behavior)
