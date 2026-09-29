# Push-Up Arena physical calibration root-cause audit — 2026-09-29

## Root cause and first failing boundary

The reported launch first fails between **MoveNet inference output and Arena BODY_VISIBILITY**. CAMERA_PERMISSION, CAMERA_STREAM, and BODY_DETECTOR only prove setup; they do not prove that a fresh frame containing the four required same-side joints reached Arena.

The checked-in current camera/calibration code already uses shoulder, elbow, wrist, and hip as core and ankle as support. That is incompatible with the phone continuing to exhibit the older full-chain behavior. The Arena HTML was still requesting the camera, calibration, coach-command, live-motion, and diagnostics files under cache keys predating the recent fixes (and requested `push-up-challenge.js` without a version). Consequently an iPhone/browser/CDN cache could execute the old five-joint and old command path while repository tests exercised new source. All causal runtime assets now share a new version key.

There were also two independent defects:

1. `I'm ready` normalized to `i m ready`, missed the Arena grammar, and could be ignored or treated as conversational input. Deterministic Arena commands now remove apostrophes and are terminal: they cannot fall through to `askCoach`, even if the Arena handler is unavailable.
2. Push-up mode correctly used `requireRestBase:false`, but returned before invoking/counting its canonical processor. This made Phase 2+ report zero processed frames and left REST_POSE_NOT_OBSERVABLE-looking evidence adjacent to the real calibration failure. Direct push-up input is now processed/countable while rest capture remains explicitly skipped; it still does not gate TOP/BOTTOM capture.

Remote speech remains feedback only. READY transitions to CAPTURE_TOP before speech is queued. A TTS failure therefore cannot veto the transition.

## Runtime contract

The same contract is now asserted through transform, visibility, calibration and tests:

- core: shoulder, elbow, wrist, hip
- support only: ankle
- one selected side, chosen using the complete core chain
- authoritative repetition scoring remains unchanged and stricter

## Physical first-failure evidence

The copied Arena report now includes:

- `latestPoseAgeMs`, `moveNetFrameCount`, `arenaPoseFrameCount`, `calibrationFrameCount`
- `selectedSide`, `usableCoreJoints`, `missingCoreJoints`, `supportMissing`
- `calibrationStage`, `lastReadyTranscript`, `readyCommandMatched`, `readyHandlerEntered`, `beginReadyCaptureResult`
- `captureAttemptCount`, `captureRejectReason`, `stablePoseDurationMs`, `topReferenceStored`
- `lastBackendRequestPurpose`

This distinguishes no inference frames, failure at Arena delivery, a named confidence/joint rejection, stale/non-monotonic frames, command mismatch, command-handler rejection, unstable hold, form rejection, and successful TOP storage.

## Human/device status

No physical iPhone acceptance, visual quality approval, movement-naturalness approval, or UX acceptance is claimed. An authorized human must deploy this commit, start a fresh Arena launch, copy the report after READY/TOP, and record physical-device acceptance through the Admin UI/API.
