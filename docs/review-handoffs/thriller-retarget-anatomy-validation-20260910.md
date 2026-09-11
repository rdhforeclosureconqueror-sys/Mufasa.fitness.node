# Thriller retarget transform-space / anatomy validation handoff

## Why this handoff exists

PR #784 fixed the prior Thriller Part 1 false-positive playback problem. Live human testing now exposes the next boundary: the personalized Avaturn is intact at 0.00s, but catastrophically separates/explodes as soon as the correct Thriller animation begins driving it (observed by ~0.81s).

Do not treat this as another loader, `animations[0]`, clip-selection, track-name, hidden-runtime-avatar, or mixer-root problem. #784 already fixed/proved those boundaries.

## Confirmed live evidence

- Avatar is intact in T-pose at `0.00s` before Play.
- Selected clip: `Thriller_Part_1_Avaturn`.
- Duration: `29.866666793823242s`.
- Track count: `162`.
- Binding: `162 intended / 162 bound / 0 unbound`.
- Mixer root and mounted personalized-avatar root are the same object/UUID.
- Runtime GLB scene root has a different UUID and is not the rendered avatar.
- Existing boundaries pass through `MIXER_ROOT_IS_VISIBLE_AVATAR`.
- After Play begins, the rendered body separates into pieces and rapidly leaves the useful camera frame.

Conclusion: correct clip selection and target binding are necessary but not sufficient. A track resolving to the correct bone name does not prove that its transform is valid in the target skeleton's rest/local coordinate space.

## Working hypothesis — prove or disprove

The offline Mixamo → Avaturn bake produced target-named tracks whose transform values are not safe in the mounted Avaturn skeleton's local/rest coordinate system. The runtime clip has 162 tracks = 54 bones × position/quaternion/scale. Earlier source/target inspection found large rest-orientation differences between Mixamo and Avaturn. Prime suspects are non-root local translation, scale, uncompensated rest-pose rotation, root/Hips unit/translation mismatch, or a combination.

Do not assume which one is guilty. Instrument the animation and identify the **first invalid transform**.

## Required investigation

Trace Part 1 from the intact `0.00s` pose through the first playback samples. For every target bone capture:

- bone name and parent bone;
- baseline/rest local position, quaternion and scale;
- sampled local position, quaternion and scale;
- position delta magnitude;
- rotation delta angle;
- scale ratio/delta;
- world-space joint position before/after;
- parent-child world distance before/after;
- first timestamp/frame where a threshold is violated;
- first bone/property that violates it.

Explicitly isolate whether the explosion is caused by:

1. non-root bone translation tracks;
2. scale tracks;
3. uncompensated rest-pose rotation differences;
4. root/Hips translation or scale/unit mismatch;
5. a combination of the above.

Use channel isolation as a diagnostic: evaluate rotation-only, then rotation + controlled root translation, then add other translation/scale only when proven valid. Do not use channel removal merely to hide a broken retarget.

## Compatibility-engine requirement

Use the existing personalized-avatar Gym Compatibility / canonical mapping architecture rather than hand-fixing 54 Thriller bones. Determine whether the current compatibility layer only resolves/saves bone-name mappings or already owns rest-pose transform compensation. If compensation is missing, implement it as a reusable source-profile → canonical → target-profile retarget boundary so future Mixamo walks, runs, dances and exercises can use the same mechanism.

Do not create a Thriller-only table of magic offsets.

## New hard diagnostic boundary

Add a post-sample validation boundary before `THRILLER_VISIBLE_PLAYBACK_CONFIRMED`:

`RETARGETED_POSE_ANATOMY_VALID`

It must fail closed when animation technically changes visible bones but produces an anatomically/structurally invalid pose. At minimum detect catastrophic:

- scale changes;
- non-root joint translation;
- parent-child separation / limb-length distortion;
- root displacement or unit mismatch;
- non-finite transforms.

On failure report:

`FIRST FAILURE: RETARGETED_POSE_ANATOMY_INVALID`

Include the first offending bone, property, timestamp, baseline value, sampled value, and measured delta/ratio.

Do not allow `THRILLER_VISIBLE_PLAYBACK_CONFIRMED` merely because a representative bone changed.

## Regression tests

Prove both sides:

- correct clip + 162/162 binding + timeline advances + bones change + catastrophic pose => **FAIL**;
- correct clip + correct binding + bones change + structurally valid pose => **PASS**.

Preserve #784's exact-clip selection, mixer-root identity check and visible-bone mutation gate.

## Acceptance criteria

Automated:

- first invalid transform is surfaced rather than `FIRST FAILURE: NONE`;
- catastrophic skeleton separation cannot be reported as successful playback;
- fix is reusable through compatibility/retarget architecture;
- known-good independent animation path remains green;
- Thriller loader/clip-selection regression tests remain green.

Human after deployment:

1. Load personalized avatar — intact T-pose.
2. Load Thriller Part 1 — avatar remains intact.
3. Press Play — avatar remains connected/proportional and visibly performs motion.
4. Stop/Restart — avatar returns to a valid starting pose.
5. Consolidated diagnostics show `RETARGETED_POSE_ANATOMY_VALID=PASS` only when rendered pose is structurally valid.

## Next-dev warning

Do **not** regenerate Parts 2–4 until Part 1 proves the reusable retarget path. Do not weaken diagnostics to make the test pass. The first task is to prove exactly which transform class/bone first corrupts the pose, then fix that at the reusable compatibility/retarget boundary.