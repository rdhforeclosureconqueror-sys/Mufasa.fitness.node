# Pocket PT Camera Coach Architecture

## Optional flow and boundaries

```text
Yoga session (canonical pose ID; always usable without camera)
  -> user chooses Check Form
  -> replaceable LandmarkProvider.observe()
  -> normalizeLandmarks() (coordinates, mirror, confidence)
  -> PoseObservation
  -> provider-neutral PoseRuleEngine
  -> PoseEvaluation (rules/status/feedback)
  -> UI may track stable passing frames and hold progress
  -> user may Continue regardless of camera availability
```

`createCameraCoach` is the adapter boundary; no browser CV dependency is bundled. A future MediaPipe, TensorFlow.js, or native provider must translate its output at this boundary. Camera permission belongs to the explicit Check Form action, never application startup.

## Domain contract

```text
PoseObservation { poseId, timestamp, landmarks: Record<name, {x,y,z,confidence}> }
PoseRuleResult { ruleId, passed, skipped, severity, measuredValue, targetRange, side, feedback }
PoseEvaluation { poseId, timestamp, confidence, rules[], overallStatus, feedback[] }
```

Low-confidence or missing points produce skipped rules, not false corrections. `overallStatus` is `insufficient_data`, `needs_adjustment`, or `aligned`. Mirrored input swaps semantic left/right names during normalization. A `front`/`either` rule tests available sides and records the selected side; a future orientation resolver should explicitly identify the front leg instead of relying on best geometric fit.

## Rule governance

The JSON Schema is `schemas/yoga-pose-rules.v1.schema.json`; definitions are versioned in `data/yoga/pose-rules.v1.json`. Current Chair and Warrior II ranges are deliberately marked non-clinical proof-of-concept values. Before user release: content/clinical review, calibrated camera datasets, accessibility review, feedback localization, temporal smoothing, front-side orientation, and false-correction metrics are required.

Hold/progress aggregation is intentionally not embedded in geometry evaluation. A later session coordinator can require N stable evaluations while preserving manual Continue and normal camera-free completion.
