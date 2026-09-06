# MUFASA PHASE C — WHOLE-JOURNEY CONTEXT ENRICHMENT

## Role
Independent reviewer. Do not merge during review. Return GO or CHANGES REQUIRED with exact repo evidence.

## Baseline
Built from current main after Phase B PR #695 merged with corrective PR #696 underneath it.

## Goal
Give canonical Mufasa a broader understanding of where the authenticated member is in their journey without creating another memory store or sending raw intake/account records into the model context.

## What changed
`src/ai/coachContextService.js` now publishes a bounded `journey` projection sourced only from the already-derived canonical Journey Profile (`user.journeyProfile` / migrated retention journeyProfile fallback).

The projection includes:
- primary pathway and bounded pathways;
- experience level;
- training availability (days/times/session frequency/duration when available);
- equipment availability;
- recommended workout category;
- recommended assessment items;
- nutrition priorities;
- dashboard recommendation modules;
- review status;
- bounded feature flags for athlete/yoga/rugby/health-review state.

The context schema is bumped to version 2.

## Privacy / authority invariants
- DO NOT expose raw `clientIntake`, mutable draft answers, phone, emergency contact, or arbitrary account/profile blobs.
- DO NOT let Mufasa reinterpret intake answers to make personalization decisions.
- Canonical Journey Profile remains the derived personalization authority.
- Existing program/workout/gamification/recovery/yoga/challenge owners remain unchanged.
- No historical camera-form claims are added in Phase C.
- No last-run claims are added in Phase C.
- No next-badge eligibility claims are added in Phase C.

## Why this boundary
The Journey Profile is already the canonical derived model used by personalization. Phase C reads a minimized projection from that derived artifact rather than duplicating the recommendation engine or feeding raw intake to the LLM.

## Required review
1. Confirm the context service reads only the authenticated user's userStore record supplied by the existing server-side AI Coach request.
2. Confirm `journey` comes from derived Journey Profile, not raw `clientIntake`/draft answers.
3. Confirm sensitive/raw intake fields are absent from the serialized context.
4. Confirm bounded arrays prevent unbounded prompt growth.
5. Confirm existing recent workouts/reps, goals, recovery, program, gamification, yoga, challenge and member-experience context remains present.
6. Confirm missing Journey Profile produces `journey: null` rather than invented defaults.
7. Confirm schemaVersion change does not break prompt/service consumers that treat context as JSON.
8. Run `node --test test/mufasa-phase-c-whole-journey-context.test.js` plus existing AI Coach/context tests and the full repository suite.

## GO criteria
GO only if Mufasa gains useful whole-journey awareness while raw intake/private account fields remain excluded and no new decision authority is created.

## Next phase after GO
Phase D — authoritative historical camera/form findings. Persist/read minimized deterministic form findings so Mufasa may truthfully say things like “last workout your knees were moving in” only when the system actually recorded that evidence.