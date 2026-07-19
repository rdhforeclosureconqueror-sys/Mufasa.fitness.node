# Operations runbook

Assumptions: commands run from the release root as the service OS identity; the platform owns TLS/process supervision; only one Node writer is active. Replace `SERVICE` and URLs with platform-specific values. Never edit live JSON while the service is running.

## Restart and health verification

1. Announce/drain traffic and confirm a recent verified backup.
2. Stop with the process supervisor and wait for clean exit (example: `systemctl stop SERVICE`).
3. Confirm no second writer: `pgrep -af 'node .*server.js'`.
4. Start: `systemctl start SERVICE`; inspect `journalctl -u SERVICE -n 200 --no-pager`.
5. Verify `curl --fail --silent --show-error https://HOST/health | jq .` and check `ok`, `degraded`, startup warnings, exercise index, auth, preflight, authorization, revocation, and audit state.
6. Run authenticated role-specific smoke reads; reopen traffic only after success.

For a local controlled check use `npm start`; do not use watch mode in production.

## Diagnosing failures and interpreting logs

| Symptom | Checks | Action |
|---|---|---|
| Process will not start | `node --version`, `npm ci`, `npm run ops:preflight`, supervisor logs, port conflict, volume permissions, disk, JSON parse error. | Fix configuration/artifact/permissions; restore corrupt file; never weaken strict startup to hide a finding. |
| `/health` connection failure | DNS/TLS/proxy/upstream/process/socket; local `curl http://127.0.0.1:PORT/health`. | Isolate edge vs app, restart only after collecting evidence. |
| Health degraded | Read `startupWarnings`, preflight, exercise index, audit, persisted override recovery. | Correct the named condition and restart/recheck. |
| `400` | Request ID plus validation code; compare [API reference](../api/api-reference.md). | Correct client payload; do not hand-edit data as first response. |
| `401` | Missing bearer, expiry, signing-secret mismatch, clock, JTI denylist, trust mode. | Reauthenticate; verify secret consistency and clocks; revoke only intentionally. |
| `402` | Membership/trial status and billing webhook/provider logs. | Reconcile membership source; never add an undocumented bypass. |
| `403` | Resolved role/permission and active trainer assignment. | Correct environment allowlist or assignment through admin API. |
| `404` | Resource ID/owner, feature flag, exercise index, route/version mismatch. | Confirm correct owner/release; do not infer authorization from ID alone. |
| `409` | State/version conflict, especially enforcement configuration. | Reload current state and retry deliberately; use break-glass only under incident procedure. |
| `429` | Named application limiter and edge limiter. | Wait window; investigate abuse/client retry loop; do not blindly raise limits. |
| `5xx` | Request ID, stack in protected logs, disk/JSON/provider failure. | Preserve failing artifact, restore or roll back; redact before escalation. |

`[request]` records identify method/path/origin/user agent/request ID. Correlate the request ID across error/write/audit records. Control-plane alerts and failed audit verification are security events. Provider `502` usually indicates an upstream problem, not permission to expose its raw response.

## Backup verification

After each backup: verify checksum/signature, list expected directories, parse every JSON file in an isolated extraction, ensure NDJSON lines parse where applicable, run `npm run ops:verify-audit` against the restored configuration/data, compare file/user/assignment counts, and record backup ID/time/size/release. At least quarterly, restore to an isolated host and run member/trainer/admin read-only smoke tests. A successful archive command without restore testing is not a verified backup.

## User recovery

1. Record user ID, request IDs, time, last successful action, and release; avoid collecting passwords/tokens.
2. Verify authentication and membership separately from domain data.
3. Stop writes before file-level recovery. Back up the current user file; parse it and compare with the last good backup.
4. Prefer supported API replay/correction. If file restore is unavoidable, restore that complete aggregate from a matched backup with owner approval and audit record; do not splice arbitrary fragments.
5. Restart/check health and have the member verify profile, intake, current plan, recent execution, and nutrition state.

## Trainer assignment troubleshooting

Confirm both identities resolve to the intended trainer/client IDs, the trainer role contains required permission, and `GET /api/admin/trainer-assignments` shows one active matching assignment. Inactive history does not grant access. Duplicate create is idempotent for an existing active pair. Use the admin POST/DELETE routes—never toggle status in live JSON. After reassignment, retry client list then client detail, program, and notes. A trainer sees only notes they authored for that pair.

## Intake troubleshooting

Call intake and progress reads with the member token. Confirm schema/version, required answers, draft completion, and submitted state. A `400` should identify validation; correct the draft through PATCH, then submit once. Check Journey Profile/personalization after submission. If persisted JSON cannot parse, stop service and restore; never repeatedly submit into suspected corruption.

## Workout/progression troubleshooting

Confirm submitted intake and current generated plan first. For execution failures, record plan/workout/execution IDs and call sequence: create → patch → complete. Ensure the execution belongs to the current member and is not already terminal. For progression, complete enough evidence, evaluate, inspect proposal, then accept only the current proposal. Compare Member Home, generated plan, progression, and adaptation reads. Legacy `/api/sessions`, `/api/workouts/track`, and `/command` are distinct compatibility paths; identify which client runtime issued the write before repair.

## Nutrition/provider troubleshooting

Confirm membership, provider key/configuration, bounded timeout, and outbound DNS/TLS. Separate provider lookup failure from member journal persistence. Retry only idempotent GETs automatically; inspect whether a POST already succeeded before replay. Manual mission progress and weekly-plan mutation remain self-owned API actions.

## Incident/rollback rule

If integrity, data loss, authorization leakage, or repeatable core-flow failure is suspected: stop writes, preserve logs/volume, revoke affected credentials if necessary, notify the incident owner, and roll back application **and compatible data** according to the [release checklist](../release/release-checklist.md). Do not deploy a persistence format downgrade over newer data without an explicit compatibility determination.
