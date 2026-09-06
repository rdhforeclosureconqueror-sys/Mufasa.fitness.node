# INDEPENDENT REVIEW — MUFASA CLIENT CONTEXT + VOICE CONVERGENCE

## Role
You are the independent reviewer. Do not assume this audit correctly classified the coach surfaces or data owners. Do not merge during review. Return GO or CHANGES REQUIRED with exact repo evidence.

## Baseline
Repository: `rdhforeclosureconqueror-sys/Mufasa.fitness.node`
Branch: `fix/mufasa-canonical-context-convergence-20260905`
Primary audit: `docs/audits/mufasa-client-context-voice-audit-20260905.md`

## Core question
Does PocketPT currently have one Mufasa coach authority or multiple divergent coach paths, and does the proposed phased convergence preserve canonical member-data ownership?

## Required verification

### 1. Coach authority split
Trace both:
- `/coach.html` → frontend AI coach client → authenticated `/api/me/ai-coach*` → `aiCoachService` → `coachContextService`;
- workout/mirror `CoachRuntime` → configured `askUrl` → actual network destination.

Confirm whether the workout path still calls the external Mufasa brain directly and therefore bypasses the canonical authenticated server context builder.

### 2. Current member context
Inspect executable code, not docs, and enumerate exactly what `coachContextService.build(userId)` can currently read. Verify recent workouts/reps/form score, program, level/XP, badges/achievements, goals, recovery, yoga faults, challenge/member-experience fields.

### 3. Exact desired claims
For each claim below, mark IMPLEMENTED / PARTIAL / MISSING and identify the canonical evidence source:
- last workout;
- reps without camera history;
- exact prior camera/form issue such as knees caving in;
- next/today workout;
- current program phase/week;
- current level / XP to next level;
- next badge or nearest badge progress;
- last run summary;
- goals/journey state;
- recovery/check-in;
- push-up challenge progress.

Do not treat a broad form score as proof of a specific historical fault. Do not treat generic distance as proof of a run.

### 4. Mute/wake-word lifecycle
Inspect `CoachRuntime.configure`, `activateVoice`, `setMuted`, wake-word parsing, calibration suspension, and post-calibration resume. Verify:
- whether configure still defaults muted;
- whether activateVoice reliably unmutes;
- whether `Hey Mufasa` uses the same recognizer as general voice input;
- whether calibration can resume listening exactly once;
- whether explicit user mute prevents automatic resume.

### 5. Privacy and member isolation
Confirm the canonical AI coach route derives member identity from authenticated `req.auth.userId`. Client-supplied `user_id` must not be allowed to choose another member's canonical context.

### 6. Architecture judgment
The target is one Mufasa identity with multiple presentation surfaces. Review whether changing workout/mirror voice to the authenticated canonical AI Coach endpoint is safer than enhancing the legacy external browser `/ask` path.

### 7. Data authority invariants
Any future form/run/badge enrichment must read from canonical services and must not create parallel storage merely for Mufasa. The LLM must remain explain-only for platform facts and rewards.

## Expected output
Return:
1. audited main SHA;
2. GO or CHANGES REQUIRED for the audit/plan;
3. exact coach-path map;
4. exact current-context matrix;
5. mute/wake lifecycle verdict;
6. corrections to any gap classification;
7. recommended implementation order;
8. specific tests required for Phase A and Phase B.

## GO criteria
GO means the audit accurately identifies the split, preserves one authenticated server-side context authority, and gives a safe phased route to the intended Mufasa experience without inventing or duplicating member facts.
