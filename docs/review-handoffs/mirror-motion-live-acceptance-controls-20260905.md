# MIRROR MOTION — LIVE ACCEPTANCE CONTROLS REVIEW

## Role
Independent reviewer. Do not merge during review. Return GO or CHANGES REQUIRED.

## Baseline
Built from current main after PR #687 merged with PR #688 acceptance-enforcement hardening included.

## Purpose
Make the already-canonical live acceptance harness operable from the UI during the user's real-device test. This PR adds no motion behavior.

## Runtime
New module: `public/mirror-motion-live-acceptance-controls.js`.

It shows the current required acceptance step, notes field, PASS / FAIL / BLOCKED / RESET controls, and the harness report. All writes delegate to `PocketPTMirrorMotionLiveAcceptance.record/reset`, so ordering, stop-on-first-failure, PASS gating, and exact snapshot capture remain owned by the hardened harness.

## Loader
Phase 12 loads controls only after `/mirror-motion-live-acceptance.js` and exposes a distinct `MIRROR_MOTION_LIVE_ACCEPTANCE_CONTROLS_LOAD_FAILED` boundary.

## Authority invariants
No pose processing, camera, MoveNet, IK, retargeter, root, contact, exercise, animation, or measured-depth authority. Controls must not bypass harness validation.

## Required review
1. Confirm PR #688 enforcement is present underneath this branch.
2. Confirm controls always target the harness's next NOT_RUN step.
3. Confirm PASS/FAIL/BLOCKED delegate to harness `record()` rather than mutating results directly.
4. Confirm reset delegates to harness `reset()`.
5. Confirm control errors are displayed and do not mutate motion/runtime state.
6. Confirm loader order and distinct controls load-failure attribution.
7. Run `node --test test/mirror-motion-live-acceptance-controls.test.js test/mirror-motion-live-acceptance.test.js test/mirror-motion-acceptance.test.js` and full suite.

## GO criteria
GO means the user can perform the real-device acceptance session from the visible UI while preserving first-failure discipline. After merge, do not create another speculative motion phase; begin live acceptance and make only reproduced-bug PRs.