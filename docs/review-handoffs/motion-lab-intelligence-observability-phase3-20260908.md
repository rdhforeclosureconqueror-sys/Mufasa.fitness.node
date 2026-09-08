# Motion Lab Intelligence Observability — Phase 3 review handoff

## Purpose

Make the Phase 2 shared biomechanics/contact pipeline visible to the operator before any additional lunge mechanics are changed.

The user re-ran the Motion Lab flow after Phase 2 and reported that the visible result appeared unchanged. The existing Motion Lab diagnostic surfaces did not expose the new adapter's per-phase constraint evidence, so there was no way to tell whether contact correction ran, how much root correction was applied, which contacts were resolved, or which boundary failed first.

## Phase 3 classification

This is an observability phase, not another motion-authoring phase.

The sequence is now:

1. Phase 1 — shared Avatar Motion Intelligence Core.
2. Phase 2 — Motion Lab adapter routes generated Motion Specs through shared contact/root enforcement.
3. Phase 3 — surface that pipeline in one copyable first-failure diagnostic panel.

Do not hand-tune the lunge in this phase.

## New module

`public/motion/motion-lab-intelligence-debug.js`

It installs a wrapper around the frozen `MotionLabRuntime` rather than mutating it. The wrapper preserves the existing runtime API and intercepts only `loadMotionSpec()` to record the compiler result.

The panel reports:

- motion ID and exercise ID;
- core version;
- adapter version;
- load status/code;
- whether kinematic validation was applied;
- whether contact lock was applied;
- anchor phase;
- missing contacts;
- maximum contact residual;
- per-phase contact count;
- per-phase correction status;
- per-phase correction magnitude;
- per-phase residual;
- per-phase first failure;
- overall first failing boundary;
- bootstrap status/stage;
- timestamp.

The panel contains one `Copy Motion Intelligence Debug` control that copies the consolidated text block for review/debug handoff.

## Bootstrap order

`motion-lab-bootstrap.js` now loads:

`MotionLabRuntime -> Motion Intelligence Debug -> install frozen wrapper -> Lunge Preview`

The bootstrap fails explicitly at `motion_intelligence_debug_install` if the wrapper does not install, so diagnostics cannot silently disappear.

## Authority boundaries

No new renderer, mixer, retargeter, IK solver, contact solver, exercise authority, or lunge-specific tuning is introduced.

Phase 2 remains the contact/root enforcement authority for generated Motion Specs. Phase 3 observes its output.

The live mirror pipeline remains unchanged.

## Manual acceptance after deploy

1. Initialize Runtime.
2. Start Session.
3. Load the reference avatar.
4. Load synthesized squat and verify it still works.
5. Load synthesized lunge.
6. Open **Motion Intelligence Debug — Phase 3**.
7. Copy the diagnostic block.
8. Send the copied block together with screenshots of the lunge.

The important values are the first failing boundary and each phase's correction status/magnitude/residual.

If the lunge still looks unchanged but the panel shows non-zero corrections, Phase 4 should inspect generated lower-body chain/IK authority. If the panel shows no correction or a failed contact boundary, Phase 4 should fix that earlier boundary instead.

## Verification

Run:

- `node --test test/avatar-motion-intelligence-core-phase1.test.js`
- `node --test test/motion-lab-intelligence-adapter-phase2.test.js`
- `node --test test/motion-lab-intelligence-debug-phase3.test.js`
- relevant Motion Lab / Motion Spec / squat / lunge suites

Focused tests were added in this branch but have not been executed in the GitHub connector environment. Do not treat test presence as test execution or human acceptance.
