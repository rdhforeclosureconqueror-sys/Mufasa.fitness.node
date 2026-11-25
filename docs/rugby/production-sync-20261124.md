# Rugby HQ V8B production synchronization

Scope: synchronize the saved Windows checkpoint, preserving Web compatibility and
access restrictions. No Window of Opportunity Coaching Engine development.

Source: `C:/Users/pftgu/Documents/rugby-hq`.
Saved checkpoint: `C:/Users/pftgu/Documents/RugbyHQ-Checkpoints/V8B-20261124-173024`.
Branch: `sync/rugby-checkpoint-20261124`.
Readiness: board `launch`, card `launch-development-rugby-sync-v8b`.

## Protection and rollback

Verified production main: `fde89ca433ba628dee9a81a9c981a44538c232b7`.
Frontend: `srv-d4qicd7diees739b6n7g`, live `dep-dc2jjpu7bikc73fplipg`.
Backend: `srv-d4qdha49c44c73bb7vbg`, live `dep-dc2jjpu7bikc73fplhpg`.
Both services auto-deploy main. No service configuration or data changes intended.
Rollback by reverting the synchronization squash SHA on a new branch, reviewing,
testing and merging the revert; monitor both services and verify public version,
assets, routes and backend health. For urgent recovery, restore the recorded Render
frontend artifact, then reconcile source through the revert PR. Never force-push
main or reset databases. Preserve current auto-deploy settings after recovery.

## Persistent checklist

- [x] Inspect current local source and saved checkpoint location.
- [x] Inspect latest production main; capture both live deployment references.
- [x] Create isolated production synchronization branch; preserve old worktrees.
- [x] Hash-verify saved checkpoint and record source inventory (90 matching files).
- [x] Synchronize Training, Playbook, avatars, animations and runtime dependencies.
- [x] Preserve shell, Compatibility renderer, threadless/mobile texture export.
- [x] Adapt mobile gestures, PASS/RESTART, telemetry and scene navigation.
- [x] Validate Godot import, parsing and dependencies.
- [x] Validate all 16 automatic 3v2 combinations and receiver neutrality.
- [x] Validate early/late double blitz, 2v1/2v2 and genuine simulation outcomes.
- [x] Validate replay/reset, formations and Training scenarios.
- [x] Validate desktop gameplay, mobile controls and multitouch (Chrome emulation).
- [x] Export, verify hashes and browser navigation/gameplay.
- [ ] Review implementation and separately review acceptance criteria; pass CI.
- [ ] Merge and confirm both Render deployments.
- [ ] Verify public build, navigation, access restrictions; record final checkpoint.
- [ ] Owner physical-device and visual acceptance (human only).

## Roadmap

1. Complete this verified production checkpoint and request owner device assessment.
2. Resolve any reported checkpoint defects in a separate reviewed repair.
3. Only next cycle: Window of Opportunity Coaching Engine, commitment detection,
   dynamic passing windows, coaching pauses and tactical assessment.

## Implementation and validation evidence

The saved Windows source was read only. The destination retains production project
settings and shell. Synchronized gameplay includes all six Training scenarios,
Double Wedge, possession control, existing gesture timing, kit avatar and animations,
15v15 formations and Playbook 2v1/2v2/3v2 simulations. No new gameplay engine was added.
The Playbook simulation uses actual touch proximity, try-line crossing and nearest
kick recovery; no `reaction_solution` override exists.

Web-specific changes retain native touch menus while consuming duplicate emulated
mouse events for PASS/RESTART. Scene changes are deferred until touch input finishes.
Read-only, opt-in QA reports both scenes, control geometry and animation state.
Export includes script dependencies explicitly and excludes GUT/editor tools.

Failures found and corrected before publication:
- Missing decision telemetry script in the selected-resource export prevented Training
  compilation in the browser. Explicit runtime-script inclusion and a package test fix it.
- QA queried an idle AnimationPlayer without a current clip; guarded the read.
- Immediate touch-driven scene changes produced `can_process` errors; deferred both routes.
- The test's native-menu keyboard sequence selected the previous item; real mouse/touch
  menu selection now verifies actual browser input instead.

Validation: GUT 9.5.0, 8 tests / 568 assertions; tactical outcome matrix saved alongside
the source hash inventory under `docs/rugby/web-validation/`. All 29 repository Rugby
contract tests pass; frontend build passes. Browser suite passes desktop 1280x900,
phone landscape 844x390 and portrait 390x844: WASD/arrows, facing, Run/Walk, fixed
physics yaw, sustained movement/perimeter, Space/R, visible ball/avatar, simultaneous
joystick/PASS/RESTART, single-finger pass, exactly-once pass, native menu selection,
3v2 simulation/reset and both scene-navigation directions. No browser/runtime errors.

Reproduce: set `GODOT_WEB_BIN` to standard Godot 4.5.1, run
`node scripts/export-rugby-web.js`, then run Godot with
`--headless --path godot/rugby-hq-web -s addons/gut/gut_cmdln.gd -gtest=res://tests/sync/test_checkpoint.gd -gexit`.
Install Playwright into the isolated test prefix with
`npm install --prefix tmp/rugby-browser playwright`, then run
`node scripts/check-rugby-checkpoint-browser.js` (Chrome installed; override path with
`RUGBY_BROWSER`). Set `RUGBY_TEST_URL` to test the production origin.

Limitations: automated Chromium touch emulation is not physical iPhone/Safari
acceptance. Portrait preserves the landscape canvas and has small text/controls;
landscape is recommended. The 15v15 formation uses 30 personalized avatars and needs
owner assessment for phone performance. Access restrictions and website routes are
unchanged. No database or service configuration changes are included.
