# Movement Reference Data Capability Guide

## Bottom line

The yoga CSVs are small outputs of MediaPipe Pose run on missing images. They are neither animation files nor ground-truth alignment labels. Today they can support schema exploration, static skeleton reconstruction from coordinates, and test-fixture experiments. They cannot validate that a pose is correct, improve the current MoveNet model by being placed in the repository, or support defensible production classification/scoring.

For row/column counts, exact landmarks, angle definitions and integrity findings, use [YOGA_SYSTEM_AUDIT.md](../../YOGA_SYSTEM_AUDIT.md#4-yoga-dataset-report). The permanent source-to-destination mapping is in [the registry](01_LEGACY_ASSET_REGISTRY.md).

## Dataset families

### `Dataset_<Pose>.csv` — landmark tables

Each table has an exported index plus 33 MediaPipe Pose landmarks × `x`, `y`, `z`, `vis`. Pose is encoded by filename, not a class column. `x/y` are image-relative, `z` is model-relative depth, and visibility is model confidence—not measurement truth. There are no timestamps, image IDs, subjects, views, mirror flags, orientation, labels for quality/fault, or splits.

Files cover Half Moon (59), Bound Angle (60), Downward Dog (60), Dancer (60), Triangle (60), Goddess/Utkata Konasana (66), Tree (58), and apparently Warrior (60) in an accidentally URL-named CSV.

### `Dataset_<Pose>_Angles.csv` — derived measurement tables

Each has image path label plus 14 directed screen-plane angles. The current formula emits degrees `[0,360)`, uses integer pixel coordinates and ignores `z`/visibility. Elbow, knee and hip vertices are recognizable, but shoulder ray order differs by side; `hand_angle`, `neck_angle_uk`, and “wrist” angles are mislabeled/cross-body measurements. Image paths do not resolve.

### `<Pose>_Combined.csv` — denormalized tables

Each repeats angle and landmark feature families for the same pose/sample count. It is convenient for an experiment but not additional data. Never count raw, angle and combined rows as three independent samples. Join provenance/order must be re-established rather than assumed.

### Coaching and movement text

`02_nasm_movement_basics.txt`, `03_nasm_overhead_squat_assessment.txt`, and `06_coach_cues_and_checklists.txt` are human prose/reference seeds, not datasets of observations. They can become controlled taxonomies and reviewed rules; they do not validate a computer-vision measurement.

## Capability matrix

| Question | Possible today | After normalization | Needs additional data/validation |
|---|---|---|---|
| Draw a 2-D skeleton? | **Yes**, plot `x/y` with MediaPipe 33-point connections | Add bounds/visibility/view policy and canonical renderer fixtures | Original image needed for overlay accuracy/provenance |
| Draw a rough 3-D skeleton? | **Demonstration only** using relative `z` | Declare coordinate semantics and normalize body frame | Use MediaPipe world landmarks/calibration for physical interpretation |
| Compare two rows? | Numerically yes, scientifically weak | Body-centered scale/rotation/mirror normalization and confidence masks | Same pose variant/view plus expert-defined similarity meaning |
| Validate joint angles? | **No**; current values are derived, not ground truth | Recalculate tested internal 0–180° angles with correct vertices and uncertainty | Expert/manual gold measurements, inter-rater validation, camera-view protocol |
| Decide pose correctness/alignment? | **No** | Schema can express approved ranges/faults | Correct/incorrect fault labels, representative people/views, professional thresholds |
| Animate movement? | **No**; rows are unrelated still images without time | Static interpolation would be synthetic and misleading | Time-ordered video/keypoint sequences, FPS/timestamps/tracking IDs and temporal cleanup |
| Train a pose classifier? | Technically a toy experiment; not defensible | Canonical labels, group-aware splits, normalized features, unknown class | Recover licensed images, subject/source IDs, negatives, many representative samples, external test set |
| Train a quality/fault classifier? | **No** | Feature pipeline only | Expert fault/severity/acceptable labels, multi-view/temporal examples and validation |
| Generate a reference pose? | Averages can be plotted but are not an authoritative “ideal” | Cluster by variant/view/side; use medoids with provenance | Professional selection and population/variation policy |
| Improve MoveNet? | **No**; MediaPipe outputs do not retrain TensorFlow.js MoveNet | Build a landmark adapter for downstream rules only | Original labeled images and a legitimate model-training/fine-tuning pipeline; MoveNet licensing/model constraints |
| Power MoveNet rules? | Not directly: 33 vs 17 landmarks/confidence differ | Map common joints and recompute measurements from current MoveNet packets | Calibrated view-specific thresholds on representative MoveNet outputs |
| Improve coaching? | Prose can inspire drafts only | Approved observation→cue/regression records | Evidence, domain reviewers, usability/safety evaluation |
| Measure stability? | **No**, no temporal sequence | Not recoverable from still rows | Frame sequences with timestamps and confidence continuity |
| Measure symmetry? | Rough same-frame left/right comparison possible | Mirror/view normalization and uncertainty | View-appropriate professional definition and representative reference distribution |

## Possible today (bounded research only)

* Validate CSV parsers, MediaPipe column mapping and renderer prototypes.
* Plot visible points and skeleton edges without claiming anatomical truth.
* Explore feature distributions and demonstrate why 0/360 wraparound is unsafe.
* Build golden fixtures for schema adapters using a few quarantined rows, if license permits.
* Normalize the prose into **draft** taxonomies/rules with explicit provenance.

Do not put these demonstrations in a user-facing score, achievement, progression gate or health/safety decision.

## Possible after normalization

Normalization requires a manifest/checksum, canonical pose/variant IDs, source sample IDs, image association, extractor/model version, coordinate semantics, view/laterality/mirror/orientation, confidence policy, body-centered transforms, recalculated measurements, provenance/license/consent and subject/source grouping. Then the assets may support reproducible exploratory baselines, adapters, rendering fixtures, and hypothesis generation for reviewed deterministic rules.

Normalization cannot create missing truth. It does not turn model predictions into annotations, stills into motion, examples into ideal angles, or filename classes into robust labels.

## Additional collection required

For classification: consented licensed source images; many subjects across body types, clothing, backgrounds, devices, lighting, sides/views and pose variants; unknown/non-pose/transition classes; subject/session IDs; group-held-out and external sets; label guidelines and inter-rater checks.

For alignment/coaching: deliberately captured acceptable and named-fault examples, severity/visibility/view annotations, professional raters, measurement uncertainty, contraindication/safety review and outcome/usability evaluation.

For motion/stability: videos or ordered keypoints with timestamps/FPS, persistent subject IDs, dropped-frame/confidence data, repetitions/phase labels and capture calibration.

For MoveNet: run the **current production detector** on the evaluation corpus. A MediaPipe-derived threshold cannot be assumed to transfer. Compare detection coverage/error by landmark/view before authorizing any downstream rule.

## Reference-data contract

A normalized sample should include `sampleId`, source checksum/license/consent, canonical pose/variant, subject/session/source group, image URI/checksum, split, view/side/mirror/orientation, detector/model/version, coordinate convention, all landmark values/confidences, rejection reasons, measurement algorithm/version, expert labels/reviewer agreement and intended-use restrictions. Store research data outside public web roots; do not retain raw media by default.

## Decision gates

1. **Provenance gate:** images, license, consent and subjects/source groups known.
2. **Technical gate:** extractor semantics and canonical measurements fixture-tested.
3. **Use-case gate:** exact intended output and prohibited claims documented.
4. **Evidence gate:** representative held-out evaluation and abstention targets pass.
5. **Professional gate:** rules/cues/ranges reviewed for specified population/view.
6. **Privacy/security gate:** retention, access, deletion and on-device/server boundary approved.
7. **Release gate:** capability flag, monitoring, version persistence and rollback tested.

Failure at any gate leaves the asset in research/archive status.
