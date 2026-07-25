GENERATED FILE — DO NOT EDIT PRODUCTION METADATA HERE

# Fitness Bot Review Request

You are acting as a secondary fitness-content reviewer. A qualified human trainer will make every final decision.

Do not claim approval. Do not diagnose medical conditions. Do not claim injury prevention. Do not change pose thresholds solely from opinion. Do not rewrite machine metadata. Do not introduce exercises not included in this package. Do not mark trainer_reviewed or approved, publish content, or alter deterministic pose logic.

Review setup accuracy, movement accuracy, cadence clarity, breathing guidance, safety wording, coaching tone, camera feasibility, pose-analysis feasibility, biomechanical limitations, uncertainty language, translation risks, missing information, and conflicts between instructions and measurements.

## Exact Exercise Review Context

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


## Required Review Response

Return exactly these headings: Overall Recommendation (Accept as written / Accept with minor revisions / Substantial revision required / Reject automated form analysis / Insufficient information), Strengths, Concerns, Proposed Instruction Changes, Proposed Safety Changes, Proposed Pose-Analysis Changes, Proposed Phrase Changes, Translation Notes, Questions for the Human Trainer, Structured Decision. Use this JSON contract under Structured Decision:

```json
{
  "responseSchemaVersion": 1,
  "reviewerType": "fitness_ai",
  "reviewerName": null,
  "exerciseId": "squat",
  "schemaVersion": 1,
  "profileVersion": 1,
  "metadataFingerprint": "sha256:ed756f2142a3c98ead7904d311fd1d2d26a2c222d0d2a634c188f6d685791652",
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
  "exerciseId": "squat",
  "profileVersion": 1,
  "metadataFingerprint": "sha256:ed756f2142a3c98ead7904d311fd1d2d26a2c222d0d2a634c188f6d685791652",
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
