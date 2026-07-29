# Yoga System Staging Audit

**Scope:** `public/new/` only, plus read-only tracing into the host application to establish whether staged files are connected.  
**Audit date:** 2026-07-29  
**Method:** full file inventory, source review, CSV parsing/statistics, path resolution, syntax/config checks, dependency-install attempts, and a bounded service-start attempt. No production data was changed and no external application API was called.

## 1. Executive summary

`public/new/` is an **unintegrated upload/staging bundle**, not a deployable yoga subsystem. The useful pieces are:

* eight small, single-pose MediaPipe datasets (58–66 observations each), containing MediaPipe's 33 landmarks and/or 14 derived 2-D directed angles;
* a Python batch script that can extract MediaPipe landmarks and angles from a hard-coded image directory;
* a separate, incomplete Express/SQLite yoga-pose catalogue prototype; and
* six concise human-authored coaching/programming notes plus four independent gamification seed tables.

What is functional in isolation: all CSVs are rectangular and numeric data cells are populated; the three Python files parse; the JavaScript files parse; the content notes have useful headings; and the intended Express read-only routes are understandable. What is partial: MediaPipe offline extraction, an SQLite catalogue API, an external Ma'at client stub, and badge seed data. What is raw only: the datasets and coaching notes. What is absent: source images/database, a trained classifier, train/validation/test splits, calibrated pose ranges, fault rules, scoring, live yoga capture, Node↔Python integration, persistence of assessments, authentication, tests, and clinical/sports-professional validation.

The main application already has a **separate browser MoveNet pipeline** for workout form/rep tracking. Nothing outside `public/new/` imports or serves this staging directory. Therefore the actual repository currently has two disconnected pose approaches: production-facing TensorFlow.js MoveNet (17 keypoints) and staged Python MediaPipe Pose (33 landmarks).

**Go/no-go:** do not train a production model or issue alignment/safety claims from this material yet. Preserve the upload unchanged as provenance; normalize copies only after licensing, image provenance, pose variant, camera view, handedness, subject identity, and expert-approved thresholds are supplied.

## 2. Complete file inventory

Status vocabulary: **Archive** = preserve as source/provenance; **Normalize** = useful after conversion/validation; **Repair** = prototype with blocking defects; **Reject** = no application value as uploaded. “Used” means referenced by the current host application; every item below is **No** unless explicitly stated.

### Training and coaching sources

| File | Type / purpose and key contents | Dependencies / relationship | Quality | Recommended action |
|---|---|---|---|---|
| `01_lego_training_blocks.txt` | Structured prose/templates: patterns, planes, four intensity gears, session blocks and assembly examples | Conceptually feeds programming; overlaps `02`, `04`, `05`, `06` | Normalize | Preserve; convert reviewed blocks to JSON with IDs, eligibility, dose, ordering and contraindications |
| `02_nasm_movement_basics.txt` | Structured prose: kinetic chain, muscle actions/roles, planes, checkpoints, compensations, phases | Vocabulary for `03` and training blocks | Normalize | Preserve; convert taxonomy to JSON; verify permission to use NASM name/content |
| `03_nasm_overhead_squat_assessment.txt` | Mixed checklist/rules: five compensations, possible contributors, SMR/stretch/strength suggestions | Can seed observation→strategy rules; not a diagnostic authority | Normalize | Expert-review, remove person-specific text, add view/evidence/confidence/stop conditions, then JSON |
| `04_gymnastics_fundamentals_L3_L5.txt` | Structured prose: event skills, physical preparation and coaching principles | Foundation vocabulary for `05` | Normalize | Convert to skill nodes only after governing-body/coach review |
| `05_gymnastics_progressions_L4_to_L8_elite.txt` | High-level progression chains and safety language | Intended prerequisite graph over `04`; explicitly only a mental map | Normalize | Convert arrows to directed edges with mastery/spotting/equipment gates; never auto-prescribe advanced skills from this alone |
| `06_coach_cues_and_checklists.txt` | Cue library, breathing, young-athlete checklist, safety and mindset | Candidate output wording for all rules | Normalize | Convert to tagged cue records with priority, audience, fault, locale and safety status |

These files use stable all-caps section headings, bullets, numbered findings and `→`, so a controlled one-time parser is possible. They are **not sufficiently deterministic as-is**: terms such as “moderate,” “carefully dosed,” “repeatable,” and “comfortable” lack machine thresholds; exercises lack canonical IDs; and contributors are many-to-many possibilities rather than diagnoses. The overhead-squat file does map five observations to contributors and corrective categories, but supplies no confirmatory tests, regression/progression objects, confidence gates or evidence grades. Gymnastics contains progression chains, levels, basic safety principles and equipment/spotting mentions, but no complete prerequisite graph, mastery criteria, age policy or load limits. Repetition (shapes, landings, hollow/arch, warm-up order) is consistent rather than contradictory. The largest content risk is incompleteness, plus person-specific references to “Marleigh.”

### Pose dataset inventory

All landmark files have 133 columns (one exported DataFrame index plus 33 × `x,y,z,vis`); all angle files have 16 columns (index, image-path label, 14 angles); all combined files have 148 columns (index, label, 14 angles, 132 landmark features). “Clean” below means structurally rectangular with no empty cells or exact duplicate whole rows—it does **not** mean scientifically validated.

| File | Pose | Rows × columns | Contents / purpose | Quality and action |
|---|---|---:|---|---|
| `Dataset_ArdhaChandrasana.csv` | Half Moon | 59 × 133 | landmarks | Structurally clean; normalize/archive |
| `Dataset_ArdhaChandrasana_Angles.csv` | Half Moon | 59 × 16 | label + directed angles | Structurally clean; recalculation required |
| `ArdhaChandrasana_Combined.csv` | Half Moon | 59 × 148 | denormalized angles + landmarks | Redundant derived artifact; do not use as independent samples |
| `Dataset_BaddhaKonasana.csv` | Bound Angle | 60 × 133 | landmarks | Structurally clean; normalize/archive |
| `Dataset_BaddhaKonasana_Angles.csv` | Bound Angle | 60 × 16 | label + directed angles | Structurally clean; recalculation required |
| `BaddhaKonasana_Combined.csv` | Bound Angle | 60 × 148 | denormalized set | Redundant derived artifact |
| `Dataset_Downward_Dog.csv` | Downward-Facing Dog | 60 × 133 | landmarks | Structurally clean; normalize/archive |
| `Dataset_Downward_Dog_Angles.csv` | Downward-Facing Dog | 60 × 16 | label + directed angles | Structurally clean; recalculation required |
| `DownwardDog_Combined.csv` | Downward-Facing Dog | 60 × 148 | denormalized set; naming loses underscore | Redundant derived artifact |
| `Dataset_Natarajasana.csv` | Dancer | 60 × 133 | landmarks | Structurally clean; normalize/archive |
| `Dataset_Natarajasana_Angles.csv` | Dancer | 60 × 16 | label + directed angles | Structurally clean; recalculation required |
| `Natarajasana_Combined.csv` | Dancer | 60 × 148 | denormalized set | Redundant derived artifact |
| `Dataset_Triangle.csv` | Triangle / Trikonasana | 60 × 133 | landmarks; English rather than Sanskrit filename | Structurally clean; pose variant unknown |
| `Dataset_Triangle_Angles.csv` | Triangle | 60 × 16 | label + directed angles | Structurally clean; recalculation required |
| `Triangle_Combined.csv` | Triangle | 60 × 148 | denormalized set | Redundant derived artifact |
| `Dataset_UtkataKonasana.csv` | Goddess / Fierce Angle | 66 × 133 | landmarks | Structurally clean; normalize/archive |
| `Dataset_UtkataKonasana_Angles.csv` | Goddess | 66 × 16 | label + directed angles | Structurally clean; recalculation required |
| `UtkataKonasana_Combined.csv` | Goddess | 66 × 148 | denormalized set | Redundant derived artifact |
| `https   drive.google.com file d 1mGE64f82r9iqiqQAzJnN6IQZD_hmLvOE view usp=sharing.csv` | Apparently Warrior / Virabhadrasana | 60 × 133 | landmarks accidentally named from a Drive URL | Clean shape, unknown provenance; rename only in normalized copy |
| `Dataset_Veerabhadrasana_Angles.csv` | Warrior (variant unspecified) | 60 × 16 | label + directed angles | “Veerabhadrasana” differs from standard “Virabhadrasana”; raw counterpart ambiguous |
| `Veerabhadrasana_Combined.csv` | Warrior | 60 × 148 | denormalized set | Redundant derived artifact |
| `Dataset_Vrukshasana.csv` | Tree / Vrikshasana | 58 × 133 | landmarks | Structurally clean; normalize/archive |
| `Dataset_Vrukshasana_Angles.csv` | Tree | 58 × 16 | label + directed angles | Structurally clean; recalculation required |
| `Vrukshana_Combined.csv` | Tree | 58 × 148 | denormalized set; truncated/misspelled name | Redundant derived artifact |

### Application, processing, configuration and documentation

| File | Type / purpose and key contents | Dependencies / used | Quality | Recommended action |
|---|---|---|---|---|
| `main.py` | Offline MediaPipe landmark/angle exporter; hard-coded to Tree images/results | OpenCV, MediaPipe, NumPy, pandas, matplotlib, IPython; No | Repair | Split pure extraction/measurement from CLI; parameterize; test; use undirected 0–180° angles |
| `landmarks.py` | Offline annotated-image generator hard-coded to Bound Angle | OpenCV, MediaPipe, missing `TRAIN`; No | Repair | Replace with tested CLI/library after provenance review |
| `check_all.py` | GUI loop displaying Bound Angle detections | OpenCV, MediaPipe, desktop/display and missing `TRAIN`; No | Archive/repair | Convert to non-GUI smoke test with fixture |
| `requirements.txt` | UTF-16LE `pip freeze` of 423 unrelated packages | Python ecosystem, git dependency; No | Reject as deploy manifest | Create minimal UTF-8 locked pose-engine requirements with supported Python matrix |
| `package.json` | Separate `yoga-api` Express manifest | npm; no lockfile; No | Repair | Rebuild as host module or documented service; correct scripts and pin/lock |
| `server.js` | Express startup, permissive CORS, morgan, static root and routers | Imports nonexistent `./routes` and `./middlewares`; No | Broken | Do not deploy; decide integration boundary first |
| `index.js` | `/v1`, category, pose and base URL router composition | Express/local flat router files; No | Partial | Re-home only after API contract decision |
| `posesRouter.js` | GET all/filter poses | `services`; wrong `../services/services`; No | Broken/security risk | Parameterize queries and validate input |
| `categoriesRouter.js` | GET all/filter categories | services, validator, schemas; wrong paths; No | Broken | Same; fix response flow and spelling in future implementation |
| `baseurlRouter.js` | GET endpoint directory | services; wrong path; No | Broken | Prefer generated OpenAPI/docs, not hard-coded self-links |
| `services.js` | Synchronous SQLite queries wrapped as async | `better-sqlite3`, absent `db/database.db`; raw SQL interpolation; No | Broken/high risk | Replace interpolation with parameters; supply migration/schema and explicit DB path |
| `schemas.js` | Joi ID/pose query sketches | Joi; declared pose schema not applied; No | Incomplete | Design full request/response schemas |
| `validatorHandler.js` | Joi middleware | Joi; calls `next()` twice on validation error; No | Defective | Correct control flow when rebuilt |
| `errorHandler.js` | Logs errors and exposes message/stack | Express; No | Unsafe for production | Structured logging; redact; no stack in production |
| `firebaseConfig.js` | Browser Firebase configuration template with one committed API key-like value | Firebase SDK not declared; No | Security review required | Restrict/rotate key if live; env/runtime configuration; no secret values reproduced here |
| `maatApi.js` | Browser ES-module client for profile/program/chat endpoints | `fetch`, placeholder external URL; No | Stub | Decide whether external service is authorized; add status/error/auth/timeouts |
| `baseURL.json` | Hard-coded public Render endpoint directory | External yoga API; No | Stale/unverified | Replace with environment base URL and generated route docs |
| `erm.json` | Commented pseudo-JSON entity sketch | Intended SQLite schema; invalid JSON; No | Broken | Convert to migrations/valid schema docs |
| `index.html` | Static ten-line “Yoga poses” heading | Browser; No | Placeholder | Replace only as part of approved host UI plan |
| `Dockerfile` | Node 20 Alpine build with native compiler and unpinned `npm install` | package manifest; absent lock/DB; No | Non-reproducible/broken runtime | Use lockfile, non-root user, healthcheck, production install and supplied DB/migrations |
| `compose.yml` | One service using prebuilt image | Docker Compose; No | Invalid port short syntax (`8000:8000:8000`) | Correct build/image and `8000:8000`; add healthcheck/config |
| `.gitignore` | Generic Python ignore list | Staging only; No | Adequate but misplaced | Consolidate with repository policy |
| `.gitattributes` | `* text=auto` | Git; No | Minimal | Preserve only if archive has its own repository boundary |
| `README.md` | Upstream dataset overview/setup, images hosted on GitHub | Describes missing `TRAIN`/`Results`; No | Useful provenance lead, claims exceed evidence in upload | Preserve and record upstream commit/dataset card |
| `LICENSE` | MIT license naming original author | Applies ambiguously to upload; No | Incomplete provenance | Owner/legal must confirm scope covers CSV/images/code and coaching additions |
| `yoga` | Empty one-byte staging artifact | None; No | Reject | Remove after archive manifest confirms it has no intended meaning |

### Gamification seed data

| File | Rows × columns | Purpose / relationship | Quality | Recommended action |
|---|---:|---|---|---|
| `FitnessMVP_Actions.csv` | 11 × 3 | event key→points catalogue | Unique populated keys; independent of criteria | Normalize to event/point policy tables |
| `FitnessMVP_Badges.csv` | 18 × 6 | badge metadata; `badge_id` is parent key | Unique IDs; tier text links to tiers except intentional `Any` | Normalize; add versioning, localization and icon FK |
| `FitnessMVP_Criteria.csv` | 18 × 4 | exactly one criterion row per badge in this upload | All badge FKs resolve; threshold stored as operator-bearing string | Parse operators into typed fields; allow multiple criteria/groups |
| `FitnessMVP_Tiers.csv` | 4 × 4 | tier advancement rules | Tier names unique; no FK/IDs | Normalize with typed comparator/window and policy version |

Yoga can be added without breaking these CSV shapes by adding action keys and new badge/criteria rows, but the schema cannot robustly express compound conditions, pose-side mastery, confidence requirements, prerequisite levels or rule versions. Use database tables once user-earned events/results exist. Suitable additions include sessions completed, qualified holds, symmetry improvement and safe prerequisite mastery; do not reward pain tolerance/extreme range. Existing IDs and relationships are valid within these four files, but criteria metrics do not link to action keys and semantic enforcement is absent.

## 3. Architecture map

```text
CURRENT HOST APPLICATION (connected)
browser pages
  └─ TensorFlow.js pose-detection + MoveNet SINGLEPOSE_LIGHTNING
       └─ 17 MoveNet keypoints → browser normalization/tracking/form rules
            └─ existing Node server endpoints/session mechanisms

STAGED BUNDLE (disconnected)
missing TRAIN images
  └─ Python/OpenCV → MediaPipe Pose (static images, complexity 2, detection confidence .3)
       ├─ 33 normalized landmarks → Dataset_*.csv
       └─ pixel-scaled 2-D directed angles → Dataset_*_Angles.csv
            └─ *_Combined.csv (denormalized derived exports; no consumer)

separate static index.html → (no scripts/API calls)
separate Express prototype → absent SQLite database
  ├─ GET /v1[/]
  ├─ GET /v1/categories
  └─ GET /v1/poses

maatApi.js → placeholder external FastAPI URL (not wired)
firebaseConfig.js → config stub (not imported)
knowledge TXT + FitnessMVP CSVs → no parser/import/runtime
```

There is no Node subprocess, HTTP call, local import, queue, or file watcher connecting Python. There is no classification/scoring model. The staged API expects local SQLite, not Firebase; Firebase is merely an unused client config. The staged frontend is static. The host app's MoveNet runtime is the only live pose system found, and it is independent of these CSVs.

## 4. Yoga dataset report

### Schema and landmark convention

The names exactly match **MediaPipe Pose's 33-landmark convention**, not MoveNet. In order:

`NOSE`; `LEFT/RIGHT_EYE_INNER`; `LEFT/RIGHT_EYE`; `LEFT/RIGHT_EYE_OUTER`; `LEFT/RIGHT_EAR`; `MOUTH_LEFT/RIGHT`; `LEFT/RIGHT_SHOULDER`; `LEFT/RIGHT_ELBOW`; `LEFT/RIGHT_WRIST`; `LEFT/RIGHT_PINKY`; `LEFT/RIGHT_INDEX`; `LEFT/RIGHT_THUMB`; `LEFT/RIGHT_HIP`; `LEFT/RIGHT_KNEE`; `LEFT/RIGHT_ANKLE`; `LEFT/RIGHT_HEEL`; `LEFT/RIGHT_FOOT_INDEX`.

For every landmark, `x` and `y` are MediaPipe image-normalized coordinates (usually relative to width/height, though values may extend outside 0–1), `z` is MediaPipe's relative depth—not a normalized world coordinate—and `vis` is predicted visibility. The unnamed first column is a pandas-exported row index and must not become a feature. There is no pose class column in landmark files; class is encoded in the filename/directory, a leakage-prone ingestion convention. There are no image pixels, subject IDs, capture IDs, camera metadata, pose variant, view, handedness, explicit orientation, split, or ground-truth quality labels.

Angle columns, present identically for every pose, are:

* `left/right_elbow_angle`: shoulder–elbow–wrist (vertex elbow; intended anatomy correct);
* `left_shoulder_angle`: elbow–left shoulder–left hip and `right_shoulder_angle`: hip–right shoulder–right elbow (both shoulder vertices, but inconsistent ray order makes direction incomparable);
* `left/right_knee_angle`: hip–knee–ankle (correct vertex);
* `angle_for_ardhaChandrasana1/2`: opposite ankle–same-side hip–other ankle (hip vertex but name/meaning insufficient);
* `hand_angle`: left elbow–right shoulder–right elbow (vertex is right shoulder, **not a hand angle**, crosses sides, likely erroneous);
* `left/right_hip_angle`: shoulder–hip–knee (correct vertex);
* `neck_angle_uk`: nose–left shoulder–right shoulder (vertex is left shoulder, **not a neck angle**, asymmetric/likely erroneous);
* `left/right_wrist_angle_bk`: wrist–hip–ankle (vertex is hip, **not a wrist angle**, misleading name).

`calculateAngle` uses `atan2` difference and adds 360 only when negative. Thus units are **degrees in [0,360)** and values are directed screen-plane orientations, not conventional internal joint angles in [0,180]. Values above 180 are not necessarily impossible under that formula, but are unsuitable for anatomical tolerance comparisons without folding (`min(theta, 360-theta)`) and consistent ray order. Integer pixel conversion before angle calculation adds quantization, discards `z`, and ignores landmark visibility. The right/left shoulder ordering defect alone can turn equivalent anatomy into complementary angles.

### Quality findings

* **Consistency:** landmark, angle and combined schemas are internally consistent across pose files; row count is consistent within each pose trio. Naming is not: `Downward_Dog` vs `DownwardDog`; `Vrukshasana` vs `Vrukshana`; “Veerabhadrasana” vs conventional `Virabhadrasana`; English `Triangle` among Sanskrit names. Pose variants (e.g., which Warrior) are absent.
* **Missing/malformed/duplicates:** parsing found zero empty cells, malformed-width rows and exact whole-row duplicates in all 28 CSVs. This is a syntactic result, not a check for same person/image appearing in multiple files or near-duplicate images, because images are absent.
* **Outliers/impossibility:** 0–360 ranges and discontinuity near 0/360 produce apparent extremes; several pose datasets span almost the full circle for named joint angles. Some normalized coordinates exceed 1, which MediaPipe can emit for off-frame landmarks. These should trigger visibility/bounds policy, not silent acceptance. No anatomical gold truth exists to label statistical outliers as wrong.
* **Confidence:** visibility exists in landmark/combined files, but generation accepts any detected pose at only `min_detection_confidence=0.3`; angle rows contain no contributing-landmark confidence and calculations do not gate on visibility.
* **Orientation:** left/right are MediaPipe anatomical labels, but camera mirroring, EXIF rotation, front/back view, pose laterality and whether examples were augmented/flipped are not recorded. No consistent orientation policy can be demonstrated.
* **Images:** every angle/combined `Label` path points under missing `TRAIN/...`; **all 483 label references are unresolved** in the repository. Landmark-only CSVs have no label/path column. The README's remote illustrations are documentation, not row-resolving samples.
* **Combined exports:** each combined file repeats the same feature families and sample count as its pose's raw/angle pair, so it is a denormalized derived dataset, not additional evidence. Direct row/string comparison is not uniformly identical, so provenance/merge order must be reconstructed rather than assuming byte-exact joins. Never concatenate all three as separate observations.
* **Splits/leakage:** no train/validation/test split exists. With only 483 pose observations total and unknown people/source images, random row splitting could place the same person, burst, web source or near-duplicate in multiple splits. Split by subject/source session before transformations; hold out an external acquisition set.
* **Balance:** counts are superficially balanced (58, 59, six classes of 60, and one of 66; max/min ratio 1.14). That does not establish demographic, side, view, subject or negative-class balance. There are no non-pose/incorrect-pose examples.
* **Readiness:** useful for demonstrations and pipeline fixtures after licensing/path repair. Not ready for production training, validation/testing claims, or rule-based quality assessment. Classification research may be possible after source-image recovery and group-aware splits. Quality assessment requires expert labels for acceptable ranges and specific faults; “examples of a pose” are not fault ground truth.

### Required normalized dataset contract

Prefer Parquet for numeric research features plus JSON/YAML for versioned pose/rule metadata; use database tables/object storage for production assessments/images. A sample record needs `sample_id`, canonical `pose_id`, pose variant, subject/session/source IDs, capture view, laterality, mirror/rotation flags, image URI/checksum/license, extractor/model version, 33 landmarks with confidence, rejection reason, derived measurement version, expert quality/fault annotations, and split. Never infer class from a path at model serving time.

## 5. Training-knowledge report

Preserve the six text files as immutable source material and create reviewed normalized copies. JSON is preferable to CSV because relationships and conditions are nested; YAML is acceptable for authoring but should compile to validated JSON. Database tables become appropriate when content is versioned/published/localized.

Suggested entities:

* `movement_pattern`, `training_block`, `exercise`, `dose`, `equipment`, `eligibility_rule`, `ordering_constraint`;
* `observation` (not diagnosis), `view_requirement`, `measurement_rule`, `possible_contributor`, `confirmatory_assessment`, `corrective_strategy`, `contraindication`;
* `skill`, `level_system`, `prerequisite_edge`, `mastery_criterion`, `spotting_requirement`, `apparatus`, `regression`, `progression`;
* `cue` with fault ID, severity, priority, stop flag, body region, reading level, locale and reviewer/version.

A deterministic plan generator is feasible only after the vague inputs become typed gates and all exercises have IDs/dose bounds. Its selection should be constrained by goal, experience, passed prerequisites, equipment, time, exclusions and recovery, then order high-skill/power before fatigue. Movement observations can map to coaching strategies, but contributors must remain hypotheses and should not be presented as pathology. Gymnastics advanced edges require human coach authorization; do not generate unsupervised tumbling, vault, beam or bars prescriptions from these summaries.

## 6. Risk report

### Critical

* **Unsafe interpretation:** directed 0–360° screen angles, mislabeled cross-body measurements and no visibility gating could issue incorrect joint coaching. Block all user-facing scoring/cues until corrected, fixture-tested and professionally validated.
* **Deployment is nonfunctional:** startup imports nonexistent directories; the database is absent; Compose port syntax is invalid. Do not expose this prototype.

### High

* **Credential/config exposure:** `firebaseConfig.js` contains an API-key-like value. No value is reproduced here. Determine whether live, apply Firebase API restrictions/rules, rotate if uncertain, and move environment-specific configuration out of source. Firebase web keys are not server secrets by themselves, but unsafe rules/restrictions can make exposure consequential.
* **SQL injection:** `services.js` interpolates `id`/`name` into SQL and routers do not apply the declared Joi schema. Replace all interpolated clauses with bound parameters and allowlisted filters.
* **Child/advanced-skill safety:** notes are tailored to a young named athlete and mention advanced gymnastics. Require guardian/coach policy, spotting/equipment gates, contraindications, escalation and clear non-medical language.
* **Privacy/provenance:** source images, subject consent, demographics, licenses and collection process are absent. Do not recover/upload/use subjects until owner/legal approval and a retention policy exist.
* **Model validity/leakage:** tiny image-derived classes, no negatives, no subject-grouped splits, unknown duplicates and missing source images prevent defensible validation.

### Medium

* Permissive CORS, no auth, rate limits or security headers; raw error stacks are returned.
* Host MoveNet and staged MediaPipe use incompatible landmark conventions without an adapter/versioned measurement contract.
* UTF-16LE, 423-package `requirements.txt` includes unrelated/old/conflicting packages and a Git dependency; Node has no staged lockfile.
* Both `opencv-python` and `opencv-contrib-python` are pinned; TensorFlow 2.10/MediaPipe 0.9 era pins are unlikely to support the environment's Python 3.14.
* Hard-coded relative paths are working-directory-sensitive and fail on Linux because required directories are absent; upload naming/casing/transliteration is inconsistent.
* `validatorHandler` can call `next` twice; category response flow can send after 404; error handling/logging/input validation are inadequate.
* No pose catalogue DB/migrations, test fixtures, classifier, scoring/cue/history schema, healthcheck or env template for this service.

### Low

* Empty `yoga` artifact, accidental URL filename, unused imports, generic HTML title, typos (`mesage`, `cagegory`) and misleading angle names reduce maintainability.
* README describes images and 3-D models not present in this upload; its “ground truth” and training claims need a dataset card/evidence.
* License scope for added coaching notes and remote/referenced images is unclear even though an MIT file accompanies upstream code.

## 7. Recommended yoga architecture

Keep the four layers—detection, measurement, interpretation, coaching—independently versioned:

```text
public/yoga/                     # Yoga home, library, pose detail, session UI
src/yoga/api/                    # authenticated routes/controllers/validators
src/yoga/content/                # pose, sequence, prerequisite services
src/pose-engine/contracts/       # canonical landmark packet + adapters
src/pose-engine/detectors/       # MoveNet initially; MediaPipe adapter only if justified
src/pose-engine/measurements/    # normalized angles, symmetry, confidence/view checks
src/yoga/assessment/             # identification, tolerance, faults, scoring, cue priority
src/yoga/progressions/           # prerequisite graph/session eligibility
data/yoga/                       # versioned pose/range/cue/progression JSON
tests/yoga/                      # unit, golden fixture, browser and API tests
```

* **Pose library/detail:** canonical Sanskrit/English names, aliases, variant, difficulty, prerequisites, instructions, muscles/categories, contraindications, regressions/progressions, approved ranges and media provenance.
* **Live/upload:** explicit consent; on-device browser detection where possible; do not save raw imagery by default. Require whole-body/view/orientation checks, confidence stabilization, temporal smoothing and an upload deletion policy.
* **Classification:** start with an explicit pose selection plus rules (safer than auto-identification). Later add a calibrated classifier trained/evaluated on subject-grouped, licensed data with an unknown class.
* **Scoring:** show separate recognition confidence, landmark quality, alignment, symmetry and stability. Publish formula/version and uncertainty; do not imply medical diagnosis or fake precision.
* **Feedback:** return no more than one or two highest-priority, professionally approved cues; pain/fall/visibility stop conditions precede refinements. Attach regression/progression only after eligibility gates.
* **Sessions/history:** server stores compact derived results, rule/model versions and consent—not video—under authenticated user IDs. Poses and sessions link to the existing exercise/category domain through stable IDs.
* **Gamification:** event-driven achievements for safe consistency/control and prerequisite mastery, idempotent award records and auditable policy versions.
* **Safety:** pre-use disclaimer, emergency/pain stop language, pregnancy/injury/accessibility flags, minors policy and trainer/medical escalation; never call a movement observation a diagnosis.

The host browser MoveNet implementation is the pragmatic first detector because it already exists. Define a canonical packet that accommodates its 17 landmarks; only adopt MediaPipe's extra hand/foot/face points if yoga rules demonstrably need them. Adapters must declare detector/model, landmark convention, coordinate frame, mirroring and confidence semantics.

## 8. Deterministic “AI without AI” design

Required pipeline:

1. **Detected landmarks:** adapter emits a versioned canonical frame; raw detector output remains separate.
2. **Confidence validation:** confirm required landmarks, per-point and aggregate thresholds, correct camera view, full body, bounds, stable consecutive frames and no recent tracking loss. Return “cannot assess” rather than guessing.
3. **Normalized joint angles:** correct orientation/EXIF/mirror state; translate to a pelvis midpoint, scale by torso/hip width, optionally rotate to a body axis; compute tested 0–180° internal angles with the intended vertex and retain uncertainty.
4. **Pose identification:** compare a selected pose or use weighted rule templates; require margin from runner-up and support `unknown`. A later classifier can replace this step without changing downstream rules.
5. **Tolerance comparison:** select pose variant/view/side-specific ranges, widened by measurement uncertainty; ranges and evidence carry versions.
6. **Fault detection:** require deviation magnitude plus persistence across a minimum usable-frame window. Rules produce observations, not diagnoses.
7. **Prioritized coaching cue:** order pain/stop, fall/stability, joint/spine concern, pose-defining error, asymmetry, refinement. Deduplicate related findings and cap cue count.
8. **Regression/progression:** check prerequisite, equipment, contraindication and recent mastery gates. A failed pose gives a safe regression; progression requires repeated qualified completions, not one score.
9. **Saved result:** persist pose/rule/model versions, aggregate measurements, confidence, findings/cues and consent context; default to no raw image/video.

Deterministic components include geometry, confidence gates, range comparisons, persistence, priority, eligibility, session assembly and badges. Machine learning benefits landmark detection and, after a proper dataset exists, pose/unknown classification and possibly temporal stability. A generative model is optional only for rephrasing an already-authorized structured result; it must not invent measurements, diagnoses, ranges or progressions.

Example rule shape:

```json
{
  "id": "downward_dog.left_knee.flexed.v1",
  "pose": "adho_mukha_svanasana",
  "view": "lateral_or_oblique",
  "requires": ["left_hip", "left_knee", "left_ankle"],
  "minimum_visibility": 0.75,
  "measurement": "left_knee_internal_angle_deg",
  "acceptable": { "min": 165, "max": 180 },
  "persistence": { "minimum_frames": 15, "minimum_ratio": 0.7 },
  "finding": "left_knee_flexion_outside_target",
  "priority": 40,
  "cue_id": "dd_lengthen_spine_before_legs",
  "regression_id": "downward_dog_intentional_bent_knees"
}
```

The numbers above illustrate schema only; they are not validated thresholds.

## 9. Implementation roadmap

### Phase 0 — security and cleanup

* **Change:** quarantine `public/new`, restrict/rotate Firebase configuration as appropriate, remove deploy discovery, document provenance; decide host-module vs service.
* **Create:** `docs/yoga/provenance.md`, `.env.example` additions, threat/privacy model, archive manifest/checksums.
* **Dependencies:** owner, legal/privacy, Firebase administrator, qualified yoga/gymnastics reviewers.
* **Acceptance:** no live credential ambiguity; no staged service exposed; ownership/license/consent decisions recorded; raw upload immutable.
* **Risks:** loss of provenance, disrupting a separately deployed unknown prototype.

### Phase 1 — data normalization

* **Change:** none of the archive; build importers for CSV/TXT copies.
* **Create:** `data/yoga/*.json`, dataset manifest/schema, canonical aliases, import/validation scripts and reports.
* **Dependencies:** JSON Schema/Ajv (Node) or a small isolated Python toolchain; no 423-package freeze.
* **Acceptance:** canonical IDs; typed columns; all rows traceable by checksum; images/license recovered or rows marked unusable; subject-grouped splits; angle golden tests; combined data not double-counted.
* **Risks:** unrecoverable images/identity groups and invalid source measurements.

### Phase 2 — yoga content API

* **Change:** host `server.js` route composition/data layer, category/exercise bridge.
* **Create:** `src/yoga/api/*`, migrations, validators, pose/sequence schemas and API tests.
* **Dependencies:** existing host auth/storage conventions; avoid a second Express runtime unless operationally justified.
* **Acceptance:** authenticated writes, validated pagination/filtering, stable pose detail responses, no SQL interpolation, yoga category works without duplicate identity.
* **Risks:** schema migration and content-review workflow.

### Phase 3 — pose-analysis engine

* **Change:** extend existing `public/pose-runtime.js` behind capability flags rather than importing staged Python directly.
* **Create:** detector adapter contract, normalization/measurement/rule modules, versioned approved rules, unit/golden/property tests.
* **Dependencies:** existing TensorFlow.js/MoveNet; optionally MediaPipe only after a measured need.
* **Acceptance:** vertex/order tests, mirror/view fixtures, confidence rejection, unknown result, deterministic replay, transparent component scores and zero cue on unusable input.
* **Risks:** 2-D ambiguity, detector bias and unvalidated thresholds.

### Phase 4 — live user feedback

* **Change:** host runtime loading/camera consent and add yoga UI routes.
* **Create:** yoga camera/upload pages, overlay, stabilization state machine, accessibility/error/consent UI and end-to-end tests.
* **Dependencies:** secure context/browser media APIs; on-device inference.
* **Acceptance:** explicit permission; mirror/orientation controls; occlusion/recovery handling; bounded cue frequency; no raw media saved by default; upload deletion verified.
* **Risks:** mobile performance, camera variability, privacy and user overreliance.

### Phase 5 — progression and gamification

* **Change:** existing action/badge event handling and user history schema.
* **Create:** prerequisite graph service, yoga session builder, mastery/event/award records and policy tests.
* **Dependencies:** reviewed skill/cue content and idempotent event processing.
* **Acceptance:** prerequisites/contraindications enforced, safe regression always available, repeatable mastery criteria, no duplicate awards, policy version auditable.
* **Risks:** incentive-driven unsafe behavior and overly rigid progression.

### Phase 6 — testing and production deployment

* **Change:** CI/CD, CSP/CORS/rate limits/log redaction, dependency pins, container/runtime docs.
* **Create:** unit/integration/browser/load/security/model-evaluation suites, model/dataset cards, rollback/runbook and health checks.
* **Dependencies:** representative consented evaluation set, human review, supported browser/device matrix.
* **Acceptance:** clean locked installs/build; passing CI; group-held-out accuracy and abstention targets agreed by owner/reviewer; accessibility/performance/privacy/security gates; monitored canary and rollback.
* **Risks:** distribution shift, regressions across devices and unsupported health/safety claims.

## 10. Questions requiring owner decisions

1. Who uploaded each group, what upstream commit/source applies, and does the MIT license cover code, CSVs, documentation images and all six coaching notes?
2. Where are the `TRAIN` images, SQLite database and any 3-D models, and is there consent to process/store each person—especially minors?
3. Is the committed Firebase configuration active; what are its API restrictions and Security Rules; should it be rotated?
4. Is the external Render yoga API owned/authorized, and may it be contacted or replaced?
5. Should yoga use the existing browser MoveNet stack, adopt MediaPipe, or support both? Is on-device-only processing a product requirement?
6. Which exact variants/views/sides do “Triangle,” “Veerabhadrasana,” and other classes represent, and what canonical transliteration policy should be used?
7. Who is qualified and accountable to approve yoga angle ranges, coaching language, contraindications, NASM-derived material and gymnastics prerequisites?
8. Is “Marleigh” authorized product-specific content or accidental personal information that must be removed from normalized content?
9. What user populations, accessibility needs, age/minor policy, jurisdictions, privacy retention/deletion policy and safety disclaimers apply?
10. What does a successful pose assessment mean, what abstention/false-feedback rate is acceptable, and may the product make only coaching observations rather than health claims?
11. Which backend is authoritative for yoga content/history—current host storage, SQLite, Firebase, or Ma'at—and what authentication/tenant model applies?
12. Should raw photos/video ever be stored? If yes, for how long, encrypted where, for what consented purpose, and who can access/delete them?
13. Are badges purely motivational or do they unlock content, and must achievements be recomputed when rule versions change?

## Validation record

* `python3 -m py_compile public/new/*.py` — passed syntax compilation; it does not execute missing imports/data paths.
* `node --check public/new/*.js` (applied to each file) — all JavaScript parsed.
* Python `csv` full parse/statistics over `public/new/*.csv` — all 28 files rectangular; no empty cells or exact duplicate rows.
* `python3 -m json.tool` — `baseURL.json` and `package.json` passed; `erm.json:2` failed because JSON does not allow comments.
* `npm install --package-lock=false --ignore-scripts` in `public/new` — environment registry policy returned HTTP 403 for `better-sqlite3`; clean installation could not be established. Temporary `node_modules` was removed.
* `npm test` — intentionally fails at `package.json`'s “no test specified” placeholder.
* `npm run lint` — fails because the script targets nonexistent `src/**/*.js` (the environment also resolved a different available ESLint major after install failed).
* `timeout 8s npm start` — fails immediately at `server.js:5` (`Cannot find module './routes/index'`); subsequent missing middleware paths/database would also block startup.
* `python3 -m pip install --dry-run -r public/new/requirements.txt` — dependency resolution reached a Git-hosted package and failed under the environment's HTTP 403 tunnel policy; the manifest is also an oversized UTF-16LE freeze with legacy pins.
* `docker compose -f public/new/compose.yml config` — not runnable because Docker is not installed in the audit environment; static review finds invalid three-part port mapping at `compose.yml:5`.

No local build script exists in the staged Node manifest, no Python test suite exists, and no service was left running.
