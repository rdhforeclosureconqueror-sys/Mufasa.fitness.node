# PR #1400 mobile control repair

The exported baseline reproduced a missed PASS while the joystick finger remained
down: actual player displacement occurred, but the pass count stayed at zero.
Godot GUI Buttons rely on a single emulated mouse pointer. The Web copy now handles
ScreenTouch presses inside the existing PASS and RESTART bounds and calls the same
gameplay methods as keyboard and mouse controls. Touch-to-mouse emulation is disabled
to prevent duplicate actions. No Windows game files, avatar resources or mechanics
were changed. PR #1400 also supplies a visible RESTART button and explains rejected
passes after a play ends or while the ball is in flight.

## Reproduce

Set GODOT_WEB_BIN to standard Godot 4.5.1, run `node scripts/export-rugby-web.js`.
Install the isolated test driver with
`npm install --prefix tmp/rugby-browser --no-save --package-lock=false playwright`.
Serve `public` at localhost:8781 and run `node scripts/check-rugby-multitouch.js`.
RUGBY_TEST_URL can select the deployed origin. The test uses real browser touch
events, including simultaneous joystick/PASS, exactly-once passing, support catch,
second-finger restart, single-finger passing, game-over feedback and restored
movement/possession after restart in portrait and landscape. CDP touchEnd identifies
the lifted finger; supplying the remaining finger incorrectly invalidates the test.
QA telemetry is read-only and enabled only by `?qa=1`.

Also run `node scripts/check-rugby-web-browser.js`,
`node scripts/check-rugby-device-browser.js` with the same preview origin,
the Rugby HQ workflow's Node tests, frontend build and readiness validation.
Browser tests emulate touch in Chromium; physical iPhone Safari acceptance remains
the owner's post-deployment check. Portrait remains letterboxed with small controls;
landscape is recommended. The initial game payload remains approximately 110 MB.

## Rollback reference captured before changes

Production main: `f16de889b2fdbc2db56852bc2c384a4e901c488e`.
Frontend service `srv-d4qicd7diees739b6n7g`, successful deployment
`dep-dc12sibtqb8s73a44h10`.
Backend service `srv-d4qdha49c44c73bb7vbg`, successful deployment
`dep-dc12sibtqb8s73a44g10` at the same commit.

Rollback: create a branch from current main, `git revert <PR1400-squash-SHA>`,
review/test/merge that revert, and monitor both automatic Render deployments.
For urgent frontend recovery, redeploy the recorded successful frontend deployment,
then reconcile source through the revert PR. Verify the frontend version endpoint,
homepage, Community Hub, Rugby HQ routes and backend health after recovery.
No database migrations or data changes are included; do not reset production data
or force-push main. Keep the unrelated notification readiness commit intact.
