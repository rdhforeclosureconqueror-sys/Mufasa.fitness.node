# V3 — Coach Guide & Operations Layer

This update addresses a usability gap in V2: the screens showed a powerful coaching architecture, but a new coach could not necessarily tell what each status meant, where it came from, or what action should change it.

## Added

- A visual, mobile-friendly Coach Guide available directly from the standalone system via a persistent **? Coach Guide** button.
- Full player onboarding workflow.
- A competency evidence ladder defining how to gauge development from Not Assessed through Verified / Current.
- Clear evidence-quality guidance and examples.
- Domain definitions for Movement Ready, Conditioning Ready, Contact Ready, Tackle Ready, Ruck Ready, Maul Ready, Lineout Ready and Scrum Ready.
- Explanation of how readiness should be updated: **log source evidence; do not type arbitrary percentages.**
- Competency Graph operating instructions.
- Movement, Testing, Technical Skills, Rugby IQ and Video evidence instructions.
- Training Planner instructions for adding/editing/removing sessions and blocks.
- Match Selection instructions for adding/removing players and hard safety locks.
- Player Welfare operating boundaries.
- Safeguarding reporting workflow and permissions explanation.
- Command Center explanation: derived dashboard, not a duplicate manual-entry screen.
- An editability map showing coach-entered, system-calculated and restricted data.
- Daily/weekly coach operating rhythm.
- `COACH_OPERATIONS_GUIDE.md` — full text manual.
- `SYSTEM_DATA_ENTRY_SPEC.md` — production implementation requirements for Add / Edit / Remove / Log Evidence actions.

## Core design decision

The system should not make coaches manually invent readiness scores. The production rule is:

**Coach records evidence → Pocket PT evaluates the defined pathway/rubric → the system displays readiness and next prerequisites.**

Safety-critical failures and restrictions are hard gates and cannot be averaged away.
