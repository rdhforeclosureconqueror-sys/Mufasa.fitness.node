# Mirror Motion Intelligence — Phase 2 live wiring + first-failure diagnostics

## Role

Independent reviewer: inspect the actual current PR head. Do not assume this handoff is correct. Do not merge as part of review unless the owner explicitly asks.

## Audited base

- Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`
- Base branch: `main`
- Base SHA: `4c06e3a5fcbd3ff65e9caac7cb79ad6f436812ee`
- Predecessor: merged PR #635, Phase 1 confidence-aware pose stabilizer
- Phase 2 branch: `feature/mirror-motion-intelligence-phase2-20260904`

## User problem being solved

Live avatar mirror motion currently exposes detector noise directly to downstream skeletal retargeting. When knees/ankles overlap or confidence falls, the avatar can jitter, buckle, split, or snap. Existing fixed smoothing can reduce jitter but risks visible latency.

Phase 1 added the stateful pose stabilizer but intentionally left it disconnected from live avatar behavior.

Phase 2 connects that accepted stabilizer to the avatar mirror path only and adds a dedicated first-failure debug panel.

## Architectural rule

Raw MoveNet remains canonical perception evidence for existing workout/rep/form systems.

Only the avatar mirror renderer receives the stabilized pose packet.

Do not replace `PoseRuntime`, create another camera loop, create another MoveNet detector, create another renderer, or change exercise authority in this phase.

## Live pipeline after Phase 2

1. Camera frame
2. Existing `PoseRuntime` / MoveNet inference
3. Existing `pose-runtime:frame` packet
4. Existing `AvatarRuntime.bindPoseFrameRenderer` boundary
5. **Phase 2 wrapper**
6. `PocketPTPoseStability.createPoseStabilizer()`
7. Stabilized packet
8. Existing avatar retarget renderer
9. Existing avatar render loop

The wrapper is installed before or when `window.AvatarRuntime` becomes available. It intercepts only renderer registration and passes a wrapped renderer into the canonical AvatarRuntime implementation.

## Runtime loading

`public/runtime-state.js` now requests `/mirror-motion-phase2.js` early when `ENABLE_AVATAR_FEATURE === true`.

The Phase 2 controller requests `/pose-stability-engine.js` through the existing lazy script loader and remains fail-open for avatar rendering while the stabilizer is still loading. This avoids blocking the camera/workout path.

## New runtime

`public/mirror-motion-phase2.js`

Responsibilities:

- patch the existing AvatarRuntime pose-renderer registration boundary;
- preserve the raw MoveNet packet outside that avatar-only boundary;
- send stabilized packets to the existing avatar renderer;
- expose cumulative and per-frame stabilizer diagnostics;
- surface renderer exceptions as a downstream first-failure boundary;
- inject a compact collapsible `Mirror Motion Debug` panel;
- reset stabilizer/tracker diagnostics without owning camera or detector lifecycle.

## Debugging standard

The panel must identify the earliest broken dependency rather than the loudest downstream symptom.

Current first-failure boundaries include:

- `MIRROR_MOTION_PHASE2_LOAD_FAILED`
- `STABILIZER_LOADER_UNAVAILABLE`
- `STABILIZER_LOAD_FAILED`
- `STABILIZER_EXPORT_MISSING`
- `DETECTION_NO_POSE`
- `DETECTION_LOW_CONFIDENCE`
- `STABILIZATION_NO_OUTPUT`
- `STABILIZATION_DROPPED:<joint>`
- `RETARGET_RENDERER_UNBOUND`
- `RETARGET_RENDERER_ERROR`
- `AVATAR_RENDER_LOOP_STOPPED`

The visible panel reports:

- first failing boundary;
- current pipeline stage;
- stabilizer readiness;
- AvatarRuntime patch state;
- renderer binding state;
- raw and stabilized frame counts;
- accepted/smoothed/coasted/clamped/dropped counts;
- critical-joint issue;
- stabilizer processing time;
- stabilized pose age;
- existing retarget frame count;
- existing bones-changed count;
- existing render-loop state;
- renderer error count.

## Fail-open behavior

While the stabilizer is loading or if it fails to initialize, the wrapper passes the original raw packet to the avatar renderer rather than breaking the workout or camera experience. The debug state must make that fallback visible.

A stabilizer processing exception also falls back to raw pose for that frame and records the failure.

A downstream avatar renderer exception is recorded and then rethrown; Phase 2 must not hide canonical renderer failures.

## Explicit non-goals

Not in this PR:

- limb-length constraint solving;
- left/right identity recovery;
- foot planting;
- exercise-state-aware constraints;
- floor/contact detection;
- IK;
- quaternion retarget rewrite;
- 3D pose estimation;
- body calibration/proportion learning;
- F-curve/live spline engine;
- tuning final smoothing coefficients from real visual acceptance data.

Those belong to later phases.

## Test scope

`test/mirror-motion-phase2.test.js` behaviorally covers:

1. stabilized packet reaches avatar renderer while raw packet remains separate;
2. critical-joint drop becomes the first failing stabilization boundary;
3. healthy stabilized input reports no upstream failure;
4. renderer exception is attributed to the retarget-renderer boundary and rethrown;
5. debug text contains the required first-failure and pipeline counters.

Phase 1 tests in `test/pose-stability-engine.test.js` must continue to pass.

## Independent review checklist

Review the actual current PR head and verify:

- branch really descends from main SHA `4c06e3a5fcbd3ff65e9caac7cb79ad6f436812ee`;
- raw MoveNet data is not globally replaced;
- only avatar renderer registration is wrapped;
- no duplicate camera/inference/render loop exists;
- stabilizer loading cannot block the workout boot path;
- fallback-to-raw behavior is explicit and diagnosable;
- the debug panel reports earliest failure, not merely renderer symptoms;
- critical-joint drops are visible;
- renderer errors remain observable and are not swallowed;
- no Phase 3 body constraints have leaked into this PR;
- focused Phase 1 + Phase 2 tests pass;
- full repository tests reveal no regression.

## Manual visual acceptance after code review

Owner should test at minimum:

- standing still: compare jitter before/after;
- normal squat: knees should no longer make small detector-noise snaps worse;
- knees close/partial overlap: panel should show coast/clamp/drop behavior when confidence degrades;
- jumping jack: fast deliberate limbs must still respond without obvious excessive lag;
- quick arm raise: confirm adaptive smoothing does not feel mushy;
- avatar overlay and avatar-only modes;
- camera-only mode remains unchanged;
- disconnect/reconnect/retry behavior;
- verify `Mirror Motion Debug` panel remains usable on mobile and does not block core controls.

## Review outcome

Return one of:

- `GO` — Phase 2 is bounded, live wiring is correct, diagnostics are useful, and no regression found.
- `CHANGES REQUIRED` — enumerate exact findings with file/behavior evidence.

Do not merge during independent review unless explicitly authorized by the owner.
