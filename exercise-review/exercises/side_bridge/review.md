GENERATED FILE — DO NOT EDIT PRODUCTION METADATA HERE

# Exercise Review: Side Bridge

## Identity

Exercise ID: side_bridge
Schema Version: 1
Profile Version: 1
Metadata Fingerprint: sha256:adf753ae1be5f3912594acc6bee8780bbd8ba68c202b89feb4efa7e120360345

## Current Status

draft. Human review: Pending. Fitness Bot review: Pending. Translation: Pending.

## Quick Summary

**Instruction coaching:** Lie on your side with your elbow beneath your shoulder. Stack or stagger your feet comfortably. Lift your hips into a strong line, pause, then lower with control. Cadence: Lift / Hold / Lower. These words guide a member and are not automated findings.

**Automated form judgment:** Supported only for the defined side camera view and rules below; uncertainty and confidence gates apply.

A two-dimensional shoulder–hip–ankle angle is unreliable when the lower body is obscured and cannot establish three-dimensional alignment.

## Setup

- Lie on your side with your elbow beneath your shoulder.
- Stack or stagger your feet comfortably.

## Movement

- Lift your hips into a strong line, pause, then lower with control.

## Cadence

- phaseOne: Lift
- hold: Hold
- phaseTwo: Lower

## Safety

- No exercise-specific safety cue is currently defined; trainer decision required.

## Coaching Phrases

- encouragement: side_bridge_encouragement_1 — Keep breathing. | side_bridge_encouragement_2 — Stay strong.
- positiveForm: side_bridge_form_positive_1 — Your side position stayed controlled.
- correctiveForm: side_bridge_form_corrective_1 — On the next set, keep your hips in line with your shoulders.
- uncertainForm: side_bridge_form_uncertain_1 — I could not get a clear enough side view.
- completion: side_bridge_completion_1 — Good job.
- recovery: side_bridge_recovery_1 — Take a breath.

## Camera Requirements

- Required view: side
- Minimum usable frames: 60%
- Minimum overall confidence: 0.75

## Pose Measurements

- body_alignment: alignment_deviation; landmarks shoulder, hip, ankle

## Form Rules

- body_alignment: alignment_deviation; priority 1

## Thresholds and Persistence

- body_alignment: {"maximumDeviationDegrees":18}; landmark confidence 0.75; affected frames 35%; consecutive duration 500 ms.

## Technical Limitations

- A two-dimensional shoulder–hip–ankle angle is unreliable when the lower body is obscured and cannot establish three-dimensional alignment.

## Decisions Required

- Confirm or revise instruction, cadence, safety, camera, pose rules, and translation source wording.
- Decide whether automated form judgment remains appropriate.

## Trainer Notes


## Trainer Decision

Complete `trainer-decision.md`; this snapshot cannot approve or mutate production metadata.
