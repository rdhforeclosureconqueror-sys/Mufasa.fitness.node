# OHSA Palms-Facing-Each-Other — Corrective Review Handoff

Date: 2026-09-09
Branch: `fix/ohsa-palms-face-each-other-20260909`
Base: current `main` after merged PR #754
Status: **OWNER VISUAL RETEST REQUIRED**

## Owner finding

The OHSA arm path, ear alignment, squat path, and grounding are now acceptable, but the hands remain rolled the wrong way. The intended assessment pose is **palms facing each other** throughout setup, descent, bottom, ascent, and finish.

## First failing boundary

The palm solver correctly identified a hand plane but treated the raw mirrored `Index -> Pinky` cross-product normal as the palm-facing side. On the loaded hand convention that normal represents the back-of-hand side. A plane has two faces; solving the correct plane with the wrong signed face produces a mathematically valid twist that is visually 180 degrees wrong.

## Fix

`public/motion/motion-spec-semantic-direction-policy.js` now defines the anatomical palm-facing normal as:

`-(mirrored Index/Pinky cross-product normal)`

before projecting it perpendicular to the hand long axis and solving the twist toward the Head/body centerline reference.

The fix only changes hand roll. It does **not** change:

- upper-arm ear alignment;
- torso/head-relative arm behavior;
- lower-body squat geometry;
- foot grounding/IK;
- bottom hold timing;
- mirrored ascent;
- three-rep sequence.

Diagnostics now include `beforeAngleDegrees`, `residualDegrees`, and `palmNormalConvention` so the first palm-orientation failure is visible.

## Regression coverage

Run:

```bash
node --test test/overhead-squat-assessment-motion-spec.test.js test/ohsa-palm-facing-regression.test.js
```

The new focused regression intentionally constructs a hand whose raw plane normal represents the back-of-hand direction. It verifies that the **anatomical palm normal**, not the raw plane normal, finishes facing the inward reference.

## Owner visual acceptance

Stop at the first failure.

1. Load OHSA on the personalized Coach Avatar.
2. Inspect `setup_overhead` from the front.
3. Confirm both palms face one another across the centerline.
4. Confirm the backs of the hands face outward.
5. Inspect right-side view and confirm hand roll does not disturb arms-by-ears alignment.
6. Play through first descent and bottom; palm orientation should remain inward.
7. Confirm ascent and all three reps preserve the same palm orientation.

### GO

Both palms face each other throughout the motion and the previously accepted arm/squat behavior is unchanged.

### NO-GO

Either palm still faces outward/forward/backward, one hand is mirrored incorrectly, hand twist disturbs ear alignment, or an existing motion behavior regresses.
