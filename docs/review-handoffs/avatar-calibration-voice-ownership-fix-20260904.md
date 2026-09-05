# AVATAR CALIBRATION VOICE OWNERSHIP — CORRECTIVE HANDOFF

## Reported production failure

During live avatar rest/base-position capture, backend AI voice and browser fallback voice competed while Mufasa wake/listening remained active. Speech overlapped, calibration never reached READY, and the live mirror stalled before the avatar could be controlled.

## Root-cause findings

1. `AvatarCalibrationSpeechArbiter.speakOne()` calls canonical `CoachRuntime.speak()`, but then owns a second direct `speechSynthesis` fallback. `CoachRuntime.speak()` already owns backend TTS -> browser fallback, so calibration can create a second fallback authority.
2. `activateCanonicalCoachVoice()` currently starts Mufasa speech recognition during calibration even though the live mirror sets `__POCKETPT_CALIBRATION_SPEECH_LOCK__` and intends calibration speech to be exclusive.
3. The calibration lock therefore does not function as a complete lifecycle ownership contract.
4. Existing calibration voice tests reflect an older contract and have drifted from the live implementation.

## Required ownership contract

While avatar calibration is anything before `READY`:

- calibration is the only guided speech owner;
- Mufasa wake-word recognition is suspended;
- any existing Mufasa speech is cancelled before the first calibration cue;
- `CoachRuntime.speak()` is the only TTS/fallback authority when CoachRuntime exists;
- direct browser speech is allowed only when CoachRuntime is genuinely unavailable;
- no second fallback is attempted after CoachRuntime has already handled a phrase;
- calibration prompts remain serialized.

When calibration reaches `READY`:

- release the calibration speech lock exactly once;
- resume Mufasa recognition exactly once unless the user explicitly muted voice;
- retain normal wake semantics (`Mufasa`, `Hey Mufasa`, `Coach`).

## Regression requirements

1. CoachRuntime success -> no direct calibration browser fallback.
2. CoachRuntime failure after its own fallback -> no second calibration fallback.
3. Calibration activation suspends existing recognition and does not restart it before READY.
4. READY resumes recognition exactly once.
5. Explicit voice mute prevents resume.
6. Prompt queue remains serialized.
7. `mufasa stop` remains safe.
8. Calibration can progress through `FRAMING -> BODY_FOUND -> SETTLING -> CAPTURING_BASE -> READY` without speech contention.

## Scope boundary

Do not change MoveNet, pose math, avatar solver, rest-pose geometry, mirror-motion phases, rep counting, or workout progression in this corrective PR.
