# MUFASA PHASE B — VOICE / MUTE / CALIBRATION LIFECYCLE

## Role
Independent reviewer. Do not merge as part of review. Return GO or CHANGES REQUIRED with evidence.

## Baseline
Built from current `main` after Phase A PR #694 merged. Workout/Hey-Mufasa chat authority is already converged on the authenticated Node AI Coach.

## Goal
Make calibration suspension temporary and preserve explicit member voice intent.

## Required contract
1. Startup-muted is not the same thing as an explicit member mute.
2. If Mufasa was actively listening before calibration, calibration may suspend recognition and Mufasa resumes exactly once afterward.
3. If Mufasa was not listening before calibration, calibration must not silently enable wake-word listening afterward.
4. If the member explicitly presses Mute during calibration, post-calibration resume must be blocked.
5. If the member explicitly presses Voice On during calibration, activation is deferred until the calibration-exclusive window ends.
6. Calibration speech remains allowed to use the canonical CoachRuntime speech path; no second TTS/fallback authority is introduced.

## Implementation
`public/mufasa-voice-lifecycle.js` wraps only canonical CoachRuntime control methods. It uses the existing calibration acquisition marker `stopAllSpeech("avatar_calibration_acquire")` to snapshot the pre-calibration state.

It tracks:
- explicit member mute;
- whether voice was listening before calibration;
- whether Voice On was requested during calibration;
- calibration suspension/resume counts;
- blocked resume count.

`public/runtime-config.js` loads the controller early. The controller waits until `CoachRuntime` exists before installing.

The existing global `__POCKETPT_EXPLICIT_VOICE_MUTE__` is now driven by actual member mute/unmute actions rather than remaining test-only/implicit state.

## Non-goals
- no AI context changes;
- no new speech recognizer;
- no new TTS engine;
- no changes to calibration motion/rest capture;
- no change to authenticated coach endpoint;
- no automatic always-on microphone policy.

## Required review cases
1. Voice listening -> calibration -> recognition pauses -> calibration ends -> recognition resumes once.
2. Startup quiet -> calibration -> prompts may run -> calibration ends -> wake-word remains off.
3. Voice listening -> calibration -> member presses Mute -> calibration ends -> no recognition resume.
4. Startup quiet -> calibration -> member presses Voice On -> activation is deferred -> calibration ends -> recognition starts once.
5. Repeated calibration acquire calls do not overwrite the first pre-calibration snapshot.
6. Normal non-calibration `startListening()` still delegates unchanged.
7. Normal Voice On / Mute behavior outside calibration still delegates to CoachRuntime.
8. Calibration voice tests from the September 4 voice-ownership fix remain green.

## Tests
Run:
- `node --test test/mufasa-phase-b-voice-lifecycle.test.js`
- `node --test test/coach-speech-activation.test.js`
- `node --test test/avatar-calibration-exclusive-voice.test.js`
- `node --test test/avatar-calibration-exclusive-speech-lock.test.js`
- full repository suite.

## GO criteria
GO only if explicit user mute is never overridden, pre-calibration listening state is faithfully restored, and no second speech/listening authority is introduced.

## Next phase after GO
Phase C — bounded whole-journey context enrichment for Mufasa.