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
- `GET /api/ops/admin-audit` (read-only recent audit paging)

Persistence (lightweight, append-only where applicable):
- enforcement overrides: `data/ops/enforcement-overrides.json`
- admin/control-plane audit log: `data/ops/admin-audit.ndjson`

## Control-plane hardening additions

### Audit retention / rotation

`admin-audit.ndjson` now rotates by size and keeps bounded archives.

- `ADMIN_AUDIT_MAX_BYTES` (default `524288`) controls the active file size target.
- `ADMIN_AUDIT_MAX_ARCHIVES` (default `4`) controls retained rotated files (`.1`, `.2`, ...).
- New writes trigger rotation before append when the active file would exceed the size target.

This keeps recent visibility by reading across active + retained archive files for tail views.

### Audit tamper-evidence

Audit append now includes a hash chain:
- each event carries `hashPrev` and `hash` fields
- `hash` is SHA-256 over event payload + `hashPrev`

Hash chaining is enabled by default and can be disabled with `ADMIN_AUDIT_HASH_CHAIN=false`.
Read surfaces expose lightweight verification results (`verified` + `issues`) for returned entries.

### Versioned enforcement override writes

Enforcement override persistence now tracks a monotonic `revision`:
- reads expose current persisted version (`persistedVersion`)
- `PUT /api/ops/enforcement-config` accepts optional `ifVersion`
- stale `ifVersion` values are rejected with `409 VERSION_CONFLICT`

This adds bounded write-safety without replacing existing storage.

### Strict startup mode

Strict mode is opt-in:
- `CONTROL_PLANE_STRICT_STARTUP=true`

When enabled, startup fails fast for critical control-plane misconfiguration touched in this phase:
- unrecoverable persisted enforcement override shape
- invalid configured action names for enforcement env list
- authorization bootstrap/allowlist config warnings

When strict mode is off (default), these remain warning-oriented and visible in `/health` + ops output.

## Observability and health

`/health` and `/api/ops/write-observability` expose:
- configured defaults, persisted overrides, and effective enforcement state
- explicit success/failure and blocked fallback counters
- admin/ops authorization check trends
- bootstrap/super-admin configuration summary
- persisted override recovery status and startup warnings
- recent admin audit activity summary
