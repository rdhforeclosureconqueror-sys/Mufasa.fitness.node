# PocketPT Mirror Motion Intelligence — phased implementation handoff

## Purpose

Build a production-safe layer between raw MoveNet perception and avatar retargeting so live mirror mode stops treating every detector frame as unquestioned truth.

The target problems are already visible in the current product: knee/ankle jitter when limbs overlap, apparent leg buckling during squats, unstable jumping-jack limbs, temporary left/right ambiguity, and the tradeoff between excessive smoothing latency and raw detector noise.

This work must preserve the current canonical runtime boundaries. Do not create a second camera loop, a second MoveNet detector, a second avatar renderer, or a parallel exercise-recognition system.

## Audited starting point

Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`

Audited main SHA: `dd15cce92c67437377b0993862dc873c48769a3e`

Current relevant boundaries on audited main:

- `public/pose-runtime.js` owns browser TensorFlow.js / MoveNet inference and emits pose packets.
- `public/body-intelligence.js` already normalizes MoveNet landmarks and owns provider-neutral body-frame concepts.
- `public/avatar-runtime.js` subscribes to `pose-runtime:frame`, calculates confidence/framing state, and forwards pose packets to the bounded avatar pose renderer.
- Existing avatar code already contains fixed smoothing constants and runtime diagnostics. This new work must complement those systems rather than create duplicate pose ownership.

## Architecture target

Camera → existing PoseRuntime / MoveNet → Mirror Motion Intelligence → existing AvatarRuntime retargeter → avatar renderer.

MoveNet remains perception evidence. The new intelligence layer owns temporal belief about the currently tracked person.

## Phase 1 — confidence-aware temporal tracker

Status in this PR: IMPLEMENTED AS A REUSABLE, TESTED FOUNDATION. NOT YET ACTIVATED IN LIVE MIRROR MODE.

New runtime module: `public/pose-stability-engine.js`.

Responsibilities:

- maintain state for named MoveNet landmarks across frames;
- use confidence to decide how strongly to trust a new detector measurement;
- smooth ordinary frame-to-frame jitter;
- stay responsive when high-confidence deliberate motion is detected;
- coast briefly through low-confidence/occluded frames instead of teleporting to weak measurements;
- bound implausible one-frame jumps before they reach skeletal retargeting;
- expose per-frame and cumulative diagnostics;
- reset cleanly between tracking sessions.

Non-goals for Phase 1:

- no limb-length constraints yet;
- no left/right identity recovery yet;
- no squat/push-up/jumping-jack phase awareness yet;
- no IK solver yet;
- no quaternion retarget rewrite yet;
- no change to MoveNet itself;
- no live runtime wiring in this PR.

The live wiring is intentionally deferred so an independent reviewer can validate the filter behavior before it becomes an input authority for the avatar.

## Phase 2 — bounded live-runtime integration

Wire exactly one `createPoseStabilizer()` instance into the canonical path immediately after `pose-runtime:frame` enters `AvatarRuntime` and before the existing `poseFrameRenderer` / retarget solver consumes the packet.

Requirements:

- preserve raw pose packets for diagnostics and fitness-analysis authorities that still require raw detector evidence;
- stabilize only the avatar/mirror presentation path first;
- reset the tracker on camera/session disposal, person-loss timeout, and explicit mirror lifecycle reset;
- add visible diagnostics for accepted, smoothed, coasted, clamped, and dropped keypoints;
- keep a kill switch/pass-through mode for visual A/B acceptance;
- confirm no extra MoveNet loop and no duplicate RAF ownership.

Acceptance scenarios:

1. Standing still: visible knee/ankle jitter decreases without obvious lag.
2. Fast arm raise: avatar follows promptly rather than feeling syrupy.
3. Squat with knees visually close: one weak detector frame does not throw a knee sideways.
4. Brief limb occlusion: avatar coasts briefly and reacquires rather than snapping.
5. Camera/person reset: old motion history never contaminates a new person/session.

## Phase 3 — structural body constraints and identity continuity

Add a body-geometry layer on top of the temporal tracker.

Responsibilities:

- estimate stable limb proportions from high-confidence calibration frames;
- preserve femur, tibia, upper-arm, and forearm lengths within configurable tolerance;
- prevent impossible one-frame joint displacement;
- maintain left/right identity through crossings and partial occlusion using history, adjacency, and confidence rather than raw label swaps;
- use parent-child body graph relationships from the canonical body model.

Do not hard-code one avatar's bone lengths. Constraints are about the observed person's tracked body model before avatar retargeting.

## Phase 4 — exercise-aware constraints

Add state-aware rules once temporal and structural tracking are reliable.

Examples:

- squat stance: feet may be treated as planted during the appropriate phase;
- push-up: hands and feet become contact anchors while the torso chain moves;
- jumping jack: explicitly model symmetric limb opening/closing and preserve left/right continuity;
- transitions to/from floor: do not assume upright orientation.

Reuse canonical exercise sequence/form authorities where possible. Do not create a second rep counter.

## Phase 5 — skeletal orientation solver

Convert stabilized body intent into more robust avatar bone orientations.

Responsibilities:

- canonical anatomical-joint mapping;
- rest-pose aware source/target transforms;
- local-space orientation handling;
- quaternion-based internal rotations/interpolation where appropriate;
- IK for contact targets such as hands/feet;
- rig adapters instead of hard-coded universal avatar bone names.

This phase addresses the current 2D-cutout character feel and lays groundwork for convincing turns, floor transitions, and more three-dimensional articulation. MoveNet SinglePose remains 2D evidence; true depth must not be fabricated as measured truth.

## Phase 6 — live curve/tuning layer

Treat live smoothing as a causal equivalent of animation curves, not offline Blender F-curves that require future keyframes.

Responsibilities:

- velocity/acceleration-aware adaptive response;
- per-joint tuning;
- phase-dependent smoothing;
- latency versus stability telemetry;
- visual tuning fixtures for squat, jumping jack, push-up entry, fast arm motion, occlusion, and left/right crossing.

Goal: suppress uncertainty strongly while preserving deliberate motion immediately enough for mirror mode to feel connected to the user.

## Phase 1 algorithm notes

The Phase 1 tracker intentionally uses simple, inspectable primitives before introducing more advanced filters:

- confidence-weighted adaptive exponential smoothing;
- short velocity-based coasting through weak detections;
- velocity-aware responsiveness;
- bounded single-frame displacement;
- explicit diagnostic states (`accepted`, `smoothed`, `coasted`, `clamped_smoothed`, `dropped`).

This keeps the first implementation understandable and tunable. A One Euro filter, Kalman-family estimator, or more advanced state estimator may replace or augment these primitives only after measured visual evidence shows a need.

## Tests added in Phase 1

`test/pose-stability-engine.test.js` covers:

- jitter damping;
- preservation of responsive high-confidence movement;
- low-confidence coasting instead of teleporting;
- implausible jump bounding;
- clean reset behavior.

The focused test file passes locally with Node's built-in test runner before publication of the PR.

## Independent reviewer instructions

Review the actual current PR head, not only this handoff.

Do not merge as part of independent review unless the owner explicitly requests it.

Validate:

- the tracker is stateful but has bounded/resettable ownership;
- low-confidence data cannot silently become high-confidence truth;
- deliberate high-confidence movement is not over-smoothed;
- jump bounding cannot create unbounded velocity feedback;
- output packet compatibility is preserved;
- no camera, detector, renderer, exercise authority, or avatar lifecycle is duplicated;
- tests assert behavior rather than merely source strings.

The next implementation PR should begin with Phase 2 live integration only after this Phase 1 foundation is accepted.
