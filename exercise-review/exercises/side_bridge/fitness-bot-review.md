GENERATED FILE — DO NOT EDIT PRODUCTION METADATA HERE

# Fitness Bot Review Request

You are acting as a secondary fitness-content reviewer. A qualified human trainer will make every final decision.

Do not claim approval. Do not diagnose medical conditions. Do not claim injury prevention. Do not change pose thresholds solely from opinion. Do not rewrite machine metadata. Do not introduce exercises not included in this package. Do not mark trainer_reviewed or approved, publish content, or alter deterministic pose logic.

Review setup accuracy, movement accuracy, cadence clarity, breathing guidance, safety wording, coaching tone, camera feasibility, pose-analysis feasibility, biomechanical limitations, uncertainty language, translation risks, missing information, and conflicts between instructions and measurements.

## Exact Exercise Review Context

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


## Automated Analysis Scope

No automated analysis scope is defined.

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


## Required Review Response

Return exactly these headings: Overall Recommendation (Accept as written / Accept with minor revisions / Substantial revision required / Reject automated form analysis / Insufficient information), Strengths, Concerns, Proposed Instruction Changes, Proposed Safety Changes, Proposed Pose-Analysis Changes, Proposed Phrase Changes, Translation Notes, Questions for the Human Trainer, Structured Decision. Use this JSON contract under Structured Decision:

```json
{
  "responseSchemaVersion": 1,
  "reviewerType": "fitness_ai",
  "reviewerName": null,
  "exerciseId": "side_bridge",
  "schemaVersion": 1,
  "profileVersion": 1,
  "metadataFingerprint": "sha256:adf753ae1be5f3912594acc6bee8780bbd8ba68c202b89feb4efa7e120360345",
  "recommendation": "accept_with_minor_revisions",
  "confidence": "medium",
  "proposals": {
    "instructions": [],
    "cadence": [],
    "safety": [],
    "phrases": [],
    "cameraSetup": [],
    "poseAnalysis": [],
    "thresholds": [],
    "limitations": []
  },
  "translationRecommendations": [],
  "questionsForTrainer": [],
  "approval": {
    "status": "not_authorized",
    "mayChangeProductionStatus": false
  }
}
```

## Draft Translation Request (optional)

Set targetLocale, regionalAudience, formality, and readingLevel. Translate meaning rather than word order; preserve coaching tone, uncertainty, safety meaning, and placeholders exactly. Do not add medical or technical claims, change cadence timing or pose logic, or publish. Flag unnatural phrases, regional assumptions, and terms needing trainer review; when uncertain return the source text. Return:

```json
{
  "translationSchemaVersion": 1,
  "exerciseId": "side_bridge",
  "profileVersion": 1,
  "metadataFingerprint": "sha256:adf753ae1be5f3912594acc6bee8780bbd8ba68c202b89feb4efa7e120360345",
  "sourceLocale": "en-US",
  "targetLocale": "<set targetLocale>",
  "regionalAudience": "<set regionalAudience>",
  "formality": "<set formality>",
  "readingLevel": "<set readingLevel>",
  "translatorType": "fitness_ai",
  "status": "draft_pending_human_approval",
  "translations": {
    "displayName": "",
    "setupCues": [],
    "movementCues": [],
    "safetyCues": [],
    "cadence": {},
    "phrases": {}
  },
  "warnings": [],
  "termsRequiringTrainerReview": [],
  "meaningChanges": []
}
```
