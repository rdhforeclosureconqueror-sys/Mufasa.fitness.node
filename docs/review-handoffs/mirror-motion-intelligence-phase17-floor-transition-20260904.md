# MIRROR MOTION INTELLIGENCE — PHASE 17 REVIEW HANDOFF

## Purpose
Add review-first standing-to-floor and floor-to-standing transition intelligence for push-up/plank mirroring without creating a second root solver or using authored reference motion as live authority.

## Base
Current main at branch creation: `d815e299936f5474120b827914fa94c88ab98d14` (merged PR #672 same-frame Phase 15–16 compensation hardening).

## Existing assets reused
- `public/motion/transition-profile.js`
- `public/motion/transition-profiles/stand-to-plank.v1.json`

The profile remains reference mechanics only. Live MoveNet/body geometry remains authoritative.

## Phase 17 boundary
Review-first only. Phase 17 emits `floorTransitionIntent` metadata and does not write avatar root/pelvis transforms.

Recognized state sequence:
`STANDING -> HINGE -> CROUCH -> HANDS_DOWN -> PLANK_STABLE`

The same states may be traversed in reverse when returning to standing.

## Safety rules
1. Learn a trustworthy standing hip baseline before transition authority becomes active.
2. Require trustworthy shoulders/hips and body scale.
3. Require consecutive evidence before advancing or reversing state.
4. A forward hinge alone must never equal hands-down/floor acquisition.
5. Hands-down requires meaningful root descent plus wrist/ankle proximity.
6. Plank requires a horizontal body-axis signal plus lower-body alignment.
7. Non-push-up exercise context remains inactive.
8. Dropped/coasted landmarks are not trustworthy.
9. Phase 2 tracker/person reset clears transition baseline/state.
10. No measured Z-depth and no root-write authority.

## Output
`floorTransitionIntent` includes:
- phase
- direction (`DOWN` / `UP`)
- normalized progress
- confidence
- normalized root drop
- body-axis angle
- standing-baseline readiness
- reference profile id
- `livePoseAuthority: true`
- `measuredDepth: false`

## Diagnostics
Report first failing boundary, phase, direction, standing samples, transition count, context resets, process errors, live-pose authority, root authority, measured-depth authority, and last issue.

## Required review
Run `node --test test/mirror-motion-phase17.test.js` plus focused Phase 4/5/13/14/15/16 tests and the full suite.

Manual acceptance:
1. Standing calibration/base pose -> no transition until stable baseline learned.
2. Bend forward to touch knees without going to floor -> must remain HINGE/CROUCH, never PLANK.
3. Move from standing through hands to floor into push-up position -> state should advance monotonically with limited hysteresis.
4. Return from plank to standing -> direction changes to UP and state reverses cleanly.
5. Pause mid-transition -> no chatter between adjacent states.
6. Tracking loss/reacquisition -> old floor-transition history must not survive.
7. Jumping jack/squat -> Phase 17 inactive.
8. Confirm calibration/Mufasa voice ownership from #665/#666 remains unchanged.

## Next phase if GO
Phase 18 may activate confidence-limited transition assistance at the existing root/pelvis boundary, using live pose as primary authority and the neutral profile only as bounded assistance during uncertain transition frames. Do not autoplay or copy source animation styling.

Return `GO` or `CHANGES REQUIRED` with exact evidence. Do not merge without owner approval.
