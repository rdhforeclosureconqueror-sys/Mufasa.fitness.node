# AVATAR CALIBRATION VOICE OWNERSHIP — CORRECTIVE HANDOFF

## Reported production failure

During live avatar rest/base-position capture, backend AI voice and browser fallback voice competed while Mufasa wake/listening remained active. Speech overlapped, calibration never reached READY, and the live mirror stalled before the avatar could be controlled.

## Root cause confirmed

1. `AvatarCalibrationSpeechArbiter.speakOne()` called canonical `CoachRuntime.speak()` and then owned a second direct `speechSynthesis` fallback. `CoachRuntime.speak()` already owns backend TTS -> browser fallback, so calibration had a second fallback authority.
2. `activateCanonicalCoachVoice()` started Mufasa speech recognition while the live mirror had already declared calibration speech locked/exclusive.
3. The lock therefore did not protect the whole calibration lifecycle.
4. Existing calibration voice tests had drifted from the live contract.

## Fix implemented

`public/motion/live-avatar-mirror.js`

- calibration now routes through `CoachRuntime.speak()` as the sole TTS/fallback authority whenever CoachRuntime exists;
- direct `speechSynthesis` fallback is used only when CoachRuntime is genuinely unavailable;
- calibration acquisition cancels current CoachRuntime speech;
- active Mufasa recognition is stopped before calibration begins;
- calibration voice activation unlocks audio but intentionally does not restart recognition;
- a new explicit `resumeCanonicalCoachVoice()` handoff resumes recognition after calibration reaches `READY`;
- resume happens at most once per live mirror instance;
- explicit voice mute prevents automatic resume;
- dispose releases calibration ownership so recognition is not stranded off if the mirror exits early;
- diagnostics now expose direct fallback count, calibration-exclusive/active voice state, resume attempt, and resume result.

## Expected ownership sequence

`MUFASA -> CALIBRATION_ACQUIRE -> CALIBRATION_EXCLUSIVE -> BASE_POSITION_READY -> CALIBRATION_RELEASE -> MUFASA_ACTIVE`

While calibration is before `READY`:

- calibration is the guided speech owner;
- Mufasa wake recognition is suspended;
- there is one TTS/fallback authority;
- prompt speech remains serialized.

After `READY`:

- calibration lock releases once;
- Mufasa recognition resumes once unless explicitly muted;
- normal wake semantics (`Mufasa`, `Hey Mufasa`, `Coach`) return.

## Regression coverage

`test/avatar-calibration-exclusive-voice.test.js`

Covers:

1. CoachRuntime failure cannot trigger a second calibration browser fallback;
2. calibration activation stops existing recognition and does not start it;
3. explicit post-calibration handoff resumes recognition exactly once;
4. explicit voice mute prevents resume.

Also re-run existing:

- `test/avatar-calibration-speech-arbitration.test.js`
- `test/avatar-calibration-canonical-voice.test.js`
- `test/coach-speech-activation.test.js`
- full repository suite.

## Manual verification

1. Open workout/live avatar mirror.
2. Enable avatar mode and connect camera.
3. Observe base/rest-position flow from framing through countdown.
4. Confirm only one voice speaks at a time.
5. Confirm no simultaneous AI voice + browser fallback.
6. Confirm saying `Hey Mufasa` during calibration does not interrupt the capture.
7. Confirm `Base position set. Start moving.` completes.
8. After READY, say `Hey Mufasa` and confirm normal coach wake/listening resumes.
9. Repeat once with explicit voice mute enabled and confirm Mufasa does not auto-resume.

## Scope boundary

No MoveNet, pose math, avatar solver, rest-pose geometry, mirror-motion Phase 1-14, rep-counting, exercise logic, or workout-progression behavior was intentionally changed.

Return `GO` or `CHANGES REQUIRED` with exact evidence. Do not merge until the owner approves.
