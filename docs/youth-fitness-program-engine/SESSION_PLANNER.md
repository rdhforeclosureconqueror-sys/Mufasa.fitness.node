# Phase 5 — Session Planner

## Purpose and program relationship

The deterministic Session Planner turns one canonical Phase 4 session slot into a versioned, executable session blueprint. Its hierarchy is profile → program → phase → week → session slot → blueprint → blocks → approved activities. It accepts no orphan workout request: the exact slot object must be owned by the validated program, its week must be covered by the referenced phase, and profile/program identity and training level must agree.

## Inputs and output

`planYouthFitnessSession(profile, program, sessionSlot, options)` consumes normalized Phase 3 and Phase 4 objects. The profile, complete program, slot membership, targets, age band, level, schedule, participant reference, and equipment are validated before selection. The output records deterministic `session_blueprint_id`, upstream IDs, week/code, focus, age presentation, requested and estimated minutes, effort, status, blocks, education, coach/participant notes, neutral reflection prompts, safety flags, coverage, local validation, warnings, and version.

The eight canonical blocks are `READINESS`, `DYNAMIC_WARMUP`, `SKILL_MOVEMENT_LEARNING`, `STRENGTH_ENDURANCE`, `CONDITIONING_GAME`, `MOBILITY_ACTIVE_RECOVERY`, `BREATHING_RECOVERY`, and `REFLECTION_TRACKING`. Short sessions scale their time budgets conservatively; totals must stay within output tolerance. A block remains visible even when the limited registry cannot supply an eligible activity, and the resulting target warning explicitly states that no replacement was invented.

## Approved activity selection and prescriptions

Selection is deterministic and reads only the validated Phase 2 registry. Eligibility requires `APPROVED` status, level rank at or below the participant, every equipment requirement, target type/family support, complete instruction/cue/error/stop metadata, and provenance. Unknown, unavailable, mismatched, or free-text activities fail closed. Games are first-class when the slot requests them; no punishment conditioning, maximal lifting, training to exhaustion, invented movement, or AI generation exists.

Output activities carry registry identity/name/type/family; their block; one or two sets; conservative repetitions or time; 30–90 seconds rest; a technique quality stop rule; optional registry regression/progression IDs; complete registry instructions, cues, errors, and stop conditions; and evidence source/rule IDs. These static relationships do not infer performance or advance a participant.

## Readiness, stress, equipment, level, and age

The readiness block reminds collection of energy, soreness, sleep quality, and pain. Reported pain preserves a non-diagnostic flag, changes the blueprint to `COACH_REVIEW_REQUIRED`, and tells the supervising adult to review before activity; it never directs a participant to push through pain. If recent impact/high stress is present, moderate/high-impact candidates are excluded and a transparent warning/flag is added. This is an early conservative hook, not Phase 7 training memory or adaptation.

Equipment is conjunctive: every registry requirement must appear in the profile. A bodyweight-only profile therefore receives only bodyweight-feasible records and warnings for targets the seed cannot meet. Competency level—not age—controls eligibility. Foundation cannot receive Development/Progression items. Age changes names, presentation style, and note wording only; it never increases difficulty.

## Education, reflection, and local validation

The planner reuses the program week's claim-inspected education. Reflection asks what went well, what improved with practice, and perceived difficulty without shame or moral judgment. Local Phase 5 validation rejects missing identity/week/session, unsupported age/level/block/type/family, non-registry or unapproved records, metadata mismatch, over-level activity, equipment mismatch, missing instructions/cues/stops/provenance, unsafe dose, out-of-tolerance duration, prohibited prescriptions, diagnostic/treatment language, and unreviewed education. This is fail-closed output integrity, not the independent final safety veto.

## Not in Phase 5 and next phase

Phase 5 adds no final Safety Validator, full adaptation/training-memory engine, assessment execution, persistence or migrations, API/UI, coach/admin editor, AI call, gamification, Pocket PT delivery integration, or Leader Within bridge. Staging/live verification is not claimed. **Next: Phase 6 — Final Safety Validator.**
