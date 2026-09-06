# Mufasa Client Context + Voice Convergence Audit

## Objective
Make Mufasa one authenticated, member-aware coach across every surface: dedicated AI Coach, workout/mirror voice, future dashboard/world, and wake-word interaction. Do not create another coach brain or duplicate member data.

## Audited baseline
Current main after mirror-motion final audit. The dedicated `/coach.html` surface and the workout/mirror `CoachRuntime` are not using the same coaching authority today.

## Primary finding: split Mufasa authority

### Canonical Mufasa path
The dedicated `/coach.html` surface uses the authenticated Node AI Coach routes (`/api/me/ai-coach*`). Server-side `aiCoachService` rebuilds authoritative member context through `coachContextService` for each request, retains bounded conversation continuity, applies safety/prompt policy, and fails truthfully when provider data is unavailable.

### Legacy workout voice path
`public/workout.html` configures `CoachRuntime` with `RuntimeState.getEndpoints().askUrl`. That endpoint still resolves to the external `https://mufasabrain.onrender.com/ask` path. The client sends profile/user/session context, but this bypasses the canonical server-side `aiCoachService` and its authoritative member context builder.

### Required architecture
There must be ONE Mufasa knowledge/context authority:

member-authenticated request
→ Node `/api/me/ai-coach/messages` or stream equivalent
→ `aiCoachService`
→ `coachContextService`
→ canonical member services / persistence
→ Mufasa response
→ presentation surface (typed chat or voice/TTS)

Voice is a presentation/input surface, not a separate coach brain.

## What canonical Mufasa already knows
`coachContextService` currently exposes bounded authoritative context including:

- member display name;
- up to five recent workouts/sessions;
- total reps and form score when those were persisted;
- latest completion/reward summary;
- upcoming/current program;
- program phase, week, today, next workout, adherence, completion percentage, deload status;
- goals baseline;
- latest recovery check-in: energy, soreness, sleep, motivation;
- current level, lifetime XP, XP to next level, current streak;
- latest achievement, latest badge, recent rewards;
- recent yoga results and common deterministic yoga fault IDs;
- Stepping Into Greatness activity count/lifetime distance/latest activity time;
- push-up challenge summary.

`aiCoachService` already provides bounded conversation memory and suggested questions such as latest workout, leveling progress, improvement, weekly focus, achievements, and recovery.

## Gaps relative to intended Mufasa experience

### Gap 1 — Workout/mirror voice bypasses canonical AI Coach
Highest priority. The wake-word/typed workout coach must use the same authenticated server-side AI Coach service as `/coach.html`.

### Gap 2 — Voice activation / mute semantics need cleanup
`CoachRuntime.configure()` still initializes `muted: true` via `setMuted(true)`. Newer `activateVoice()` explicitly unmutes before recognition and calibration has an exclusive speech handoff, but default mute remains part of runtime state.

Desired contract:
- configure does not imply an irreversible or confusing user mute;
- browser microphone/listening still requires an intentional activation path;
- an explicit user mute is respected and survives calibration;
- if voice was enabled/intended before calibration, calibration suspends listening and resumes Mufasa once after rest capture;
- if user explicitly muted voice, calibration must not silently reactivate it;
- no competing TTS fallback authorities.

### Gap 3 — Specific prior camera/form faults are not yet a general coach memory
General recent workout context includes form score but does not prove persistence of bounded specific findings such as knee valgus, trunk collapse, depth fault, etc. Yoga has deterministic fault summaries, but the general camera/form-analysis path needs a canonical minimized persistence projection before Mufasa may say, for example, “last workout your knees were moving in.”

Do not infer historical faults from a low form score.

### Gap 4 — Last run summary is incomplete
Current context can expose some member-experience distance/activity information, but it does not yet prove an authoritative detailed last-run summary (distance, duration, pace, date, relevant run result). Identify the canonical run activity store first. If no canonical persisted run session exists, build that separately before Mufasa claims run history.

### Gap 5 — “Next badge” must come from gamification authority
Current context exposes level/XP, XP to next level, latest achievement/badge, and recent rewards. It does not explicitly expose a next-badge projection. Mufasa must not calculate award eligibility itself. Add a deterministic server-side progress projection from the gamification definition/read-model authority, then expose only that projection to coach context.

### Gap 6 — Whole-journey profile context is intentionally too narrow today
Current prompt member context is minimized. To support “understand where I am in my journey,” add only coaching-relevant authenticated fields from canonical profile/intake/personalization services, e.g. goals, training baseline, program position, relevant preferences, and user-supplied coaching context. Do not indiscriminately dump entire account records or sensitive/private data into the model prompt.

## Phased implementation plan

### Phase A — Unify coach authority
1. Change workout/mirror CoachRuntime ask endpoint from legacy external `/ask` to authenticated Node `/api/me/ai-coach/messages`.
2. Preserve TTS and wake-word as presentation/input only.
3. Verify existing response extraction handles canonical response envelope.
4. Ensure Bearer auth comes from canonical auth runtime.
5. Add regression proving typed workout chat and wake-word requests reach the same canonical AI Coach route as `/coach.html`.
6. Retain external brain only behind the server provider boundary if still required; browser must not call it directly for canonical Mufasa coaching.

### Phase B — Voice lifecycle and post-calibration Mufasa resume
1. Audit `configure`, `activateVoice`, explicit mute preference, calibration suspend, and calibration resume.
2. Distinguish `configured`, `voice enabled/intended`, `explicit user muted`, `listening`, and `calibration suspended` states.
3. Ensure `Hey Mufasa` works after calibration when voice is enabled.
4. Ensure explicit mute prevents automatic restart.
5. Add first-failure diagnostics for mute/listening/resume state.

### Phase C — Whole-journey canonical context
Extend `coachContextService` from canonical server-side owners only:
- profile/intake/personality-safe coaching fields;
- personalization/journey projection;
- current program + next workout;
- recent workouts/reps;
- recovery/check-ins;
- challenge/progress surfaces already authoritative.
Keep it bounded, current-user-only, and privacy-minimized.

### Phase D — Historical camera/form findings
1. Locate canonical workout form-analysis result owner.
2. Persist bounded deterministic findings tied to authenticated workout/session/exercise.
3. Store finding ID/severity/count or qualified-rep evidence, not raw camera footage.
4. Add recent form finding summary to coach context.
5. Mufasa may reference a historical form issue only when this authoritative summary says it occurred.

### Phase E — Run history context
1. Identify canonical run/GPS session persistence.
2. If it exists, expose last run + bounded recent-run summary.
3. If it does not exist, create run persistence as its own product workstream first.
4. Never infer a run from generic activity distance.

### Phase F — Next-badge projection
1. Add deterministic gamification progress projection for currently eligible/nearest badge goals.
2. Keep award authority in gamification engine.
3. Coach receives explanatory projection only.
4. Mufasa can say “you are X away from Y” only when server projection supplies it.

### Phase G — Mufasa acceptance harness
For a seeded/authenticated member, independently verify these questions against canonical stored facts:
- “Mufasa, what did I do in my last workout?”
- “How many reps did I do?”
- “What should I focus on today?”
- “What did you notice about my form last time?”
- “What was my last run?”
- “What level am I?”
- “What badge am I closest to?”
- “What is my next workout?”
- “How am I doing toward my goal?”
- “What do you know about my recovery/check-in?”

Also verify voice lifecycle:
- Voice enabled → Hey Mufasa responds.
- Calibration begins → Mufasa recognition/output yields exclusive ownership.
- Rest/base capture completes → Mufasa resumes once.
- Explicit user mute → Mufasa does not resume.
- Provider unavailable → truthful recorded-facts fallback, no invented member history.

## Acceptance definition
Mufasa is considered converged when:
1. every member-facing coach surface uses one authenticated server-side coach/context authority;
2. Mufasa cannot read another member’s context;
3. current profile/journey/workout/program/progress/recovery facts are authoritative and bounded;
4. historical form/run/badge claims are made only when their canonical services provide them;
5. wake-word activation survives calibration correctly without violating explicit mute;
6. no browser surface directly owns a competing Mufasa memory/brain;
7. diagnostics identify the first failure across auth → context → coach → TTS → recognition.

## Explicit non-goals
- Do not give Mufasa raw camera recordings as long-term memory.
- Do not let the LLM award XP/badges or calculate eligibility independently.
- Do not create a second profile, workout history, run history, or form-history database.
- Do not auto-start microphone capture without the required user/browser activation semantics.
