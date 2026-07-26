# Pocket PT conversational speech state machine

Pocket PT keeps voice-mode ownership (`listening`) separate from the conversational session (`conversationState`). Voice mode may listen in `IDLE` for a wake phrase without accepting ordinary commands. Workout Voice and Guided Coach preferences do not start or end a conversational session.

```text
Voice On
  |
  v
IDLE -- "Hey Mufasa" / "Coach" --> WAKE_DETECTED
                                         |
                                         +-- wake only --> RESPONDING ("Hi, how can I help?")
                                         |                    |
                                         |                    v
                                         +-- command ----> PROCESSING --> RESPONDING
                                                                |
                                                                v
                                                            LISTENING
                                                                |
                                      follow-up command --------+
                                                                |
                                      goodbye / cancel ----------+--> IDLE
                                      inactivity timeout --------+--> IDLE
                                      Voice Off / teardown ------+--> IDLE + STT stopped
```

## State responsibilities

- **IDLE** — voice mode can keep the singleton recognizer running, but transcripts require a wake phrase.
- **WAKE_DETECTED** — the 25-second inactivity timer is armed. A wake-only utterance produces one local greeting; a wake phrase with a command proceeds directly to processing.
- **PROCESSING** — an accepted intent has been dispatched to the existing coach/backend path.
- **RESPONDING** — recognition is stopped before TTS so the assistant does not recognize its own response. The recognizer object is retained.
- **LISTENING** — recognition resumes on the same object after TTS and follow-up commands no longer require a wake phrase.

Every accepted user interaction and completed assistant response resets the inactivity timer. Its default is 25 seconds and tests may override it through `conversationTimeoutMs`. `goodbye`, `cancel`, `stop listening`, `end conversation`, `that's all`, and `that is all` return the session to `IDLE`. Voice Off also stops recognition immediately. A microphone failure ends the session rather than presenting a false active state.

Normal recognition `end` events restart only while voice mode is enabled. An `end` caused by the TTS pause does not enter the restart loop; if speech finishes before the browser delivers `end`, resumption waits for `end` and then starts the existing recognizer exactly once. Application `pagehide` invokes the explicit voice-service teardown. All transitions remain available in the bounded `[SPEECH_LIFECYCLE]` trace under the `conversation` and `stt` modules.
