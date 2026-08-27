# Phase 2 MoveNet pose tracking proof

Build/cache identifier: `2026-08-27-movenet-pose-proof-v18`.

## Production data path

1. `public/runtime-state.js` lazily loads TensorFlow.js 4.14.0 and `@tensorflow-models/pose-detection` 2.1.3 from jsDelivr through `window.__ensurePoseRuntime()`.
2. The authenticated production workout loads `public/pose-runtime.js`. Its `initMoveNetDetector()` selects TensorFlow CPU on the existing mobile-device branch and WebGL otherwise (with CPU fallback), awaits `tf.ready()`, and creates `SupportedModels.MoveNet` with `SINGLEPOSE_LIGHTNING`. It is single-pose, not Thunder or multipose.
3. Connect Camera assigns the `MediaStream` to `<video id="video">`. That connected video—with its real `videoWidth` and `videoHeight`—is the only inference source.
4. `PoseRuntime.startPoseLoop()` owns a `requestAnimationFrame` loop and calls `detector.estimatePoses(video, { flipHorizontal: true })`. The model result is an array of poses; the first pose has MoveNet keypoints. `normalizePosePacket()` retains pixel keypoints and source dimensions in a packet. Provider-neutral viewport normalization, where required by other features, is performed by `public/body-intelligence.js`; the proof deliberately does not feed avatar bones.
5. Each successful inference dispatches `pose-runtime:frame` with `{ pose, posePacket, poses }`. The proof instruments production, dispatch, and receipt. Existing subscribers are `WorkoutFormRuntime` and the Phase 1 live-avatar mirror. Phase 2 sets a production proof-only guard that disposes/prevents the mirror, so these frames cannot mutate avatar bones; workout form observation remains a read-only consumer.
6. Camera connection now initializes the model and starts this loop before a workout starts. The loop lifetime is tied to an active capture stream, not workout state, render mode, profile hydration, backend synchronization, or whether the video layer is visible. Avatar Only changes the visible video layer to hidden but does not detach `video.srcObject`.

## First failure found

The production camera connection path previously enabled pose initialization only when `enablePoseProcessing=1` or an avatar render mode was selected. In ordinary Camera mode, it displayed the stream but never created MoveNet or started inference. The old loop predicate also depended on workout-running/avatar-mode state. Therefore the first real boundary for a normal Connect Camera flow was `MODEL_NOT_CREATED` (followed by `INFERENCE_LOOP_NOT_STARTED`), despite camera visibility.

## Framing algorithm

The proof reuses the runtime's existing confidence threshold of **0.30**. Upper-body readiness requires both shoulders, elbows, wrists, and hips (8/8). Full-body readiness additionally requires both knees and ankles (12/12). Geometry is calculated from the bounding range of keypoints at or above threshold divided by the inference video's intrinsic dimensions. `TOO_CLOSE` means coverage exceeds 82% of source width or 88% of height; `TOO_FAR` means height coverage is below 32%. Otherwise complete required sets produce `UPPER_BODY_READY` or `FULL_BODY_READY`; a returned pose with an incomplete confident set is `LOW_CONFIDENCE`; no returned pose is `NO_PERSON`.

## Backend synchronization

Backend profile/sync work is a separate asynchronous path. No backend state is read by detector initialization, `estimatePoses`, or the inference loop predicate. Diagnostics project the current sync label and explicitly report `Backend sync blocks pose inference: NO`; increasing attempted/success/event counters while the label remains “Checking…” are the runtime proof.

## Physical-device acceptance boundary

These source and automated tests prove the instrumented chain and its state projection, but do **not** prove deployed iPhone inference. Phase 2 must remain unclaimed until authenticated physical iPhone Safari shows increasing successful frames and changing real keypoint confidences.
