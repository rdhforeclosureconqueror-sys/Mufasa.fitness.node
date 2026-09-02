# Independent Review Handoff — Stationary Left Lunge v2

## Scope
Review the correction to the synthesized stationary left-forward lunge after owner side-view screenshots showed a clear NO-GO failure: the front leg behaved reasonably, but the right rear toe/forefoot stayed airborne and the right rear knee did not descend toward the floor. The motion read like a running/suspended stride instead of a grounded stationary lunge.

## Branch
`lunge-v2-ground-contact`

Base: current `main` at branch creation.

## Intended v2 behavior
- Left foot stays forward and whole-foot planted.
- Right foot stays behind with the right toes/ball of foot planted.
- Right heel may rise.
- No flight phase.
- Pelvis descends mostly vertically between the two support contacts.
- Front knee continues tracking acceptably over the front support.
- Right rear knee travels DOWN toward the floor as the body descends.
- Bottom target remains approximately 90° at both knees as an engineering target, not asserted biomechanical truth.
- Ascent reverses the same chain and returns to the same split stance.

## What changed
### Motion spec
`public/motion/lunge-motion-spec.js`

Advanced to:
`lunge/stationary_left_synthesized_engineering_v2_rear_toe_grounded`

The front chain is intentionally kept close to v1 because owner visual review said it looked acceptable. The rear chain changes materially:
- start rear knee is closer to extension so the rear toe can establish lower rather than already folding upward;
- rear femur rotates toward a more vertical/downward bottom orientation;
- rear knee flexes to about the 90° engineering region;
- root bottom descent is increased to support the rear-knee-down intent;
- the spec explicitly rejects approval of an airborne rear-toe start anchor.

### Movement contract
`public/motion/contracts/stationary-lunge-left.v1.json`

Now explicitly treats these as hard requirements:
- right toe/ball of foot grounded;
- grounded anchor establishment before the anchor is accepted;
- rear knee descends toward floor;
- no running-stride/rear-leg-swing behavior.

## Critical architecture limitation to review
The generic compiler currently applies root translation correction for multiple contact anchors. It does **not** yet implement a true independent two-bone IK solve for each planted limb.

Therefore do not approve merely because `enforceContactAnchors: true` exists in JSON. Inspect the actual Phase E skeleton and Motion Lab playback.

If the right toe still leaves the floor while the front foot is planted, classify this as a contact-solver limitation rather than endlessly tuning angles. The correct next architecture would be a per-limb planted-contact IK/constraint solve.

## Required checks
Run at minimum:

`node --test test/lunge-motion-spec-v1.test.js test/motion-spec-real-avatar.test.js test/squat-motion-spec-v1.test.js`

Then in Motion Lab on the Phase E reference avatar:
1. Load the synthesized lunge.
2. Use exact side view.
3. Pause at START, DESCENT, BOTTOM, ASCENT.
4. Confirm the right toe/forefoot remains on the same visible ground plane as the front support.
5. Confirm the rear heel may rise but the toe does not.
6. Confirm the right knee moves progressively downward on descent.
7. At bottom, confirm rear knee is near the ground rather than hanging behind the body.
8. Confirm the front leg has not regressed.
9. Orbit to front/back and inspect for tightrope/crossover behavior.
10. Verify squat regression remains acceptable.

## GO
Only GO if:
- right toe/forefoot visually remains grounded through the cycle;
- right knee moves down toward the floor;
- pelvis lowers between supports;
- front foot remains planted;
- motion no longer resembles running or airborne stride;
- no obvious regression in squat contact behavior.

## NO-GO
NO-GO if:
- rear toe floats;
- rear leg swings backward/up instead of acting as a support chain;
- rear knee does not descend;
- front foot slides/lifts;
- contact residuals are materially nonzero even if visual camera angle hides it;
- motion becomes unstable from root correction.

## Evidence boundary
This remains a synthesized development reference. No dedicated lunge FBX is copied into the runtime and no medical/biomechanical authority is claimed.
