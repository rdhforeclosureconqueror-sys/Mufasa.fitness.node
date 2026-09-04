# Mirror Motion Intelligence — Phase 11 side-view occlusion authority

## Base

PR #655 hardening head: `0f5b2c6ede82dcbe58baa2b0755243faa81167cd`.

## Purpose

Reduce side/quarter-view limb identity jitter when paired limbs overlap in 2D projection, without inventing Z-depth.

## Behavior

- consumes hardened Phase 7 orientation intent;
- operates only in trusted QUARTER/SIDE views;
- compares left/right elbow, wrist, knee, and ankle separation relative to body scale;
- requires a material confidence difference plus consecutive overlap frames before granting presentation authority to one side;
- zeros only the weaker avatar-presentation confidence while overlap authority is active;
- keeps the hold through bounded release hysteresis to avoid flicker;
- ambiguous confidence does not guess near/far authority;
- FRONT/untrusted orientation/body-scale loss clears transient authority;
- IK-solved/contact-anchored upstream points are protected and bypass suppression;
- Phase 2 tracker/person reset clears overlap state;
- `measuredDepth` remains false.

## Scope boundary

Review-first only. Do not add Phase 11 to the production runtime loader in this PR. No depth reconstruction, second solver, new camera/MoveNet path, exercise authority, or rest-pose rewrite.

## Diagnostics

`Mirror Motion Phase 11 Debug` reports first failing boundary, runtime patch/bind status, occlusion suppressions, active overlap pairs, upstream protected bypasses, context resets, process errors, and explicit no-depth authority.

## Regression coverage

`test/mirror-motion-phase11.test.js` covers consecutive entry, ambiguous-confidence passthrough, release hysteresis, IK/contact protection, FRONT reset behavior, and no-depth diagnostics.

## Review focus

Attack side-on push-ups, overlapping knees during squats, jumping jacks, arm crossings, fast turns, mirrored preview semantics, confidence ties, tracker reacquisition, and cases where the actually visible limb temporarily has the lower MoveNet confidence.

Return `GO` or `CHANGES REQUIRED` with exact evidence. Do not merge unless explicitly requested by the owner.