GENERATED FILE — DO NOT EDIT PRODUCTION METADATA HERE

# Exercise Review: Bodyweight Squat

## Identity

Exercise ID: bodyweight_squat
Schema Version: 1
Profile Version: 1
Metadata Fingerprint: sha256:b546305327a89d78f60c7da43b97bad55f1c1e83b8cc41603fc3ed1b991eaf07

## Current Status

draft. Human review: Pending. Fitness Bot review: Pending. Translation: Pending.

## Quick Summary

**Instruction coaching:** Stand with your feet in a comfortable stance. Keep your chest tall. Sit your hips back, pause with control, then stand tall. Cadence: Sit back / Hold / Stand. These words guide a member and are not automated findings.

**Automated form judgment:** Supported only for the defined side camera view and rules below; uncertainty and confidence gates apply.

The current shoulder–hip–ankle angle does not measure squat depth, knee tracking, or torso position independently, especially from an unsuitable view.

## Setup

- Stand with your feet in a comfortable stance.
- Keep your chest tall.

## Movement

- Sit your hips back, pause with control, then stand tall.

## Cadence

- phaseOne: Sit back
- hold: Hold
- phaseTwo: Stand

## Safety

- No exercise-specific safety cue is currently defined; trainer decision required.

## Coaching Phrases

- encouragement: bodyweight_squat_encouragement_1 — Keep your rhythm. | bodyweight_squat_encouragement_2 — Stay controlled.
- positiveForm: bodyweight_squat_form_positive_1 — Your squat stayed controlled.
- correctiveForm: bodyweight_squat_form_corrective_1 — On the next set, keep your torso controlled as you stand.
- uncertainForm: bodyweight_squat_form_uncertain_1 — I could not get a clear enough side view.
- completion: bodyweight_squat_completion_1 — Good job.
- recovery: bodyweight_squat_recovery_1 — Take a breath.

## Camera Requirements

- Required view: side
- Minimum usable frames: 60%
- Minimum overall confidence: 0.75

## Pose Measurements

- torso_control: alignment_deviation; landmarks shoulder, hip, ankle

## Form Rules

- torso_control: alignment_deviation; priority 1

## Thresholds and Persistence

- torso_control: {"maximumDeviationDegrees":35}; landmark confidence 0.75; affected frames 35%; consecutive duration 500 ms.

## Technical Limitations

- The current shoulder–hip–ankle angle does not measure squat depth, knee tracking, or torso position independently, especially from an unsuitable view.

## Decisions Required

- Confirm or revise instruction, cadence, safety, camera, pose rules, and translation source wording.
- Decide whether automated form judgment remains appropriate.

## Trainer Notes


## Trainer Decision

Complete `trainer-decision.md`; this snapshot cannot approve or mutate production metadata.
