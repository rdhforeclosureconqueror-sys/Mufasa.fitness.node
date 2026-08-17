# Phase 0 — Pocket PT Architecture Audit

## 1. Executive answer

Pocket PT already has a server-authenticated member identity, JSON-backed member aggregate, deterministic general program engine, session/result tracking, exercise catalog/intelligence layer, OHSA capture, AI coach boundary, gamification event system, trainer authorization, and member-facing program routes. These provide useful infrastructure but **do not constitute a youth fitness engine**.

The minimum safe design is additive: place a dedicated constrained domain at `src/youth-fitness/`, key it through the authenticated Pocket PT subject using server-issued opaque participant references, adapt shared exercise/scheduling/event infrastructure, and keep its rules, approvals, states, safety validator, and repositories independent from current adult/general templates. No Youth Fitness Brain production code was added in Phase 0.

## 2. Repository/runtime map

| Concern | Current location | Finding | Youth disposition |
| --- | --- | --- | --- |
| Runtime/API composition | `server.js` | Large Express composition root; authenticated `/api/me/*`, trainer/admin, program, session, exercise, AI, and command routes are assembled directly. | Add thin youth routes later and delegate immediately to a youth application service; avoid adding policy logic to `server.js`. |
| Authentication | `src/middleware/auth.js`, `src/lib/authToken.js` | Bearer token verification resolves canonical `req.auth.userId` from JWT `sub`; guards and permission checks exist. | Reuse. Resolve opaque participant refs server-side and enforce subject/guardian/trainer scopes. Never accept a browser ownership ID as canonical. |
| Authorization | `src/lib/authorization.js`, trainer guards in `server.js` | Role/permission resolver and trainer-client assignment checks exist. | Reuse mechanics, but add explicit youth profile/program/read and coach-review permissions plus guardian policy. |
| Member persistence | `src/repositories/userStore.js` | Atomic per-user JSON files store a flexible aggregate. No relational ORM/schema migration system exists; `migrations/` currently contains trail JSON only. | Use repository interfaces in early phases; do not create a duplicate participant master. Durable normalized production storage is a prerequisite to launch. |
| Profile/intake | `src/services/userDataService.js`, journey intake services/validators | General profile includes age, goals, injuries and notes; intake/baseline data exists but is not a canonical youth fitness profile or controlled goal/level model. | Adapt reads through a Fitness Profile Resolver; store youth-specific versioned state separately from generic profile fields. |
| General program engine | `src/program-engine/*`, `docs/programs/*` | Deterministic program aggregate, mesocycles/microcycles, schedule, persistence, analytics, substitution, and assignment APIs exist. | Reuse deterministic/versioning and schedule ideas through adapters. Do not reuse current policy/templates as youth-safe. |
| Program policy mismatch | `src/program-engine/programTemplates.js`, `progressionEngine.js`, `programValidator.js` | Includes fat loss/muscle gain, intermediate/advanced, barbells/back squats/bench press and up to six training days; progression can change sets, reps, intensity, and tempo. | Hard incompatibility. Youth code needs Foundation-first goals/levels, 2–3 sessions in V1, approved registries, two qualifying successes, and one-major-variable progression. |
| Workout generation | `src/services/generatedWorkoutService.js`, `src/workouts/*`, `public/fitness.js` | General generated workout and browser-local “today workout” paths coexist with authoritative programs. | Must not be youth authority. Youth sessions must have program/phase/week identity and pass final safety validation. |
| Sessions/results | `src/services/sessionService.js`, authenticated session routes | Captures starts, rep updates, completion, form/reps, and emits workout-completed facts. | Reuse transport/event patterns after adding readiness, valid-quality work, stop/pain, activity result, session state, and adaptation contracts. |
| Exercises | `src/exercise-intelligence/*`, `public/exercise-db`, generated profiles | Canonical IDs, metadata schema, search, relationships/progressions/substitutions, curation, and approval-like admin workflow exist. | Best reuse candidate. Add a youth eligibility/approval projection with movement family, level, impact, instructions, stop rules, dose guidance, evidence tag, and admin approval. Existing catalog membership alone is insufficient. |
| Games | No dedicated registry found | Gamification/challenges exist, but no approved developmental movement-game registry. | Add first-class youth game registry in Phase 2; do not model games as arbitrary workout text. |
| Assessment | OHSA command/API and `public/assessment-runtime.js`; goals baseline in user data | Camera-derived OHSA summaries and generic baseline storage exist. Current output includes inferred “findings”; no standardized youth performance protocol/version model exists. | Reuse capture/storage plumbing only after policy review. Store observations, GREEN/YELLOW/RED and training categories; prohibit anatomical diagnosis and global score. |
| Readiness | No participant training-readiness model found | “Readiness” occurrences primarily describe operational launch/gamification readiness, not energy/soreness/sleep/pain. | New Phase 3/5 readiness model and adjuster required. Pain handling must fail safe and flag an adult without diagnosis. |
| Training memory/adaptation | General workout history and adaptation/progression services | Some recent performance/progression exists, but not canonical youth stress tags or qualifying-success logic. | Add youth stress memory and adaptation events; adapter may consume verified session facts. |
| AI | `src/ai/*`, `src/services/aiCoachService.js`, external Ma’at calls in fitness domain | Coach has safety/prompt/provider infrastructure, while legacy domain can call external program generation. | AI may explain approved decisions, never invent youth activities or bypass deterministic constraints/validator. External responses are untrusted inputs. |
| Gamification | `src/gamification/*`, leaderboards, notifications | Event capture, immutable-ish ledger/projections, achievements, streaks, XP, operations and privacy docs exist. | Event infrastructure is reusable later. Youth rewards require minor privacy, exclusion-aware consistency, no public comparison by default, and anti-overexercise policy. |
| Trainer/admin | Trainer workspace and exercise curation routes/services | Trainer-client assignment and content roles exist. | Reuse guard patterns for coach review/admin approval, without exposing private data to Leader Within. |
| Leader Within | No application integration or contract found | Repository search found only unrelated “cohort” documentation; no Movement Mission, leadership, or completion bridge implementation. | Treat as external bounded context. Implement only opaque assignment + idempotent minimal completion event in Phase 11. |
| Youth/minor policy | No complete youth domain found | Age is a generic optional profile value; existing gamification docs note minors need dedicated policy. | Must define supported age check, cleared-population scope, consent/guardian/privacy/retention and escalation before production enrollment. |

## 3. Current program API and data flow

The authoritative general path is:

1. JWT middleware derives `req.auth.userId`.
2. An authenticated program assignment route calls `programService.assign(userId, input)`.
3. `programGenerator` validates generic inputs, chooses a goal template and exercises, constructs periodization/progression and schedules weeks.
4. `programPersistence` embeds one `programAssignment` in the member JSON record.
5. Program read routes derive today/next/calendar/analytics projections.
6. Session completion and program events feed existing gamification adapters.
7. AI Coach receives program context for explanation/coaching but is not meant to be the planning authority.

This is structurally program-first and useful, but it lacks the youth intake, approval registry, evidence provenance, developmental weekly objectives, readiness, stress memory, hard prohibited list, safety veto, assessment protocol identity, and longitudinal adaptation states required by the handoff.

## 4. Identity map and risks

### Canonical map

```text
verified token subject (req.auth.userId)
  -> Pocket PT member JSON aggregate (current canonical account record)
  -> server-side participant reference resolver (to add in Phase 3)
  -> youth_fitness_profile / program / result repositories
```

The external-facing participant reference should be random/opaque and mapped server-side. API handlers should authorize against `req.auth.userId` (or an explicit guardian/trainer assignment) before resolving or returning youth data.

### Risks

1. **Duplicate identity:** legacy fitness domain code directly constructs file paths from user IDs, while the repository store is the safer shared path. Youth work must use repositories only.
2. **Flexible aggregate drift:** JSON user records have no enforced schema or migration version for youth longitudinal data.
3. **Minor privacy/consent gap:** no complete guardian consent, parental access, age assurance, retention, deletion, or escalation policy was found.
4. **Client authority:** generic browser/runtime paths can generate or submit workout/profile data. They cannot choose youth ownership, approval, progression, or completion validity.
5. **External identity/API trust:** external Ma’at calls and auth bridge functionality must not create an alternate participant or planning authority.

## 5. Reusable components

### Reuse directly

- JWT authentication, request context, API error envelopes, rate limiting, and permission-guard patterns.
- Atomic repository write pattern for development/test fixtures.
- Program deterministic ID/version concepts and date/schedule utilities.
- Session lifecycle/event transport after youth-specific validation.
- Exercise canonical IDs, content versions, relationship concepts, curation audit pattern, and member-safe projections.
- Gamification event idempotency/projection patterns (not current youth reward policy).
- Diagnostics, audit logging, and test conventions using Node's built-in test runner.

### Reuse behind a youth adapter

- Generic member profile/intake data.
- General program persistence/read projection.
- Exercise catalog and media.
- Workout completion facts.
- OHSA capture plumbing.
- Trainer-client assignment authorization.
- AI Coach explanation provider.

### Do not reuse as youth policy

- Generic program goals/difficulties/templates and current progression dosing.
- Browser-local workout generation.
- Any free-form/external AI-selected exercise list.
- Existing streak formula as youth consistency.
- OHSA anatomical/injury inference.
- Public leaderboard defaults or adult challenge rewards.

## 6. Missing capability list

1. Canonical youth master specification in the repository.
2. Evidence/rule registry with sources, claim boundaries, dates, versions, links, overrides, and review status.
3. Youth-approved exercise projection and first-class game registry.
4. Fitness Profile Resolver with age presentation band, controlled goals, Foundation level, equipment, assessment categories, readiness, memory, and consistency.
5. Youth Program Planner producing phases, objectives, weeks, scheduled session objectives, education, consistency, and reassessment points before activities.
6. Week and Session Planners that operate only within that roadmap.
7. Participant readiness adjuster and pain/adult escalation workflow.
8. Recent stress tags/memory resolver.
9. One-variable progression/regression and adaptation event engine.
10. Fail-closed final safety validator and prohibited-prescription rules.
11. Separate performance, movement, consistency, and engagement assessment models.
12. Exclusion-aware consistency denominator.
13. Youth program state/read projection and Pocket PT journey UI.
14. Minimal idempotent Leader Within completion bridge.
15. Durable production persistence/migrations, retention, backup and rollback plan.

## 7. Schema conflicts to resolve before implementation

| Existing concept | Conflict | Resolution direction |
| --- | --- | --- |
| `user.profile.age` | Optional generic age, no supported-range/consent semantics | Youth profile stores validated age/band and clearance/consent state while referencing canonical member. |
| `experienceLevel` = beginner/intermediate/advanced | Not the canonical `FOUNDATION/DEVELOPMENT/PROGRESSION` competency model | Add youth enum and resolver; V1 emits Foundation only unless future scope approves more. |
| Generic goal strings | Includes fat loss/muscle gain and lacks full youth goal set | Controlled youth goal enum; goals change emphasis without removing balance. |
| `program.phase` plus mesocycle phase | Generic phase labels and no phase/weekly objectives | Youth program aggregate owns explicit versioned phase and week entities/object values. |
| Seven scheduled entries/week | Rest/recovery entries are sessions but consistency semantics are generic | Youth schedules distinguish required eligible sessions, optional activities, and excluded/cancelled sessions. |
| Exercise `id`/`exerciseId` and catalog approval | Multiple identifier shapes; catalog presence is not youth approval | Normalize canonical `exercise_id`; youth registry projection records eligibility and approval version. |
| Completion percentage/form score | Cannot prove quality reps, pain absence, or two qualifying successes | Add activity results with prescribed/attempted/valid work, technique state, effort, pain, stop reason and qualification outcome. |
| OHSA `findings` | May imply limitation/diagnosis and lacks protocol/version categories | Store observations and protocol version; resolve only approved training categories. |
| Streak/weekly target | Counts completed workouts against a fixed target without eligible exclusions | Youth consistency uses eligible completed / eligible scheduled and neutral language. |
| Single embedded assignment | Insufficient history for cycles/adaptations/evidence replay | Repository supports versioned programs, phases, weeks, sessions, results and immutable adaptation history. |

## 8. Recommended minimum additive architecture

```text
src/youth-fitness/
  index.js
  domain/                 # enums, states, aggregate/value contracts
  profiles/               # participant-reference + fitness profile resolver
  evidence/               # rules, sources, links, overrides, provenance
  activities/             # approved exercise adapter + game registry
  planning/               # program, week, session planners
  readiness/              # readiness validation and conservative adjustment
  memory/                 # recent stress projection
  adaptation/             # maintain/progress/regress/modify/review
  safety/                 # prohibited rules + final fail-closed validator
  assessments/            # protocol identity and non-diagnostic observations
  consistency/            # eligibility/exclusion calculation
  progress/               # member-safe journey projection
  repositories/           # interfaces and development/production adapters
  integration/            # Pocket PT ports; later Leader Within bridge
```

Later API placement should follow subject-scoped conventions, for example `/api/me/youth-fitness/program`, `/readiness`, and `/sessions/:sessionRef/results`. External/Leader Within endpoints should use a separate authenticated integration namespace and opaque assignment references. Names are recommendations, not Phase 0 API commitments.

## 9. Proposed aggregate boundaries

- **YouthFitnessProfile:** participant ref, supported age/band, controlled goals, experience/level, schedule/equipment, assessment and movement categories, current readiness pointers.
- **YouthFitnessProgram:** immutable/versioned roadmap definition and mutable lifecycle state; contains phases/weeks/session objectives, assessment schedule, consistency target, education sequence, progression philosophy.
- **PlannedSession:** program/phase/week identity and objective; final activity prescription records exact registry/evidence versions used.
- **SessionResult:** readiness snapshot, activity outcomes, pain/stop flags, valid quality work, completion state.
- **AdaptationEvent:** immutable decision, inputs/rule versions, prior/new state and actor.
- **Evidence/Activity registries:** independently versioned administrative reference data, never embedded as unrestricted text authority.

## 10. Phase 1 entry conditions and recommendation

Phase 0 exit questions are answered:

- **What exists?** Authenticated member identity, generic profile/intake, deterministic general program/schedule, session tracking, exercise intelligence, assessment capture, AI coach, trainer/admin guards and gamification infrastructure.
- **What can be reused?** Infrastructure and patterns listed in section 5, mostly through adapters.
- **What must be added?** The constrained youth domain capabilities in section 6.
- **What must not be duplicated?** Participant identity, low-level auth/session transport, exercise media/catalog identity, and event/diagnostics infrastructure.
- **Where does the engine live?** `src/youth-fitness/`, exposed through thin Pocket PT routes and isolated integration ports.

**Recommendation: GO to Phase 1 after review.** Phase 1 should check in the full canonical handoff and implement only evidence/rule architecture and tests. It must not generate youth programs yet.

