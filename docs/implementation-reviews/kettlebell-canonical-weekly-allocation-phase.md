# Canonical 1–4 Day Weekly Programming Allocation — Merge Readiness

## Summary
Implemented and activated a canonical, source-traceable eight-week kettlebell allocation for every supported weekly commitment. Calendar dates now carry stable canonical session IDs; they do not define workout identity.

## Scope
Programming data, allocation validation, scheduler handoff, runtime resolution, integration/regression coverage, and review evidence. No commitment, runtime, persistence, completion, comeback, gamification, checkpoint, form, voice, camera, or education system was rebuilt.

## Files Changed
- `data/challenges/kettlebellCanonicalProgram.js`: authoritative allocation data and validator.
- `src/program-engine/challengeCommitmentScheduler.js`: persists canonical session identity.
- `src/services/challengeEngineService.js`: resolves canonical allocation into existing workout runtime.
- `test/kettlebell-canonical-allocation.test.js`: allocation and four-level flow tests.
- Existing kettlebell integration/route expectations updated from legacy day identity.
- This review artifact.

## Architecture Decisions
Allocation is program data. The scheduler only maps ordered semantic sessions onto preferred calendar days. Resolution uses week + enrolled commitment + ordinal, while the persisted `canonicalSessionId` makes that decision inspectable and stable through rescheduling. Day D is always explicitly marked `technique: true` and `intensity: low`.

## Existing Infrastructure Reused
Existing enrollment, 56-day calendar/recovery scheduler, owner-scoped routes, session service, source correlation, persistence, completion idempotency, comeback events, workout XP, and UI remain in authority.

## Canonical Programming Data Model
`program.weeks[]` holds phase/priorities, five canonical semantic sessions, and allocations keyed 1–4. Exercise entries retain canonical ID, movement type, per-side semantics, sets/rounds, reps/time, rest, tempo, purpose, and traceability.

## Complete 8-Week Allocation Tables

### Week 1 — Learn + Condition

| Commitment | Session | Exercises | Sets/Rounds | Reps/Time | Rest | Tempo | Purpose |
|---|---|---|---|---|---|---|---|
| 1-day | week1-essential | Kettlebell Deadlift<br>Goblet Squat<br>Bent-Over Row<br>Suitcase Carry | 2<br>2<br>2<br>2 | 2 × 30s<br>2 × 30s<br>2 × 30s / side<br>2 × 30s / side | 30s<br>30s<br>30s<br>30s | controlled<br>controlled<br>controlled<br>controlled | Control, breathing, positioning and unhurried conditioning. |
| 2-day | week1-a | Kettlebell Deadlift<br>Suitcase Carry<br>Kettlebell Floor Press | 2<br>2<br>2 | 2 × 30s<br>2 × 30s / side<br>2 × 30s / side | 30s<br>30s<br>30s | controlled<br>controlled<br>controlled | Control, breathing, positioning and unhurried conditioning. |
| 2-day | week1-b | Goblet Squat<br>Kettlebell Halo<br>Two-Hand Kettlebell Swing | 2<br>2<br>2 | 2 × 30s<br>2 × 30s<br>2 × 20s | 30s<br>30s<br>40s | controlled<br>2–1–2<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Control, breathing, positioning and unhurried conditioning. |
| 3-day | week1-a | Kettlebell Deadlift<br>Suitcase Carry<br>Kettlebell Floor Press | 2<br>2<br>2 | 2 × 30s<br>2 × 30s / side<br>2 × 30s / side | 30s<br>30s<br>30s | controlled<br>controlled<br>controlled | Control, breathing, positioning and unhurried conditioning. |
| 3-day | week1-b | Goblet Squat<br>Kettlebell Halo<br>Two-Hand Kettlebell Swing | 2<br>2<br>2 | 2 × 30s<br>2 × 30s<br>2 × 20s | 30s<br>30s<br>40s | controlled<br>2–1–2<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Control, breathing, positioning and unhurried conditioning. |
| 3-day | week1-c | Bent-Over Row<br>Reverse Lunge | 2<br>2 | 2 × 30s / side<br>2 × 30s / side | 30s<br>30s | controlled<br>controlled | Control, breathing, positioning and unhurried conditioning. |
| 4-day | week1-a | Kettlebell Deadlift<br>Suitcase Carry<br>Kettlebell Floor Press | 2<br>2<br>2 | 2 × 30s<br>2 × 30s / side<br>2 × 30s / side | 30s<br>30s<br>30s | controlled<br>controlled<br>controlled | Control, breathing, positioning and unhurried conditioning. |
| 4-day | week1-b | Goblet Squat<br>Kettlebell Halo<br>Two-Hand Kettlebell Swing | 2<br>2<br>2 | 2 × 30s<br>2 × 30s<br>2 × 20s | 30s<br>30s<br>40s | controlled<br>2–1–2<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Control, breathing, positioning and unhurried conditioning. |
| 4-day | week1-c | Bent-Over Row<br>Reverse Lunge | 2<br>2 | 2 × 30s / side<br>2 × 30s / side | 30s<br>30s | controlled<br>controlled | Control, breathing, positioning and unhurried conditioning. |
| 4-day | week1-technique | Kettlebell Deadlift<br>Goblet Squat<br>Bent-Over Row | 1<br>1<br>1 | 1 × 30s<br>1 × 30s<br>1 × 30s / side | 30s<br>30s<br>30s | controlled<br>controlled<br>controlled | Low-fatigue technique: Control, breathing, positioning and unhurried conditioning. |

### Week 2 — Strength Development

| Commitment | Session | Exercises | Sets/Rounds | Reps/Time | Rest | Tempo | Purpose |
|---|---|---|---|---|---|---|---|
| 1-day | week2-essential | Kettlebell Deadlift<br>Goblet Squat<br>Bent-Over Row<br>Suitcase Carry | 3<br>3<br>3<br>3 | 3 × 8<br>3 × 8<br>3 × 8 / side<br>3 × 30s / side | 60s<br>60s<br>60s<br>60s | 3–1–1–1<br>3–1–1–1<br>2–1–1–1<br>controlled carry | Controlled force production; progress load or reps, not both aggressively. |
| 2-day | week2-a | Kettlebell Deadlift<br>Suitcase Carry<br>Kettlebell Floor Press | 3<br>3<br>3 | 3 × 8<br>3 × 30s / side<br>3 × 8 / side | 60s<br>60s<br>60s | 3–1–1–1<br>controlled carry<br>1–1–3–1 | Controlled force production; progress load or reps, not both aggressively. |
| 2-day | week2-b | Goblet Squat<br>Kettlebell Halo<br>Overhead Press | 3<br>3<br>3 | 3 × 8<br>3 × 8<br>3 × 8 / side | 60s<br>60s<br>60s | 3–1–1–1<br>2–1–2<br>2–1–3–1 | Controlled force production; progress load or reps, not both aggressively. |
| 3-day | week2-a | Kettlebell Deadlift<br>Suitcase Carry<br>Kettlebell Floor Press | 3<br>3<br>3 | 3 × 8<br>3 × 30s / side<br>3 × 8 / side | 60s<br>60s<br>60s | 3–1–1–1<br>controlled carry<br>1–1–3–1 | Controlled force production; progress load or reps, not both aggressively. |
| 3-day | week2-b | Goblet Squat<br>Kettlebell Halo<br>Overhead Press | 3<br>3<br>3 | 3 × 8<br>3 × 8<br>3 × 8 / side | 60s<br>60s<br>60s | 3–1–1–1<br>2–1–2<br>2–1–3–1 | Controlled force production; progress load or reps, not both aggressively. |
| 3-day | week2-c | Bent-Over Row<br>Reverse Lunge | 3<br>3 | 3 × 8 / side<br>3 × 8 / side | 60s<br>60s | 2–1–1–1<br>3–1–1–1 | Controlled force production; progress load or reps, not both aggressively. |
| 4-day | week2-a | Kettlebell Deadlift<br>Suitcase Carry<br>Kettlebell Floor Press | 3<br>3<br>3 | 3 × 8<br>3 × 30s / side<br>3 × 8 / side | 60s<br>60s<br>60s | 3–1–1–1<br>controlled carry<br>1–1–3–1 | Controlled force production; progress load or reps, not both aggressively. |
| 4-day | week2-b | Goblet Squat<br>Kettlebell Halo<br>Overhead Press | 3<br>3<br>3 | 3 × 8<br>3 × 8<br>3 × 8 / side | 60s<br>60s<br>60s | 3–1–1–1<br>2–1–2<br>2–1–3–1 | Controlled force production; progress load or reps, not both aggressively. |
| 4-day | week2-c | Bent-Over Row<br>Reverse Lunge | 3<br>3 | 3 × 8 / side<br>3 × 8 / side | 60s<br>60s | 2–1–1–1<br>3–1–1–1 | Controlled force production; progress load or reps, not both aggressively. |
| 4-day | week2-technique | Kettlebell Deadlift<br>Goblet Squat<br>Bent-Over Row | 1<br>1<br>1 | 1 × 8<br>1 × 8<br>1 × 8 / side | 60s<br>60s<br>60s | 3–1–1–1<br>3–1–1–1<br>2–1–1–1 | Low-fatigue technique: Controlled force production; progress load or reps, not both aggressively. |

### Week 3 — Strength Development

| Commitment | Session | Exercises | Sets/Rounds | Reps/Time | Rest | Tempo | Purpose |
|---|---|---|---|---|---|---|---|
| 1-day | week3-essential | Kettlebell Deadlift<br>Goblet Squat<br>Bent-Over Row<br>Farmer Carry | 4<br>4<br>4<br>3 | 4 × 8–10<br>4 × 8–10<br>4 × 8–10 / side<br>3 × 45s | 60s<br>60s<br>60s<br>60s | 3–1–1–1<br>3–1–1–1<br>2–1–1–1<br>controlled carry | Controlled force production; progress load or reps, not both aggressively. |
| 2-day | week3-a | Kettlebell Deadlift<br>Farmer Carry<br>Kettlebell Floor Press | 4<br>3<br>4 | 4 × 8–10<br>3 × 45s<br>4 × 8–10 / side | 60s<br>60s<br>60s | 3–1–1–1<br>controlled carry<br>1–1–3–1 | Controlled force production; progress load or reps, not both aggressively. |
| 2-day | week3-b | Goblet Squat<br>Kettlebell Halo<br>Overhead Press | 4<br>4<br>4 | 4 × 8–10<br>4 × 8–10<br>4 × 8–10 / side | 60s<br>60s<br>60s | 3–1–1–1<br>2–1–2<br>2–1–3–1 | Controlled force production; progress load or reps, not both aggressively. |
| 3-day | week3-a | Kettlebell Deadlift<br>Farmer Carry<br>Kettlebell Floor Press | 4<br>3<br>4 | 4 × 8–10<br>3 × 45s<br>4 × 8–10 / side | 60s<br>60s<br>60s | 3–1–1–1<br>controlled carry<br>1–1–3–1 | Controlled force production; progress load or reps, not both aggressively. |
| 3-day | week3-b | Goblet Squat<br>Kettlebell Halo<br>Overhead Press | 4<br>4<br>4 | 4 × 8–10<br>4 × 8–10<br>4 × 8–10 / side | 60s<br>60s<br>60s | 3–1–1–1<br>2–1–2<br>2–1–3–1 | Controlled force production; progress load or reps, not both aggressively. |
| 3-day | week3-c | Bent-Over Row<br>Reverse Lunge | 4<br>4 | 4 × 8–10 / side<br>4 × 8–10 / side | 60s<br>60s | 2–1–1–1<br>3–1–1–1 | Controlled force production; progress load or reps, not both aggressively. |
| 4-day | week3-a | Kettlebell Deadlift<br>Farmer Carry<br>Kettlebell Floor Press | 4<br>3<br>4 | 4 × 8–10<br>3 × 45s<br>4 × 8–10 / side | 60s<br>60s<br>60s | 3–1–1–1<br>controlled carry<br>1–1–3–1 | Controlled force production; progress load or reps, not both aggressively. |
| 4-day | week3-b | Goblet Squat<br>Kettlebell Halo<br>Overhead Press | 4<br>4<br>4 | 4 × 8–10<br>4 × 8–10<br>4 × 8–10 / side | 60s<br>60s<br>60s | 3–1–1–1<br>2–1–2<br>2–1–3–1 | Controlled force production; progress load or reps, not both aggressively. |
| 4-day | week3-c | Bent-Over Row<br>Reverse Lunge | 4<br>4 | 4 × 8–10 / side<br>4 × 8–10 / side | 60s<br>60s | 2–1–1–1<br>3–1–1–1 | Controlled force production; progress load or reps, not both aggressively. |
| 4-day | week3-technique | Kettlebell Deadlift<br>Goblet Squat<br>Bent-Over Row | 1<br>1<br>1 | 1 × 8–10<br>1 × 8–10<br>1 × 8–10 / side | 60s<br>60s<br>60s | 3–1–1–1<br>3–1–1–1<br>2–1–1–1 | Low-fatigue technique: Controlled force production; progress load or reps, not both aggressively. |

### Week 4 — Recovery / Deload

| Commitment | Session | Exercises | Sets/Rounds | Reps/Time | Rest | Tempo | Purpose |
|---|---|---|---|---|---|---|---|
| 1-day | week4-essential | Kettlebell Deadlift<br>Goblet Squat<br>Bent-Over Row<br>Suitcase Carry | 2<br>2<br>2<br>2 | 2 × 6–8<br>2 × 6–8<br>2 × 6–8 / side<br>2 × 30s / side | 60s<br>60s<br>60s<br>60s | controlled<br>controlled<br>controlled<br>controlled carry | Maintain movement quality with 30–40% less work and light load. |
| 2-day | week4-a | Kettlebell Deadlift<br>Suitcase Carry<br>Kettlebell Floor Press | 2<br>2<br>2 | 2 × 6–8<br>2 × 30s / side<br>2 × 6–8 / side | 60s<br>60s<br>60s | controlled<br>controlled carry<br>controlled | Maintain movement quality with 30–40% less work and light load. |
| 2-day | week4-b | Goblet Squat<br>Kettlebell Halo<br>Overhead Press | 2<br>2<br>2 | 2 × 6–8<br>2 × 6–8<br>2 × 6–8 / side | 60s<br>60s<br>60s | controlled<br>2–1–2<br>controlled | Maintain movement quality with 30–40% less work and light load. |
| 3-day | week4-a | Kettlebell Deadlift<br>Suitcase Carry<br>Kettlebell Floor Press | 2<br>2<br>2 | 2 × 6–8<br>2 × 30s / side<br>2 × 6–8 / side | 60s<br>60s<br>60s | controlled<br>controlled carry<br>controlled | Maintain movement quality with 30–40% less work and light load. |
| 3-day | week4-b | Goblet Squat<br>Kettlebell Halo<br>Overhead Press | 2<br>2<br>2 | 2 × 6–8<br>2 × 6–8<br>2 × 6–8 / side | 60s<br>60s<br>60s | controlled<br>2–1–2<br>controlled | Maintain movement quality with 30–40% less work and light load. |
| 3-day | week4-c | Bent-Over Row<br>Reverse Lunge | 2<br>2 | 2 × 6–8 / side<br>2 × 6–8 / side | 60s<br>60s | controlled<br>controlled | Maintain movement quality with 30–40% less work and light load. |
| 4-day | week4-a | Kettlebell Deadlift<br>Suitcase Carry<br>Kettlebell Floor Press | 2<br>2<br>2 | 2 × 6–8<br>2 × 30s / side<br>2 × 6–8 / side | 60s<br>60s<br>60s | controlled<br>controlled carry<br>controlled | Maintain movement quality with 30–40% less work and light load. |
| 4-day | week4-b | Goblet Squat<br>Kettlebell Halo<br>Overhead Press | 2<br>2<br>2 | 2 × 6–8<br>2 × 6–8<br>2 × 6–8 / side | 60s<br>60s<br>60s | controlled<br>2–1–2<br>controlled | Maintain movement quality with 30–40% less work and light load. |
| 4-day | week4-c | Bent-Over Row<br>Reverse Lunge | 2<br>2 | 2 × 6–8 / side<br>2 × 6–8 / side | 60s<br>60s | controlled<br>controlled | Maintain movement quality with 30–40% less work and light load. |
| 4-day | week4-technique | Kettlebell Deadlift<br>Goblet Squat<br>Bent-Over Row | 1<br>1<br>1 | 1 × 6–8<br>1 × 6–8<br>1 × 6–8 / side | 60s<br>60s<br>60s | controlled<br>controlled<br>controlled | Low-fatigue technique: Maintain movement quality with 30–40% less work and light load. |

### Week 5 — Power Development

| Commitment | Session | Exercises | Sets/Rounds | Reps/Time | Rest | Tempo | Purpose |
|---|---|---|---|---|---|---|---|
| 1-day | week5-essential | Two-Hand Kettlebell Swing<br>Kettlebell Clean<br>Front-Rack Carry | 4<br>4<br>3 | 4 × 5–6<br>4 × 5–6 / side<br>3 × 30s / side | 90s<br>90s<br>60s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET<br>controlled carry | Explosive quality with full recovery; stop when speed falls. |
| 2-day | week5-a | Two-Hand Kettlebell Swing<br>High Pull | 4<br>4 | 4 × 5–6<br>4 × 5–8 | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 2-day | week5-b | Kettlebell Clean<br>Front-Rack Carry | 4<br>3 | 4 × 5–6 / side<br>3 × 30s / side | 90s<br>60s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>controlled carry | Explosive quality with full recovery; stop when speed falls. |
| 3-day | week5-a | Two-Hand Kettlebell Swing<br>High Pull | 4<br>4 | 4 × 5–6<br>4 × 5–8 | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 3-day | week5-b | Kettlebell Clean<br>Front-Rack Carry | 4<br>3 | 4 × 5–6 / side<br>3 × 30s / side | 90s<br>60s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>controlled carry | Explosive quality with full recovery; stop when speed falls. |
| 3-day | week5-c | Push Press | 4 | 4 × 5–6 / side | 90s | LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 4-day | week5-a | Two-Hand Kettlebell Swing<br>High Pull | 4<br>4 | 4 × 5–6<br>4 × 5–8 | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 4-day | week5-b | Kettlebell Clean<br>Front-Rack Carry | 4<br>3 | 4 × 5–6 / side<br>3 × 30s / side | 90s<br>60s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>controlled carry | Explosive quality with full recovery; stop when speed falls. |
| 4-day | week5-c | Push Press | 4 | 4 × 5–6 / side | 90s | LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 4-day | week5-technique | Two-Hand Kettlebell Swing<br>Kettlebell Clean | 2<br>2 | 2 × 5–6<br>2 × 5–6 / side | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Low-fatigue technique: Explosive quality with full recovery; stop when speed falls. |

### Week 6 — Power Development

| Commitment | Session | Exercises | Sets/Rounds | Reps/Time | Rest | Tempo | Purpose |
|---|---|---|---|---|---|---|---|
| 1-day | week6-essential | Two-Hand Kettlebell Swing<br>Kettlebell Clean<br>Front-Rack Carry | 4<br>4<br>3 | 4 × 5–6<br>4 × 5–6 / side<br>3 × 40s / side | 90s<br>90s<br>60s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET<br>controlled carry | Explosive quality with full recovery; stop when speed falls. |
| 2-day | week6-a | Two-Hand Kettlebell Swing<br>High Pull | 4<br>4 | 4 × 5–6<br>4 × 5–8 | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 2-day | week6-b | Kettlebell Clean<br>Clean to Press | 4<br>4 | 4 × 5–6 / side<br>4 × 5–6 / side | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 3-day | week6-a | Two-Hand Kettlebell Swing<br>High Pull | 4<br>4 | 4 × 5–6<br>4 × 5–8 | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 3-day | week6-b | Kettlebell Clean<br>Clean to Press | 4<br>4 | 4 × 5–6 / side<br>4 × 5–6 / side | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 3-day | week6-c | Push Press<br>Front-Rack Carry | 4<br>3 | 4 × 5–6 / side<br>3 × 40s / side | 90s<br>60s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>controlled carry | Explosive quality with full recovery; stop when speed falls. |
| 4-day | week6-a | Two-Hand Kettlebell Swing<br>High Pull | 4<br>4 | 4 × 5–6<br>4 × 5–8 | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 4-day | week6-b | Kettlebell Clean<br>Clean to Press | 4<br>4 | 4 × 5–6 / side<br>4 × 5–6 / side | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 4-day | week6-c | Push Press<br>Front-Rack Carry | 4<br>3 | 4 × 5–6 / side<br>3 × 40s / side | 90s<br>60s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>controlled carry | Explosive quality with full recovery; stop when speed falls. |
| 4-day | week6-technique | Two-Hand Kettlebell Swing<br>Kettlebell Clean | 2<br>2 | 2 × 5–6<br>2 × 5–6 / side | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Low-fatigue technique: Explosive quality with full recovery; stop when speed falls. |

### Week 7 — Power Development

| Commitment | Session | Exercises | Sets/Rounds | Reps/Time | Rest | Tempo | Purpose |
|---|---|---|---|---|---|---|---|
| 1-day | week7-essential | Two-Hand Kettlebell Swing<br>Kettlebell Clean<br>Front-Rack Carry | 5<br>5<br>3 | 5 × 5–6<br>5 × 5–6 / side<br>3 × 45s / side | 90s<br>90s<br>60s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET<br>controlled carry | Explosive quality with full recovery; stop when speed falls. |
| 2-day | week7-a | Two-Hand Kettlebell Swing<br>High Pull<br>Front-Rack Carry | 5<br>5<br>3 | 5 × 5–6<br>5 × 5–8<br>3 × 45s / side | 90s<br>90s<br>60s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET<br>controlled carry | Explosive quality with full recovery; stop when speed falls. |
| 2-day | week7-b | Kettlebell Clean<br>Clean to Press | 5<br>5 | 5 × 5–6 / side<br>5 × 5–6 / side | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 3-day | week7-a | Two-Hand Kettlebell Swing<br>High Pull<br>Front-Rack Carry | 5<br>5<br>3 | 5 × 5–6<br>5 × 5–8<br>3 × 45s / side | 90s<br>90s<br>60s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET<br>controlled carry | Explosive quality with full recovery; stop when speed falls. |
| 3-day | week7-b | Kettlebell Clean<br>Clean to Press | 5<br>5 | 5 × 5–6 / side<br>5 × 5–6 / side | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 3-day | week7-c | Push Press<br>Kettlebell Snatch | 5<br>5 | 5 × 5–6 / side<br>5 × 5–6 / side | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 4-day | week7-a | Two-Hand Kettlebell Swing<br>High Pull<br>Front-Rack Carry | 5<br>5<br>3 | 5 × 5–6<br>5 × 5–8<br>3 × 45s / side | 90s<br>90s<br>60s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET<br>controlled carry | Explosive quality with full recovery; stop when speed falls. |
| 4-day | week7-b | Kettlebell Clean<br>Clean to Press | 5<br>5 | 5 × 5–6 / side<br>5 × 5–6 / side | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 4-day | week7-c | Push Press<br>Kettlebell Snatch | 5<br>5 | 5 × 5–6 / side<br>5 × 5–6 / side | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Explosive quality with full recovery; stop when speed falls. |
| 4-day | week7-technique | Two-Hand Kettlebell Swing<br>Kettlebell Clean | 2<br>2 | 2 × 5–6<br>2 × 5–6 / side | 90s<br>90s | LOAD → EXPLODE → FLOAT/CATCH → RESET<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Low-fatigue technique: Explosive quality with full recovery; stop when speed falls. |

### Week 8 — Consolidate / Assess

| Commitment | Session | Exercises | Sets/Rounds | Reps/Time | Rest | Tempo | Purpose |
|---|---|---|---|---|---|---|---|
| 1-day | week8-essential | Kettlebell Deadlift<br>Goblet Squat<br>Bent-Over Row<br>Front-Rack Carry | 3<br>3<br>3<br>2 | 3 × 5–6<br>3 × 5–6<br>3 × 5–6 / side<br>2 × 30s / side | 75s<br>75s<br>75s<br>75s | controlled assessment<br>controlled assessment<br>controlled assessment<br>controlled carry | Submaximal quality, capacity, symmetry and technical consistency. |
| 2-day | week8-a | Kettlebell Deadlift<br>Two-Hand Kettlebell Swing | 3<br>3 | 3 × 5–6<br>3 × 5–6 | 75s<br>75s | controlled assessment<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Submaximal quality, capacity, symmetry and technical consistency. |
| 2-day | week8-b | Goblet Squat<br>Kettlebell Clean | 3<br>3 | 3 × 5–6<br>3 × 5–6 / side | 75s<br>75s | controlled assessment<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Submaximal quality, capacity, symmetry and technical consistency. |
| 3-day | week8-a | Kettlebell Deadlift<br>Two-Hand Kettlebell Swing | 3<br>3 | 3 × 5–6<br>3 × 5–6 | 75s<br>75s | controlled assessment<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Submaximal quality, capacity, symmetry and technical consistency. |
| 3-day | week8-b | Goblet Squat<br>Kettlebell Clean | 3<br>3 | 3 × 5–6<br>3 × 5–6 / side | 75s<br>75s | controlled assessment<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Submaximal quality, capacity, symmetry and technical consistency. |
| 3-day | week8-c | Bent-Over Row<br>Front-Rack Carry | 3<br>2 | 3 × 5–6 / side<br>2 × 30s / side | 75s<br>75s | controlled assessment<br>controlled carry | Submaximal quality, capacity, symmetry and technical consistency. |
| 4-day | week8-a | Kettlebell Deadlift<br>Two-Hand Kettlebell Swing | 3<br>3 | 3 × 5–6<br>3 × 5–6 | 75s<br>75s | controlled assessment<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Submaximal quality, capacity, symmetry and technical consistency. |
| 4-day | week8-b | Goblet Squat<br>Kettlebell Clean | 3<br>3 | 3 × 5–6<br>3 × 5–6 / side | 75s<br>75s | controlled assessment<br>LOAD → EXPLODE → FLOAT/CATCH → RESET | Submaximal quality, capacity, symmetry and technical consistency. |
| 4-day | week8-c | Bent-Over Row<br>Front-Rack Carry | 3<br>2 | 3 × 5–6 / side<br>2 × 30s / side | 75s<br>75s | controlled assessment<br>controlled carry | Submaximal quality, capacity, symmetry and technical consistency. |
| 4-day | week8-technique | Kettlebell Deadlift<br>Goblet Squat<br>Bent-Over Row | 1<br>1<br>1 | 1 × 5–6<br>1 × 5–6<br>1 × 5–6 / side | 75s<br>75s<br>75s | controlled assessment<br>controlled assessment<br>controlled assessment | Low-fatigue technique: Submaximal quality, capacity, symmetry and technical consistency. |

## Source Traceability
- Weekly phases and general loading come from `exercise-generation/kettlebellchallenge/kettlebellchallengebreakdown`.
- Exercise-specific time, set/rep, rest, tempo, unilateral, carry, composite, and ballistic rules take precedence where explicit.
- Exercise distribution and low-fatigue Day D come from the approved allocation rules in this phase.
- Canonical IDs/names use the existing challenge exercise set; generic Exercise DB defaults are not consulted by this allocator.
- Each exercise row is marked `explicit exercise prescription + approved allocation rule`. No unsupported prescription is active.

## Weekly Volume Comparison
- **1 day:** a safe essential subset, not the cumulative A/B/C volume.
- **2 days:** the weekly pool is distributed across balanced A/B sessions; neither duplicates the essential circuit.
- **3 days:** the full normal pool is distributed once across A/B/C.
- **4 days:** the same A/B/C hard structure plus a short 1–2-set/round technique exposure. It does not duplicate C.
- Week 4 never exceeds two sets in A/B/C and Day D is one set; light 60–70% intent remains required. Power Day D uses only two technical ballistic sets with 90 seconds recovery.

## Special Exercise Semantics
Carries remain timed; unilateral work is explicitly per side; halo remains cyclical; swing/clean/high pull/snatch retain ballistic LOAD → EXPLODE semantics; clean-to-press remains composite and per side.

## Routes / APIs
Reused: public challenge detail; protected enrollment, active schedule retrieval, commitment reschedule, commitment session start, and session completion. No new public surface was required.

## Persistence Behavior
Enrollment persists `canonicalSessionId` on every workout commitment. Rescheduling swaps calendar placement without changing this identity. Existing source metadata persists the same ID through runtime and completion correlation.

## UI Impact
No broad UI or CSS changes. The browser continues receiving resolved server programming rather than constructing workouts.

## Mobile Status
Existing mobile enrollment UI and Playwright spec were preserved. Rendered-browser verification was not performed: Playwright acquisition returned HTTP 403 from npm.

## Tests Added
Seven canonical allocation tests cover schema/all weeks, A/B/C sequencing, weekday independence, rescheduling identity, recovery preservation, enrollment→resolve→start→complete→credit for levels 1–4, duplicate completion, deload caps, Day D, power semantics, and Week 8.

## Tests Run
- `npm run lint`: PASS (selfcheck).
- `npm test`: PASS — 1,184 passed, 0 failed, 0 skipped/cancelled/todo.
- `node --test test/kettlebell-canonical-allocation.test.js test/kettlebell-commitment-scheduler.test.js test/kettlebell-workout-integration.test.js test/kettlebell-commitment-routes-ui.test.js`: PASS — 23 passed, 0 failed.
- `npm run security:validate-routes`: PASS — contract matches 285 runtime routes.
- `npm run test:e2e:mobile`: ENVIRONMENT BLOCKED — Playwright package download HTTP 403; 0 rendered tests executed.
The full npm suite includes challenge engine, commitment scheduler, workout integration, persistence, progression, gamification, and route-security regression tests.

## Route Verification
Public detail returned 200. Unauthenticated enrollment and reschedule returned 401. Authenticated enrollment returned 201, owner reschedule 200, session start 201, and completion 200. The runtime authorization contract covered all 285 routes.

## Authenticated Verification
Test login tokens exercised enrollment, reschedule, start, and completion. Canonical source identity survived the complete path and duplicate completion returned idempotently.

## Security / Ownership Verification
A second authenticated user received 404 when starting the owner's commitment. Owner-scoped reschedule remained protected; route contract validation passed.

## Regression Risks
Existing enrollments created before this phase lack persisted `canonicalSessionId`, but runtime resolution remains deterministic from stored commitment and ordinal. Changes to exercise IDs must update the canonical program or validation will fail at module load.

## Known Limitations
Rendered mobile browser evidence is unavailable in this environment because npm returned HTTP 403 acquiring Playwright. Week 8 supplies assessment-compatible sessions but the final benchmark engine remains a separate phase as requested.

## Unresolved Programming Questions
None block activation. The source gives ranges in several phases; the canonical rows preserve those ranges rather than inventing a single load or 1RM. Actual kettlebell load remains runtime-recorded.

## Merge Readiness
**READY WITH KNOWN LIMITATIONS**

All 1–4 day allocations are active and backend flows/regressions pass. The only limitation is unavailable rendered-browser execution; no mobile UI changed and the E2E spec remains ready for CI/developer execution.

## Recommended Next Phase
After human approval only: **Exercise Cards + Exercise Education Experience**, beginning with Goblet Squat, Kettlebell Halo, Bent-Over Row, and Suitcase Carry. Do not alter canonical allocation during that phase without a programming review.
