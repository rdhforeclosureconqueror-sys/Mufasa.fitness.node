# Pocket PT — Adult Activate Engine Handoff v1

## Product Goal
Build an Adult Activate Engine for rugby athletes aged 20+. Use a clearly labeled **Activate-Aligned Adult Foundation** as the official-foundation layer and a distinct **Pocket PT Beast Mode Rugby Performance System** above it.

**Philosophy:** Activate is the floor. Beast Mode is the ceiling.

## Foundation
- Training-session Activate
- Match-day Activate
- Seven adult progression levels
- Four-part session structure
- Coach-monitored quality standards
- Progression based on control, balance and technique
- Exercise records should support official/current drills, dose, coaching cues, faults, regression and progression

## Activate 8
1. Head neutral / lifted
2. Chest up
3. Pinch shoulders together
4. Shoulders level with hips
5. Brace through the trunk
6. Soft knees
7. Hip, knee, ankle in line
8. Knee over toes

## Coach Tracking
Attendance: attended / full / partial / missed / reason.
Movement quality 1–5: control, balance, technique, trunk stability, lower-limb alignment, landing, change of direction, neck control, fatigue breakdown.
Readiness: soreness, pain flag, injury concern, concussion concern, fatigue, notes.
Status: Not assessed / Learning / Needs regression / Hold / Ready with reduced volume / Ready to progress / Advanced-Beast Mode candidate.

## Default Progression
Progress when attendance >=75%, control >=4, balance >=4, technique >=4, no active pain/injury flag and coach_approved=true.
Team progression: if >=70% squad ready, move the team while scaling athletes individually.
Regression: if quality <3, pain flag active, or required movement cues cannot be maintained, reduce dose/regress/return to prior level.

## Pocket PT Extension
Functional Stability → Maximum Stability → Strength Stabilization → Maximum Strength → Power → Maximum Power → Beast Mode.

No athlete enters the extension if foundational movement quality cannot be preserved.

## MVP Data Entities
athletes
activate_levels
activate_parts
activate_exercises
activate_cues
exercise_cues
athlete_activate_status
session_logs
athlete_session_scores

## Workflow
Before: select Team → Session Type → Activate Level → Structured/Integrated; review welfare flags.
During: show Parts A–D, instructions, dose, cues, faults, regressions, progressions, notes.
After: score quality, attendance, pain/injury, readiness and notes.
Recommend: Progress / Hold / Regress / Reduce volume / Beast Mode candidate.

## Guardrail
Do not present Pocket PT as replacing World Rugby Activate. Keep the official-aligned foundation and Pocket PT extension visibly separated. Version exact exercise content from authorized/current official materials.
