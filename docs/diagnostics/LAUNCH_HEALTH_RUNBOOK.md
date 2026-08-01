# Launch Health runbook

1. Verify both public version endpoints return schema v1, exact build `2026-07-31-launch-readiness`, `Cache-Control: no-store`, the build header, and token `20260731-launch-readiness`. Inspect the deployed browser/CDN response before claiming cache freshness.
2. Run deterministic diagnostics as an authorized operator. Confirm storage, policies, notifications, universal leaderboard, separate Push-Up leaderboard, raw-context classification, and route authorization.
3. Designate an approved existing fixture member and inspect without mutation.
4. Explicitly select AI Coach, diagnostic summarizer, and Stripe Safe External Checks as required. Never infer reachability from credentials.
5. Complete notification/leaderboard acceptance from their runbooks. Preserve redacted exports for evidence.

Rollback uses feature flags plus application revision. Preserve events, ledgers, notification audit, user preferences, and admin audit. Never expose secrets or Render deployment metadata.
