# Gamification Production Smoke Test

## Rules

**Approval required.** The deployment operator executes; the monitoring owner records sanitized evidence; product owns the go/no-go. Use the dedicated synthetic production smoke account `<SMOKE_USER_ID>`, minimum necessary workout, and no real member data. Do not expose public gamification UI, notifications, or leaderboards. Do not run destructive correction tests against real users.

Set shell placeholders without printing tokens:
```bash
export BASE_URL='<PRODUCTION_BASE_URL>'
export OPERATOR_TOKEN='<SECURELY_INJECTED_OPERATOR_TOKEN>'
export SMOKE_USER_ID='<DEDICATED_SYNTHETIC_ACCOUNT_ID>'
```

## Before traffic

- [ ] Approved release commit and environment flag snapshot recorded; notifications and leaderboards are `false`.
- [ ] Application startup/health succeeds on every instance and no startup replay error appears.
- [ ] The following returns `ready:true`, migration version 3, valid writable/events/generation/replay/policies/integrity/migration/startupReplay checks:
```bash
curl --fail-with-body -H "Authorization: Bearer $OPERATOR_TOKEN" "$BASE_URL/internal/gamification/operations/readiness"
```
- [ ] Unprivileged authentication is rejected (expected `401` or `403`), proving authorization:
```bash
curl --silent --output /dev/null --write-out '%{http_code}\n' "$BASE_URL/internal/gamification/operations/readiness"
```

## Synthetic transaction

1. Complete exactly one minimal approved workout through the existing client/API procedure for `$SMOKE_USER_ID`; record its source entity ID. Confirm the workout and user history commit even if gamification observation is unavailable.
2. Query the operator projection and ledger:
```bash
curl --fail-with-body -H "Authorization: Bearer $OPERATOR_TOKEN" "$BASE_URL/internal/gamification/profile/$SMOKE_USER_ID"
curl --fail-with-body -H "Authorization: Bearer $OPERATOR_TOKEN" "$BASE_URL/internal/gamification/ledger/$SMOKE_USER_ID"
```
3. Confirm exactly one event, duplicate source delivery creates no additional event/value, XP equals the committed policy, level matches the committed level table, and achievements exactly match deterministic criteria. Never assume a numeric XP value outside the deployed policy.
4. Enqueue/observe the approved replay, then verify integrity and checksum stability:
```bash
curl --fail-with-body -X POST -H "Authorization: Bearer $OPERATOR_TOKEN" -H 'Content-Type: application/json' "$BASE_URL/internal/gamification/operations/replay/user/$SMOKE_USER_ID"
curl --fail-with-body -H "Authorization: Bearer $OPERATOR_TOKEN" "$BASE_URL/internal/gamification/operations/replay/history"
curl --fail-with-body -H "Authorization: Bearer $OPERATOR_TOKEN" "$BASE_URL/internal/gamification/operations/integrity"
```
5. If an approved smoke fixture supports correction, append the correction through the existing authoritative workflow. Confirm the source and original event remain, award revocation and equal/opposite XP reversal appear, projection changes, and replay checksum is stable. Otherwise mark **not executed** and rely on the identical staging fixture evidence; never manufacture a production correction.

## Public-surface and regression checklist

- [ ] No public gamification route, widget, toast/notification, or leaderboard is visible.
- [ ] Workouts create/read/update normally and history contains the smoke workout.
- [ ] Authentication/session behavior remains normal.
- [ ] Trails search/detail and walking route generation succeed.
- [ ] Run club read/write smoke succeeds.
- [ ] Push-up challenge smoke succeeds.
- [ ] Nutrition read/write smoke succeeds.
- [ ] Existing user history is unchanged except for the intentional synthetic workout.
- [ ] Operator projections are visible only to the authorized operator.
- [ ] Event append/replay/preflight/generation/migration metrics show no failures; queues drain and checksums match.

Use the application's approved smoke commands/endpoints for unrelated domains; their production URLs, credentials, and safe fixture procedures are **Operator Inputs Required** and are intentionally not invented here.

## Decision

**GO** only if every applicable box passes, skipped correction has successful staging evidence attached, no integrity alert fired, unrelated-domain baselines are healthy, and product explicitly approves promotion. Otherwise **NO-GO**: stop promotion and follow `LAUNCH_RUNBOOK.md` rollback order without deleting authoritative history.
