# Rugby HQ Implementation Notes for Mufasa Fit

## Recommended routes/pages

- `/rugby-hq` — main dashboard
- `/rugby-hq/learn` — course-derived learning modules
- `/rugby-hq/screening` — movement screens and MoveNet capture
- `/rugby-hq/drills` — drill library
- `/rugby-hq/program-builder` — weekly plan builder
- `/rugby-hq/wellness` — daily wellness check-in
- `/rugby-hq/load` — RPE and weekly load
- `/rugby-hq/game` — Rugby HQ game integration

## Suggested components

- `RugbyHQDashboard`
- `AthleteReadinessCard`
- `SessionLoadCalculator`
- `WellnessCheckinForm`
- `ScreeningTestCard`
- `MoveNetScreeningCapture`
- `DrillLibrary`
- `DrillClassifier`
- `WeeklyPlanBuilder`
- `RugbyHqGameChallenge`

## Activation logic

When the bot enters Rugby HQ mode, load:

1. `prompts/rugby_hq_bot_system_prompt.md`
2. `data/rugby_hq_knowledge_base.json`
3. `data/rugby_hq_drills.json`
4. `data/rugby_hq_screening_tests.json`
5. `data/rugby_hq_programming_rules.json`

## MVP data models

Use the JSON schemas in `schemas/rugby_hq_data_schemas.json`.

Minimum entities:
- Athlete
- WellnessCheckin
- SessionLog
- ScreeningResult
- Drill
- WeeklyPlan
- GameChallenge

## Suggested bot commands

- "Build a pre-season week for 10 amateur players"
- "Classify this drill"
- "Create a 3v2 fatigue decision game"
- "Log session RPE"
- "Interpret this overhead squat screen"
- "Give me a sand acceleration session"
- "Create an unload week"
- "Create a taper for a tournament weekend"
