GENERATED FILE — DO NOT EDIT PRODUCTION METADATA HERE

# Fitness Bot Review Request

You are acting as a secondary fitness-content reviewer. A qualified human trainer will make every final decision.

Do not claim approval. Do not diagnose medical conditions. Do not claim injury prevention. Do not change pose thresholds solely from opinion. Do not rewrite machine metadata. Do not introduce exercises not included in this package. Do not mark trainer_reviewed or approved, publish content, or alter deterministic pose logic.

Review setup accuracy, movement accuracy, cadence clarity, breathing guidance, safety wording, coaching tone, camera feasibility, pose-analysis feasibility, biomechanical limitations, uncertainty language, translation risks, missing information, and conflicts between instructions and measurements.

## Exact Exercise Review Context

GENERATED FILE — DO NOT EDIT PRODUCTION METADATA HERE

# Exercise Review: Push-Up

## Identity

Exercise ID: push_up
Schema Version: 1
Profile Version: 2
Metadata Fingerprint: sha256:eda3e0679463a072e40901c6b226c37552a0523a00897d07826b18d4b97464b4

## Current Status

draft. Human review: Pending. Fitness Bot review: Pending. Translation: Pending.

## Quick Summary

**Instruction coaching:** Place your hands approximately under your shoulders. Brace in a straight line from shoulders to heels. Lower your body with control, pause, then press the floor away. Inhale as you lower. Exhale as you press. Cadence: Lower / Hold / Press. These words guide a member and are not automated findings.

**Automated form judgment:** Supported only for the defined side camera view and rules below; uncertainty and confidence gates apply.

A two-dimensional shoulder–hip–ankle angle cannot assess wrist comfort, pain, elbow angle, depth, or full three-dimensional alignment. Camera placement, lighting, landmark occlusion, and incomplete body visibility may reduce pose-estimation reliability.

## Setup

- Place your hands approximately under your shoulders.
- Brace in a straight line from shoulders to heels.

## Movement

- Lower your body with control, pause, then press the floor away.
- Inhale as you lower. Exhale as you press.

## Cadence

- phaseOne: Lower
- hold: Hold
- phaseTwo: Press

## Safety

- Perform each repetition with control.
- Stop the exercise if you experience unexpected pain.
- Breathe normally throughout the movement.

## Coaching Phrases

- encouragement: push_up_encouragement_1 — Keep your body in one straight line. | push_up_encouragement_2 — Stay controlled.
- positiveForm: push_up_form_positive_1 — Your body alignment stayed controlled.
- correctiveForm: push_up_form_corrective_1 — On the next set, try keeping your hips in line with your shoulders.
- uncertainForm: push_up_form_uncertain_1 — I could not get a clear enough side view to evaluate your body alignment.
- completion: push_up_completion_1 — Good job.
- recovery: push_up_recovery_1 — Take a breath.

## Camera Requirements

- Required view: side
- Minimum usable frames: 60%
- Minimum overall confidence: 0.75
- Guidance: Position the camera at the side and keep the shoulders, hips, and ankles visible throughout the movement. Avoid major landmark occlusion.

## Automated Analysis Scope

Automated assessment evaluates shoulder–hip–ankle body alignment only.

## Pose Measurements

- body_alignment: alignment_deviation; landmarks shoulder, hip, ankle

## Form Rules

- body_alignment: alignment_deviation; priority 1

## Thresholds and Persistence

- body_alignment: {"maximumDeviationDegrees":18}; landmark confidence 0.75; affected frames 35%; consecutive duration 500 ms.

## Technical Limitations

- A two-dimensional shoulder–hip–ankle angle cannot assess wrist comfort, pain, elbow angle, depth, or full three-dimensional alignment.
- Camera placement, lighting, landmark occlusion, and incomplete body visibility may reduce pose-estimation reliability.

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
  "exerciseId": "push_up",
  "schemaVersion": 1,
  "profileVersion": 2,
  "metadataFingerprint": "sha256:eda3e0679463a072e40901c6b226c37552a0523a00897d07826b18d4b97464b4",
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
  "exerciseId": "push_up",
  "profileVersion": 2,
  "metadataFingerprint": "sha256:eda3e0679463a072e40901c6b226c37552a0523a00897d07826b18d4b97464b4",
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
