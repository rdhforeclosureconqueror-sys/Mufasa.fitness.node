# Sprint 2 Approved Architecture Decisions

**Status:** Approved implementation contract

**Approval date:** 2026-07-30

**Scope:** These decisions resolve the Sprint 2 entry blockers recorded in the Phase 1 implementation log. They authorize the Achievement Engine sprint and supersede the corresponding unresolved implementation questions for this sprint. Existing Phase 1 invariants continue to apply.

## Correction and revocation

- Historical events, awards, and XP effects are immutable and append-only.
- A correction is a compensating `workout.revoked` event that references the original event and an allow-listed reason.
- Invalidated evidence is excluded during deterministic replay. Any affected award receives an append-only revocation record and its XP receives one unique, equal-and-opposite ledger entry.
- Records are never edited or deleted. The source event, correction event, award, revocation, XP effect, and reversal preserve the complete audit trail.

## Projection and replay

- The immutable event log and append-only outcome records are authoritative.
- User projections are disposable and can be deleted and rebuilt by replaying the complete event stream.
- Phase 1 uses simple bounded-page replay. It has no snapshots, durable evaluation checkpoints, or advanced replay optimization.
- Stable ordering, qualification keys, award keys, and effect keys make live delivery, retries, restart, and full replay idempotent.

## Catalogue Version 1

- Catalogue Version 1 is a bounded, production-reviewed set of 24 achievements supported by the authoritative `workout.completed` event available at the end of Sprint 1.
- Definitions are immutable, published Version `1.0.0` records with fixed integer XP, badge references, explicit effective time, accepted event schemas, verification methods, typed criteria, and one-time repeatability.
- Future walking, running, trail, step, nutrition, coaching, and profile achievements are added as new versioned definitions only after their authoritative event adapters exist. The evaluator and stores require no redesign for those additions.

## Included Phase 1 behavior

- Deterministic typed achievement evaluation and progress tracking.
- Append-only achievement and badge awards, XP effects, correction revocations, and XP reversals.
- Level projection from the reviewed Version 1 cumulative threshold table.
- Full event consumption and deterministic projection replay.
- Invisible outcomes while read APIs and notifications remain disabled.

## Explicit exclusions

Prestige, seasons, marketplace behavior, cosmetic entitlement/unlock systems, trading, social gifting, guilds, leaderboards, loot/random rewards, and premium reward mechanics are not part of Sprint 2.
