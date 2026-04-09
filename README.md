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
- `PUT /api/ops/enforcement-config/break-glass` (super_admin only; requires reason)
- `GET /api/ops/write-observability`
- `GET /api/ops/admin-audit` (read-only recent audit paging)
- `GET /api/ops/admin-audit/verify` (full-chain verification across active + archives)

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

### Break-glass override workflow

An explicit emergency path exists for sensitive control-plane overrides:
- route: `PUT /api/ops/enforcement-config/break-glass`
- role: `super_admin` only
- requires: `reason` or `reasonCode` string + `enabledByAction`
- semantics: forces override persistence (bypasses stale `ifVersion` checks)
- audit: writes `enforcement_config_break_glass_update` with `annotations.breakGlass=true` and reason

Use this route only for operational recovery scenarios where normal optimistic locking blocks urgent remediation.

### Audit-chain verification tooling

Operational verification paths:
- API: `GET /api/ops/admin-audit/verify`
- CLI: `npm run ops:verify-audit`

Both verify hash-chain continuity across active and rotated audit files and return pass/fail issue summaries.

### Optional periodic audit checkpointing

Checkpoint records can be written periodically as lightweight chain anchors:
- `ADMIN_AUDIT_CHECKPOINT_FILE_PATH` (default `data/ops/admin-audit.checkpoints.ndjson`)
- `ADMIN_AUDIT_CHECKPOINT_INTERVAL_MS` (default `0`, disabled)

When enabled (`>0`), checkpoint entries include timestamp + latest audit chain hash.
This is local bounded checkpointing only (no external trust service).

### Minimal alert hooks

Control-plane alert events are emitted with a pluggable sink (`createApp({ controlPlaneAlertSink })`) and logged.
Current alert types:
- `strict_startup_failure`
- `enforcement_version_conflict`
- `audit_integrity_failure`
- `break_glass_used`

Alert counters are also exposed through `/api/ops/write-observability`.

### Authz/enforcement preflight linting

Preflight checks are available via:
- `npm run ops:preflight`

Checks include:
- invalid enforcement action names
- malformed allowlist values
- missing bootstrap super-admin configuration
- contradictory/inert enforcement settings (e.g., enforcement flags set while legacy fallback is disabled)

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
