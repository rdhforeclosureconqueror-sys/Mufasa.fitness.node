# Launch Health runbook

1. Verify both public version endpoints return schema v1, exact build `2026-07-31-launch-readiness`, `Cache-Control: no-store`, the build header, and token `20260731-launch-readiness`. Inspect the deployed browser/CDN response before claiming cache freshness.
2. Run deterministic diagnostics as an authorized operator. Confirm storage, policies, notifications, universal leaderboard, separate Push-Up leaderboard, raw-context classification, and route authorization.
3. Designate an approved existing fixture member and inspect without mutation.
4. Explicitly select AI Coach, diagnostic summarizer, and Stripe Safe External Checks as required. Never infer reachability from credentials.
5. Complete notification/leaderboard acceptance from their runbooks. Preserve redacted exports for evidence.

## Member browser evidence semantics

Launch Health now keeps Greatness persistence/events, route discovery, route generation, browser-map configuration, and last-known browser-map evidence separate. It likewise keeps universal ranking/projection, APIs, preference route, UI asset presence, standings result, and latest member client contract separate. Static assets and healthy services cannot make either full browser experience `READY`: absence of a report is `UNKNOWN_UNTIL_CLIENT_EVIDENCE`, while an accepted failure is `CLIENT_RUNTIME_FAILED` only for that client capability.

Authenticated clients may POST to `/api/me/client-diagnostics` at most 12 times per minute. The bounded non-authoritative store accepts only allowlisted capability, status, classification, coarse browser/device category, timestamp, safe build/asset tokens, and optional safe stage. It discards coordinates, geometry, locations, user identifiers, contact data, URLs, keys, stacks, upstream bodies, and deployment metadata. Ordinary diagnostic GETs only read snapshots and never create evidence or mutate member state. Client evidence supplements—and never overrides—deterministic configuration/service checks.

Operator verification requires a real generated Greatness route and each universal leaderboard state in supported browsers. A successful sanitized report can raise only its client component. A failure must be remediated according to its safe classification and followed by fresh evidence. Rollback means reverting the application revision (and, if needed, disabling the affected presentation flag); retain authoritative domain data and never edit credentials through diagnostics.

Rollback uses feature flags plus application revision. Preserve events, ledgers, notification audit, user preferences, and admin audit. Never expose secrets or Render deployment metadata.
