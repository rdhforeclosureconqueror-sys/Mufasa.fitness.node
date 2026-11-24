# Movement Screening and Dynamic Testing

## Decision flow
GLOBAL SCREEN → OBSERVED COMPENSATION → POSSIBLE CONTRIBUTORS → SECONDARY / ISOLATION TESTS → CONVERGING EVIDENCE → TARGET CAPACITY / REGION → INTERVENTION → RETEST

## Distinctions
- Global functional screen: broad movement pattern.
- Local ROM: joint-specific measurement.
- Dynamic control: movement under speed, load or repetition.

Screening does not equal medical diagnosis.

## Hard pain gate
Pain during screening exits the automated corrective path and prompts appropriate referral.

## Required assessment fields
Store:
- athlete
- date
- assessor
- protocol + version
- side
- raw result
- units
- derived result
- pain
- asymmetry
- validity / data-quality flag
- possible contributors
- intervention
- retest date

## Vision/camera feature
Standardize:
- camera position
- height
- distance
- athlete orientation
- anatomical landmarks
- repetition / frame used
- surface
- footwear
- frame rate where relevant

Store joint-angle estimates with confidence and image-quality flags.

Camera analysis sees movement. It does not directly measure muscle activation.

## Language guardrails
Use:
- possible contributor
- suggests
- may contribute
- consistent with
- low/moderate/high confidence

Do not write: “this muscle caused it.”

## Hypothesis ledger
Each hypothesis should store:
- evidence for
- evidence against
- confidence
- intervention
- retest date

Repeated consistent findings raise confidence; conflicts lower it.

## Specific course-preserved examples
### Hip internal / external rotation
Supine with hip and knee around 90°. Lower leg moving outward represents hip internal rotation; inward/across represents external rotation. Prefer goniometric measurement when available. Course ranges are contextual, not universal cutoffs.

### Hamstring popliteal-angle style test
Course reference >70° should not be universalized. Preserve setup. Flexibility and hamstring strength are separate capacities.

### Tuck Jump Assessment
Course format: 10 rapid jumps with 10 observed faults. Use as a movement-quality/deterioration observation, not a standalone ACL-injury predictor. Front + side video can help. Landing-noise assessment requires audio.

### CKCUEST
Course protocol preserved: hands separated by ~90 cm tape, 15 s test, warm-up plus 3 trials, ~45 s between trials, average touches. Norms are contextual, not universal.
