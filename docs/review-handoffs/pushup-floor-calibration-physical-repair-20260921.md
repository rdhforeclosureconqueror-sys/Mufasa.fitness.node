# Push-Up Arena physical-test repair — 2026-09-21

## Evidence that triggered this repair
Physical debug report after PRs #848/#849 showed:
- FIRST FAILURE: DETECTION_NO_POSE
- BODY_VISIBILITY waiting despite visible/green overlay
- REST_BASE_CAPTURE failed / REST_POSE_NOT_OBSERVABLE
- protected rest pose UNOBSERVED; 0 mapped rest-pose bones
- 57 tracker/context resets
- Mirror Motion Phase 4 knew exercise=pushup, but exercise phase remained PUSHUP_TRANSITION
- user reported generic “too far” feedback while already horizontal in push-up position
- voice RESET/READY/START did not respond

## Root cause found
The Arena had two incompatible calibration contracts running in series:
1. the desired exercise-specific side-view TOP/BOTTOM/TOP calibration; and
2. the older generic Mirror Motion AvatarMirrorCalibration, which requires bilateral shoulders/hips/ankles, >=35% normalized body height, a standing/base hold, and temporarily stops speech recognition for exclusive calibration voice.

That second contract explains both symptoms: it can say “I found you” then stall waiting for a protected rest/base pose, and it disables recognition exactly when the athlete needs hands-free commands.

The generic PoseRuntime also has a standing-oriented TOO_FAR rule based on vertical body-height coverage. That rule is not Arena visibility authority for a horizontal floor push-up.

## Change
- Arena creates PocketPTArenaLiveMotion with requireRestBase:false.
- In this mode the canonical Mirror Motion foundation may load, but its standing-neutral rest/base calibration is SKIP for Arena setup and onRestReady opens exercise TOP capture.
- Arena resumes CoachRuntime recognition immediately after voice/audio activation so bare RESET/READY/START can be heard.
- UI no longer asks for a “clear full-body view”; it asks for one side chain: shoulder/elbow/wrist/hip/ankle.
- Arena camera visibility remains based on its selected-side five-joint chain. Generic PoseRuntime TOO_FAR must not override it.
- No authoritative rep thresholds were weakened.

## Reviewer / physical acceptance
1. Start from fresh arena load.
2. Enter challenge and enable camera.
3. Get on floor, side view, TOP position.
4. Confirm one selected side chain can make BODY_VISIBILITY PASS even if opposite arm/leg are occluded.
5. Confirm REST_BASE_CAPTURE is SKIP/PUSHUP_DIRECT_CALIBRATION, not FAIL/REST_POSE_NOT_OBSERVABLE.
6. Confirm calibration advances into CAPTURE_TOP instead of stopping after body found.
7. Say RESET and READY without “Coach” or “Mufasa”; both must dispatch.
8. Capture TOP -> BOTTOM -> TOP.
9. Say START; countdown and 60-second authoritative session should begin.
10. Verify STOP can interrupt speech, while ambient speech/echo cannot.
11. Verify stale/lost pose cannot falsely advance capture.
12. Desktop + iPhone physical acceptance remains required.

## Non-goals
No avatar/Godot visual retarget repair, leaderboard, multiplayer, yoga, or education changes.
