# Mirror Motion Intelligence — Phase 7 hardening review

## Reviewed implementation

Merged PR #647 on the stacked motion-intelligence branch.

## Verdict

CHANGES REQUIRED before Phase 7 facing intent is allowed to drive live root yaw.

## Findings fixed

1. Low-confidence or body-scale-unavailable frames held the prior stable orientation but did not break the pending facing-transition streak. Non-consecutive trustworthy SIDE/QUARTER frames could therefore accumulate across an uncertain gap and trigger a turn.
2. Phase 7 installed its `AvatarRuntime` interceptor without preserving an existing property descriptor. Earlier mirror-motion phases use composable getter/setter interception, so Phase 7 could interfere with that chain when AvatarRuntime was assigned later.
3. Hold frames did not update diagnostic confidence, leaving stale high-confidence telemetry during uncertainty.

## Hardening

- uncertain/scale-unavailable frames now reset the pending candidate streak to the current stable state;
- facing transitions require consecutive trustworthy evidence;
- `AvatarRuntime` interception now preserves configurable prior getters/setters, enumeration, and existing assignment behavior;
- non-configurable interception reports `PHASE7_AVATAR_RUNTIME_INTERCEPT_BLOCKED` rather than overwriting;
- hold-frame diagnostics update the current confidence;
- orientation intent schema bumped to version 2.

## Regression coverage

`test/mirror-motion-phase7.test.js` now covers:

- FRONT stability;
- consecutive-frame SIDE hysteresis;
- uncertain gap breaking the hysteresis streak;
- bounded signed yaw intent;
- low-confidence hold and diagnostic confidence;
- composition with an existing AvatarRuntime property descriptor;
- explicit no-depth diagnostics.

## Scope boundary

No live root-yaw activation, no quaternion rewrite, no claimed Z-depth, no new camera/MoveNet authority, and no new exercise/rep authority.

Run the focused Phase 1–7 tests and the full repository suite. Then manually challenge FRONT/QUARTER/SIDE intent with camera framing changes, squat depth, side-on push-up, arm crossings, mirrored preview, face occlusion, and confidence drop/reacquisition before granting yaw authority.
