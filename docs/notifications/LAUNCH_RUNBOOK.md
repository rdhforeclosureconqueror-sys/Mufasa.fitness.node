# Notification launch runbook

## Configuration
Require the complete gamification event/evaluation/read pipeline, durable `POCKET_PT_DATA_DIR`, and `GAMIFICATION_NOTIFICATIONS=true`. Do not enable claims for any external channel.

## Acceptance
1. Confirm Launch Health reports flag, service, writable append log, projection, routes, UI, unread projection check, deduplication, bounded history, and `channels=[in_app]`.
2. With an approved fixture member, complete one workout and verify one notification. Replay twice and verify the count remains one.
3. Award the first achievement/badge through the normal engine; verify separate award-linked history without duplicate celebrations.
4. Verify list, unread count, mark one read, mark all read, dismiss, empty state, pagination, keyboard operation, narrow viewport, and cross-member 404 behavior.
5. Verify Greatness and Push-Up domain writes still succeed if notification/event capture is deliberately failed.

## Rollback
Set `GAMIFICATION_NOTIFICATIONS=false` and redeploy. Preserve the NDJSON audit log and gamification source events. Re-enabling replays missing projections without altering source transactions.
