# Stationary Lunge v2.2 — stride length + angle gate

## Owner-observed failure
The v2.1 motion declared a ~90° front-knee bottom target, but the entry step was visually too short. The avatar entered something closer to a walking/running stride than a true lunge stance. Once that stance was planted, later vertical descent could not reliably create the requested front-knee geometry without compensating elsewhere.

## First failing boundary
`LUNGE_ENTRY_GEOMETRY`

The important failure occurs before the descent: the front leg does not travel far enough forward at `step_forward` / `split_plant`.

## Why the system did not catch it
The previous validator checked structural truth: phase order, contact membership, IK availability, loaded contact release, and authored vertical pelvis travel. It also stored the 90° knee target as movement intent, but it did not make entry stride geometry a hard validity condition.

That meant a Motion Spec could simultaneously say "front knee target = 90°" and still author a short step. The system had a target but no enforcement boundary connecting the entry stance to that target.

## v2.2 correction
The authored entry mechanics are changed materially:

- `step_forward` left hip flexion: 34° → 55°
- `split_plant` left hip flexion: 24° → 40°
- `split_plant` rear hip extension: 27° → 34°
- bottom front-knee authored flexion offset: 72° → 88°
- bottom rear-knee authored flexion offset: 82° → 92°

The intent is not to treat those raw bone offsets as universal biomechanics. They are rig-specific authoring controls for the shipped reference avatar.

## New hard authoring gate
`authoringGeometryGate` rejects the Motion Spec before it is considered valid when:

- step-forward left-hip flexion < 50°;
- split-plant left-hip flexion < 35°;
- split-plant rear-hip extension < 30°;
- bottom front-knee authored flexion < 80°;
- bottom rear-knee authored flexion < 85°.

The contract also adds `entry_step_too_short` as an explicit compensation signal.

## Important boundary
This PR closes the specific gap that allowed a clearly short entry stance to pass validation. It does **not** claim that raw bone rotations are the final biomechanical measurement. Human visual acceptance of the generated world-space pose remains required, and future world-space joint-angle validation should measure the actual hip-knee-ankle geometry after IK.

## Device acceptance
On the deployed Motion Lab:

1. Load Stationary Lunge Left.
2. Inspect `step_forward` and `split_plant` from the side.
3. Confirm the left foot travels materially farther forward than v2.1.
4. Confirm `split_plant` resembles a true lunge setup rather than a walking stride.
5. Play through each bottom and compare against the owner's reference image.
6. The front knee should approach a right angle while the front shin remains near vertical.
7. The rear knee should travel down toward the floor, not swing behind.
8. Do not merge if the longer authored stance still fails visually; use the first failing boundary rather than compensating later phases.
