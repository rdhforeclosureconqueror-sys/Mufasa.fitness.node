# AI health and summary contract

Production AI Coach uses `AI_COACH_ENABLED`, `AI_COACH_PROVIDER`, and `AI_COACH_MODEL`. The optional diagnostic summarizer separately uses `DIAGNOSTIC_SUMMARIZER_ENABLED`, `DIAGNOSTIC_SUMMARIZER_PROVIDER`, and `DIAGNOSTIC_SUMMARIZER_MODEL`. `OPENAI_DIAGNOSTIC_MODEL` is a documented legacy model alias accepted only by the summarizer call path. Both currently use the server-only `OPENAI_API_KEY`; only credential presence is reported.

Each capability reports enabled, configuration validity, credential presence, provider, model, static readiness, live reachability, last external check, latency, and sanitized failure class. Live calls occur only when an operator explicitly selects the capability through Safe External Checks. Results are retained process-locally for Launch Health and never include response bodies or credentials. Allowed statuses include READY, READY_WITH_LIMITATION, CONFIGURATION_MISSING, PROVIDER_UNREACHABLE, RATE_LIMITED, AUTHENTICATION_FAILED, MODEL_UNAVAILABLE, DISABLED_INTENTIONALLY, and UNKNOWN.

When the summarizer is disabled, ordinary diagnostic report creation does not call OpenAI. Summarizer failure affects optional prose only. Coach failure does not invalidate deterministic diagnostics, and summarizer failure does not classify Coach unavailable.
