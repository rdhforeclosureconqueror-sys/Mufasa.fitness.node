# Independent Review Handoff — Dashboard Admin Diagnostics Regression

## Role
You are the independent reviewer. Do not assume the implementation is correct. Do not merge solely from this handoff.

## User-reported regression
On iPhone Safari, the admin Dashboard previously exposed a larger diagnostic/admin surface. The current deployed static frontend showed `Development & Launch` with Movement Capture Studio, Launch Readiness, Avatar Development Board, Client Management, and Trainer Workspace, but the expected diagnostic launch controls were no longer visible in that area.

A second screenshot showed the older/expected diagnostic controls including `Copy Codex Repair Summary`, `Refresh`, `Run Club Diagnostics`, and `Motion Lab`.

## Repository reconnaissance
Base main at branch creation:

`694e360869d739e5b88dfa3fadf7e644e535e8d9`

Important finding: current `public/dashboard.html` on main still contains the full `Launch Health Console (Admin)` and the canonical controls:

- Run Full Diagnostic
- Run Safe External Checks
- Export Redacted Report
- Copy Codex Repair Summary
- Refresh
- Run Club Diagnostics
- Motion Lab
- Mobile Auth Diagnostics
- launch-health sections

Therefore the source console was not deleted by the recent motion PRs. The live symptom is consistent with either frontend deployment/cache parity or a runtime/admin-navigation reveal path failing before all controls become reachable.

`public/dashboard.js` also contains a separate admin observability reveal path. Review its dependency on DOM/global element resolution carefully; do not assume browser named-element globals are portable across Safari versions.

## Repair strategy
This PR deliberately adds a stable, redundant admin launch surface in `public/trainer-navigation.js`, because that script already successfully reveals the `Development & Launch` card in the user's screenshot.

For admin/super_admin it now ensures direct links to:

- Movement Capture Studio
- First-Failure Debug
- Run Club Diagnostics
- Motion Lab
- Client Management

It also explicitly reveals the existing hidden `clientManagementCard`, `runClubDiagnosticsNav`, and `motionLabNav` when those nodes exist.

This does NOT replace the full Launch Health Console. It makes critical observability routes reachable even if another downstream Dashboard runtime fails.

## Files changed
- `public/trainer-navigation.js`
- `test/admin-movement-capture-dashboard.test.js`
- `docs/review-handoffs/dashboard-admin-diagnostics-regression-handoff.md`

## Required static review
1. Confirm only `admin` and `super_admin` receive the new diagnostic links.
2. Confirm trainer-only/member users do not get admin diagnostics.
3. Confirm no new authentication system or parallel role source was created.
4. Confirm links point to canonical existing routes.
5. Confirm Movement Capture Studio still uses the existing recorder/camera architecture.
6. Confirm current `public/dashboard.html` still contains the full Launch Health Console.
7. Inspect `public/dashboard.js` for brittle element/global lookup behavior and report whether a follow-up should explicitly bind `developmentLaunchCard` with `getElementById`.

## Tests to run

`node --test test/admin-movement-capture-dashboard.test.js`

Also run the broader dashboard/auth tests if available in the checkout.

## Live mobile acceptance
After merge + static frontend deployment:

1. Sign in as admin on iPhone Safari.
2. Open Dashboard.
3. Scroll to Development & Launch.
4. Confirm all five direct development/diagnostic entries are visible.
5. Confirm Client Management is visible.
6. Confirm First-Failure Debug opens.
7. Confirm Run Club Diagnostics opens.
8. Confirm Motion Lab launch path remains functional.
9. Continue scrolling and confirm the full Launch Health Console is also present.
10. Capture the frontend deployment identity/version. If the console is still absent while GitHub main contains it, classify as frontend deployment/cache parity failure rather than deleting/rebuilding diagnostics.

## GO
- Critical admin diagnostics are reachable from the stable Development & Launch card.
- Full Launch Health Console remains intact.
- No admin tools leak to non-admin roles.
- Static/frontend deployment serves the reviewed commit.

## NO-GO
- Admin links still disappear.
- Non-admin users see admin diagnostics.
- Motion Lab/Run Club routes are duplicated with a new runtime instead of canonical links.
- Live frontend serves a different commit/build than the reviewed main.

Tests were authored but not executed by ChatGPT. Keep static/code proof separate from live iPhone/deployment proof.
