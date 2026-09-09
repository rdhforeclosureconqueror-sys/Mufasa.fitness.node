# Motion Lab Local Playback Controls — Review Handoff

Date: 2026-09-09
Branch: `feat/motion-lab-local-playback-controls-20260909`
Base: `main` after merged PR #750

## Owner request

Keep playback controls directly under the avatar while inspecting or authoring motion so the owner does not have to scroll back to the top-level Motion Lab controls.

Requested behavior:

- Play / resume
- Pause
- Stop
- Restart
- Step backward
- Step forward
- Timeline scrub
- Controls remain usable before and after pose adjustments
- Camera orbit / view inspection must remain independent from playback

## Architecture

This change deliberately does **not** create another renderer, mixer, animation action, or Motion Lab session.

The local control bar gets the existing active session from:

`PocketPTMotionLabPoseEditor.getActiveSession()`

All transport commands operate on that exact session/action already used by Motion Lab. The top controls and the viewer-local controls therefore remain two UI surfaces over one playback authority.

The bar is mounted inside `#poseEditorLiveViewer`, directly below the actual `#viewer` canvas after the Pose Editor moves the canonical viewer into its authoring panel.

## Adjusted-preview behavior

When there are no pending pose edits, local Play delegates to the existing session `play()` path.

When pending pose edits exist, the local controls track an edit signature for the adjusted preview:

- If the adjusted preview is stale or has not been built for the current edits, Play rebuilds it through `PocketPTMotionLabPoseEditor.playAdjustedPreview()`.
- If the adjusted preview already matches the current edit signature and is merely paused, Play resumes the existing adjusted action from its current time instead of rebuilding/restarting it.
- Restart intentionally rebuilds/plays the current adjusted preview from the beginning.
- Any additional edit invalidates the prior adjusted-preview signature, so the next Play rebuilds the latest motion rather than resuming stale content.

This fixes the review-discovered resume defect where paused adjusted playback could restart from time zero.

No edit is required before Play becomes useful.

## Stepping / scrubber

Back/Forward move by 0.10 seconds and pause on the inspected pose.

The scrubber uses the same active session mixer and current action. Seeking:

1. enables the current action;
2. pauses it;
3. calls the existing mixer `setTime(time)` path;
4. updates the avatar matrices;
5. leaves the camera untouched.

## Mobile behavior

The Pose Editor viewer is already sticky on mobile. The new local transport bar is sticky at the bottom of that viewer block, so the avatar and transport stay together while the owner works through phases and rotates the camera.

## Protected route

`motion-lab-local-playback-controls.js` is requested through the existing protected generic route:

`/dev/motion-lab-assets/:filename`

The existing filename contract accepts lower-case hyphenated `.js` assets, so no new route or authorization surface is introduced.

The already-static `motion-lab-pose-editor-preview-guard.js` loads the new local control module once. This keeps the Motion Lab bootstrap/session architecture unchanged.

## Regression coverage

`test/motion-lab-local-playback-controls.test.js` verifies:

- protected-route loading;
- all requested viewer-local controls;
- 0.10-second stepping and scrubber support;
- use of the Pose Editor active session;
- no second AnimationMixer/session/clipAction authority;
- canonical playback before edits;
- adjusted-preview build when edits exist;
- paused adjusted-preview resume without rebuild/restart when edit signature is unchanged;
- adjusted-preview rebuild after the edit signature changes;
- explicit Restart behavior;
- no camera mutation in playback controls.

## Manual acceptance

1. Initialize Motion Lab.
2. Load the personalized Coach Avatar.
3. Load Stationary Left Lunge v3.
4. Confirm local controls appear directly under the avatar viewer.
5. Press local Play before making any edits and confirm the full lunge plays.
6. Pause during descent.
7. Rotate the avatar view while paused; confirm the pose stays paused.
8. Press Forward and Back; confirm motion steps in 0.10-second increments and remains paused.
9. Drag the timeline and confirm the avatar follows the selected time.
10. Resume Play and confirm playback continues from the inspected time.
11. Make a Pose Editor adjustment.
12. Press local Play and confirm the adjusted preview plays.
13. Pause the adjusted preview midway, then press Play and confirm it resumes from the same time instead of restarting.
14. Make another adjustment, then press Play and confirm the new adjusted preview is rebuilt and played.
15. Press Restart and confirm the current adjusted preview begins from the start.
16. Confirm top-level controls and local controls continue to operate the same animation state.
17. Confirm no duplicate avatar, animation stacking, second canvas, or playback-state disagreement appears.

## First-failure order

If the controls fail, report the first failing boundary:

1. local module route loaded
2. local bar mounted under `poseEditorLiveViewer`
3. active session resolved
4. action resolved
5. pending-edit signature resolved
6. adjusted-preview signature current/stale decision correct
7. Play delegated to canonical play, adjusted rebuild, or adjusted resume as expected
8. Pause state reflected
9. seek/step mixer time applied
10. avatar pose updated
11. timeline reflects current action time
12. camera remains independently controllable

## Readiness boundary

Code and focused regression coverage are included in this PR. Repository-required test execution, readiness evidence/validation, and owner mobile visual acceptance remain review gates before declaring the feature fully accepted.
