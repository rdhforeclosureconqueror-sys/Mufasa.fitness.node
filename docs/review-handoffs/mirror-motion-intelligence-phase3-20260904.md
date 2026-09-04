# Mirror Motion Intelligence — Phase 3 review handoff

## Audited base

- Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`
- Base main SHA: `0762254d9611ddf1cf429bbcc7491df7c065d21d`
- Predecessors: merged PRs #635, #636, #637, #638
- Branch: `feature/mirror-motion-intelligence-phase3-20260904`

## Phase 3 goal

Teach the avatar mirror a bounded structural model of the tracked body after Phase 2 temporal stabilization and before the existing avatar retarget renderer.

Pipeline target:

`MoveNet raw -> Phase 1/2 temporal stabilization -> Phase 3 structural constraints -> existing retarget renderer -> avatar render`

Raw MoveNet remains untouched for workout/form-analysis authorities.

## Added runtime

`public/mirror-motion-phase3.js`

Phase 3 owns only structural interpretation for the avatar presentation path.

### Body-proportion calibration

The engine learns per-session 2D segment lengths for:

- left/right upper arm
- left/right forearm
- left/right thigh
- left/right shin

Calibration is confidence-gated and excludes dropped/coasted points. A segment is not treated as calibrated until it has the configured minimum number of trustworthy samples.

### Limb-length constraints

Once a segment is calibrated, a frame whose segment length differs from the learned model by more than the configured tolerance is corrected by projecting the distal joint back onto the learned segment radius while preserving its observed direction from the proximal joint.

The correction annotates the keypoint with:

- original structural raw position
- segment name
- observed length
- target length
- error ratio
- `structuralState=length_constrained`

### Left/right identity continuity

For shoulder, elbow, wrist, hip, knee, and ankle pairs, the engine compares current same-side temporal assignment cost with swapped assignment cost. It only recovers identity when:

- both points meet confidence requirements;
- apparent travel is large enough to matter;
- the swapped assignment is clearly cheaper by a body-scale-normalized margin.

This is intended to catch obvious detector label swaps without treating legitimate limb crossing as an automatic swap.

## Runtime integration

`public/runtime-state.js` now loads Phase 2 first and Phase 3 second through the existing loader.

Phase 3 captures the already Phase-2-patched `AvatarRuntime.bindPoseFrameRenderer` boundary. Therefore the call order is:

1. raw packet enters AvatarRuntime;
2. Phase 2 stabilizes it;
3. Phase 3 structurally constrains the stabilized packet;
4. existing retarget renderer receives the constrained packet.

No second camera, detector, pose subscription, renderer, rep counter, or exercise authority is created.

## Diagnostics

Phase 3 adds a dedicated `Mirror Motion Phase 3 Debug` panel and runtime diagnostics for:

- first failing structural boundary
- pipeline stage
- runtime patch status
- renderer binding status
- structural frame count
- calibrated segments / total segments
- cumulative limb-length corrections
- cumulative left/right identity recoveries
- last structural issue
- structural process errors

Structural process failures fall back to the already stabilized Phase 2 packet instead of breaking the mirror.

## Tests

`test/mirror-motion-phase3.test.js` covers:

- segment calibration before enforcement;
- impossible thigh-length correction;
- refusal to calibrate from coasted joints;
- obvious left/right knee identity recovery;
- constrained packet delivery behavior;
- required diagnostics fields.

Run at minimum:

`node --test test/pose-stability-engine.test.js test/mirror-motion-phase2.test.js test/mirror-motion-phase3.test.js`

Also run the full repository suite.

## Manual acceptance

Review on a real camera with avatar overlay and avatar-only modes:

1. stand still through calibration and confirm segment count rises without corrections exploding;
2. perform repeated squats and confirm knee/ankle geometry no longer stretches into split-like poses;
3. bring knees close/partially overlap and inspect identity-recovery counts;
4. perform jumping jacks and verify arms/legs remain responsive;
5. deliberately move fast and confirm Phase 1/2 smoothing remains responsive;
6. leave/re-enter frame and verify temporal reset does not preserve stale structural behavior;
7. confirm debug panels identify the earliest relevant failure/intervention.

## Explicit non-goals

This PR does not implement:

- 3D reconstruction/depth inference;
- IK;
- foot planting or floor contacts;
- push-up hand/foot anchors;
- squat/jumping-jack exercise-state constraints;
- quaternion retarget rewrite;
- live F-curve/motion-curve engine;
- persistent user body measurements across sessions.

## Independent review request

Review the actual PR head, not this handoff alone. Challenge calibration contamination, false identity swaps, correction direction, runtime wrapping order, reset ownership, diagnostics accuracy, and fail-open behavior.

Return `GO` or `CHANGES REQUIRED` with exact evidence. Do not merge unless explicitly requested by the owner.
