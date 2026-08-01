# Generic Exercise Sequence Engine (GESE)

GESE separates runtime mechanics from exercise knowledge. `ExerciseSequenceEngine` validates and executes a definition; definitions own landmarks, measurements, phases, graph edges, persistence, confidence, feature weights, completion, review state, and preview metadata. Adding an exercise means registering a definition—GESE contains no exercise IDs or thresholds.

## Definition contract

A definition requires `exerciseId`, `sequenceId`, versioned capability/template fields, `status`, `requiredLandmarks`, `initialPhase`, `repetitionPath`, `measurements`, `phases`, and `visualTemplate`. Each phase has an arbitrary `id`, `nextPhase`, `kind`, condition tree, optional frame/duration persistence, and optional `completesRepetition`. The graph may have any names, count, and valid edges.

Measurement evaluator types are `joint_angle`, `relative_landmark_position`, `normalized_distance`, `alignment_deviation`, `movement_direction`, `velocity`, `landmark_confidence`, `landmark_visibility`, `frame_persistence`, and `duration`. Conditions are `greater_than`, `less_than`, `range`, `equals`, `movement_direction`, `previous_phase`, `persistence_frames`, `persistence_duration`, `all_of`, and `any_of`. Validation rejects unknown types and landmark references not declared by the definition.

Features reference measurements and declare a weight plus `required`; weights affect diagnostic contribution only. Evidence retains observed and expected values, comparison, pass/fail, confidence, and contribution. It is evaluator output, never coaching text.

## Fingerprint and review

The fingerprint is SHA-256 over recursively key-sorted effective exercise, sequence, measurement, condition, weight, capability, template, and engine-version data. Existing fingerprint fields are excluded, preventing self-reference. Property ordering does not alter identity; any behavior-affecting value does.

Review generation creates a versioned artifact in `generated/exercise-sequences/<exercise>/`. Definitions remain draft and the artifact explicitly prohibits automatic approval. Squat is fixture-only, is omitted from production artifacts, and supplies no trainer-approved thresholds.

## Current limitations

Velocity depends on frame timestamps and single-frame deltas; no biomechanical filtering is implied. Definitions are JavaScript data rather than JSON Schema files. Push-Up's legacy repetition counter remains the production count while GESE runs as the already-established parallel sequence diagnostic, preserving observable challenge behavior and comparison continuity. Real-device validation remains required before activating a new definition.
