# Push-Up Arena physical-phone BOTTOM / RESET root-cause audit

Date: 2026-09-30

## Root causes and first failing boundary

The first Arena-owned failing boundary was `PoseCaptureEngine.transform()` →
`arena-pose-calibration.observe()` during `CAPTURE_BOTTOM`.

1. The exercise adapter independently chose the higher-confidence four-joint
   side on every frame. It did not use the temporal hysteresis already applied
   to authoritative shoulder/hip/ankle tracking. A brief left-hip confidence
   dip could therefore make an otherwise usable right chain become the frame's
   selected side.
2. Personal calibration treated `frame.side` as part of camera source identity.
   Once TOP had stored `left`, a `right` BOTTOM transition frame was classified
   as `SOURCE_CHANGED`. That branch called `invalidate('SOURCE_CHANGED')`, which
   erased TOP. This—not BOTTOM elbow depth—was the destructive path.
3. A missing required core point started a two-second loss timer. If it fired
   during BOTTOM, calibration entered `NEEDS_RETRY`. Although newer code could
   preserve TOP for `TRACKING_LOST`, the user was still forced out of active
   capture instead of allowing the side chain to reacquire within the existing
   capture window.
4. RESET called `camera.resetTracking()` even though the camera had not changed.
   That cleared side/tracking continuity and emitted BODY_VISIBILITY false. It
   increased the chance of post-reset side churn and made a healthy active
   camera appear lost.
5. `stop` was absent from the Arena-reserved bare-command grammar. Reserved
   commands otherwise fail closed locally even if the UI handler is absent;
   `stop` could instead miss that local boundary.

The reported `STABILIZATION_DROPPED:left_hip` is produced by the independent
Mirror Motion/avatar diagnostic pipeline. Push-Up personal calibration does not
consume stabilized avatar landmarks, rest/base state, retarget output, Godot
`LIVE_MOCAP`, or avatar binding. The correlated physical failure was the direct
Arena side selector reacting to the same low-confidence hip and then the
calibration layer misclassifying that side change as a camera replacement.

## Why TOP worked but BOTTOM failed

TOP was acquired while one side had a complete shoulder → elbow → wrist → hip
chain for the 700 ms hold. Moving downward changes occlusion and phone
perspective; the hip confidence dip made the opposite side win the stateless
calibration-side comparison. The next direct Arena frame then failed the
side-as-source check before BOTTOM stability/form evaluation could complete.
Thus substantial MoveNet frame volume and a working READY path were compatible
with repeated BOTTOM failure.

## Implemented separation and recovery

* The four-joint Arena side selector now has independent temporal hysteresis;
  authoritative scoring thresholds and rep judging are unchanged.
* TOP/BOTTOM personal references use side-agnostic angle geometry after the
  adapter's hysteretic side selection. A stable opposite-side chain may continue
  calibration when the original side becomes occluded. Only source dimensions
  changing invalidate camera identity and captured references.
* Missing core frames clear only the current stability accumulation. Reacquired
  frames continue the same BOTTOM capture attempt; the existing bounded phase
  deadline remains the timeout authority.
* RESET clears capture references/timers and returns to `WAIT_TOP_READY` without
  resetting a still-active MoveNet tracker. Actual camera replacement and
  orientation changes retain explicit tracking reset/invalidation ownership.
* All deterministic Arena commands, including `stop`, are reserved locally.
  The dispatcher returns an Arena result even when its handler is unavailable,
  so coach chat is never the fallback for those commands.
* READY commits `beginReadyCapture()` before cue speech is queued. Speech/TTS
  success remains feedback only and cannot roll back or block the state change.

## Bounded diagnostic history

Calibration now exposes an 80-entry, metadata-only attempt trace. It includes
READY receipt, capture starts, captures, frame rejection reasons, tracking
reacquisition duration, RESET, local handling, source changes, and observed
backend-request purpose. It stores no image and no raw landmark coordinates.
The trace survives calibration RESET so the failure preceding the final state
is retained, while remaining bounded.

## Expected physical-phone sequence

1. Camera remains active and establishes a side chain.
2. Athlete enters TOP and says READY.
3. State immediately becomes `CAPTURE_TOP`; cue playback is optional feedback.
4. TOP is stored and state becomes `WAIT_BOTTOM_READY`.
5. Athlete lowers and says READY; state immediately becomes `CAPTURE_BOTTOM`.
6. A brief hip/core dropout clears only the current stability samples. TOP remains
   stored. Once either side provides a stable hysteretic four-joint chain, a new
   700 ms stable interval is accumulated.
7. BOTTOM is stored, then a final READY captures TOP_CONFIRM and reaches
   `CALIBRATED`.
8. If the bounded attempt times out, RESET immediately clears old timers and
   references and returns to `WAIT_TOP_READY` while the camera stays active.
   The next READY creates one new local `CAPTURE_TOP` attempt. Multiple RESETs
   have the same idempotent outcome.

## Remaining physical-device and human gates

Automated tests cannot approve iPhone camera framing, Safari recognition
re-arming, cue audibility, visual guidance, movement naturalness, or UX. An
authorized human must deploy this build and execute the exact sequence above,
including a deliberately occluded hip, timeout/reset, rapid multiple RESETs,
and backend-unavailable run. This audit does **not** claim physical-device
acceptance.
