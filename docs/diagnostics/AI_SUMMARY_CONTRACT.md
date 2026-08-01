# AI health and summary contract

`AI_COACH_*` configures production coaching. `DIAGNOSTIC_SUMMARIZER_*` separately configures optional diagnostic prose; both currently use credential presence from `OPENAI_API_KEY`, never its value. Each reports provider, model, enabled, configuration validity, credential presence, static readiness, live reachability, last check, latency, and sanitized failure class. Allowed failures are configuration missing, unreachable, rate limited, authentication failed, and model unavailable. Deterministic findings remain authoritative.
