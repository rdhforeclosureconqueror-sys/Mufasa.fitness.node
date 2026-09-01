# INDEPENDENT REVIEW HANDOFF — FREE RUN CLUB PHASE 4 SERVER HOOK

## ROLE

Act as the second independent reviewer. Do not merge. Do not assume the author is correct.

Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`

Branch: `free-run-club-phase4-server-hook`

## LIVE FAILURE THAT TRIGGERED THIS PHASE

Owner iPhone testing produced the browser first-failure diagnostic:

- `profile_api` -> FAIL 404
- `board_read_api` -> FAIL 404
- `server_diagnostic` -> FAIL 404

This proves the static Free Run Club page was deployed while the authenticated API route installer was not connected to the production startup path.

## ARCHITECTURE TO VERIFY

Production starts through `npm start` -> `node world-bridge-server.js`, not by invoking `server.js` directly.

This phase installs the already-existing Free Run Club service/routes in that canonical production entrypoint. It must continue to reuse the same filesystem user directory under:

`POCKET_PT_DATA_DIR/users`

or the normal development fallback `data/users`.

There must be no second auth system and no separate Run Club identity database.

## FILES TO REVIEW

- `world-bridge-server.js`
- `src/services/freeRunClubCommunityService.js`
- `src/routes/freeRunClubCommunityRoutes.js`
- `test/free-run-club-phase4-server-hook.test.js`

Also inspect current `package.json` and confirm `npm start` still uses `world-bridge-server.js`.

## REQUIRED CHECKS

1. Confirm `createWorldBridgeApp()` calls the Free Run Club installer on startup.
2. Confirm it derives the same persistent user directory as the canonical server.
3. Confirm all three live endpoints exist after startup:
   - GET/PUT `/api/me/run-club/profile`
   - GET/POST `/api/me/run-club/board`
   - GET `/api/me/run-club/diagnostic`
4. Confirm all endpoints still require canonical authentication.
5. Confirm Run Club board membership is derived from canonical `userStore.listUsers()` and active profile consent.
6. Confirm the service no longer calls nonexistent `userStore.getUser`; the repository user store exposes `loadUser`.
7. Confirm text-only posts work.
8. Confirm photo payloads remain bounded and require photo-sharing consent.
9. Confirm the 24-hour pruning rule still removes expired posts.
10. Confirm the appended route error boundary produces JSON rather than an Express HTML error page.
11. Check whether route-authorization inventory needs an explicit follow-up entry before final security approval.
12. Run focused tests and any route/security inventory tests affected by new endpoints.

## LIVE OWNER ACCEPTANCE AFTER DEPLOY

On the Free Run Club page:

1. Run Debug Check. `profile_api` must no longer be HTTP 404.
2. Save/open a profile.
3. Post a text-only message and verify `Posted ✓` and visible feed entry.
4. Post a photo after the iPhone-picker repair is merged and verify preview + feed rendering.
5. Reload and confirm active posts persist until their 24-hour expiry.

## FINAL VERDICT

Return exactly one:

**APPROVE FOR OWNER TESTING**

or

**CHANGES REQUIRED**
