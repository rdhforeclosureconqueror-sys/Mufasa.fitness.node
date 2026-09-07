# MIRROR DEBUG SINGLE-AUTHORITY + DEPLOYMENT PARITY — INDEPENDENT REVIEW

## Role
Independent reviewer. Do not merge during review. Return GO or CHANGES REQUIRED with exact evidence.

## User-reported symptom
On iPhone/Safari, multiple mirror debug panels still stack over the workout even after earlier consolidation PRs. The visible symptoms include Mirror Acceptance Controls, camera diagnostics, and large phase/acceptance panels all rendering simultaneously. The user also suspects merged frontend and backend code are not aligned on the phone.

## Audit findings
1. PR #701 created the consolidated Mirror Debug Center.
2. PR #703 correctly force-hides legacy panels with inline `display:none !important`, adds Copy All / X / Debug launcher, dedupes duplicate text, raises z-index, and cache-busts the center itself.
3. However, the production `public/workout.html` source does not load `/runtime-config.js` directly. The debug-center bootstrap lives inside `runtime-config.js`, so a perfectly merged center is not guaranteed to execute on the actual production workout artifact.
4. The frontend build already has canonical deployment identity at `/__frontend-version.json`, while the Node service exposes `/api/deployment/identity`. Those identities were not previously included in the mirror debug copy payload.

## Fix in this PR
### Production bootstrap authority
`scripts/build-frontend.js` now injects exactly one:

`/runtime-config.js?v=<deployed commit>`

into the built `dist/workout.html` if the source shell does not already own a runtime-config script.

The query value comes from `RENDER_GIT_COMMIT` / `GIT_COMMIT` / build fallback. This makes each deployed frontend commit a distinct Safari/CDN cache URL without introducing a second runtime configuration authority.

### Deployment alignment diagnostics
New `public/mirror-deployment-diagnostics.js` reads:
- frontend `/__frontend-version.json` with `cache: no-store` + timestamp;
- backend `<canonical backend>/api/deployment/identity` with `cache: no-store` + timestamp.

It publishes a hidden diagnostic source `mirrorMotionDeploymentDebug` containing frontend commit/build, backend commit/service, and parity `ALIGNED`, `MISMATCH`, or `UNKNOWN`.

This producer is intentionally invisible by itself. Its ID is managed by the existing Mirror Debug Center, so its text becomes part of the same consolidated panel and Copy All report.

### Loader ordering
`public/runtime-config.js` requests deployment diagnostics before `/mirror-debug-center.js?v=20260907-consolidated-v2` once mirror diagnostics are detected.

## Authority invariants
- Keep exactly one visible mirror debug UI: Mirror Debug Center.
- Do not remove legacy diagnostic producers; hide/present them through the center.
- Do not create a second acceptance state machine.
- Do not change MoveNet, stabilization, constraints, IK, root motion, camera correction, rest capture, retargeting, voice, or workout behavior.
- Deployment diagnostics are read-only.
- Do not infer backend/frontend alignment from timestamps; compare deployed commit identifiers.

## Required review
1. Run `node --test test/mirror-debug-center.test.js test/mirror-debug-deployment-alignment.test.js`.
2. Run frontend build with a fake browser Maps key and known `GIT_COMMIT`; inspect built `dist/workout.html` and prove exactly one commit-cache-busted runtime-config tag exists.
3. Confirm `/runtime-config.js` is not duplicated if a future source shell adds it directly.
4. Confirm deployment diagnostics create no fixed-position overlay of their own.
5. Confirm `mirrorMotionDeploymentDebug` is captured by the existing managed-panel pattern.
6. Confirm #703 forced hiding / Legacy reveal / Copy All / close behavior remains intact.
7. Confirm production `render.yaml` still builds from `main` with `npm run build:frontend` and publishes `dist/`.
8. After deploy on iPhone/Safari, verify only one Debug launcher exists when closed and only one Mirror Debug Center exists when opened.
9. Use Copy All and verify deployment section shows the actual frontend and backend commit IDs.
10. If parity says MISMATCH, do not tune mirror motion; resolve deployment alignment first.

## Phone acceptance sequence after deploy
1. Hard refresh / reopen the Pocket PT workout page.
2. Confirm legacy phase/acceptance/camera panels do not stack.
3. Confirm a small `Debug` launcher exists.
4. Open it and confirm one scrollable center.
5. Tap Copy All and paste into chat.
6. Confirm deployment block appears.
7. If frontend commit is older than this merge, frontend Render deploy/cache is stale.
8. If backend commit differs, backend and frontend are on different deployed heads.

## GO criteria
GO only when the production build guarantees the canonical loader, one visible debug center owns presentation, Copy All remains complete, and frontend/backend deployment identity is observable from the phone.
