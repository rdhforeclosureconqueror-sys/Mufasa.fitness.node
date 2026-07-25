# Pocket PT Speech Investigation Report

**Investigation date:** 2026-07-25  
**Repository/branch:** `Mufasa.fitness.node` / `work`  
**Release status:** **BLOCKED** — no deployment was performed, and production-browser speech has not been proven reliable.

## Executive finding and evidence boundary

The first deterministic failure is application mute state, before wake-word STT: `CoachRuntime.configure()` calls `setMuted(true)`. That call cancels output and publishes `Voice unavailable: muted`. On the Voice On click, the shell then calls `speak("Voice is on.")` **before** toggling listening and without unmuting; `speak()` again returns `{ ok: false, reason: "muted" }`. Thus “Voice unavailable” and “Muted” do not establish missing browser voices or a microphone failure. They are an application state transition.

The reported later `STT error` originates only from a `SpeechRecognition.onerror` event (or a synchronous start/restart exception), but the old logging discarded the event sequence and retained only `event.error`. There is no captured browser trace in the repository, so the exact STT error value and its browser cause cannot be proven retrospectively. The new bounded lifecycle trace records the evidence needed; it does not change recognition, mute, or synthesis behavior.

## Speech architecture and runtime flow

```text
User tap: Voice On (public/workout.html)
  ├─ CoachRuntime.unlockAudioOnce()
  │    └─ AudioContext/webkitAudioContext → oscillator → resume()
  ├─ CoachRuntime.speak("Voice is on.")
  │    └─ state.muted === true → Voice unavailable: muted  [FIRST DETERMINISTIC FAILURE]
  └─ CoachRuntime.toggleListening()
       └─ startListening() → ensureRecognition()
            ├─ window.SpeechRecognition || window.webkitSpeechRecognition
            ├─ browser owns microphone prompt/capture (no app audio getUserMedia)
            └─ continuous recognition lifecycle
                 start → audiostart → soundstart → speechstart
                 → result / nomatch / error
                 → speechend → soundend → audioend → end
                         │
                         └─ handleRecognitionResult()
                              ├─ substring gate: “mufasa” OR “coach”
                              ├─ remove hey/coach/mufasa
                              └─ empty wake phrase becomes local default question
                                   → dispatchCoachCommand()
                                        → stopAllSpeech()
                                        → CoachRuntime.askCoach()
                                             ├─ POST configured /ask backend
                                             └─ local conservative text fallback on failure
                                                  → CoachRuntime.speak(answer, "llm")
                                                       ├─ muted gate
                                                       ├─ AudioContext unlock
                                                       ├─ POST configured /api/speak
                                                       ├─ Blob/Object URL/HTMLAudioElement.play()
                                                       └─ on backend failure only:
                                                            speechSynthesis.cancel()
                                                            → SpeechSynthesisUtterance
                                                            → speechSynthesis.speak()

WorkoutProgressionRuntime
  → WorkoutCoachRuntime (guided instructions/countdowns/cues; promise queue)
       → CoachRuntime.speak("workout-<event>")
       → CoachRuntime.stopAllSpeech() on cancellation
       → preference callback maps Workout Voice off to CoachRuntime.setMuted(true)
```

“Wake word” is not a separate low-power listener or library. The single continuous general-purpose recognizer in `CoachRuntime` hears the entire transcript and performs a substring check. Saying only “Hey Mufasa” dispatches the hard-coded question “give me a quick status update on my workout.” Recognition is not intentionally stopped after a result. There is one module-level recognizer, cached by `ensureRecognition()`; the workout shell performs only feature detection and does not instantiate another recognizer.

## Files involved and dependency map

| File | Responsibility | Direct speech dependencies |
|---|---|---|
| `public/workout.html` | Production workout UI, Voice On/Mute handlers, runtime configuration, status/log elements, TTS `<audio>` element, API URLs | `RuntimeOrchestrator`, `CoachRuntime` |
| `public/coach-runtime.js` | Mute, audio unlock, STT construction/wake parsing/restart, command dispatch, backend TTS, browser TTS fallback, typed coach, visible errors | Web Speech recognition/synthesis, Web Audio, HTML media, Permissions API (diagnostic only), Fetch |
| `public/runtime-orchestrator.js` | Calls `CoachRuntime.configure()` once and records configuration | `CoachRuntime` |
| `public/workout-progression-runtime.js` | Connects workout lifecycle and voice preference to the two coach runtimes | `WorkoutCoachRuntime`, `CoachRuntime` |
| `public/workout-coach-runtime.js` | Workout Voice/Guided Coach preferences, sequential cue promise queue, cadence timers, cancellation | Injected `CoachRuntime.speak/stopAllSpeech/setMuted` |
| `public/workout-runtime.js` | Speaks workout intro and reports workout-start errors as voice-unavailable | Injected `CoachRuntime` |
| `server.js` | Serves `public/`; implements/configures the speech proxy route used by `AIVOICE_URL` | Express, upstream voice service configuration |
| `test/performance-lazyload.test.js` | Ownership, feature-detection, status, and complete STT instrumentation contracts | Static source assertions |
| `test/workout-focus-runtime-regression.test.js` | Proves voice initializes muted and performs no backend request while muted | VM runtime harness |
| `test/workout-coach-runtime.test.js` | Guided Coach/Workout Voice queue, preference independence, cancellation | Runtime harness |
| `test/tts-speak-proxy.test.js` | Server TTS proxy request/response contracts | Node server harness |

`index.html` is a noncanonical alternate/legacy workout shell containing similar wiring. `/` is served from `public/index.html` (landing page); users reach speech through `/workout.html`. Camera `getUserMedia({video:true,audio:false})` in `public/workout-runtime.js` is unrelated to speech capture. The Three.js vendor `AudioContext` is its own media utility and is not on the coach speech path.

## Stage-by-stage reachability and failure handling

| Stage | Reached / transition | Failure modes | Existing handling/logging | Fallback |
|---|---|---|---|---|
| Runtime configuration | Page boot through orchestrator | missing script/runtime | orchestrator failure; coach configure log | none |
| Initial mute | always at configure | not a platform failure; deliberately true | `Voice unavailable: muted`; cancels browser/HTML audio | none |
| Voice On gesture | button click | handler not bound; earlier boot failure | only per-call warnings | none |
| Audio context unlock | before STT | API absent; constructor/node/resume rejection; suspended policy | visible voice-unavailable and now context lifecycle trace | none; STT still called because shell ignores false result |
| Recognition feature detection | on configure/start | neither standard nor prefixed constructor | text-only status and system log | typed coach |
| Microphone permission/capture | implicitly inside `recognition.start()` | insecure context, denied, policy, no device, busy capture | browser error reaches generic STT handler; diagnostic permission state now recorded where supported | typed coach; no explicit audio `getUserMedia` retry |
| STT start | Voice On | synchronous invalid-state/start error | `setMicFailure`; listening reset | typed coach |
| STT active | browser callback | `no-speech`, `audio-capture`, `not-allowed`, `service-not-allowed`, `network`, `aborted`, `language-not-supported`, browser-specific errors | formerly error only; now all lifecycle events, state, and exact error are traced | none; any error sets listening false, so `end` does not restart |
| Wake gate | result | false positives due substring; wake-only creates synthetic question | transcript was logged; dispatch log | non-wake speech ignored |
| Intent/chat | after gated result | dispatcher absent/throws; backend unavailable/bad/empty | visible chat error plus request trace | local conservative response unless disabled |
| Speech entry | responses/workout cues | muted or speech lock | visible unavailable for mute; rep lock silently returns reason | browser synthesis only after backend attempt, not for mute |
| Backend synthesis | unmuted speech | missing URL/fetch, timeout/abort, HTTP error, blob/player/play error | backend-failed status; new request/response/player trace | browser speech synthesis |
| Browser synthesis | backend TTS failure | API absent, utterance error, empty/OS voice state | generic unavailable; now initial/changed voice count and utterance events | none |
| Workout speech queue | workout events | disabled, cancellation generation, cue rejection | category-only workout log; underlying coach trace | skipped cues do not block timers |

## STT event lifecycle

Configuration is `lang = en-US`, `continuous = true`, and `interimResults = false`. Previously handled events were only `result`, `error`, and `end`. The investigation now observes all requested events without altering behavior:

| Event | Meaning in this runtime | Behavior |
|---|---|---|
| `start` | service started | trace |
| `audiostart` | browser began capturing audio | trace |
| `soundstart` | sound detected | trace |
| `speechstart` | speech classified | trace |
| `result` | final result delivered | trace count/index, then existing transcript/wake processing |
| `nomatch` | speech recognized without a match | trace |
| `error` | recognition failure | trace exact `error`/message, mark listening false, show Mic error, append `STT error` |
| `speechend` | speech ceased | trace |
| `soundend` | audible sound ceased | trace |
| `audioend` | capture ceased | trace |
| `end` | service disconnected | trace; restart only if `state.listening` remains true |

The error handler changes `listening` to false before `end`, so recognition errors never auto-restart. A normal browser `end` attempts immediate restart. A synchronous exception during that restart becomes an STT failure. Navigation has no explicit recognition `pagehide` stop; page destruction normally ends it, but that ordering is not instrumented outside browser callbacks.

## Complete visible-message traces

### `Voice unavailable`

Source is `setVoiceUnavailable(reason, source)` in `public/coach-runtime.js`. It normalizes the reason, writes `state.lastVoiceError`, changes the main status to `Voice unavailable: <reason>`, changes the Ma’at chip to `voice unavailable`, logs `[VOICE_RUNTIME] unavailable`, and appends the same system log.

Call paths are:

1. `configure → setMuted(true) → stopAllSpeech → setVoiceUnavailable("muted", "mute-toggle")`.
2. `speak → state.muted → setVoiceUnavailable("muted", source)`; this is exercised by the Voice On prime because the handler never unmutes.
3. `unlockAudioOnce` when AudioContext is absent or unlock rejects.
4. backend audio player `onerror` (`audio_playback_error`).
5. browser utterance `onerror` (`browser_speech_error: ...`).
6. `speak` after both backend and browser fallback fail (`browser_fallback_failed: ...`).
7. `public/workout-runtime.js` reports `workout_start_failed: ...` through the same generic UI.

Therefore the label is not a diagnosis and does not imply zero installed voices.

### `Muted`

Mute is application state only: `state.muted`, initialized `true`. It is not browser microphone mute, OS output mute, permission state, AudioContext state, Focus Mode, or `speechSynthesis.paused`. Sources that write it are `configure()`; the explicit Mute button; Workout Voice preference synchronization in `WorkoutProgressionRuntime`; workout start synchronization; and Workout Coach’s `onVoicePreferenceChange`. Guided Coach is independent: disabling it removes extended instruction content but does not itself mute output. Workout Voice is persisted under `mufasa_workout_coach_preferences_v1`, defaults on, and maps its inverse into global coach mute when progression configures.

### `STT error`

The literal is appended only by `setMicFailure`. Runtime paths are `recognition.onerror → setMicFailure(exactError, "speech-recognition-error")`, a synchronous `startListening` exception, or a synchronous `onend` restart exception. `setMicFailure` stores `lastMicError`, clears listening, updates the button, displays `Mic error: <reason>`, sets the Ma’at mic-error chip, appends `STT error: <reason>`, and logs mic failure. It does **not** come from TTS, mute, backend chat, camera, or AudioContext. Without the exact `<reason>` and ordered browser events, choosing among permission, capture, service/network, no-speech, abort, and invalid-state causes would be guessing.

## Mute, queue, and race analysis

- Workout Voice and the global mute are coupled; Guided Coach and Focus Mode are not mute sources.
- Workout Coach serializes its own cues with a promise chain, but direct chat/rep speech does not share that queue. `CoachRuntime.speak()` calls `stopAllSpeech()` before each utterance, so concurrent direct calls can cancel one another.
- `stopAllSpeech()` does not stop recognition. Recognition can therefore listen while TTS is playing and may transcribe the assistant. There is no echo-duplex guard, pause-before-speak, or restart-after-speak protocol.
- Recognition result dispatch calls `stopAllSpeech()`, but synthesis calls never stop recognition. This is asymmetric, permits feedback, and is a competing explanation for post-wake STT errors or unwanted commands—not proof of the observed error.
- A normal `end` immediately calls `start()` while `listening` is true, with no delay/backoff or start-in-flight flag. Browser callback ordering can yield `InvalidStateError`; the new trace distinguishes `end`, `restarted`, and restart failure.
- `speechSynthesis.cancel()` occurs before browser fallback utterances and every general stop. An utterance cancellation may fire `error: canceled/aborted`, which the generic UI reports as voice unavailable.
- Workout transitions and pause/skip/end/pagehide cancel Workout Coach timers/output. There is no corresponding pagehide STT cleanup.
- Audio unlock constructs a new context once and does not retain or close it. Success is represented only by a boolean; a later OS/browser suspension is not detected.

## Speech synthesis and voice loading

Backend TTS is primary. The `alloy/verse/aria/ember/coral` dropdown values are sent to `/api/speak`; they are not selected from `speechSynthesis.getVoices()` and do not represent installed browser voices. Browser `speechSynthesis` is reached only if backend synthesis fails. Its utterance has no `.voice` assignment, so the user agent chooses its default voice.

Before this investigation the runtime never called `getVoices()` and never observed `voiceschanged`; consequently it could neither prove nor diagnose the common asynchronous voice-list population timing. The trace now records initial count, later `voiceschanged` count, and default voice name, but deliberately does not change selection. No-voice timing cannot cause the deterministic initial `Voice unavailable: muted`, because that message occurs before browser synthesis. Whether a particular later fallback failure is voice loading, OS voice availability, cancellation, autoplay, or a browser limitation requires its traced utterance event.

## Permissions and audio analysis

There is no speech `getUserMedia({audio:true})`. `SpeechRecognition.start()` owns prompting and capture. The camera path explicitly asks for video with `audio:false`; its permission has no evidentiary value for STT. The investigation performs a non-prompting `navigator.permissions.query({name:"microphone"})` when listening starts, logging `granted`, `prompt`, `denied`, unsupported query, or query rejection. The recognition event remains authoritative because browsers differ in support/exposure and Permissions API state alone does not prove usable hardware or recognition service.

Audio output unlock uses `AudioContext || webkitAudioContext`, creates a near-silent oscillator, calls `resume()` within the Voice On gesture, and then awaits backend fetch before `HTMLAudioElement.play()`. The initial resume is gesture-associated; the later asynchronous play may still be subject to platform policy. The runtime has no separate output-routing API and cannot detect OS mute. AudioContext is not involved in STT capture. The trace records creation/resume state and HTML audio play rejection.

## Browser compatibility (capability, not production verification)

Runtime detection for recognition correctly checks the standard constructor and the WebKit-prefixed constructor. Synthesis, utterance, AudioContext, and prefixed AudioContext are separately detected. Detection cannot establish permission, installed voices, network recognition service, autoplay allowance, or reliable continuous mode.

| Browser | Recognition expectation | Synthesis/audio expectation | Investigation status |
|---|---|---|---|
| Desktop Chrome | commonly exposes prefixed recognition; service may be network-backed | synthesis and AudioContext generally exposed; autoplay gesture rules apply | capability path coded; not production tested |
| Android Chrome | commonly exposes prefixed recognition; continuous behavior/service availability can vary | synthesis availability depends on device voices; gesture rules apply | not production tested |
| Safari (macOS) | version/OS-dependent recognition exposure; prefixed path covered | synthesis and prefixed AudioContext path covered; voice list may load asynchronously | not production tested |
| iPhone Safari | recognition availability/version/OS policy varies; unsupported path correctly falls back to text | user gesture and interruption behavior are material; prefixed AudioContext covered | not production tested |
| Edge (Chromium) | constructor exposure/service policy can differ despite Chromium | synthesis/AudioContext generally exposed | not production tested |
| Firefox | should be treated as recognition-unsupported unless constructor detection proves otherwise at runtime | synthesis may be present independently | text + possible TTS only; not production tested |

Authoritative references for browser verification are MDN’s [SpeechRecognition](https://developer.mozilla.org/docs/Web/API/SpeechRecognition), [SpeechSynthesis](https://developer.mozilla.org/docs/Web/API/SpeechSynthesis), [voiceschanged](https://developer.mozilla.org/docs/Web/API/SpeechSynthesis/voiceschanged_event), [Permissions API](https://developer.mozilla.org/docs/Web/API/Permissions_API), [MediaDevices.getUserMedia](https://developer.mozilla.org/docs/Web/API/MediaDevices/getUserMedia), and [AudioContext.resume](https://developer.mozilla.org/docs/Web/API/AudioContext/resume). The repository investigation environment could not perform a live compatibility lookup or browser matrix, so this table intentionally avoids version guarantees.

## Logging added

`[SPEECH_LIFECYCLE]` emits a structured entry containing ISO timestamp, module, event, mute/listen/unlock/lock state, and normalized error. It covers permissions, audio-context creation/resume, backend TTS, HTML audio playback, browser voice inventory and utterance lifecycle, and every STT event. A 100-entry ring is available as `CoachRuntime.getSpeechTrace()` so a reproduction can be exported without unbounded logging. It logs lifecycle boundaries rather than audio frames/interim hypotheses and therefore does not spam per-frame data. Final transcripts retain the pre-existing recognition log behavior; the structured result entry contains only result metadata.

## Manual reproduction and evidence collection

1. Use a supported secure origin and open `/workout.html`; sign in if required.
2. Open DevTools Console, clear it, and record browser/OS/version, origin security, microphone device, and site microphone setting.
3. Before interaction run `CoachRuntime.getState()`. **Expected current state:** `muted: true`; UI has already traversed `Voice unavailable: muted` during configuration.
4. Click **Voice On** once. Capture the visible status and `[SPEECH_LIFECYCLE]` entries. Expected intended behavior is output unlock followed by STT `start → audiostart` and listening status. Actual static behavior is that the prime speech is rejected as muted before STT is toggled.
5. Say “Hey Mufasa” once, then wait ten seconds without speaking. Expected intended behavior is `soundstart → speechstart → result`, command dispatch, coach answer, TTS, and continued listening. For the reported incident the actual behavior is wake result followed by an unknown STT error; the new trace must establish its exact event/error sequence.
6. Export `JSON.stringify(CoachRuntime.getSpeechTrace(), null, 2)`, the coach system log, permission UI state, and Network entries for `/ask` and `/api/speak`.
7. Repeat with Workout Voice on/off and during Guided Coach output to test duplex feedback, then repeat the defined browser matrix. Do not call a browser “passing” from constructor presence alone.

## Root cause, minimal fix, and regression risk

### Proven application defect

The initial `Voice unavailable / muted` sequence is caused by contradictory application state: voice defaults muted, while the button is labelled “Voice On” and primes speech without first unmuting. It affects every browser because it occurs before platform synthesis. Minimal eventual fix: make the Voice On gesture explicitly enable output before priming (or do not prime while muted), and make the visible label/state consistent with the persisted Workout Voice preference. Regression risks include changing the established safe default tested by Focus Mode, unexpected audio at boot, and preference synchronization loops. No behavioral fix was made in this investigation because the requested first task is evidence collection and the STT failure remains unproven.

### Unproven STT root cause

The repository proves only that a recognition error or synchronous start/restart exception generated `STT error`. Competing hypotheses are:

1. permission/service denial (`not-allowed` or `service-not-allowed`);
2. absent/busy capture (`audio-capture`);
3. recognition service/network failure (`network`);
4. normal no-speech policy (`no-speech`) treated as terminal;
5. recognition/TTS overlap or explicit synthesis cancellation producing an abort/interruption;
6. immediate continuous recognizer restart racing browser state (`InvalidStateError`).

Evidence required to choose is the ordered lifecycle trace with exact error, permission state, browser/OS/version, whether assistant audio was active, and Network/backend timing. Installed browser voices cannot explain an STT error and microphone permission cannot explain the deterministic muted TTS rejection.

## Recommended next action

Collect the new trace on the originally affected browser first. Then implement the minimal mute-order correction and only the error-specific STT change supported by that trace (for example, retry/backoff for a proven transient `no-speech`/normal end, not for denied permission). Add browser automation where Web Speech can be deterministically stubbed and complete real-device Chrome, Android Chrome, Safari, iPhone Safari, Edge, and Firefox checks before changing release status.

## Tests and regression status

Focused assertions cover ownership of all eleven recognition events, structured timestamped logging, and bounded trace exposure. Existing tests already cover muted initialization/no backend request, runtime ownership/status transitions, Workout Voice/Guided Coach independence, queue sequencing/cancellation, and TTS proxy behavior. Command results and commit identity are recorded in the change summary/PR and must not be interpreted as production-browser testing.

## Remaining unknowns

- exact reported `SpeechRecognitionErrorEvent.error` and preceding event sequence;
- affected browser, OS, versions, secure-origin status, microphone hardware/routing, and site permission;
- whether TTS was playing at error time and whether the recognizer heard it;
- `/ask` and `/api/speak` request outcomes for the incident;
- initial and post-`voiceschanged` installed voice inventory;
- AudioContext/HTML audio state at failure;
- reliability across the required real-browser/device matrix.

**Release status remains BLOCKED until speech works reliably and production browser testing is completed.**
