GENERATED FILE — DO NOT EDIT PRODUCTION METADATA HERE

# Exercise Review: Squat

## Identity

Exercise ID: squat
Schema Version: 1
Profile Version: 1
Metadata Fingerprint: sha256:ed756f2142a3c98ead7904d311fd1d2d26a2c222d0d2a634c188f6d685791652

## Current Status

draft. Human review: Pending. Fitness Bot review: Pending. Translation: Pending.

## Quick Summary

**Instruction coaching:** Stand with your feet in a comfortable stance. Keep your chest tall. Sit your hips back, pause with control, then stand tall. Cadence: Sit back / Hold / Stand. These words guide a member and are not automated findings.

**Automated form judgment:** Supported only for the defined side camera view and rules below; uncertainty and confidence gates apply.

The current shoulder–hip–ankle angle does not measure squat depth, knee tracking, load, or torso position independently.

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

- encouragement: squat_encouragement_1 — Keep your rhythm. | squat_encouragement_2 — Stay controlled.
- positiveForm: squat_form_positive_1 — Your squat stayed controlled.
- correctiveForm: squat_form_corrective_1 — On the next set, keep your torso controlled as you stand.
- uncertainForm: squat_form_uncertain_1 — I could not get a clear enough side view.
- completion: squat_completion_1 — Good job.
- recovery: squat_recovery_1 — Take a breath.

## Camera Requirements

- Required view: side
- Minimum usable frames: 60%
- Minimum overall confidence: 0.75


## Automated Analysis Scope

No automated analysis scope is defined.

## Pose Measurements

- torso_control: alignment_deviation; landmarks shoulder, hip, ankle

## Form Rules

- torso_control: alignment_deviation; priority 1

## Thresholds and Persistence

- torso_control: {"maximumDeviationDegrees":35}; landmark confidence 0.75; affected frames 35%; consecutive duration 500 ms.

## Technical Limitations

- The current shoulder–hip–ankle angle does not measure squat depth, knee tracking, load, or torso position independently.

## Decisions Required

- Confirm or revise instruction, cadence, safety, camera, pose rules, and translation source wording.
- Decide whether automated form judgment remains appropriate.

## Trainer Notes


## Trainer Decision

Complete `trainer-decision.md`; this snapshot cannot approve or mutate production metadata.
