# Push-Up Arena hands-free calibration review handoff

## Goal
Make the first physical Push-Up Challenge setup hands-free after camera activation. The athlete begins on the floor in a side-view TOP push-up position. Setup must require one usable side chain (shoulder → elbow → wrist plus shoulder → hip → ankle), not bilateral green landmarks.

## User-reported failures this PR addresses
1. Coach speech was still being cut short. While any coach speech is active, non-stop transcripts must not interrupt it. Only explicit stop/exit intent may cancel active speech.
2. The UI could report body visible and then appear stuck. Setup copy now explicitly advances toward TOP capture, BOTTOM capture, TOP confirmation, then waits for START.
3. Hands-free commands are introduced for RESET, READY and START. RESET restarts pose capture; READY begins/restarts scanning; START is accepted only after calibration and speaks “Three. Two. One. Go.” before emitting the start request event.
4. Calibration should not require both sides of the body. The existing camera/calibration contract already consumes the detector-selected left OR right side and requires shoulder/elbow/wrist/hip/ankle on that side. This PR makes that contract explicit in UX and review criteria.
5. Calibration hold is shortened from 1000 ms to 700 ms; scoring thresholds are intentionally untouched.

## Expected physical flow
- Athlete places camera at their side.
- Athlete gets down into TOP push-up position.
- Say READY.
- System scans the current side view.
- TOP capture: elbow extension + shoulder stack + shoulder/hip/ankle line.
- Coach says TOP captured and asks athlete to lower.
- BOTTOM capture: elbow depth + shoulder/hip/ankle line.
- Athlete returns to TOP to confirm the personal cycle.
- Coach says calibration is complete and waits.
- Say START.
- Coach completes the uninterrupted countdown: 3, 2, 1, go.
- START creates the existing authoritative PushUpChallenge ExerciseSessionEngine in challenge mode, feeds live frames into it, and arms a 60-second finish timer. The DOM event remains telemetry/integration signaling rather than the session owner.

## Voice behavior to review
- Shared CoachRuntime remains the sole speech/recognition owner.
- Arena attaches a narrow dispatchCommand handler after CoachRuntime is configured; duplicate configure must not rebuild audio/STT.
- During ANY active speech, only explicit STOP or EXIT can cancel. Ambient/echo transcripts are ignored.
- Speech must finish, then the current state should determine the next cue. Do not replay a stale cue solely because visibility changed while speech was playing.
- Browser STT support still varies, especially iPhone/Safari. Do not claim physical-device acceptance from unit tests.

## Files
- public/coach-runtime.js
- public/arena-coach-runtime.js
- public/arena-phone-ui.js
- public/arena-phone-flow.js
- public/arena-pose-calibration.js
- public/arena-push-up.html

## Reviewer checks
1. Confirm RESET/READY/START cannot accidentally invoke general coach Q&A.
2. Confirm START cannot arm before CALIBRATED.
3. Confirm voice echo while coach is speaking cannot cancel/replace the active cue.
4. Confirm STOP remains able to interrupt speech.
5. Confirm detector-selected side can calibrate when the opposite arm/leg is low-confidence or occluded.
6. Confirm TOP/BOTTOM form gates still use elbow angle and shoulder→hip→ankle alignment; no scoring threshold was weakened.
7. Confirm lost tracking/reacquisition does not falsely advance calibration.
8. Confirm camera reset/retry does not leak streams/detectors.
9. Confirm START creates ExerciseSessionEngine, starts challenge mode only after CALIBRATED, feeds live frames while active, and finishes at the 60-second timer.
10. Physical acceptance: desktop + iPhone, side view, five deliberate setup cycles, explicit RESET mid-capture, READY after reset, START after calibration, and STOP during a spoken cue.

## Non-goals
No avatar animation changes, Godot changes, leaderboard changes, yoga changes, education changes, or authoritative rep-scoring threshold changes.
