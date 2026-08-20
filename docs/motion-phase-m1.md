# Phase M1 — push-up engineering motion proof

## Authority and boundary

The recognition/rep authority reused by M1 is `push_up_standard_v1` in `public/exercise-sequence-definitions.js`, evaluated by `public/generic-exercise-sequence-engine.js`. It defines the top → lowering → bottom → rising → top-complete order, MoveNet landmark requirements, measurements, direction, persistence, and repetition completion. `generated/exercise-profiles/push_up/runtime.generated.json` supplies draft coaching scope and explicitly limits automated analysis. The legacy mention in `public/new/01_lego_training_blocks.txt`, exercise catalogue prose, generic `public/form-engine.js`, and legacy MediaPipe static yoga samples are not animation authority.

M1 does not copy the recognition thresholds into animation. `public/motion/push-up-motion-spec.js` contains manually authored, rest-relative local rotation offsets and avatar-height-relative root offsets. The five evenly spaced phase times and four-second proof duration are development presentation choices, not prescribed exercise tempo. The values are an engineering reference requiring human visual review; they are not medical, coaching, force, joint-twist, or biomechanical ground truth.

## Motion contract

The minimal contract contains identity/version/status, canonical skeleton/root/rotation space, duration/loop/timing provenance, ordered phases, normalized phase time, interpolation, rest-relative root rotation, avatar-height-relative root position, rest-relative bone rotations, optional hold duration, and semantic contacts. The compiler resolves every target against the loaded canonical avatar and creates an in-memory `THREE.AnimationClip`; it does not contain or load a second avatar.

The authored targets are `mixamorig:Hips`, `mixamorig:LeftArm`, `mixamorig:RightArm`, `mixamorig:LeftForeArm`, and `mixamorig:RightForeArm`. Contact labels document intent only in M1; there is no IK/contact solver and approximate planting requires browser verification.

## Manual verification

Status: **PENDING HUMAN VERIFICATION**.

1. Authenticate as an authorized Motion Lab operator and launch `/dev/motion-lab`.
2. Select **Initialize Runtime**, then **Start Session**.
3. Select **Load Canonical Avatar**, then **Load Push-Up Motion**, then **Play**.
4. Observe one complete repetition and confirm the full body is visible, recognizable as a push-up, connected, and free of skeletal explosion; hands and feet remain approximately planted; torso and pelvis remain coherent; and translation does not drift.
5. Exercise **Pause**, **Resume**, **Stop**, **Restart**, and Loop off/on.
6. Select **Dispose Runtime** and confirm active sessions, RAF owners, listeners, timers, and canvases are all zero.

Do not approve M1 visually if the resting skeleton axes make the authored offsets produce detached limbs, extreme spine deformation, clipping, unbounded drift, or an unrecognizable exercise. Revise only the development Motion Spec after recording the observed canonical rest-axis behavior; never alter the canonical GLB to conceal a spec error.
