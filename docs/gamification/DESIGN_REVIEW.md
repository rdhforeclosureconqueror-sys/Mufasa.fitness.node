# Gamification Design Review

**Status:** Architecture direction accepted; the open questions below must be resolved before production implementation or economy publication.

**Scope:** Achievement evaluation, immutable event evidence, append-only awards, and XP derived from accepted domain activity.

**Companion specifications:** [Achievement system](ACHIEVEMENT_SYSTEM.md), [event model](EVENT_MODEL.md), [points and XP](POINTS_AND_XP.md), [badge library](BADGE_LIBRARY.md), and [Phase 1 implementation plan](PHASE_1_IMPLEMENTATION_PLAN.md).

## Decisions made

1. **The achievement engine is server authoritative.** Browsers may read projections and preferences, but cannot submit award decisions, XP amounts, badges, levels, verification status, or trusted achievement events.
2. **Events are immutable.** Corrections append invalidation or replacement facts and trigger deterministic replay; they never rewrite the original event.
3. **Awards are append-only.** An award is created once. Correction is represented by a revocation record and compensating ledger entries rather than deletion or in-place mutation.
4. **Gamification never validates workouts.** Existing domain services remain solely responsible for accepting, rejecting, and persisting workout activity. Gamification runs only after the authoritative domain commit and cannot cause that commit to fail.
5. **XP is derived from accepted events.** XP is not a client-provided event field or mutable balance. Versioned reward policy derives integer ledger effects from accepted immutable facts.

These decisions are invariants, not implementation preferences. A proposal that weakens one requires a new design review rather than a local exception.

## Decisions deferred

| Topic | Current boundary | Decision required before |
|---|---|---|
| Seasonal cadence | Season-aware identifiers and ledger scopes may be reserved, but no cadence is approved. Any example duration in companion documents is illustrative, not launch policy. | Publishing a season, seasonal reset, season leaderboard, or time-limited reward. |
| Marketplace | Points remain non-spendable and have no cash value, transfer path, or purchase path. | Showing a redeemable balance, listing an item, or accepting a redemption. |
| Cosmetic unlocks | The model may retain badge/title references, but no inventory, entitlement, equipping, or fulfilment contract is approved. | Advertising or granting a cosmetic entitlement. |
| Social gifting | No point, award, item, or entitlement transfer between users is permitted. | Exposing any gifting, trading, or peer-transfer flow. |

Deferred features must not shape Phase 1 storage in a way that compromises immutable evidence, ledger auditability, privacy, or the ability to remove the feature cleanly.

## Risks and required controls

| Risk | Failure mode | Required Phase 1 control | Signal to monitor |
|---|---|---|---|
| XP inflation | Duplicate, overlapping, or high-volume activity creates more progression than intended. | Idempotency keys, overlap groups, per-source caps, integer ledger effects, maximum-issuance validation, and dry-run economy simulation. | XP percentiles by source, cap-hit rate, duplicate rate, weekly source mix, and time-to-level. |
| Badge saturation | Too many similar or easy awards make recognition noisy and meaningless. | Small reviewed launch catalogue, stable achievement families, tier spacing, retirement rather than deletion, and a catalogue budget owned by product. | Awards per active member, completion distribution, zero/near-universal completion, catalogue growth, and badge-view engagement. |
| Notification fatigue | Bursts, repeated milestones, or low-value updates train members to mute all messages. | Post-commit deduplicated queue, at most one visible unlock at a time, bundling, cooldowns, quiet preferences, and notifications disabled independently of evaluation. | Notifications per active member, burst size, mute/opt-out rate, open rate, and support feedback. |
| Event duplication | Retries, reconciliation, or multiple adapters record the same accepted action twice. | Unique `(subjectUserId, idempotencyKey)` event identity, deterministic source keys, duplicate disposition, unique award/effect keys, and replay checksum tests. | Duplicate disposition rate, uniqueness conflicts, source-to-event count variance, and replay/live checksum differences. |

## Open questions

### Blocking before implementation

1. **What is the atomicity contract between each domain commit and event capture?** For every Phase 1 source, choose transactional outbox, durable marker plus reconciliation, or best-effort emission plus reconciliation; define the accepted event-loss and lag objectives.
2. **Which accepted domain events form the minimum launch vocabulary?** Name the event type, schema version, authoritative producer, stable source ID, verification states, allowed fields, and retention policy for each source.
3. **How are corrections represented end to end?** Define who may invalidate evidence, the immutable correction event, targeted replay boundary, award-revocation policy, member-visible explanation, and compensating-entry authorization.
4. **What consistency promise do read APIs make?** Set the projection freshness target, stale-state response semantics, cursor/checkpoint model, and user experience when evaluation is delayed or disabled.
5. **What are the initial economy limits?** Approve the reward-policy version, per-action and aggregate caps, overlap groups, target XP distribution, maximum theoretical issuance, and rollback threshold using representative data.
6. **Which definitions comprise the launch catalogue?** Establish a hard catalogue budget, definition owners, tier spacing, safety/privacy/accessibility review, and measurable retirement criteria to prevent saturation.

### Blocking before rollout

7. **What are the duplicate and reconciliation service-level objectives?** Set thresholds for duplicate rate, missing-event variance, processing lag, dead letters, replay divergence, and the automatic pause/rollback response for each.
8. **What notification budget applies across channels?** Decide bundling window, per-day cap, quiet hours/timezone behavior, priority rules, channel consent, and whether a correction notification can bypass ordinary batching.
9. **What evidence is safe to expose?** Approve the public, member-private, operator-only, and prohibited fields for events, award summaries, hidden achievements, diagnostics, and support tooling.
10. **What is the backfill boundary?** Identify eligible source records, earliest date, verification standard, definition version/effective-time policy, dry-run acceptance thresholds, and the owner who authorizes publication.
11. **Who owns operational intervention?** Name roles for disabling capture/evaluation/notifications, approving reversals, resolving dead letters, publishing definitions, and communicating member-impacting corrections.
12. **What rollout gates are quantitative?** Define staff and cohort durations plus pass/fail thresholds for domain isolation, event completeness, idempotency, replay parity, economy distribution, notification volume, and support impact.

### Deferred-feature questions

13. **Seasons:** What user need justifies a season, what cadence supports recovery, which values reset, how are late events handled, and how are earned awards archived?
14. **Marketplace:** What is the legal and accounting classification of points, how do expiry/refunds work, and how are purchases kept separate from fitness achievement?
15. **Cosmetics:** What constitutes an entitlement, can content be retired without removing ownership, and which accessibility/localization requirements apply to equipping and display?
16. **Social gifting:** What eligibility, consent, anti-abuse, moderation, reversal, minor-safety, and privacy rules apply to a transfer?

## Review exit criteria

The architecture review is complete when:

* each implementation-blocking question has a named decision owner and an approved answer in the relevant companion specification;
* event schemas and reward policies are versioned and publication rejects unknown or unbounded inputs;
* a failure-injection test proves an accepted workout remains successful when event capture, evaluation, projection, and notification components fail;
* duplicate live delivery and full replay create no additional event, award, or ledger value;
* two clean rebuilds produce identical award, ledger, and projection checksums;
* economy simulation and catalogue review have explicit pass thresholds and recorded approval; and
* rollout and rollback gates have named operators, observable metrics, and rehearsed procedures.

Until those criteria are met, this review authorizes documentation and validation work only, not production reward issuance.
