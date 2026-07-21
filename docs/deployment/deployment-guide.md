# Deployment guide

Pocket PT requires Node.js 18 or newer and a **single** application process with a persistent local volume. This guide documents a manual deployment; it does not perform one.

## Environment variables

Start from `.env.example`; production secrets belong in the platform secret manager, not `.env` in source control.

| Area | Variables | Production guidance |
|---|---|---|
| Runtime | `NODE_ENV=production`, `PORT` (default application convention is 3000), `BASE_URL`, `PUBLIC_BASE_URL`, `BACKEND_PUBLIC_URL`, `FRONTEND_PUBLIC_URL`, `POCKET_PT_DATA_DIR`, and (when avatars are enabled) `POCKET_PT_AVATAR_UPLOAD_DIR` | Mount a Render persistent disk at `/var/data`; set the data path to `/var/data/pocket-pt/data` and avatar path to `/var/data/pocket-pt/avatars`. The server refuses a normal production boot without these paths. |
| Authentication | `AUTH_TOKEN_SECRET`, `PILOT_LOGIN_PASSWORD`, `LOGIN_SEED_EMAIL`, `AUTH_TOKEN_MIN_SECRET_LENGTH`, `AUTH_TOKEN_MAX_TTL_MS`, `AUTH_TOKEN_CLOCK_SKEW_MS`, `AUTH_TOKEN_DENYLIST_RETENTION_MS` | Unique high-entropy secret; rotate with an explicit session invalidation plan. |
| Origin/trust | `ALLOWED_ORIGINS`, `AUTH_BRIDGE_ALLOW_MANUAL=false`, `AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE=false`, provider identity settings | Exact HTTPS origins, no wildcard with credentials; keep low-trust bridges off. |
| Authorization | `AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS` or `AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS`; optional `AUTHZ_ADMIN_USER_IDS`, `AUTHZ_ADMIN_SUBJECTS`, `AUTHZ_TRAINER_USER_IDS`, `AUTHZ_TRAINER_SUBJECTS`, `ADMIN_EMAILS` | Configure deterministic least-privilege allowlists; always retain one tested bootstrap path. |
| Control plane | `CONTROL_PLANE_STRICT_STARTUP=true`, `LEGACY_FALLBACK_ENABLED`, `LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS` and per-action variants | Run preflight; migrate clients off `/command`; protect operations routes. |
| Features/TTS | `ENABLE_AVATAR_FEATURE`, `ENABLE_TTS_NO_AUTH=false`, `SKILL_WORLD_TTS_TOKEN`, `AIVOICE_API_KEY` and provider URL/voice settings | Enable only deliberately; server secrets only. |
| Billing | `BILLING_ENABLED`, `STRIPE_LIVE_MODE`, `STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `STRIPE_PRICE_ID`, `STRIPE_PUBLISHABLE_KEY`, optional `VITE_STRIPE_PUBLISHABLE_KEY`, plan label/currency variables | Keep secret/webhook keys server-only; match test/live mode and verify webhook destination. |
| Nutrition | `USDA_FDC_API_KEY`, `NUTRITION_PROVIDER_TIMEOUT_MS`, `NUTRITION_CACHE_TTL_MS`, `OPEN_FOOD_FACTS_BASE_URL`, `OPEN_FOOD_FACTS_USER_AGENT` | Identify the client and set bounded provider timeouts. |
| Diagnostics | OpenAI diagnostic summarizer variables if enabled | Optional; absence must not be mistaken for core service failure. Never send unsanitized secrets/PII. |

Use `rg 'process\.env\.' server.js src .env.example` during release review to detect variables added after this document.

## Install, startup, and health

On Render, **create and attach a persistent disk before the first production write**. A service restart reuses that disk. A redeploy/cold boot replaces the container filesystem but reattaches the disk, so only paths below its mount survive. Setting an environment variable to a path under the repository (or another container-local directory) does not make it durable. Keep a single instance because the JSON repositories do not coordinate multiple writers. Existing results on an old ephemeral instance are not copied automatically: recover them from that instance or a backup into the mounted tree before replacement, if still accessible.

```bash
npm ci
npm run lint
npm test
npm run ops:preflight
npm start
curl --fail --silent --show-error https://app.example/health
```

`prestart` ensures the exercise index before `server.js` starts. `/health` is public and reports service readiness/configuration summaries, exercise-index availability, strict-startup/preflight state, authorization configuration counts, audit summary, warnings, degradation, and time. Treat HTTP success plus `ok: true` as liveness; alert on `degraded`, failed strict startup, missing exercise index, default auth secret, audit integrity warnings, or unexpected fallback/trust settings. Do not publish detailed health output outside a controlled monitoring path without reviewing its output policy.

## Reverse proxy and HTTPS

Terminate TLS 1.2+ at a maintained proxy/load balancer, redirect HTTP to HTTPS, preserve `Host` and trusted `X-Forwarded-Proto/Host`, support WebSocket upgrade, enforce request/body/header/time limits, and set upstream timeouts longer than bounded provider calls. Add edge request limiting and access logs with token/cookie/header redaction. Route one upstream process only because storage and application limiters are process-local. Do not proxy `data/`, dotfiles, backups, temporary files, or source maps unintentionally.

## Logging, monitoring, and secrets

Capture stdout/stderr as structured-enough records with timestamps, environment/release ID, request ID, method/path/status/latency—never bearer tokens, passwords, raw webhook bodies, payment fields, nutrition/provider secrets, or sensitive profiles. Retain and protect `data/ops/admin-audit*.ndjson` separately. Monitor process availability/restarts, `/health`, latency/error/429/402 rates, disk space/inodes, persistent-volume durability, backup age, audit-chain verification, provider failures, and certificate expiry. Alert on repeated 401/403, startup warnings, JSON parse errors, disk errors, and integrity failures.

## Backups and restore

For a consistent backup, drain traffic and stop writes/the service, archive `data/` plus enabled `public/uploads/avatars/`, generate a checksum, encrypt, copy off-host, test extraction/JSON parsing, then restart. Define retention and access according to personal/health data policy.

Restore procedure:

1. Drain and stop the process; snapshot the damaged volume for investigation.
2. Verify archive signature/checksum and select the last known-good matched snapshot.
3. Restore to a staging directory; run `find ... -name '*.json'` through JSON parsing and verify audit chain.
4. Replace `data/` (and matched uploads) as one recovery unit; restore service-user ownership and restrictive permissions.
5. Start exactly one process; check `/health`, logs, audit verification, authentication, and representative member/trainer/admin reads before reopening traffic.

## Production checklist

* Immutable reviewed revision, `npm ci`, tests/lint/security/preflight passing, no uncommitted runtime data.
* Persistent volume mounted and writable by only the service identity; restore rehearsal completed.
* Unique secrets installed; low-trust flags false; least-privilege roles and origin allowlist verified.
* HTTPS, WebSocket upgrade, edge limits, timeouts, security headers, monitoring, alerting, and log redaction verified.
* Exercise index exists; one process; sufficient disk; provider and billing modes explicitly checked.
* Release/rollback owner, maintenance window, backup ID, smoke identities, and rollback decision threshold recorded.

See the [operations runbook](../operations/runbook.md) and [release checklist](../release/release-checklist.md).
