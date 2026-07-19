# Phase 4 personalization audit

The application recommendation boundary is `personalizationService`. It derives all
consumer views from the canonical Journey Profile and is the only application layer
allowed to select workout categories, dashboard modules, nutrition priorities,
assessment recommendations, or pathway feature flags.

## Migrated recommendation consumers

- `GET /api/programs/current`: workout recommendation metadata now comes from the
  service; an existing assigned program is returned unchanged.
- `GET /api/progress/dashboard`: widget/module selection now uses the canonical
  dashboard configuration.
- `GET /api/me/nutrition/education`: nutrition priorities now use the canonical
  service. Weekly mission creation and progress algorithms are unchanged.
- `GET /api/me/ohsa`: assessment recommendations now use the canonical service;
  assessment history and completion state are unchanged.
- `GET /api/me/personalization`: exposes the shared consumer contract and
  deterministic feature flags.
- `public/retention-flow.js`: workout discovery availability and assessment next-step
  state consume that shared contract. The legacy goal check remains only as a
  fallback for accounts that have not yet created a Journey Profile.

## Legacy data retained outside recommendation decisions

- `journeyIntakeService.migrate` reads `clientIntake`, `goalsBaseline`, and `profile`
  once to create a versioned intake for backward compatibility.
- `userDataService` continues to read legacy intake, goals, profile, and assigned
  program for legacy CRUD, progress history, coach copy, and reports. These are not
  recommendation selectors and remain compatible.
- `public/retention-flow.js` remains the legacy onboarding editor for compatibility,
  but does not derive recommendation decisions from its legacy form values.

No assigned program, Weekly Nutrition Mission, or assessment completion record is
written by personalization reads.
