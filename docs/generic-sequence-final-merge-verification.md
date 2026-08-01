# Generic Exercise Sequence Engine — final merge verification

## Verdict

**DO NOT MERGE** the claimed generic refactor. The implementation reviewed is commit `566d617` on branch `work`; the worktree was clean before this report. No `ExerciseSequenceEngine` symbol exists in the checkout or in any reachable Git object. The reachable history contains the Push-Up implementation commits `77beb20` and merge `64eb2b8`, but no generic-engine refactor. Therefore this review does not silently substitute architectural intent for an unavailable implementation.

## Component inventory

| Claimed component | Actual evidence | Result |
|---|---|---|
| `ExerciseSequenceEngine` | No source or reachable object contains the symbol | Missing |
| Sequence-definition schema | No sequence schema; `PUSH_UP_SEQUENCE_DEFINITION` is an inline object | Missing |
| Measurement evaluators | Inline Push-Up angle/alignment helpers and deltas | Push-Up-specific |
| Condition evaluators | Inline branches and comparisons in `PushUpSequenceMatcher.observe` | Push-Up-specific |
| Phase/transition state | Fixed `TOP`, `LOWERING`, `BOTTOM`, `RISING`, `TOP_COMPLETE` branches | Push-Up-specific |
| Repetition events | Fixed completion in `TOP_COMPLETE` | Push-Up-specific |
| Explainability | Static phase-name array, not evaluated condition evidence | Insufficient |
| Fingerprinting | Manually embedded literal | Insufficient |
| Renderer adapter | Three-card `PUSH_UP_SEQUENCE` plus five hard-coded Push-Up live targets | Push-Up-specific |
| Trainer review | General exercise-profile workflow does not ingest sequence definitions | Not integrated |
| Legacy comparison | Frame-coincident booleans in `ExerciseSessionEngine.observe` | Insufficient |

Every exercise-specific reference in the only sequence engine is material: module/class names `PushUpSequenceEngine` and `PushUpSequenceMatcher`; `push_up_standard_v1`; `push_up`; capability `push_up.sequence.phase.v1-proposed`; shoulder/elbow/wrist/hip/ankle landmarks; fixed feature weights; fixed phase IDs; elbow-angle thresholds 145°, 25°, 15°; shoulder travel `.08`; direction deltas `.008`; fixed ordered evidence; and Push-Up-specific template fingerprint. The generic-engine expected result is not met.

## Push-Up configuration boundary

Push-Up behavior is spread across `exercise-generation/sources/push_up.json`, `exercise-generation/rules.json`, generated profile/runtime artifacts, `public/exercise-metadata.js`, `public/push-up-sequence-engine.js`, `public/guided-exercise-sequence.js`, `public/push-up-challenge.js`, and `public/push-up-challenge-page.js`. Coaching/profile metadata is generated, but sequence phases, provisional landmarks, transitions, thresholds, weights, visual behavior, and repetition completion remain executable Push-Up code. Changing those sequence elements requires editing the matcher and/or renderer.

## Squat architecture proof

No Squat fixture was added because there is no generic engine or sequence schema for such a fixture to exercise. Existing Squat/profile/pose tests use other systems and cannot prove that a Squat definition loads into `ExerciseSequenceEngine`. None proves arbitrary phase names/counts, configured Squat landmarks/measurements, ordered generic transitions, a generic repetition event, or a sequence fingerprint. Creating a bespoke second matcher would conceal rather than prove the missing abstraction.

## Declarative measurements and conditions

There is no registry or schema for measurement types. Angle and alignment are local functions; relative position and direction are computed directly in the Push-Up matcher. Consequently there are no generic input/output contracts, unknown-type failures, or evaluator-produced evidence.

There is likewise no declarative condition model for comparison operators, ranges, reference changes, direction, persistence duration, `all`/`any`, optional/required weighted features, or previous-phase requirements. Persistence frame counts are constructor parameters, while all other conditions are JavaScript branches. No validator rejects malformed or unsupported sequence conditions because no sequence validator exists.

## Explainability and fingerprinting

The emitted explanation is the static array `['top','lowering','bottom','rising','top_complete']`. It is not derived from the observed values, operator, target, pass/fail result, or confidence. Similarity contains aggregate feature scores but not the required structured condition evidence. The user-facing layer therefore has no condition evidence contract from which to summarize without invention.

The sequence fingerprint is a literal in source rather than a canonical hash of effective configuration. There is no proof for threshold, phase-order, weight, timestamp, property-order, behavior-version, or Push-Up-versus-Squat sensitivity. Existing generator fingerprint tests cover exercise profiles, not this sequence template.

## Preview and legacy comparison

The preview defaults to exactly three Push-Up steps and maps exactly five fixed Push-Up states. Tests explicitly describe the prototype as limited to Top–Bottom–Top. It does not render arbitrary loaded definitions or phase counts.

Legacy/sequence comparison occurs once per observed frame: simultaneous booleans become `bothCounted`; otherwise the frame becomes `sequenceOnly`, `legacyOnly`, or `neitherCounted`. There are no repetition IDs, matching window, one-to-one correlation, ordering queue, ambiguity classification, duplicate prevention, or interruption policy. Thus a physical repetition whose engines emit on adjacent frames is falsely split rather than correlated.

## Review workflow, Fitness Lego, and safety boundary

The authoritative exercise-profile workflow correctly keeps approval human-controlled, generated artifacts deterministic, trainer decisions separate/preserved, and Push-Up pose analysis in `trainer_review_required`. However, sequence definitions, provisional sequence measurements/thresholds, sequence fingerprints, and activation policy do not appear in its schemas or generated review artifacts. Sequence review integration is therefore **missing**, not established by the validation Markdown file.

Fitness Lego integration is **partially integrated** at the surrounding exercise-profile level only. Machine-readable inputs used by the Push-Up sequence matcher are the frame landmarks; sequence landmarks/phases/conditions are code constants. Exercise sources, coaching prose, capability vocabulary, and review metadata are not inputs to a generic sequence engine.

No official NASM endorsement or clinical claim was found in the sequence implementation. Coaching prose is not automatically converted into matching, and the profile documents single-camera limitations. Those boundaries pass, but they do not cure the genericity failures.

## Automated verification

All available regression checks passed:

- `node --test test/push-up-sequence-engine.test.js` — 13/13.
- `node --test test/guided-exercise-sequence.test.js` — 4/4.
- `node --test test/push-up-challenge-mvp.test.js` — 20/20.
- `node --test test/push-up-tracking-continuity.test.js` — 9/9; expected injected transient-error logs occurred.
- `npm test` — 852/852.
- `npm run lint` — passed.
- `npm run verify:generated-artifacts` — six files deterministic, digest `sha256:335793b5b034fd602f4e0ea4ece50d4bf7ff37da3de7b8a2aa2623867ae0353f`.
- `git diff --check` — passed before commit.

These checks preserve current Push-Up behavior, legacy Personal Best, no-raw-video persistence, single detector/loop protections, camera switching, and tracking continuity. They do not supply the absent generic/Squat/fingerprint/renderer/correlation proofs.

## Manual status and required future files

- Automated current Push-Up regression: passed.
- Synthetic current Push-Up sequence: passed.
- Synthetic generic Squat sequence: unavailable because the generic engine is missing.
- Real-device Push-Up: **NOT TESTED ON REAL DEVICE**.
- Real-device Squat: **NOT TESTED ON REAL DEVICE**.

After a genuine generic engine and schema exist, adding reviewed Squat behavior should require a Squat exercise source, sequence definition, capability/measurement definitions, trainer-review metadata, optional visual-template configuration, fixture/runtime tests, and generated artifacts. `ExerciseSequenceEngine` must not be on that list. In this checkout it would first have to be created/refactored, so the stated claim is presently false.
