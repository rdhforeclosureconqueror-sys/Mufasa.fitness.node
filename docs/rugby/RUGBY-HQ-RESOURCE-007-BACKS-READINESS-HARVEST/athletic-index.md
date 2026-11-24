# Backline Athletic Index

## Purpose

The Backline Athletic Index is separate from the Backline Skill/IQ Rating.

It measures rugby-specific athletic ability for backs.

Do not let this score override safety, defensive IQ, or skill-readiness gates.

## Recommended categories

| Category | Weight for backs | Test examples |
|---|---:|---|
| Speed | 25% | 10m sprint, 20m sprint, 40m sprint |
| Agility | 25% | T-test, 5-10-5, reactive cone drill |
| Repeat effort | 20% | Get-up sprint repeat drill |
| Endurance | 15% | Bronco, beep test |
| Power | 10% | Broad jump, vertical jump, medicine ball throw |
| Strength | 5% | Rugby-relevant strength measures, not bench-only |

## Fitness philosophy

Rugby is not played on a bench press. Gym strength matters, but the test battery should value transferable rugby movement.

Preferred power tests:

- medicine ball chest pass / throw,
- broad jump,
- vertical jump.

Preferred endurance tests:

- Bronco,
- beep test.

Preferred speed/agility tests:

- 10m sprint,
- 20m sprint,
- 40m sprint,
- T-cone drill,
- 5-10-5 shuttle,
- reactive cone drill.

## Rugby-specific get-up sprint drill

This drill should be a named Rugby HQ test.

### Test description

1. Athlete starts on the ground.
2. Athlete pops up.
3. Athlete sprints 5 yards.
4. Athlete drops to the ground.
5. Athlete pops up.
6. Athlete sprints back 5 yards.
7. That down-and-back sequence counts as 1 rep.
8. Athlete completes 3 reps for time.

### What it measures

- repeat effort,
- acceleration,
- body control,
- speed off the ground,
- tackle-to-reload ability,
- fatigue resistance.

### Why it matters

This simulates a rugby action sequence:

```text
make tackle -> get up -> reload -> chase/defend -> repeat
```

## Bronco note

The standard rugby Bronco is commonly run as repeated shuttles to 20m, 40m, and 60m lines for 5 total sets. If Rugby HQ uses a yard-based local variant, define that variant clearly in the app and store the protocol used with the test result.

Suggested data field:

```json
{
  "testName": "Bronco",
  "protocol": "local_yard_variant",
  "description": "Goal line to 5, back; 10, back; 40, back; 50, back; repeated for assigned sets."
}
```

## Backline Athletic Index output

Example:

```text
Backline Athletic Index: 82
Speed: 88
Agility: 84
Repeat Effort: 79
Endurance: 76
Power: 81
Strength: 70
```

## Do not mix with selection status

A player can be:

```text
Athletic Index: 91
Skill/IQ Rating: 63
Status: Not starter eligible
Reason: Defensive IQ and tackling-in-space below threshold.
```

That is a feature, not a bug. It prevents fast but unsafe or tactically unreliable backs from being mislabeled as ready.
