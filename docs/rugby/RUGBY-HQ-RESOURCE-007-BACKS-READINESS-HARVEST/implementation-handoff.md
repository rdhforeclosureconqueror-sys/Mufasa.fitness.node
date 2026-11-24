# Implementation Handoff

## Objective

Transfer the recovered Rugby HQ backs-readiness knowledge into the production `Mufasa.fitness.node` repository as durable documentation and machine-readable intelligence.

This is not a full system implementation. It is the preserved knowledge layer that another repo-aware bot or contractor can reconcile with the other Rugby HQ resource packs.

## Destination layout

```text
docs/rugby/RUGBY-HQ-RESOURCE-007-BACKS-READINESS-HARVEST/
data/rugby/backs-readiness-resource-007/
```

## Integration rules

1. Preserve existing Rugby HQ architecture.
2. Do not create a second athlete identity model.
3. Do not create a competing readiness system.
4. Treat this as an extension to existing Rugby Passport, Rugby Ready, Combine Assessment Engine, Athlete Attribute Engine, Coach Headquarters, tactical simulator, and player-development systems.
5. Keep official requirements, published research, internal coaching methods, and software rules separated.
6. Store performance, medical/welfare, and safeguarding data in separate permission spaces.
7. Keep all player-facing statuses explainable with evidence and next actions.

## Core user story

As a backline player, I can see exactly what makes me eligible for the starting lineup, including my skill/IQ rating, athletic index, role-specific strengths, blockers, evidence used by coaches, and next action.

As a coach, I can evaluate a player from 10 through 15 using a clear rubric that rewards rugby IQ, skill execution, movement, defensive understanding, tackling safety, and position responsibilities.

## Readiness statuses

- 90–99: Impact starter / elite within program.
- 80–89: Clear starter-ready.
- 70–79: Match-ready / rotation player.
- 60–69: Developmental / situational use.
- 1–59: Not yet rugby-ready for that role.

Hard gates may block the status even when the weighted score is high.

## Hard gates

- Tackling in Space starter-eligible minimum: 70.
- Safety/availability must be green.
- Medical hold blocks affected participation.
- Safeguarding hold blocks affected participation.
- Role-specific restrictions must be respected.

## Evidence model

Each evaluation should record player ID, position evaluated, category, competency, score, evidence type, coach note, next action, optional video clip/timestamp, evaluator, date, and confidence.

## Suggested implementation steps

1. Add docs and data files only.
2. Index `machine-context.json`, `evaluation-rubric.json`, and markdown files in the Rugby HQ retrieval layer.
3. Map existing athlete/player identity into evaluation records without duplicating identity.
4. Add a database table or JSON-backed pilot store only after verifying existing repo conventions.
5. Add UI cards for Backline Skill/IQ Rating and Backline Athletic Index.
6. Add coach evaluation form based on rubric JSON.
7. Add readiness calculation service that applies hard gates.
8. Add audit trail.
9. Add video/reference evidence later.
10. Reconcile with other Rugby HQ resource packs before building the unified Milele Fit Rugby Intelligence Engine.
