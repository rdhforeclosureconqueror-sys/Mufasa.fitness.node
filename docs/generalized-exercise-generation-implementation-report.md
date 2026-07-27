# Generalized Exercise-Profile Generation — Implementation Report

> Copy/paste-ready implementation report for trainer, engineering, translation, and publication review. Nothing in this report represents trainer approval or publication authorization.

## Repository Findings

- `public/exercise-metadata.js` is the current browser/runtime authority for seven modeled exercise profiles. It contains exercise content, pose rules, validation, and workflow state in a single UMD bundle.
- `scripts/export-exercise-metadata-review.js` creates the fingerprinted metadata review export.
- `scripts/generate-exercise-review-workspace.js` creates detached profiles, Markdown reviews, translation sources, Fitness Bot handoffs, manifests, and trainer-decision templates under `exercise-review/`.
- `public/exercise-db/` contains 873 exercise database import records plus generated index and database manifest artifacts. These records are distinct from the seven modeled runtime profiles.
- `data/exercise.json` and the generated exercise index are lookup/import artifacts, not trainer decisions.
- Exercise content was duplicated between the runtime metadata bundle, review export, handoff package, translation source, and review snapshots.
- Generated review artifacts are not authoritative editing surfaces. Existing trainer-decision files are now preserved byte-for-byte when the review workspace is regenerated.
- Before the Push-Up write, the source resolved to exercise ID `push_up`, schema version `1`, profile version `1`, and fingerprint `sha256:370eb528d709d4ed5c141ae6271b04d45116bf1a1d2a9ddc899d7a05642072bb`. The supplied stale-write fingerprint matched.

## Implementation Plan

### Stage A — Implemented

- Inspect repository sources, generators, review artifacts, pose rules, validation, versioning, and database imports.
- Add the normalized Push-Up source.
- Correct Push-Up content in the current runtime source.
- Generate the Push-Up reference profile and review artifacts.
- Add Push-Up acceptance tests.

### Stage B — Initial architecture implemented

- Add deterministic inheritance in this order:
  1. global defaults
  2. equipment defaults
  3. movement-family defaults
  4. body-position defaults
  5. exercise source
  6. explicit exercise override
- Record resolved-field provenance.
- Detect inherited conflicts rather than silently selecting between incompatible rules.
- Add deterministic phrase construction, validation, and fingerprinting.

### Stage C — Initial capability gating implemented

- Add an exercise-scoped pose-capability registry.
- Keep Push-Up pose support at `trainer_review_required`.
- Emit `no_validated_capability` for exercises without a matching explicit capability.
- Do not infer that Push-Up support applies to all horizontal presses, bodyweight exercises, or floor exercises.

### Stage D — Dry-run migration implemented

- Read all exercise database records.
- Derive stable candidate identifiers.
- Detect missing normalization data, duplicate identifiers, and parse failures.
- Produce triage totals without modifying source, trainer-review, approval, or publication state.

### Stage E — Not performed

- Select small, trainer-reviewed samples from several exercise families.
- Refine shared rules based on those samples.
- Do not perform a blind bulk conversion or publication.

## Push-Up Changes

### Instructions

| Area | Old wording | New wording |
|---|---|---|
| Setup | `Place your hands beneath your shoulders.` | `Place your hands approximately under your shoulders.` |
| Setup | `Brace in a straight line from shoulders to heels.` | Unchanged |
| Movement | `Lower your body with control, pause, then press the floor away.` | Unchanged |
| Breathing | Not present | `Inhale as you lower. Exhale as you press.` |

Hand placement and breathing remain coaching guidance only. Neither was added as an automated finding.

### Cadence

| Phase | Value | Result |
|---|---|---|
| `phaseOne` | `Lower` | Unchanged |
| `hold` | `Hold` | Unchanged |
| `phaseTwo` | `Press` | Unchanged |

No timing value or hold duration was added.

### Safety

| Old wording | New separately stored cues |
|---|---|
| Unresolved empty safety list | `Perform each repetition with control.` |
| — | `Stop the exercise if you experience unexpected pain.` |
| — | `Breathe normally throughout the movement.` |

No diagnosis, treatment, medical advice, or injury-prevention claim was added.

### Coaching phrases

| Phrase | Old wording | New wording |
|---|---|---|
| Encouragement 1 | `Keep your body strong.` | `Keep your body in one straight line.` |
| Encouragement 2 | `Stay controlled.` | Unchanged |
| Positive form | `Your body position stayed controlled.` | `Your body alignment stayed controlled.` |
| Corrective form | `On the next set, try keeping your hips in line with your shoulders.` | Unchanged |
| Uncertainty | `I could not get a clear enough view of your body position.` | `I could not get a clear enough side view to evaluate your body alignment.` |
| Completion | `Good job.` | Unchanged |
| Recovery | `Take a breath.` | Unchanged |

Existing stable phrase IDs were retained. The uncertainty phrase reports insufficient visibility and does not imply poor form.

### Camera guidance

| Item | Result |
|---|---|
| Required view | `side` — unchanged |
| Minimum usable frames | `60%` — unchanged |
| Minimum overall confidence | `0.75` — unchanged |
| Added guidance | `Position the camera at the side and keep the shoulders, hips, and ankles visible throughout the movement. Avoid major landmark occlusion.` |

No additional required landmarks were added.

### Automated-analysis scope

Added:

> Automated assessment evaluates shoulder–hip–ankle body alignment only.

### Technical limitations

| Old wording | New wording |
|---|---|
| `A two-dimensional shoulder–hip–ankle angle cannot assess wrist comfort, pain, elbow angle, depth, or full three-dimensional alignment.` | Retained unchanged |
| Not present | `Camera placement, lighting, landmark occlusion, and incomplete body visibility may reduce pose-estimation reliability.` |

Limitations and reliability failures must not be emitted as form failures.

## Architecture Added

### Normalized source schema

The human-maintained source model supports:

- stable exercise ID and display name
- schema and source version
- exercise family and movement patterns
- equipment and load type
- body position and support surface
- laterality
- open-, closed-, or mixed-chain classification
- dynamic, isometric, or mixed movement type
- difficulty
- primary and secondary joints
- primary and secondary muscles
- balance requirements
- phases
- camera candidates
- candidate measurements
- known unsupported assessments
- translation-risk terms
- trainer-review requirements
- controlled exercise overrides

### Inheritance model

Resolution is deterministic:

```text
global defaults
→ equipment defaults
→ movement-family defaults
→ body-position defaults
→ exercise source
→ explicit exercise override
```

The resolver records `resolvedFrom` provenance and returns inherited conflicts for review.

### Controlled generation

Generation uses only:

1. deterministic templates
2. controlled defaults
3. stable phrase-ID rules
4. normalized taxonomy values
5. explicit exercise overrides
6. explicit capability and threshold records

There is no unrestricted build-time AI generation and no automatic application of AI suggestions.

### Pose-capability registry

The Push-Up capability is explicitly scoped to:

```json
{
  "capabilityId": "push_up.side.body_alignment",
  "exerciseIds": ["push_up"],
  "exerciseFamilies": ["horizontal_press"],
  "view": "side",
  "measurement": "alignment_deviation",
  "requiredLandmarks": ["shoulder", "hip", "ankle"],
  "validationStatus": "trainer_review_required",
  "thresholdProfileId": "body_alignment_v1",
  "supportedFindings": ["body_alignment"],
  "unsupportedFindings": [
    "pain",
    "wrist_comfort",
    "elbow_angle",
    "depth",
    "three_dimensional_alignment"
  ]
}
```

This record is not approval of the capability or its threshold.

### Validation

The generalized validation layer currently checks or reports:

- missing normalized source fields
- malformed exercise IDs
- missing exercise-specific capabilities
- inherited-value conflicts
- feedback that references unsupported assessments
- diagnostic or injury-prevention safety wording
- capabilities that remain pending trainer review
- stale Push-Up source fingerprints
- trainer-decision preservation during regeneration

The existing runtime validator continues to validate phrase ownership, placeholders, pose vocabulary, numeric ranges, feedback references, IDs, aliases, and draft workflow state.

### Versioning and fingerprinting

Generated profiles include:

- schema version
- source version
- profile version
- generator version
- taxonomy version
- template version
- capability-registry version
- deterministic metadata fingerprint

The fingerprint includes the canonicalized source, controlled shared rules, capability and threshold references, and generator behavior version. It excludes timestamps and other nondeterministic inputs.

### Artifact separation

| Artifact | Role |
|---|---|
| `exercise-generation/sources/*.json` | Human-maintained exercise facts |
| `exercise-generation/rules.json` | Controlled defaults, capabilities, and threshold references |
| `generated/exercise-profiles/*.generated.json` | Generated, non-authoritative profiles |
| `exercise-review/**` | Generated review, translation, and bot-handoff artifacts |
| `trainer-decision.md` | Separate human decision artifact preserved during regeneration |

No apply, approval, or publication command was added.

### Migration tooling

The migration command is dry-run-only in this rollout. It reads all database JSON records, derives candidate identifiers, detects duplicates and parse errors, and reports missing normalization inputs. It does not create approval, review, or publication state.

## Files Changed

| File or area | Reason |
|---|---|
| `exercise-generation/schema.json` | Define the normalized human-maintained source contract. |
| `exercise-generation/sources/push_up.json` | Add the first normalized reference fixture and stale-write guard. |
| `exercise-generation/rules.json` | Add controlled defaults, cadence inheritance, capability registry, and unchanged Push-Up thresholds. |
| `scripts/lib/exercise-profile-generator.js` | Implement deterministic resolution, provenance, capability gating, validation, and fingerprinting. |
| `scripts/generate-exercise-profiles.js` | Add targeted generation and stale-fingerprint protection. |
| `scripts/migrate-exercise-profiles.js` | Add read-only database migration triage. |
| `public/exercise-metadata.js` | Correct current runtime Push-Up content while preserving workflow and pose logic. |
| `scripts/export-exercise-metadata-review.js` | Export camera guidance, analysis scope, and limitations. |
| `scripts/generate-exercise-review-workspace.js` | Generate new review fields and preserve trainer decisions. |
| `generated/exercise-profiles/push_up/profile.generated.json` | Generated normalized Push-Up reference profile. |
| `exercise-review/exercises/push_up/**` | Regenerated Push-Up review, translation, profile, and bot artifacts. |
| `exercise-review/SUMMARY.md` | Record the updated Push-Up profile version. |
| `exercise-review/manifest.json` | Record the updated Push-Up identity and fingerprint. |
| `exercise-review/fitness-bot-handoff.json` | Carry the corrected generated Push-Up package. |
| `reports/exercise-metadata-review.json` | Regenerate the deterministic review export. |
| `test/exercise-profile-generation.test.js` | Add acceptance, determinism, stale-write, pose, workflow, and immutability tests. |
| `docs/generalized-exercise-generation.md` | Document architecture findings and rollout boundaries. |
| `package.json` | Add targeted generation and migration dry-run scripts. |

## Pose-Logic Verification

No deterministic Push-Up pose logic changed.

| Property | Before | After | Changed? |
|---|---:|---:|---|
| Measurement | `alignment_deviation` | `alignment_deviation` | No |
| Landmarks | shoulder, hip, ankle | shoulder, hip, ankle | No |
| Required view | `side` | `side` | No |
| Maximum deviation | `18°` | `18°` | No |
| Landmark confidence | `0.75` | `0.75` | No |
| Affected frames | `35%` | `35%` | No |
| Consecutive duration | `500 ms` | `500 ms` | No |
| Minimum usable frames | `60%` | `60%` | No |
| Overall confidence | `0.75` | `0.75` | No |
| Priority and feedback routing | Existing values | Existing values | No |

No elbow-angle, depth, wrist-position, symmetry, scapular-motion, head-position, pain, comfort, or three-dimensional form judgment was added.

The 18-degree threshold remains pending validation against trainer-labelled recordings.

## Validation Results

| Command | Result |
|---|---|
| `npm test` | Passed — 497 tests, 0 failures |
| `node --test test/exercise-profile-generation.test.js test/exercise-metadata.test.js test/exercise-metadata-review.test.js test/exercise-review-workspace.test.js` | Passed — 32 tests, 0 failures |
| `npm run validate:exercise-metadata` | Passed — 7 profiles, 0 errors, 0 warnings |
| `npm run generate:exercise-profiles -- --exercise=push_up --expected-fingerprint=sha256:370eb528d709d4ed5c141ae6271b04d45116bf1a1d2a9ddc899d7a05642072bb` | Passed — fingerprint matched; expected trainer-review warning emitted |
| `npm run generate:exercise-review-workspace` | Passed |
| `npm run export:exercise-metadata-review` | Passed |
| `npm run generate:exercise-profiles -- --exercise=push_up --dry-run` | Passed without writing |
| `npm run migrate:exercise-profiles:dry-run` | Passed without writing |
| `git diff --check` | Passed |

## Push-Up Acceptance Results

### Instructions — passed

- Setup uses “approximately under your shoulders.”
- Straight-line bracing cue is retained.
- Existing movement cue is retained.
- Breathing cue is present.
- Cadence remains Lower / Hold / Press.

### Safety — passed

- Controlled-repetition cue is present.
- Unexpected-pain stop cue is present.
- Normal-breathing cue is present.
- No injury-prevention claim is present.

### Coaching — passed

- Positive phrase refers to body alignment.
- Corrective phrase refers to hips and shoulders.
- Uncertainty explicitly refers to an unclear side view.
- Uncertainty is not converted into a form failure.
- Stable phrase IDs are retained.

### Camera — passed

- Side view remains required.
- Shoulder, hip, and ankle visibility guidance is present.
- Confidence gates remain unchanged.

### Pose analysis — passed

- Only shoulder–hip–ankle body alignment is evaluated.
- Threshold remains 18 degrees.
- Affected-frame requirement remains 35%.
- Consecutive duration remains 500 ms.
- Landmark confidence remains 0.75.
- Minimum usable frames remains 60%.
- Overall confidence remains 0.75.
- Elbow angle is not evaluated.
- Depth is not evaluated.
- Wrist comfort is not evaluated.
- Pain is not evaluated.
- Three-dimensional alignment is not evaluated.

### Workflow — passed

- Generated status remains `draft`.
- Human review remains `pending`.
- Translation remains `pending`.
- No publication field was authorized.
- No approval field was authorized.
- Existing trainer decisions are preserved during regeneration.

## Migration Dry-Run Results

| Metric | Count |
|---|---:|
| Total exercises inspected | 873 |
| Successfully normalized | 796 |
| Missing required data | 77 |
| Conflicting records | 0 |
| Unsupported pose configurations | 0 |
| Trainer-review warnings | 796 |
| Translation warnings | 0 |
| Blocking errors | 0 |
| Manual exercise-specific override required | 79 |
| Schema conversion failed | 0 |

“Successfully normalized” is migration triage only. It does not mean trainer-approved, pose-validated, production-ready, or published.

## Generated Artifacts

The following files were produced through repository generators rather than manually patched:

- `generated/exercise-profiles/push_up/profile.generated.json`
- `exercise-review/exercises/push_up/profile.json`
- `exercise-review/exercises/push_up/review.md`
- `exercise-review/exercises/push_up/fitness-bot-input.json`
- `exercise-review/exercises/push_up/fitness-bot-review.md`
- `exercise-review/exercises/push_up/translation-source.json`
- `exercise-review/exercises/push_up/translations/README.md`
- `exercise-review/SUMMARY.md`
- `exercise-review/manifest.json`
- `exercise-review/fitness-bot-handoff.json`
- `reports/exercise-metadata-review.json`

These files are generated review artifacts and are not authoritative editing surfaces.

## Remaining Human Decisions

A qualified human trainer or authorized reviewer must still decide:

- final Push-Up safety wording
- breathing-cue approval
- camera wording approval
- validation of the 18-degree threshold against trainer-labelled recordings
- approval or rejection of the Push-Up pose capability
- approval of each future pose-capability family
- translation approval
- resolution of the 77 migration exceptions
- whether normalized database candidates contain sufficient exercise-specific characteristics
- exercise-specific biomechanical overrides
- final trainer-review status
- final publication approval

## Risks and Conflicts

- **Stale fingerprints:** The supplied Push-Up fingerprint matched. Future mismatches block targeted generation.
- **Duplicate sources:** No duplicate candidate identifiers were reported in the dry run.
- **Schema incompatibility:** Seventy-seven database records lack one or more conservative normalization inputs.
- **Repository convention:** The current browser UMD bundle remains a runtime source because the application has no browser build step. Migration to the normalized source is therefore staged rather than performed as a blind rewrite.
- **Unvalidated pose rules:** Push-Up pose support and its 18-degree threshold remain `trainer_review_required`.
- **Missing broad-family evidence:** Push-Up is the only fully normalized acceptance fixture in this rollout.
- **Ambiguous inheritance:** The resolver reports conflicts and provenance, but additional family rules require trainer-reviewed examples.
- **Migration risk:** Database normalization does not establish biomechanics, camera feasibility, translation readiness, or pose capability.
- **Temporary dual fingerprints:** The normalized generator and legacy runtime review export fingerprint different controlled input boundaries. They should be unified only during a deliberate runtime-source migration.
- **No blanket conversion:** No other exercise was approved, published, or granted Push-Up-derived pose support.

## Final Status

The Push-Up is a reference implementation and acceptance fixture, not blanket approval for other exercises.

All generated profiles remain pending qualified human and translation review.

No exercise has been approved, trainer-reviewed, production-authorized, or published by Codex.
