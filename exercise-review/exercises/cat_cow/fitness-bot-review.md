GENERATED FILE — DO NOT EDIT PRODUCTION METADATA HERE

# Fitness Bot Review Request

You are acting as a secondary fitness-content reviewer. A qualified human trainer will make every final decision.

Do not claim approval. Do not diagnose medical conditions. Do not claim injury prevention. Do not change pose thresholds solely from opinion. Do not rewrite machine metadata. Do not introduce exercises not included in this package. Do not mark trainer_reviewed or approved, publish content, or alter deterministic pose logic.

Review setup accuracy, movement accuracy, cadence clarity, breathing guidance, safety wording, coaching tone, camera feasibility, pose-analysis feasibility, biomechanical limitations, uncertainty language, translation risks, missing information, and conflicts between instructions and measurements.

## Exact Exercise Review Context

GENERATED FILE — DO NOT EDIT PRODUCTION METADATA HERE

# Exercise Review: Cat-Cow Flow

## Identity

Exercise ID: cat_cow
Schema Version: 1
Profile Version: 1
Metadata Fingerprint: sha256:8bffa7982d55d3e25cfb1ce3390ff8c12dd72d715316c544b89e46feec2e79de

## Current Status

draft. Human review: Pending. Fitness Bot review: Pending. Translation: Pending.

## Quick Summary

**Instruction coaching:** Start on your hands and knees. Stack your shoulders over your hands and hips over your knees. Move smoothly between spinal flexion and extension with your breath. Cadence: Round / Breathe / Extend. These words guide a member and are not automated findings.

**Automated form judgment:** Not supported. Coaching instructions remain available, but the system must not infer form quality.

Automated form judgment is unsupported; MoveNet has no detailed spinal segmentation for precise curvature assessment.

## Setup

- Start on your hands and knees.
- Stack your shoulders over your hands and hips over your knees.

## Movement

- Move smoothly between spinal flexion and extension with your breath.

## Cadence

- phaseOne: Round
- hold: Breathe
- phaseTwo: Extend

## Safety

- No exercise-specific safety cue is currently defined; trainer decision required.

## Coaching Phrases

- encouragement: cat_cow_encouragement_1 — Keep breathing. | cat_cow_encouragement_2 — Move smoothly.
- positiveForm: None
- correctiveForm: None
- uncertainForm: None
- completion: cat_cow_completion_1 — Nice work.
- recovery: cat_cow_recovery_1 — Take a breath.

## Camera Requirements

- Required view: not_supported
- Minimum usable frames: 60%
- Minimum overall confidence: 0.75

## Pose Measurements

- None.

## Form Rules

- Automated form judgment is unsupported.

## Thresholds and Persistence

- None.

## Technical Limitations

- Automated form judgment is unsupported; MoveNet has no detailed spinal segmentation for precise curvature assessment.

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
  "exerciseId": "cat_cow",
  "schemaVersion": 1,
  "profileVersion": 1,
  "metadataFingerprint": "sha256:8bffa7982d55d3e25cfb1ce3390ff8c12dd72d715316c544b89e46feec2e79de",
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
  "exerciseId": "cat_cow",
  "profileVersion": 1,
  "metadataFingerprint": "sha256:8bffa7982d55d3e25cfb1ce3390ff8c12dd72d715316c544b89e46feec2e79de",
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
