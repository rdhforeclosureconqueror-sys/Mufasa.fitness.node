# Frontend bridge/auth-token remnants audit (2026-04-29)

Scope: full repository scan for `/api/auth/bridge`, `ensureAuthToken`, `trustMode`, `googleIdToken`, and `popa_auth_token`.

## Remaining references (outside `public/`)

### backend-only legacy
- `server.js` (`/api/auth/bridge` route and bridge policy handling).
- `src/validation/meValidators.js` (bridge payload validation including `trustMode`/`googleIdToken`).
- `src/lib/providerIdentity.js` (Google ID token verification flow).
- `backend-read.js` (client helper that can call backend bridge route; shared utility, not in-browser runtime by default unless imported by frontend shell).

### test-only legacy
- `test/*.test.js` files that intentionally exercise `/api/auth/bridge` and trust-mode behavior.

### safe to keep
- `docs/*.md`, `reports/*.md`, `README.md`, `PILOT_READINESS_PHASE4.md` references documenting migration/audits.
- `scripts/auth-*.js`, `scripts/repo-route-audit.js` references used by diagnostics/audit tooling.

### must remove later
- None identified in active frontend runtime outside `public/`.
- Optional future cleanup: stale historical report references if repo wants to reduce legacy noise.

## Frontend/runtime status
- No active frontend runtime bridge/auth-token remnants found outside `public/`.
- Existing outside-`public/` occurrences are backend, test, docs, or audit tooling.
