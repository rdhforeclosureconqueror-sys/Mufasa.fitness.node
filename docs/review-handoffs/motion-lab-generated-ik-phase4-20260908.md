# Motion Lab Phase 4 — Generated Pose / IK Enforcement

## Why this phase exists

Live device diagnostics proved that the lunge compiler, shared intelligence core, adapter, contact resolution, root correction, and existing contact validation all ran successfully, yet the rendered stationary lunge still looked biomechanically wrong. The missing authority was generated limb-chain enforcement. The previous compiler could move the root toward contact anchors without forcing the hip-knee-ankle chain to satisfy those anchors, and it rebuilt animation tracks from authored offsets rather than preserving post-constraint bone quaternions.

## Generalized architecture

Phase 4 extends the existing Motion Lab intelligence adapter. It does not add a second retargeter or second animation compiler.

Pipeline:

Motion Spec authored pose → shared root/contact correction → declared kinematic chain solve → post-solve segment/contact validation → capture corrected local quaternions → build AnimationClip tracks.

The shared core remains biomechanics math authority through `solveTwoBoneChain()` and `validateKinematicPose()`. `motion-spec-clip.js` remains clip authority. `motion-lab-intelligence-adapter.js` remains the THREE/avatar translation layer.

## Contact-offset-aware leg chains

A contact may be distal to the two-bone chain endpoint. The rear lunge contact is `RightToeBase`, but the two-bone leg is hip → knee → ankle (`RightUpLeg` → `RightLeg` → `RightFoot`). Phase 4 therefore captures the ankle-to-contact point in the end bone's local space during the authored anchor phase. During each solved phase it derives the required ankle target from the planted contact anchor and that rigid local offset. It never treats knee→toe as shin length.

The lunge spec now declares generic `kinematicChains` metadata and `enforceGeneratedIK: true`. The adapter itself contains no lunge exercise ID or Mixamo lunge bone names.

## Fail-closed boundaries

The compiler/adapter now fail explicitly for unresolved chains, invalid captured segment lengths, unsolved/unreachable two-bone IK, rotation failures, excessive segment residual, excessive final contact residual, or final kinematic validation failure.

Phase 4 uses tighter generated-motion residual limits than the broad Phase 2 root-contact tolerance:
- generated contact residual ratio: 0.035 of avatar body scale
- chain residual ratio: 0.015 of avatar body scale
- two solve iterations to account for the distal contact offset after parent rotations

These are development engineering thresholds and still require visual owner acceptance before product clearance.

## Critical compiler correction

The compiler now records each target bone's local quaternion **after** root/contact/IK enforcement for every phase and uses those captured quaternions to build the keyframe tracks. This closes the prior authority gap where successful compile-time corrections could be discarded when tracks were reconstructed from original authored Euler offsets.

## Diagnostics

The existing consolidated Motion Intelligence diagnostic now reports:
- Generated IK state
- Generated IK chain count
- whether post-solve tracks were captured
- max chain residual
- per-phase chain count
- per-chain solve status
- thigh/shin captured lengths
- chain residual
- contact residual
- chain first failure

No second debug panel is introduced. The existing canonical copied diagnostic remains the review surface.

## Regression proof set

1. Stationary lunge is the failing proof case.
2. Squat must still compile/play without regression.
3. Push-up must still compile/play without regression.
4. Existing Phase 2 contact/root behavior remains available for Motion Specs that do not declare `enforceGeneratedIK`.

## Manual device acceptance

After deploy:
1. Initialize Motion Lab and start a session.
2. Load the Phase E reference avatar.
3. Load synthesized lunge.
4. Copy the consolidated diagnostic.
5. Verify `Generated IK: PASS`, `Post-solve tracks captured: YES`, two generated chains, and bounded chain/contact residuals for all contact phases.
6. Visually inspect front and side views. Rear toe/forefoot must remain planted, rear knee must descend rather than the leg swinging into a running-stride shape, and pelvis/root movement must remain coherent.
7. Repeat synthesized squat and push-up regression checks.

Do not mark the lunge human-cleared from diagnostics alone. Visual biomechanics acceptance remains human authority.

## Verification status

Focused regression tests were added, but they were not executed in the connector environment. Run at minimum:

- `node --test test/avatar-motion-intelligence-core-phase1.test.js`
- `node --test test/motion-lab-intelligence-adapter-phase2.test.js`
- `node --test test/motion-lab-generated-ik-phase4.test.js`
- `node --test test/motion-lab-intelligence-diagnostics-consolidated.test.js`
- relevant squat/lunge/Motion Spec suites
- full suite if practical

Canonical readiness stores were not edited directly.
