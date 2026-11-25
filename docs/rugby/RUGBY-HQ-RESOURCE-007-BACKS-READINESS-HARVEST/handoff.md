# Rugby HQ Handoff

## Context

The existing Pocket PT Rugby Coaching OS already covers a large portion of rugby operations:

- coach command center,
- roster and availability,
- player development record,
- starter / bench / developing status,
- coach-verified competency acknowledgments,
- scrum prerequisite graph and staged progression,
- training planner,
- evidence-informed starting XV board,
- player welfare and concussion recognition workflow,
- restricted safeguarding / athlete welfare workspace,
- coach-readiness checklist,
- DFW Academy pathway.

The key gap identified in the thread is that forwards have a clearer rugby-ready pathway because of scrum and contact readiness, while backs do not yet have an equivalent system.

Rugby HQ needs a backs-specific readiness framework that can judge players from 10 through 15:

- fly-half,
- inside center,
- outside center,
- wings,
- fullback.

The system should make readiness visible to players and coaches, similar to a sports video game rating card, while still being grounded in real coaching observation.

## Product goal

Create a Backs Rugby Ready module that answers:

1. Is this back safe and ready to play?
2. Is this back starter eligible?
3. What role is this back best suited for?
4. What skills or rugby IQ areas are holding them back?
5. What evidence did coaches use to make the rating?
6. What should the player work on next?

## Key distinction

There must be two separate rating systems:

### 1. Backline Skill/IQ Rating

This judges rugby skill, rugby intelligence, role understanding, and decision-making.

It includes:

- defensive IQ,
- tackling in space,
- attack IQ,
- ball skills,
- movement and evasion,
- role-specific skill.

### 2. Backline Athletic Index

This judges physical performance and rugby-specific fitness.

It includes:

- acceleration,
- top-end speed,
- agility,
- repeat effort,
- endurance,
- power,
- contact/reload repeatability.

A player can be fast and athletic but still not starter-ready if they cannot defend space, communicate, tackle safely, or understand the game.

## Readiness bands

Use a 1–99 visible player rating.

| Score | Meaning |
|---:|---|
| 90–99 | Impact starter / elite within the program |
| 80–89 | Clear starter-ready |
| 70–79 | Match-ready / rotation player |
| 60–69 | Developmental / situational use |
| Below 60 | Not yet rugby-ready for that role |

## Hard eligibility gates

These gates override the numeric rating.

A player cannot be starter eligible if:

- tackling safety is below the required threshold,
- medical/welfare status blocks participation,
- concussion/return-to-play status is unresolved,
- safeguarding restriction blocks participation,
- required profile/registration requirement is missing for competition use,
- position-specific safety requirement is not met.

For backs specifically:

- tackling-in-space score below 70 should block starter eligibility,
- defensive IQ below 65 should require coach approval before starting,
- unsafe high-ball technique for wings/fullback should restrict those roles,
- poor last-line tackle safety should restrict fullback use.

## Coach observation philosophy

Every score should be backed by evidence.

Evidence types:

- drill,
- controlled scrimmage,
- match,
- video clip,
- coach review.

Each observation should include:

- player,
- position evaluated,
- category,
- competency,
- score,
- evidence type,
- coach note,
- clip or timestamp if available,
- evaluator,
- date,
- confidence level,
- next action.

## UX idea

Every player should have a visible card:

```text
Backline Skill/IQ Rating: 76
Backline Athletic Index: 82
Safety/Availability: Green
Backs Rugby Ready Status: Starter Eligible
Primary Role: 13
Secondary Role: Wing
Next Action: Improve edge defensive connection with wing.
```

If blocked:

```text
Backline Skill/IQ Rating: 81
Backline Athletic Index: 91
Safety/Availability: Red
Backs Rugby Ready Status: Not Starter Eligible
Reason: Tackling safety below required standard.
Next Action: Complete Tackle Ready reassessment.
```

## Implementation recommendation

Build the backs module as data first:

1. Add rubric definitions as JSON.
2. Add coach observation storage.
3. Compute category scores from observations.
4. Apply hard gates.
5. Show a player-facing rating card.
6. Show a coach-facing evidence view.
7. Add role overlays for 10, 12, 13, wing, and 15.
8. Keep fitness tests separate from Skill/IQ readiness.
