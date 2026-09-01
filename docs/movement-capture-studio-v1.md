# PocketPT Movement Capture Studio v1

This follow-up extends the merged Movement Lego Recorder with paired FRONT + SIDE evidence, custom movement definitions, and timestamped skeleton pose checkpoints.

## Evidence model

MoveNet captures remain 2D perception evidence. Paired front + side recordings provide complementary projections of the same movement pattern, but are not represented as true synchronized 3D reconstruction. Animation/FBX/GLB references remain the source for root/pelvis/spine/bone rotations that 2D MoveNet cannot directly observe.

## Paired capture contract

Foundation movements require both views:

`FRONT -> save -> prompt SIDE -> save -> PAIRED 2D COMPLETE`

A single view never marks the movement complete. The roadmap displays separate Front and Side badges.

## Custom movements

The trainer can define local custom movement identities, for example `One-Arm Push-Up Left`. Custom movements receive a local `custom_*` primitive ID and default to front + side capture. They remain research/evidence data and are not automatically promoted to active exercise scoring.

## Pose checkpoints

After local evidence is saved, the capture studio annotates the serialized recording with suggested checkpoints. Each checkpoint contains:

- frame index
- timestamp in milliseconds
- generated SVG skeleton from normalized MoveNet joints

The generic checkpoint set is START/TOP, KEY/BOTTOM or movement extreme, and RETURN/FINISH. Movement-specific heuristics may choose a useful middle frame such as squat depth, minimum push-up elbow angle, jump apex, stand-to-ground horizontal body-axis point, or closest knee drive. These are suggestions for review, not validated biomechanical truth.

## Storage boundary

Full recordings remain in the existing bounded browser-local evidence cache. This is not durable permanent storage. Important evidence should still be exported until reviewed server-side motion persistence is designed.

## Runtime boundary

The new studio does not call `getUserMedia`, create a MoveNet detector, or own a pose loop. It layers onto the merged recorder and canonical `pose-runtime:frame` pipeline.
