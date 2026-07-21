# Pocket PT Program State Validation Report

## Resolution and root cause

The member-facing canonical resolver is `resolveMemberProgramState`. Previously,
the generated-workout read model independently treated any persisted generated
recommendation as active, while the retention UI independently rendered its
assignment library whenever personalization existed. The generated-plan UI also
kept execution controls enabled beside an assigned program. Those three local
decisions produced the contradictory message, assignment buttons, and competing
workouts.

## Program source inventory

| Source | Purpose | Persistence | API | Frontend | Priority |
| --- | --- | --- | --- | --- | --- |
| Coach assignment | Authoritative coach prescription | `user.program` JSON record | `GET /api/programs/current` | retention flow, Member Home | 1 |
| Member selection | Explicitly confirmed member choice | `user.program`/legacy `user.selectedProgram` | `POST /api/programs` | retention flow | 2 |
| Activated generated plan | Explicitly activated generated week | `user.generatedWorkoutPlan` with `recommendationOnly=false`, active status | generated-workout APIs | generated workout runtime | 3 |
| Template fallback | Generic preconfigured program | legacy `user.templateProgram` | read-model fallback | workout fallback UI | 4 |
| Emergency fallback | Safe empty/default workout behavior | not an assignment | local workout fallback | workout runtime | 5 |
| Journey/assessment recommendation | Suggestion metadata only | `user.programRecommendation` | personalization/generated plan reads | recommendation preview | Not active |
| Generated weekly recommendation | Preview/progression candidate | `user.generatedWorkoutPlan` with `recommendationOnly=true` | `/api/me/generated-workout-plan` | Available Recommendations | Not active |
| Daily generated session | Executable session only when its generated plan is active | `user.generatedWorkoutExecutions` | generated execution APIs | generated session dialog | Derived |
| Assigned daily workout | Today's session from the active assignment/calendar | assignment plus workout tracking | program/workout APIs | retention calendar | Derived |

## Final resolution rules

1. A persisted assignment (`user.program`) wins; its assignment metadata
   distinguishes member selection from coach assignment without changing trainer
   behavior.
2. A legacy member selection (`user.selectedProgram`) is next.
3. A generated plan is active only when it is explicitly active and is not marked
   recommendation-only.
4. A persisted template program is a fallback.
5. Otherwise there is no active program. Recommendation records remain previews.

Today's Workout is derived only from the canonical active source. Generated
sessions cannot become Member Home's next/in-progress workout unless the generated
plan is explicitly active. The generated execution API returns a conflict while an
assignment is active. Assigned-program daily detail remains the authoritative
Today's Workout; recommendation sessions are labeled Preview.

## UI behavior matrix

| State | Active heading | Recommendation controls | Today's workout |
| --- | --- | --- | --- |
| No program | No active program | Use this program | Safe fallback/none |
| Member-assigned | Current Active Program | Switch Program (confirmation) | Assigned calendar session |
| Coach-assigned | Current Active Program | Switch Program (confirmation) | Coach program session |
| Recommendation only | No active program | Use this program | Safe fallback/none |
| Template fallback | Current Active Program | Preview/switch | Template workout |

## Persistence validation

Assignments remain in the repository's existing per-user JSON store and are read
again for refresh/login/restart. Automated restart coverage verifies replacement
of the store instance against the same directory. Deployment persistence still
depends on the production persistent volume and therefore requires production
validation; storage was not redesigned here.
