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


## Identity trust hardening (pilot-bounded)

Auth bridge now separates identity classes:
- `provider_verified`: Google OIDC token verified server-side via tokeninfo/JWT verifier hook.
- `provider_unverified`: Google claim-only bridge path (kept for compatibility).
- `manual_unverified`: manual userId bridge path.

Bridge controls:
- `AUTH_BRIDGE_ALLOW_MANUAL` (`true` default)
- `AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE` (`true` default)
- `GOOGLE_OAUTH_CLIENT_ID` (required when unverified Google path is disabled)

`POST /api/auth/bridge` accepts:
- manual: `{ userId }`
- verified Google: `{ googleIdToken, googleSub?, googleEmail? }`
- compatibility Google (if allowed): `{ googleSub }` or `{ googleEmail }`

`/api/me` now returns identity trust fields: `providerVerified` and `identityClass`.

Temporary trust limitation kept intentionally for pilot:
- if `AUTH_BRIDGE_ALLOW_MANUAL=true` or `AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE=true`, low-trust bridge paths still exist and should be restricted operationally.

## Token/session hardening (pilot-bounded)

Auth token checks now enforce:
- minimum secret length (`AUTH_TOKEN_MIN_SECRET_LENGTH`, default `16`)
- bounded token lifetime (`AUTH_TOKEN_MAX_TTL_MS`)
- clock skew handling (`AUTH_TOKEN_CLOCK_SKEW_MS`, default `5000`)
- strict header validation (`alg=HS256`, `typ=MUFASA`)
- `jti` issuance for per-token lifecycle tracking hooks

Invalid/expired tokens now include `WWW-Authenticate: Bearer ... invalid_token` in 401 responses.

## Deployment/pipeline automation hooks

Machine-readable outputs are available for automation:
- `npm run ops:preflight -- --json`
- `npm run ops:verify-audit -- --json`
- `npm run ops:pilot-checks` (aggregates both checks as JSON and exits non-zero on failure)

Expected pass/fail behavior:
- **pass**: `ok=true` and process exit `0`
- **fail**: `ok=false` and process exit `1`, with `issues` or check-level `stderr`

Recommended deployment gate (lightweight):
1. run `npm run ops:pilot-checks`
2. block rollout if exit is non-zero
3. archive emitted JSON into deploy logs/artifacts for operator review

## Control-plane hardening additions

### Trust policy tightening (pilot readiness)

Auth bridge now models low-trust issuance modes explicitly:
- `manual_unverified`
- `provider_unverified`

Env controls:
- `AUTH_BRIDGE_ALLOWED_TRUST_MODES` (CSV, explicit allowlist)
- `AUTH_TRUST_POLICY_MODE` (`warn` default, `fail` for stricter gating)

Safe rollout behavior:
- dev/test default: both low-trust modes allowed for compatibility
- non-dev default: low-trust modes disabled unless explicitly allowed
- `/api/auth/bridge` blocks disabled trust modes with `403 TRUST_MODE_DISABLED`

Preflight + health/ops surfaces expose current trust posture, enabled low-trust modes, and pilot-readiness status.

Recommended pilot-safe settings:
- `NODE_ENV=production`
- `AUTH_BRIDGE_ALLOWED_TRUST_MODES=` (empty)
- `AUTH_TRUST_POLICY_MODE=fail`

### Token revocation denylist (bounded)

Issued auth tokens now include `jti`.

Bounded revocation support:
- storage: `data/ops/token-denylist.json`
- retention: `AUTH_TOKEN_DENYLIST_RETENTION_MS` (default 14 days)
- check: auth verification rejects revoked `jti` values
- admin path: `POST /api/ops/auth/token-revocations` (`ops.manage_enforcement`)

Revocation entries are pruned after token-expiry + retention window to keep storage bounded.

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
- trust policy posture and low-trust mode enablement
- token revocation readiness/status
- configured defaults, persisted overrides, and effective enforcement state
- explicit success/failure and blocked fallback counters
- admin/ops authorization check trends
- bootstrap/super-admin configuration summary
- persisted override recovery status and startup warnings
- recent admin audit activity summary
