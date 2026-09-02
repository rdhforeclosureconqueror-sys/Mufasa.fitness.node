# Independent Review Handoff — Squat v5 Back Squat Reference

## Purpose

Independently review the move from manually tuned squat v4 to a squat v5 whose lower-body mechanics are derived from the owner's uploaded `Back Squat.fbx` reference.

Do not assume the implementation is correct because the source animation itself looks correct. Verify the extracted data, the translation into the Phase E skeleton, the runtime contact behavior, and the visual result.

## Base

Branch was created from current main SHA `0f93d66ab8375a17143ddf174ff6ad54059b8e37` after merged PR #622.

## Source identity

User upload: `Back Squat.fbx`

- size: 489,696 bytes
- SHA-256: `da6ddbfbd3c38060d9b4537b813fb387778517f2fdf40bf1214d20eb0dca4fe2`
- binary FBX version: 7700
- animation stack: `mixamo.com`
- duration: ~2.266667 s
- root curve keys: 69
- skeleton root: `mixamorig:Hips`
- raw binary is NOT committed; redistribution/license status is unverified

Derived neutral mechanics are recorded in `motion-sources/back-squat-reference.source.json`.

## Key extracted mechanics

Standing to bottom at ~1.266667 s:

- Hips translation Y: `93.3506 -> 38.4738` (drop ~54.8768 source units)
- Hips translation Z: `0.8003 -> -13.4202` (posterior change ~14.2205 source units)
- Hips X rotation delta: ~+9.36°
- Left thigh X delta: ~+109.02°
- Left knee/lower-leg X delta: ~-132.70°
- Left foot X delta: ~+35.09°
- Right thigh X delta: ~+106.24°
- Right knee/lower-leg X delta: ~-130.71°
- Right foot X delta: ~+35.72°
- Spine X delta: ~+14.84°

Mid-descent at ~0.633333 s is approximately +61° thigh, -77° knee, +30° foot relative to standing.

## Implementation intent

`public/motion/squat-motion-spec.js` is advanced to:

`motionId: squat/synthesized_engineering_v5_back_squat_reference`

The runtime does NOT directly play the uploaded FBX. Instead it uses source-derived joint deltas and phase timing as the lower-body engineering reference while preserving PocketPT's existing dual-foot contact lock and exercise contract.

This is deliberate: the source FBX may carry source skeleton/style/root assumptions, and its redistribution rights are unverified.

## What must be verified statically

1. `motion-sources/back-squat-reference.source.json` matches the uploaded source facts/hash above.
2. v5 remains development-only.
3. raw FBX is not committed.
4. source-derived phase values are present:
   - descent thigh ~61, knee ~-77, ankle ~30;
   - bottom thigh ~108, knee ~-132, ankle ~35.
5. bottom root intent is approximately `-0.31` avatar heights vertically and `-0.08` posteriorly.
6. both feet remain declared/enforced contacts.
7. start and finish are identical.
8. no production scoring/medical authority is claimed.

## Tests

Run at minimum:

`node --test test/squat-motion-spec-v1.test.js test/motion-spec-real-avatar.test.js test/motion-lab-inspection-controls.test.js`

Do not report PASS unless actually executed.

## Human Motion Lab acceptance

Use the Phase E reference avatar. Load Squat v5. Inspect side/front/back with orbit controls and pause around start, mid-descent, bottom, mid-ascent, finish.

### GO criteria

- both feet remain planted with no visible flight or heel/toe pop;
- pelvis clearly moves down and back on descent;
- hips reach visibly appropriate squat depth;
- knees flex deeply and track with feet rather than collapsing;
- ankle accommodation looks coordinated rather than like a leg tuck;
- torso inclination resembles the source squat family rather than a good morning;
- ascent reverses the same chain cleanly;
- start/finish return without teleport or drift.

### NO-GO criteria

- foot lift/sliding;
- tuck-jump appearance;
- knees folding toward torso while pelvis stays high;
- excessive posterior teleport/root jump;
- bottom pose materially shallower than source reference;
- skeletal explosion or binding regression.

## Important interpretation

The reference FBX gives us the first complete named squat cycle studied end-to-end. It is much stronger evidence than the previous combination of hinge/crouch/jump/landing fragments, but it does not replace runtime contact constraints or human acceptance on PocketPT's skeleton.

If v5 still fails primarily because two planted feet cannot both be satisfied by root translation, stop tuning angles and review whether per-limb IK/contact solving is required.
