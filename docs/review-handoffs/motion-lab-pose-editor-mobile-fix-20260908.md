# Motion Lab Pose Editor mobile authoring correction — 2026-09-08

## Owner-observed failures

On iPhone, the Pose Editor rendered but endpoint nudges reported `authoring_chain_unresolved`. The live avatar viewer was several sections below the editor, forcing scroll-back-and-forth during adjustments. The black avatar was also difficult to inspect against the dark Motion Lab scene.

## First failing boundary

The editor used exact bone-name lookup (`node.name === mixamorig:...`) while the Motion Spec compiler already compensates for Three.js name sanitization with normalized alias resolution. Valid Mixamo bones could therefore exist and compile successfully while the editor failed to resolve the same chain.

A second coordinate-authority defect was found: the editor labeled world X as forward/back. The lunge is authored in the avatar sagittal plane, so authoring directions must be avatar-relative rather than hard-coded screen/world axes.

## Fix

- normalize requested and loaded bone names before unique alias resolution, while preserving exact-name priority;
- expose missing requested chain members when resolution fails;
- replace hard-coded X/Y/Z move labels with semantic Forward/Back, Up/Down, Left/Right directions;
- derive move vectors from the avatar root world orientation;
- keep Pitch/Yaw/Roll axes for Rotate mode;
- move the existing canonical `#viewer` and `#viewerStatus` into the Pose Editor authoring workspace before runtime mount;
- keep that live viewer sticky on narrow screens so the avatar remains visible while the owner taps adjustment controls;
- set the Pose Editor session scene background to gold (`#d4af37`) and match the viewer CSS background for high contrast with the black avatar;
- preserve the existing shared IK solver, Motion Spec authority, preview clip behavior, rest-pose guard, and consolidated diagnostics.

## Authority boundaries

No lunge geometry, generated IK math, Motion Spec source values, retargeter, renderer ownership, or live-mirror behavior is changed. This PR fixes authoring resolution, semantic editor direction, presentation placement, and inspection contrast only.

## Device acceptance

1. Initialize Motion Lab, start session, load Reference Avatar, and load synthesized lunge.
2. Pose Editor and live avatar viewer must appear together; on phone the viewer remains visible while scrolling through editor controls.
3. Gold scene must visibly contrast the black avatar.
4. Load `start` phase for editing.
5. Select Left Foot → Move → Forward/Back → Medium.
6. Tap `+` or `−`; the editor must not report `authoring_chain_unresolved`, the foot must visibly move, and the hip/knee chain must follow through shared IK.
7. Reset Selected must restore the sampled phase.
8. Play Adjusted Preview must animate the temporary edited clip.
9. Copy Full Diagnostic Summary if any step fails; use the first failing boundary.

## Verification status

Static regression coverage was added but not executed in the connector environment. Human device acceptance remains required.