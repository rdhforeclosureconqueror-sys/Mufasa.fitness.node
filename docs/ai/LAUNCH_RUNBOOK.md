# AI Coach V1 Launch Runbook

## Architecture and lifecycle

Authoritative member services build bounded context; the modular prompt builder passes it to an injected provider; deterministic safety guards run before and after generation. The server normalizes provider SSE into authenticated newline-delimited JSON (NDJSON). The sequence is authentication, membership/rate validation, message validation, context/prompt construction, input safety, provider stream, output safety, atomic completed-pair persistence, privacy-safe metrics, cleanup.

`POST /api/me/ai-coach/stream` emits `response.started`, zero or more `response.delta`, optionally `response.replaced`, then exactly one terminal `response.completed`, `response.cancelled`, or `response.failed`. Correlation IDs are server-generated and are not database/provider IDs. `DELETE /api/me/ai-coach/generation` cancels the authenticated member's active request.

## Policy

Only one active generation per member is permitted. The UI disables duplicate submission. Cancellation, disconnect, timeout, and failure discard the entire partial pair. Completed pairs are retained chronologically in the additive member field, bounded to 24 messages by default; clear history deletes that member's field contents. Provider calls are never retried after output starts. V1 performs no automatic provider retry, avoiding duplicate output; operators can reconsider a single jittered retry for 408/429/5xx only before the first token after production evidence.

Safety interception covers emergencies, severe injury, self-harm, dangerous restriction, diagnosis/medication/prohibited substances, unsafe authority overrides, and injection aimed at prompts, secrets, policies, events, administration, or other users. It offers calm escalation and does not diagnose. Prompts and message content are not logged.

## Configuration inventory

All values are operator inputs; credentials have no default.

| Variable | Default | Purpose |
|---|---:|---|
| `AI_COACH_ENABLED` | `false` | Enable live provider |
| `AI_COACH_PROVIDER` | `openai` | Provider |
| `AI_COACH_MODEL` | none | Approved model (required enabled) |
| `OPENAI_API_KEY` | none | Server-only credential (required enabled) |
| `AI_COACH_REQUEST_TIMEOUT_MS` | `30000` | Total provider timeout |
| `AI_COACH_FIRST_TOKEN_TIMEOUT_MS` | `8000` | Reserved first-token bound |
| `AI_COACH_MAX_OUTPUT_TOKENS` | `600` | Output cap |
| `AI_COACH_MAX_MESSAGE_CHARS` | `2000` | Input cap |
| `AI_COACH_HISTORY_LIMIT` | `24` | Retained messages |
| `AI_COACH_REQUESTS_PER_MINUTE` | `20` | Member rate limit |
| `AI_COACH_CIRCUIT_THRESHOLD` | `5` | Failures before open |
| `AI_COACH_CIRCUIT_COOLDOWN_MS` | `30000` | Open duration |
| `AI_COACH_LOGGING_MODE` | `metadata` | Privacy-safe logging |
| `AI_COACH_SAFETY_MODE` | `enforce` | Deterministic enforcement |

## Verification

Without credentials:

```bash
npm test
npm run lint
node --test test/ai-coach-*.test.js
node --test test/phase12a-security-remediation.test.js
git diff --check
```

**Requires approved non-production environment, synthetic account, and real provider credential:**

```bash
AI_COACH_ENABLED=true AI_COACH_MODEL='<APPROVED_MODEL>' OPENAI_API_KEY='<SECRET>' AI_COACH_LIVE_CONNECTIVITY_APPROVED=true npm run ai-coach:launch-verify
```

Never paste output containing a credential into tickets. Exercise authentication, two synthetic members, context, streaming, Stop, timeout, safety fixtures, persistence/clear, rate limit, circuit opening/recovery, outage, and sanitized logs. Confirm dashboard, workouts, completion, and gamification remain usable throughout.

## Risks, rollback, and recovery

Provider API behavior, model approval, regional availability, pricing, and production thresholds require operator confirmation. First-token-specific enforcement and daily/global distributed limits require shared infrastructure and are deferred; total timeout, per-process circuit, per-member concurrency, minute rate, history, input, and output caps apply now.

Rollback: set `AI_COACH_ENABLED=false`, restart through the approved deployment workflow, retain the truthful fallback, optionally disable the three streaming/cancellation routes by reverting the sprint commit, and verify non-AI smoke tests. No destructive migration is needed; completed additive conversations can remain safely ignored. Never roll back authoritative workout, progression, achievement, or member data.
