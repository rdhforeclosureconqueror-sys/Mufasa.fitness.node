# 8-Week Kettlebell Challenge: architecture audit and integration plan

**Status:** review deliverable only; no broad implementation is included in this change.  
**Authoritative programming source:** `exercise-generation/kettlebellchallenge/kettlebellchallengebreakdown`.

## Executive decision

The repository already has the major runtime components needed for this challenge. The safest design is to extend the reusable challenge definition and resolve a selected challenge session on the server into the existing live-workout plan contract. The browser should receive a resolved session, store it through the existing active-workout selection boundary, and launch `workout.html`. It must not receive or trust a prescription assembled from query parameters.

The existing algorithmic kettlebell seed in `data/challenges/seeds.js` is **not suitable as canonical programming**. It rotates exercises by arithmetic, applies generic targets by week and exercise order, and repeats the swing in every workout. It conflicts with the supplied human-readable source and should be replaced for this challenge by an explicit, versioned definition—not modified into another algorithm.

### Behavioral architecture addendum

The challenge's primary loop is **Commit → Train → Recover → Return → Measure**. Programming owns the weekly training goal; enrollment owns realistic availability. A participant chooses one to four unique preferred weekdays, and the schedule makes every other day visible as non-mandatory recovery. Adherence is measured against promised workouts per challenge week, not consecutive calendar training days.

The commitment model must preserve both `originalPlannedDate` and `actualCompletionDate`. A passed planned date can become `makeup_available` within the same challenge week, a safe reschedule can become `rescheduled`, and a recovered completion becomes `comeback_completed`. Planned recovery never breaks `commitmentStreak`. Commitment, comeback and performance remain separate projections and reward meanings.

The repository's program scheduling layer is the reuse boundary: the initial commitment scheduler belongs under `src/program-engine/` alongside the existing availability scheduler. It does not allocate final A/B/C/D workouts; that remains blocked on an approved programming addendum for each one-to-four-day commitment level.

## 1. Relevant repository map

| Concern | Existing authority / entry points | Role in the integration |
| --- | --- | --- |
| Challenge definitions | `data/challenges/seeds.js` | Published challenge catalogue; currently includes the non-authoritative algorithmic kettlebell seed. |
| Challenge state/service | `src/services/challengeEngineService.js` | Join, active projection, activity logs, day completion, adherence, challenge streak, challenge XP and PRs. |
| Challenge HTTP/UI | `server.js`, `public/challenges.html`, `public/challenges.js`, `public/challenge.html`, `public/challenge-page.js`, `public/challenges.css` | Catalogue/detail routes and the current check-in-oriented challenge experience. |
| Challenge persistence contract | `migrations/004-reusable-challenge-engine-v1.json`, runtime file `data/challenges/runtime-v1.json` | Keeps definitions separate from user-owned runtime progress. |
| Live workout shell | `public/workout.html`, `public/workout-runtime.js`, `public/runtime-orchestrator.js` | Camera/workout lifecycle and integration boundary. |
| Workout progression | `public/workout-progression-runtime.js` | Active plan normalization, set/exercise state, work/rest timers, rep totals and completion handoff. |
| Workout persistence | `public/session-write.js`, `src/services/sessionService.js`, session routes in `server.js` | Canonical session creation/update/completion and workout history writes. |
| Generated-session precedent | `src/services/generatedWorkoutService.js`, `public/generated-workout-runtime.js` | Strong precedent for server-resolved `sessionId`, executions and persisted exercise progress. |
| Program selection | `src/services/memberProgramState.js`, `src/workouts/workoutPlanBuilder.js`, `src/program-engine/*` | Existing program precedence and normalized prescriptions. |
| Exercise source | `data/exercise.json`, generated `public/exercise-db/index.json`, records in `public/exercise-db/` | Large source catalogue and browser-delivered index. |
| Canonical exercise intelligence | `src/exercise-intelligence/exerciseCatalog.js`, `exerciseSchema.js`, `exerciseClassification.js`, `exerciseMedia.js`, `public/exercise-metadata.js` | Canonical IDs, aliases/classification, metadata, media and explicit capability declarations. |
| Pose acquisition | `public/pose-runtime.js` | One MoveNet detector/loop; emits normalized `pose-runtime:frame` events. |
| Pose overlay | workout inline integration plus `public/avatar-runtime.js` | Existing live-camera/landmark visualization. |
| Ordered checkpoints | `public/generic-exercise-sequence-engine.js`, `public/exercise-sequence-definitions.js` | Declarative measurements, ordered phases, persistence and repetition completion. |
| Sequence UI/controller | `public/guided-exercise-sequence.js`, `public/challenge-controller.js` | Preview sequencing and live expected-phase handoff. |
| Form analysis | `public/form-engine.js`, `public/workout-form-runtime.js`, `public/exercise-metadata.js` | Separate family-level live form status and approved, post-set exercise rules. |
| Voice | `public/coach-runtime.js`, `public/workout-coach-runtime.js` | Existing speech adapter, queue, preferences, countdowns, cadence and set cues. |
| Retention/history | `src/services/userDataService.js`, `src/services/trainingAdaptationService.js`, `program_calendar.js`, history routes in `server.js` | Workout summaries, streaks, retention projections, history and calendar surfaces. |
| Gamification | `src/gamification/*`, `src/repositories/gamification*`, `public/gamification.js` | Event-to-award/ledger/projection pipeline; workout completion adapter is shared by sessions and challenges. |
| Source images | `exercise-generation/kettlebellchallenge/{gobletsquat,kettelbellhalo,bentoverrow,suitcasecarry}.jpg` | Four POC assets; the physical `kettelbellhalo.jpg` spelling must remain stable. |

## 2. Existing challenge architecture

The reusable challenge engine is definition-driven. A definition contains phases, day records and day activities. `challengeEngineService` reads those definitions and stores only user participation, day logs, activity logs and personal records. It calculates required-day completion, adherence, streaks and XP, and forwards completed challenge workouts into the same gamification workout-completion adapter used by ordinary sessions.

Public routes already provide catalogue, detail, join, active challenge, activity update, day completion and participation-status mutation. The challenge detail page already renders week, phase, completion, challenge streak and XP, but activities are check-in rows with manual numeric inputs. It does not resolve or launch a live session.

There is a separate legacy/specialized push-up challenge service and camera page. It is useful evidence for the camera controller and sequence engine, but it must **not** become the kettlebell framework. The reusable challenge engine is the correct ownership boundary.

## 3. Existing workout architecture

The live runtime has an existing handoff contract based on `ACTIVE_WORKOUT_SELECTION_V1`. `workout-progression-runtime.js` hydrates and normalizes that selection, owns the active exercise/set indices, starts the canonical server session, controls timed intervals and transitions, records rep totals, and completes the session through `SessionWrite`.

The server `sessionService` is the canonical persistence path for a normal live session and invokes the shared workout-completion/gamification adapter. The generated-workout subsystem demonstrates the preferred server-authoritative pattern: the client sends a session ID, the service resolves it from persisted plan data, creates an execution, and rejects unknown exercises or sessions.

Recommended kettlebell handoff:

1. Challenge page sends `challengeId` (or slug), `weekNumber`, and stable `sessionId`.
2. A challenge-session resolver validates membership/current access and resolves that exact session from the versioned definition.
3. The server returns the existing normalized live-workout selection shape plus immutable provenance (`challengeId`, definition version, week and session ID).
4. The client writes the returned selection using the existing selection boundary and opens `/workout.html`.
5. Existing runtime creates/completes the normal session.
6. Completion is correlated back to the challenge day/session idempotently; the same completion event must not award gamification twice.

## 4. Exercise DB architecture

There are three related layers rather than one monolithic table:

* `data/exercise.json` is the large source dataset; `public/exercise-db/index.json` and individual JSON records are generated delivery artifacts.
* `src/exercise-intelligence/exerciseCatalog.js` canonicalizes source rows into an explicit schema with `exerciseId`, aliases, classification, coaching, requirements, relationships and movement compatibility.
* `public/exercise-metadata.js` is the browser runtime registry for instruction/form/voice capabilities. `exerciseMedia.js` currently resolves images only from filenames in the exercise DB rows.

Only **Goblet Squat** is an exact existing DB match among the four POC exercises. The DB contains specialized bent-over-row variants, but not the challenge's generic unilateral kettlebell row. No exact Kettlebell Halo or Suitcase Carry record was found. The workout catalogue also already owns `goblet_squat`; IDs with an `exercise_` prefix in the current challenge seed are challenge-local duplicates and should not be retained as canonical exercise identities.

## 5. Camera / pose architecture

`public/pose-runtime.js` is the sole detector owner. It loads TensorFlow, selects WebGL with CPU fallback, creates MoveNet SinglePose Lightning, runs one request-animation-frame inference loop, normalizes pose packets and emits `pose-runtime:frame`. It also supports optional face and hand trackers, but these are not required for the POC.

Consumers subscribe to pose-frame events. This is the correct integration seam for both ordered checkpoint matching and existing form analysis. Kettlebell work should add definitions/landmark adaptation—not another detector, loop, camera controller or TensorFlow bootstrap.

## 6. Ordered checkpoint architecture

`generic-exercise-sequence-engine.js` is already a reusable, declarative ordered-state engine. Definitions declare:

* required landmarks and confidence;
* measurements (joint angles, relative positions, alignment, direction, velocity, confidence and duration);
* ordered phases and transition conditions;
* frame/time persistence;
* the completion phase; and
* a smaller visual template independent of the full detection path.

The engine advances only through each phase's declared `nextPhase`, records decision evidence, and increments a repetition only at `completesRepetition`. Tracking loss returns an unscorable result rather than advancing. That directly supports strength, ballistic and composite state vocabularies. Carry support needs a definition-model extension because validation currently requires a repetition-completion phase; extend this engine to permit a timed completion outcome rather than creating a carry engine.

Production support is currently narrow: `push_up` is the implemented sequence and the squat is explicitly a fixture, not production. None of the four kettlebell POC movements currently has production checkpoint support.

## 7. Current rep-counting architecture

There are two connected concepts:

* The sequence engine owns **detected repetition completion** for camera-capable exercises and produces evidence-bearing `repetition_completed` events.
* The workout progression runtime owns the session's rep totals, target comparisons, set completion and persisted completion payload.

The kettlebell integration should adapt a sequence repetition event into the progression runtime's existing rep-update operation. It should not add an independent counter. For timed carry/Week 1 intervals, the timer is completion authority while checkpoints establish setup/posture validity; the app must not fabricate reps.

## 8. Form-analysis architecture

Checkpoint matching and form grading are already technically separate:

* The generic sequence engine returns `formFindings: []` and `formScore: null`; reaching a phase is evidence of ordered movement only.
* `workout-form-runtime.js` samples pose packets during a set, resolves an exercise metadata profile, and only analyzes profiles whose pose rules are supported **and approved**. Unsupported exercises return `unsupported_exercise`; poor data returns an explicit insufficient/camera/pose status.
* `form-engine.js` also maps broad movement families to live body-region states and colors. It must not be treated as exercise-specific validation.

Therefore POC copy should say “Checkpoint reached,” “Rep detected,” or “Movement completed.” “Perfect form” is prohibited until approved exercise-specific rules exist. Normal transitions should be gold/neutral; red is reserved for a supported rule violation, invalid sequence, meaningful tracking warning or detection loss.

## 9. Timer / tempo infrastructure

`workout-progression-runtime.js` already owns preparation, work, extension, pause/resume, rest/transition and set timers, including persisted timed state. It handles `targetTime` separately from rep targets. `workout-coach-runtime.js` parses tempo and schedules cadence/countdown cues on its existing timer/queue.

The existing workout normalization defaults to a three-part `3-1-3` tempo. The challenge source uses four-part strength tempos, special bottom-start ordering for floor press, a five-part push-press notation, and semantic ballistic stages. The model must preserve the source string **and** a structured semantic tempo object; it must not flatten all prescriptions into the current default. Timer ownership remains unchanged.

## 10. Voice / guided-coach infrastructure

`coach-runtime.js` provides the speech mechanism and mute/cancel behavior. `workout-coach-runtime.js` owns workout voice preferences, serialized speech, cancellation generations, set instruction, countdowns, cadence, final countdown and completion phrases. `guided-exercise-sequence.js` already lets an educational preview follow the live sequence's expected phase.

Future tempo synchronization should publish checkpoint/timer events to `workout-coach-runtime.js`. New phrases and scheduling rules are acceptable; a new speech queue or Web Speech wrapper is not.

## 11. Progress, persistence and gamification architecture

* Challenge-owned progress is persisted in the reusable challenge runtime store and projected as current week/day, completion, adherence, streak, XP and PRs.
* Workout-owned history is persisted by the session service/user store and surfaced through history, retention and adaptation services.
* Active program precedence is centralized in `memberProgramState.js`; a challenge should be a workout source/provenance, not silently replace a trainer/member program.
* Calendar/program scheduling already exists and should receive challenge sessions through an adapter only after the core handoff is proven.
* Gamification is event-driven with idempotent stores, policies, awards, ledger and projections. Both challenge completion and session completion currently can call the workout adapter, so correlation/idempotency is a critical integration requirement.

The live session should remain the workout-history authority. Challenge completion should consume/correlate that result and update challenge progress rather than persist a second independent workout.

## 12. Exercise-ID reconciliation approach

Reconciliation must be committed as reviewable data, not hidden in fuzzy runtime matching:

1. Normalize punctuation/case only to discover candidates.
2. Compare equipment, laterality, movement pattern and technique—not name alone.
3. Reuse an exact canonical ID when semantics match.
4. Add source names as aliases to that canonical record.
5. Create a new canonical record only when no semantically correct exercise exists.
6. Explicitly declare sequence and form capabilities; absence means unsupported, never inferred.

### Initial four-exercise reconciliation

| Source challenge name | Proposed canonical ID | Existing DB name | Status | Aliases to document | Type | Checkpoints | Form analysis |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Goblet Squat | `goblet_squat` | Goblet Squat | Reuse | `Kettlebell Goblet Squat`, `KB Goblet Squat` | rep-based bilateral strength | No production definition; squat fixture is not reusable as approval | Unsupported until approved rules exist |
| Bent-Over Row | `kettlebell_bent_over_row` | No exact semantic record; specialized row variants exist | New canonical record after review | `Bent-Over Row`, `Kettlebell Bent-Over Row`, `KB Row` | unilateral rep-based strength | Unsupported | Unsupported |
| Suitcase Carry | `suitcase_carry` | No exact record found | New canonical record after review | `Kettlebell Suitcase Carry`, `KB Suitcase Carry` | unilateral timed carry | Unsupported; needs timed sequence completion | Unsupported |
| Kettlebell Halo | `kettlebell_halo` | No exact record found | New canonical record after review | `Halo`, `KB Halo` | cyclical / multi-stage | Unsupported | Unsupported |

The remaining 12 exercises require the same manual review before implementation. In particular, generic names such as Overhead Press, Push Press and High Pull must not be merged with barbell/machine variants solely by normalized text.

## 13. Challenge machine-data recommendation

Extend the existing definition framework with one explicit file such as `data/challenges/kettlebell-strength-power.v1.js` (or JSON if repository validation is added), imported by `data/challenges/seeds.js`. Suggested hierarchy:

```text
challenge
  id, slug, version, status, title, durationWeeks, sourceDocument
  phases[] { id, weeks, goal, intensity, deload }
  exerciseReferences[] { sourceName, exerciseId, aliases, mode, capability }
  weeks[]
    { weekNumber, phaseId, progressionRules, sessions[] }
      session { sessionId, dayLabel, rounds, assessment, exercises[] }
        prescription {
          exerciseId, order, mode, sets, rounds, reps,
          workSeconds, restSeconds, perSide, directionBehavior,
          tempo { notation, stages[] }, progression, modifications
        }
  educationByExerciseId
    { classification, muscles, equipment, stages[], cues[], mistakes[],
      breathing, modifications[], proTip, progressionCue }
  mediaByExerciseId { educationImage, stageReferences[] }
```

Do not duplicate generic exercise facts in every session. Session prescriptions reference canonical exercise IDs; challenge-specific education/progression may overlay the canonical exercise profile. Preserve modes such as `strength_reps`, `unilateral_reps`, `timed`, `timed_carry`, `cyclical`, `ballistic`, `composite` and `assessment` as data, not UI guesses.

Add a server resolver that returns only a selected session in the existing workout-plan shape. Include `definitionVersion` in participation/execution provenance so a published-program update does not reinterpret an in-progress user's history.

### Source ambiguities that block a complete canonical session schedule

The supplied source must remain authoritative, so these points require product/programming clarification rather than invention:

1. It names Week 1 “Day A, Day B, Day C” and defines interval/round rules, but never allocates the 16 exercises to specific A/B/C sessions in any week.
2. It gives exercise-specific prescriptions for Week 1, Weeks 2–3 and selected power exercises, plus general weekly rules, but does not specify exact exercise selections for Weeks 4–8.
3. “2 rounds during the first half of the week” and “by the end of Week 1: 3 rounds” does not explicitly say whether Day A/B are two rounds and Day C is three.
4. The general Week 2 rule says `3 × 8`, while several exercise sections say `3–4 × 8–10`; the general Week 3 rule also says `3–4 × 8–10`. The precedence for each session is unstated.
5. The source calls Farmer Carry a two-kettlebell movement, while the current catalogue seed advertises one kettlebell. The seed is not authoritative, but equipment requirements must be reconciled before the challenge can truthfully promise one-kettlebell participation.
6. The four-number tempo language is defined as eccentric → bottom pause → concentric → top reset, while Floor Press explicitly presents `1–1–3–1` in movement order (press → top pause → lower → bottom pause). Structured tempo must encode semantic stages to avoid misinterpretation.
7. Week 8 lists assessment dimensions but no test protocol, thresholds, scoring, exercise selection or baseline procedure, despite the current seed declaring baseline and final assessments.

Until these are resolved, Phase 1 can safely model metadata, exercises, education, progression ranges and the four-image pipeline, but it cannot claim an authoritative full session-by-session workout schedule.

## 14. Four-image media strategy

Copy the four approved files into a server-served challenge media directory while retaining stable source provenance and the misspelled Halo filename. Map them explicitly by canonical exercise ID; do not infer filenames from display names and do not rename `kettelbellhalo.jpg`.

For the POC, each exercise gets one educational reference image. The structured stage list supplies professional text and accessibility. Since the JPGs are not verified stage-separated assets, use the same image as a static reference rather than pretending it changes pose. `stageReferences` can remain empty until reviewed stage-specific assets exist. Live UI should fall back to text/phase highlighting while showing the single reference image.

## 15. Missing integration pieces

* Explicit, source-derived session schedule (blocked on the ambiguities above).
* Versioned challenge definition schema/validator and an explicit kettlebell definition.
* Complete 16-exercise reconciliation; canonical records for missing exercises.
* Challenge education/media projection endpoint or safe inclusion in challenge detail.
* Challenge-session resolver and authorized start endpoint.
* Adapter from resolved challenge session to `ACTIVE_WORKOUT_SELECTION_V1`.
* Completion correlation between workout session and challenge day/activity, with one idempotency key.
* Card/detail challenge UI replacing numeric check-in fields for this workout-capable challenge.
* Production sequence definitions and landmark adapters for kettlebell exercises.
* Timed-completion support in the generic sequence engine for carries.
* Neutral transition/checkpoint status presentation.
* Structured four-/five-part and semantic tempo support in workout normalization/coach cadence.
* Stage-reference panel in the live workout.
* Calendar and active-program coexistence policy.

## 16. Technical risks

| Risk | Mitigation |
| --- | --- |
| Algorithmic seed silently changes the authored program | Remove kettlebell schedule generation; use explicit versioned sessions after clarification. |
| Duplicate exercise identities across challenge, workout and Exercise DB | Store only canonical IDs in prescriptions and maintain an explicit reconciliation/alias table. |
| Client tampering with reps/tempo/session contents | Resolve `challengeId + week + sessionId` server-side; never accept a full prescription from URL/client. |
| Double XP/history from challenge and session completion | One correlation/idempotency key; session is history authority and challenge consumes completion. |
| In-progress definitions changing under a user | Persist definition version with participation and session execution. |
| False “perfect form” claims | Capability-gate approved form rules separately from checkpoints. |
| Red flashing during correct transitions | Neutral/gold transition state; red only for explicit supported failure/warning states. |
| MoveNet cannot see kettlebell/load or depth reliably from one view | Restrict early checkpoints to observable body states, require confidence/persistence, label unsupported checks, and validate on-device before production. |
| Unilateral side ambiguity | Model `perSide` and side completion explicitly; require side selection/calibration where detection supports it. |
| Carry doesn't fit repetition validation | Extend the generic sequence result type for timed completion; keep workout timer authoritative. |
| Tempo notation interpreted incorrectly | Store semantic stage names/durations/explosive markers alongside original notation. |
| Images mistaken for machine-detectable targets | Treat current JPGs as education references only until annotated stage assets are reviewed. |
| Challenge conflicts with trainer-assigned program | Respect centralized program precedence and present challenge as an explicit parallel source, not an overwrite. |

## 17. Recommended implementation phases

0. **Programming clarification:** resolve the seven source ambiguities above, especially exact sessions and assessments.
1. **Canonical data foundation:** add schema/version validation, explicit definition, 16-exercise reconciliation and four-image mappings; leave runtime behavior unchanged.
2. **Roadmap and education POC:** render workout cards and structured details for the four mapped exercises, with accessible static images.
3. **Authoritative handoff:** add server session resolution/start and feed its normalized result into the existing workout runtime.
4. **Completion integration:** correlate normal session completion to challenge progress/history/gamification idempotently.
5. **Live reference POC:** show current exercise reference plus expected stage label in the existing live UI.
6. **Checkpoint POC:** add reviewed definitions to the existing generic sequence engine, starting with the simplest observable movement; add carry timed completion only by extending that engine.
7. **Tempo integration:** extend normalization and existing timer/coach scheduling for structured strength and semantic ballistic tempo.
8. **Voice synchronization:** subscribe the existing workout coach to sequence/timer events and add phrases without a new speech system.
9. **Persistence/calendar hardening:** reconnect/resume tests, version pinning, calendar coexistence, idempotency and retention verification.
10. **Coverage expansion:** only after POC validation, reconcile remaining exercise capabilities and request additional reviewed visual assets.

## 18. Exact files proposed for later change/create

This audit creates only this document. Subject to review and source clarification, the smallest anticipated implementation patch is:

### Create

* `data/challenges/kettlebell-strength-power.v1.js` — explicit authored definition.
* `data/challenges/kettlebell-exercise-reconciliation.v1.json` — auditable IDs, aliases and capability declarations.
* `src/validation/challengeDefinitionValidator.js` — schema/semantic validation for reusable definitions.
* `src/services/challengeSessionService.js` — authorized server-side resolver/normalizer and completion correlation.
* `test/kettlebell-challenge-definition.test.js` — source invariants, modes, prescriptions and media references.
* `test/kettlebell-challenge-session.test.js` — resolver, tamper rejection, versioning and idempotency.
* `public/challenge-media/kettlebell/{gobletsquat,kettelbellhalo,bentoverrow,suitcasecarry}.jpg` — served copies of the four approved assets (names preserved).

### Modify

* `data/challenges/seeds.js` — import the explicit definition and remove only the algorithmic kettlebell generator.
* `src/services/challengeEngineService.js` — version-aware participation/projection and session completion correlation.
* `server.js` — minimal challenge-session resolve/start route wiring.
* `public/challenge-page.js` — roadmap cards, education detail and trusted Start Workout handoff.
* `public/challenges.css` — card/detail styles and status semantics.
* `public/workout-progression-runtime.js` — preserve structured prescription modes/tempo and consume existing sequence rep events.
* `public/workout.html` — reference panel markup only, without another runtime.
* `public/exercise-sequence-definitions.js` — reviewed POC sequence definitions when validated.
* `public/generic-exercise-sequence-engine.js` — minimal timed-completion result extension for carries.
* `public/guided-exercise-sequence.js` — bind the existing preview to kettlebell phase labels/reference fallback.
* `public/workout-coach-runtime.js` — consume structured tempo/checkpoint events using the existing queue.
* `public/exercise-metadata.js` and its generator source if applicable — canonical aliases/education/capability declarations, never unapproved form claims.
* Relevant challenge, workout, sequence, coach and persistence tests alongside the files above.

## 19. Systems that should remain untouched

Unless a narrow defect is discovered during implementation, do not replace or fork:

* `public/pose-runtime.js` detector initialization and inference loop;
* TensorFlow/MoveNet dependency loading;
* camera acquisition and pose overlay ownership in the workout shell;
* `public/form-engine.js` and `public/workout-form-runtime.js` grading pipeline;
* `public/coach-runtime.js` speech adapter/queue ownership;
* `src/services/sessionService.js` as workout-history completion authority;
* gamification repositories, ledger, projection and policy engines;
* program precedence in `src/services/memberProgramState.js`;
* the generated-workout execution framework (use it as a pattern, not a challenge dependency);
* existing push-up challenge behavior and its specialized leaderboard service;
* generated Exercise DB artifacts by hand (change generator/source inputs instead);
* workout templates or unrelated programs; and
* the four original source JPGs, especially the physical `kettelbellhalo.jpg` path.

## Review gate

No large-scale challenge implementation should start until product/programming owners approve the reconciliation policy and provide an authoritative week/session exercise allocation plus Week 8 assessment protocol. After that approval, Phase 1 should land independently and be validated before UI or camera expansion.
