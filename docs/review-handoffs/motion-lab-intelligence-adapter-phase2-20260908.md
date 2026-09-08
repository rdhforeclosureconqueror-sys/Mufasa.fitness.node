# Motion Lab Intelligence Adapter — Phase 2 review handoff

## Purpose

Connect the Phase 1 `Avatar Motion Intelligence Core` to generated Motion Spec compilation without creating a second avatar solver or hand-tuning the current lunge.

## Trigger

Human review cleared the existing squat and push-up demos but rejected the synthesized stationary lunge. The lunge spec already declares front-foot and rear-forefoot grounding. The failure therefore belongs to constraint enforcement, not exercise naming or authoring intent.

## Phase 2 changes

- Adds `public/motion/motion-lab-intelligence-adapter.js`.
- Loads the shared core and adapter before `motion-spec-clip.js` in Motion Lab bootstrap.
- Replaces the compiler's local average contact-correction block with the shared adapter.
- Uses the avatar's actual 3D world-space contact positions and authored anchor phase.
- Routes multi-contact root correction through `Avatar Motion Intelligence Core.solveRootAnchorCorrection()`.
- Validates corrected contact geometry with the shared first-failure validator.
- Fails closed with `motion_kinematic_validation_failed` instead of silently producing a clip when the shared contact contract is violated.
- Emits per-phase constraint diagnostics and the adapter version in clip diagnostics.

## Authority boundaries

Phase 2 does not introduce a second retargeter, animation mixer, renderer, MoveNet detector, exercise authority, or IK authority.

The existing Motion Spec compiler still owns clip creation and quaternion tracks. The new adapter only owns shared contact/root constraint enforcement during compilation.

The live mirror pipeline remains unchanged.

## Why Phase 2 does not hand-fix the lunge

This phase intentionally does not change lunge angles or add lunge-only compensation. The purpose is to make the generator use the same shared biomechanical contract for every generated movement.

If the current lunge remains visually wrong after this phase, its per-phase diagnostics become the evidence for Phase 3. Phase 3 should correct the generalized generated-pose/chain solve, not patch one clip by eye.

## Regression expectations

1. Motion Lab still initializes.
2. Squat still compiles and plays.
3. Push-up existing path remains unchanged.
4. Lunge compilation now uses the shared contact/root constraint path.
5. Mixed-dimensional evidence fails closed.
6. The old local average-contact correction implementation is no longer the compiler authority.
7. No false Z-depth authority is introduced.

## Required reviewer execution

Run:

- `node --test test/avatar-motion-intelligence-core-phase1.test.js`
- `node --test test/motion-lab-intelligence-adapter-phase2.test.js`
- relevant Motion Spec / squat / lunge / Motion Lab suites
- full repository suite if practical

Then manually verify Motion Lab on iPhone Safari:

- Initialize Runtime
- Start Session
- load canonical avatar
- load synthesized squat and play
- load synthesized stationary lunge and play or capture the first reported compile/kinematic failure

## Phase 3 gate

Do not begin lunge-specific correction until Phase 2 is merged and the real-device result is observed. The first failing phase/constraint from the shared adapter becomes the Phase 3 target.
