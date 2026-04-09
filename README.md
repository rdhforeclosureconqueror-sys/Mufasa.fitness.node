# Mufasa Fitness Brain (Node)

Pilot fitness backend with explicit API write routes, controlled legacy fallback, and bounded rollout hardening.

## Authorization model (bounded)

Roles:
- `super_admin`
- `admin`
- `trainer`
- `user`

Admin/ops permissions are centralized in `src/lib/authorization.js` and applied via middleware guards.

## Bootstrap super-admin

Server-side bootstrap allowlists guarantee super-admin access:
- `AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS` (CSV)
- `AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS` (CSV)

Role assignment allowlists:
- `AUTHZ_ADMIN_USER_IDS`, `AUTHZ_ADMIN_SUBJECTS`
- `AUTHZ_TRAINER_USER_IDS`, `AUTHZ_TRAINER_SUBJECTS`

## Enforcement rollout defaults

Legacy `/command` fallback explicit-only enforcement is action-scoped.

Default after this phase:
- enforced: `session_complete`
- not enforced: `session_start`, `rep_update`, `profile`, `ohsa`

Env controls:
- `LEGACY_FALLBACK_ENABLED`
- `LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS` (CSV)
- `LEGACY_FALLBACK_REQUIRE_EXPLICIT_<ACTION>` (`true|false` per action)

Runtime ops controls (admin/super-admin only):
- `GET /api/ops/enforcement-config`
- `PUT /api/ops/enforcement-config`
- `GET /api/ops/write-observability`

Persistence (lightweight, append-only where applicable):
- enforcement overrides: `data/ops/enforcement-overrides.json`
- admin/control-plane audit log: `data/ops/admin-audit.ndjson`

## Observability and health

`/health` and `/api/ops/write-observability` expose:
- configured defaults, persisted overrides, and effective enforcement state
- explicit success/failure and blocked fallback counters
- admin/ops authorization check trends
- bootstrap/super-admin configuration summary
- persisted override recovery status and startup warnings
- recent admin audit activity summary
