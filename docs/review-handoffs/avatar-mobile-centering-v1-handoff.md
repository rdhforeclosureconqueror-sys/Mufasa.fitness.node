# Independent Review Handoff — Workout Avatar Mobile Centering v1

## Scope

Review the bounded mobile avatar presentation repair on the PocketPT workout/trainer page.

Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`

Branch: `avatar-mobile-centering-v1`

Base main SHA at branch creation: `766efd653ce64d3d62afb98c2cb8354840bc5cde`

Do not merge solely from this handoff. Independently inspect the implementation and live behavior.

## User-observed failure

On iPhone Safari, camera capture and MoveNet were healthy, the avatar asset rendered, and Avatar Only mode was active, but the avatar was positioned partly off-screen instead of centered inside the visible workout presentation card.

The live diagnostic evidence showed:

- camera stream active
- TensorFlow WebGL active
- MoveNet inference loop active
- 0 pose inference failures in the observed run
- mobile visible presentation/card approximately 324 x 475 CSS px
- source video 480 x 640
- avatar rendered but visually displaced outside the mobile presentation frame

This PR intentionally does not modify MoveNet ownership, getUserMedia, pose inference, render-mode authority, animation generation, or exercise logic.

## Implementation

`public/runtime-events.js` now installs a workout-only mobile avatar framing guard.

The guard:

1. Runs only on `/workout` or `/workout.html`.
2. Reads the actual visible `#workoutPresentation` dimensions.
3. Aligns the existing Three.js renderer and camera aspect to that visible viewport instead of blindly using raw camera-source dimensions.
4. At baseline/no-person state, measures the mounted avatar root with `THREE.Box3` and applies an X-only correction so the avatar bounds center on world X=0.
5. Does not recenter the root while `__avatarRuntimeStatus.personDetected === true`, so live pose/body-follow ownership is not fought by the baseline centering guard.
6. Re-applies after avatar Three readiness, presentation-mode changes, ResizeObserver notifications, window resize, and orientation changes.
7. Publishes diagnostics on `__avatarRuntimeStatus`:
   - `mobileAvatarFramingState`
   - `mobileAvatarFramingReason`
   - `mobileAvatarFramingTrigger`
   - `mobilePresentationViewport`
   - `mobileAvatarCenterCorrectionX`
   - `mobileAvatarCentered`
   - `mobileAvatarFramingUpdatedAt`

## Review requirements

### Automated/static

Review `test/workout-avatar-mobile-framing.test.js` and run the relevant test suite. Do not report PASS unless actually executed.

Verify the implementation does not create:

- a second camera stream
- a second MoveNet detector
- a second avatar renderer
- a second avatar root
- a competing render-mode authority

### Live iPhone Safari

Use the trainer/workout page with the same canonical saved avatar.

1. Load page in portrait orientation.
2. Connect Camera.
3. Select Avatar Only.
4. Before a person is visible, confirm the full avatar is visually centered in the green presentation frame rather than clipped to a side.
5. Rotate orientation and return to portrait; confirm centering survives.
6. Switch Camera -> Avatar Overlay -> Avatar Only; confirm centering survives.
7. Put a full body in frame. Confirm the live body-follow system can move the avatar without the centering guard snapping it back to center.
8. Confirm MoveNet inference remains healthy and there is still exactly one authoritative camera/pose pipeline.

## GO / NO-GO

GO only if:

- baseline avatar is fully visible and horizontally centered on iPhone
- visible viewport aspect is reflected by the Three camera
- orientation/render-mode changes do not reintroduce clipping
- live pose following remains authoritative once a person is detected
- camera and MoveNet diagnostics remain healthy

NO-GO if:

- avatar remains clipped/off-screen
- baseline centering fights live body following
- renderer resize distorts or breaks the avatar
- camera/MoveNet ownership changes
- any second runtime/render loop is introduced

## Notes

This is a presentation/framing repair, not a biomechanical or animation change. Squat, lunge, push-up, Motion Lab, and movement synthesis should remain untouched.
