# Phase 2 — Approved Activity Registries

## Boundary and authority

The canonical Phase 2 activity universe is the validated fixture in `src/youth-fitness/activities/`. It contains separate exercise and movement-game projections while retaining one relationship graph. Registry presence alone is not enough: future consumers must resolve an item through `requireApprovedActivity`, which fails closed unless the identifier exists and its administrative status is `APPROVED`.

This registry does not prescribe activities, build programs, create sessions, infer eligibility from age, or replace Pocket PT's general exercise catalog. It is a youth eligibility projection suitable for a later adapter to that catalog. Code fixtures remain appropriate until production persistence, authorization, audit, rollback, and retention decisions are complete.

## Movement-family definitions

| Family | Definition |
| --- | --- |
| `SQUAT` | Knee-and-hip bending pattern with the torso supported over the base of support. |
| `HINGE` | Hip-dominant folding and extending pattern. |
| `PUSH` | Moving the body or resistance away through an upper-body press. |
| `PULL` | Drawing the body or resistance closer through an upper-body pull. |
| `SINGLE_LEG` | A stance or movement with meaningfully greater demand on one leg. |
| `TRUNK` | Maintaining or deliberately changing torso position under control. |
| `CARRY` | Transporting a suitable load while maintaining controlled locomotion. |
| `LOCOMOTION` | Traveling through space by walking, marching, crawling, skipping, or similar patterns. |
| `JUMP_LAND` | Leaving the ground and/or receiving landing forces with control. |
| `MOBILITY` | Controlled movement through a comfortable available range. |
| `CONDITIONING` | Sustained or repeated whole-body activity used to develop work capacity. |
| `BREATHING_RECOVERY` | Low-demand breathing or movement used to support recovery and self-regulation. |
| `MOVEMENT_GAME` | A bounded play activity with movement rules, space, instructions, and stop conditions. |

## Canonical metadata

Every item has a stable ID and type; one or more validated movement families and equipment requirements; minimum competency-based training level; optional future-facing age-presentation bands; impact; instructions; cues; common errors; stop conditions; regression and progression links; evidence source/rule tags; and versioned administrative approval.

Training levels are `FOUNDATION`, `DEVELOPMENT`, and `PROGRESSION`. They describe demonstrated training competency, not chronological age. Age bands (`10_12`, `13_15`, `16_17`) are presentation metadata only. Impact levels are `NONE`, `LOW`, `MODERATE`, and `HIGH`; the initial approved seed intentionally contains no high-impact item.

## Validation and fail-closed preparation

Validation rejects missing fields, unknown enum values, empty safety/instruction metadata, unknown evidence tags, duplicate IDs, broken/self-referential activity relationships, games without the `MOVEMENT_GAME` family, mismatched ID/type prefixes, invalid approval records, and approved records without an approver and approval date. The exported fixtures and nested metadata are frozen.

The seed is deliberately bodyweight-first and conservative: most items use bodyweight or simple space/surfaces, while a small number demonstrate bands or light-load eligibility. A registry record does not establish that an activity is safe for every participant or prescription. Profile eligibility, readiness, workload, recent stress, pain handling, and final prescription validation belong to later phases.
