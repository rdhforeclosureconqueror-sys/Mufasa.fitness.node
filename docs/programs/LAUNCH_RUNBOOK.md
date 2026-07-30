# Program Engine Launch Runbook

## Preflight

1. Back up the user data directory and deploy behind the authenticated API.
2. Run `npm test`, `npm run lint`, targeted program, gamification, and AI Coach suites, then `git diff --check`.
3. Assign internal programs for every goal/experience combination and confirm identical input produces identical IDs.
4. Verify keyboard/screen-reader clients can consume the semantic session dates/types; UI calendars should use a labelled table or list, visible focus, 44px touch targets, reduced-motion media queries, and never color alone.
5. Monitor assignment errors, session-state failures, adherence distributions, view latency, and program-event rejection/quarantine.

## Rollout and rollback

Roll out to staff, then a small member cohort, then general availability. Existing legacy programs remain the fallback when no authoritative assignment exists. To roll back, disable authoritative assignment routes, restore the backup only if writes are corrupt, and continue serving legacy `/api/programs/current`; do not delete assignments. Program IDs include content version, so reverting content restores deterministic prior generation.

## Launch decision

Launch is **GO** only when all suites pass, p95 view latency meets the API budget, access-isolation probes pass, milestone events are accepted without bypassing XP policy, and product/accessibility review approves the calendar. Any cross-member access, non-determinism, event quarantine spike, or data-loss finding is an automatic **NO-GO**.
