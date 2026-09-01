# INDEPENDENT REVIEW HANDOFF — FREE RUN CLUB PHASE 2

## Role
Act as the second independent technical reviewer. Do not merge. Do not assume Phase 1 or Phase 2 is correct.

## Repository
`rdhforeclosureconqueror-sys/Mufasa.fitness.node`

## Branch
`free-run-club-community-phase2`

## Dependency
This branch is intentionally based on `free-run-club-community-phase1`. Review Phase 1 assumptions as part of this review.

## Product boundary
Free Run Club is free. Paid Stepping Into Greatness is a separate product. The Free Run Club may reuse canonical GPS/activity infrastructure but must not require or imply paid Stepping Into Greatness enrollment.

## Review these changes
- `src/routes/freeRunClubCommunityRoutes.js`
- `public/free-run-club.js`
- `public/retention-journey-start.html`
- `public/retention-journey-start.js`
- `test/free-run-club-community-phase2.test.js`
- Phase 1 community service/profile/UI files

## Required checks
1. Confirm Retention Journey shows Free Run Club as a first-class option and routes directly to `/free-run-club.html`, never `/greatness.html?mode=run-club`.
2. Confirm Run Club APIs require canonical authentication.
3. Confirm board membership is derived from canonical users who explicitly completed the Free Run Club profile/consent; no second identity database.
4. Verify 24-hour pruning across members and identify any mutation-on-read/storage concerns.
5. Review age/sex/state exposure. Determine whether field-level visibility controls are required before production.
6. Confirm no raw GPS/home location is exposed in community profile or posts.
7. Review image URL/reference handling for XSS, unsafe schemes, ownership and future upload requirements. Images should not be treated as fully production-safe until this is resolved.
8. Confirm profile and photo consents are distinct and auditable enough.
9. Review rate limits and abuse/reporting/moderation gaps.
10. Confirm diagnostics identify the earliest failed boundary: auth/API/profile/community membership/board read/server diagnostic.
11. Verify Free Run Club does not accidentally grant paid membership capabilities.
12. Verify existing paid Stepping Into Greatness still works unchanged.
13. Inspect server integration. The route installer must actually be instantiated by `server.js` before calling this production-complete. If not wired, verdict must require that final hook.
14. Run focused tests and relevant auth/greatness/run-club regressions.

## Final verdict
Return exactly one:
- `APPROVE PHASE 2 FOR FINAL SERVER HOOK / OWNER TESTING`
- `CHANGES REQUIRED`

Do not merge.
