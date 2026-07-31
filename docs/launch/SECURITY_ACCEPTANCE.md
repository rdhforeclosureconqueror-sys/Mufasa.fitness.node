# Security Acceptance

The authorization contract now exactly inventories both member and internal Exercise Intelligence routes. Member routes derive identity from authentication. Internal content read, manage/author, review, and publish/rollback permissions remain distinct; internal routes are absent from member navigation. Drift validation detects missing runtime records, stale contract records, duplicates, and incomplete public-write/ownership declarations.

Yoga completion derives the member from authentication, rejects mismatched client user IDs at the route, bounds all derived results, stores no video/frame/landmark payload, and now deduplicates an optional bounded idempotency key before persistence/event emission. Production CSRF posture, cache headers, deployed secrets/logs, rate limits, database permissions, and external penetration review remain operator gates.

