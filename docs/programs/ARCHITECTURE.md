# Program Engine Architecture

## Authority boundaries

The Program Engine is the sole planning authority. It emits versioned programs and scheduled workout, Yoga, mobility, cardio/recovery, and rest sessions. The Workout Engine executes a selected session; Movement evaluates quality; Gamification consumes verified milestone events; AI Coach receives a read-only, `explain_only` view.

Generation is a pure deterministic pipeline: validated constraints → goal template → exercise selection → periodization → progression → unified schedule. Identical normalized input, content version, and start date produce identical IDs and output. Modules isolate validation, templates, selection, periodization, progression, substitution, scheduling, analytics, persistence, events, generation, and orchestration.

## Integration and performance

`GET /api/programs/current` prefers the authoritative view. Assignment and session status writes are authenticated and scoped to the token subject. Derived calendar views and analytics are calculated from one persisted assignment read; they are not persisted. Callers may cache views by assignment version. Content-version changes intentionally create a new deterministic program ID.

## Risks and future compatibility

The launch catalog is deliberately compact. Exercise metadata should later move to the shared catalog adapter. Running, trails, wearables, and nutrition can add typed sessions without changing the schedule contract. Unknown schema fields must be ignored. A future migration is required before changing schema version 1.
