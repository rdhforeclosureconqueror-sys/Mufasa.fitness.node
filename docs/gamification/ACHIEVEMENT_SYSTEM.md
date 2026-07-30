# Achievement System

## 1. Concepts

* **Achievement:** a versioned goal with executable criteria and progress.
* **Badge:** visual recognition attached to an achievement award; it is presentation, not the rule.
* **Tier:** ordered stages of one achievement family (Bronze/Silver/Gold/Platinum), each independently awardable.
* **Milestone:** an immutable threshold crossing, usually lifetime or within a season.
* **Title:** optional cosmetic label granted by level or achievement.
* **Award:** append-only evidence that a subject qualified under an exact rule version.
* **XP/points:** ledger effects optionally attached to first qualification/repeat period.

## 2. Definition model

```json
{
  "achievementId": "consistency.workout_weeks",
  "definitionVersion": 1,
  "contentRevision": 2,
  "state": "published",
  "category": "consistency",
  "visibility": "public",
  "repeatability": { "mode": "one_time", "period": null, "maxAwards": 1 },
  "effectiveFrom": "2026-10-01T00:00:00Z",
  "effectiveTo": null,
  "acceptedEvents": [{ "type": "workout.completed", "schemaVersions": [1] }],
  "criteria": {
    "operator": "gte",
    "aggregate": "distinct_local_weeks_with_count",
    "where": { "minimumPerWeek": 3 },
    "threshold": 4,
    "window": "lifetime"
  },
  "reward": { "xp": 150, "points": 30, "titleId": null },
  "badgeId": "badge.consistency_foundation.bronze",
  "supersedesVersion": null
}
```

Rules use typed `count`, `sum`, `distinct_count`, `consecutive_periods`, `streak`, `percent_delta`, and `all_of`/`any_of` operators. Units and windows are explicit. Arbitrary JavaScript, SQL, string comparators, and client expressions are prohibited. Publication validates an acyclic dependency graph and maximum reward issuance.

## 3. Achievement types

### One-time

Award once per stable achievement ID/tier, such as first assessment or 100 lifetime walking kilometres. Replay and later rule versions cannot duplicate it unless migration explicitly maps a new tier.

### Repeatable

Declare period (`day`, `week`, `month`, `season`, challenge instance), period timezone, cooldown, maximum awards, and reward behavior. Each award uniqueness key includes the period ID. Prefer progress recognition and sharply capped or zero repeat XP after the first award. Example: complete a balanced week in three distinct activity categories, repeatable once/month.

### Hidden

Before unlock, API exposes either nothing or a generic “Secret achievement” placeholder according to visibility policy. Criteria, progress, and icon remain server-side. Hidden achievements must still be safe, attainable without risky guessing, and cannot require disclosure of sensitive data. After award, reveal name/description/evidence summary.

### Seasonal

Rules bind to `seasonId` and use only events occurring inside its interval. Permanent “participated in Season X” awards can remain; season rank/progress is archived. Late-event and close rules are explicit.

## 4. Badges and tiers

Badge records contain stable ID, localized name/description keys, category, tier, rarity, icon asset/alt-text concept, art revision, and availability. The badge never contains mutable progress logic.

Default tier semantics:

| Tier | Meaning | Design treatment |
|---|---|---|
| Bronze | A healthy behavior established. | Warm bronze; simple silhouette. |
| Silver | Behavior repeated over meaningful time. | Silver; one additional motif. |
| Gold | Sustained or diverse practice. | Gold; richer border, not flashing. |
| Platinum | Long-term mastery/leadership; rare and safely capped. | High-contrast platinum; no implication of professional credential. |

Thresholds are family-specific, strictly increasing, and should emphasize elapsed consistency over raw volume. Users retain lower-tier awards. Tier rarity is descriptive (`common`, `uncommon`, `rare`, `epic`, `legendary`) and not a probability or loot mechanic.

## 5. Milestones, titles, levels, and rewards

Milestones are generated only when a versioned aggregate crosses a configured threshold; late events award the milestone at evaluation time while preserving the qualifying occurrence. Achievements may grant fixed XP/points once, but base actions and achievement rewards use overlap groups to avoid circular farming.

Levels come only from lifetime XP ledger thresholds. Titles come from level bands or explicit awards, remain user-selectable, and are not professional/medical claims. Achievement evaluation never directly sets a user's level or balance; it appends ledger effects and projections derive them.

## 6. Evaluation algorithm

1. Accept a newly persisted event cursor.
2. Load published definitions effective at event occurrence and accepting its schema/trust.
3. Update only referenced typed aggregates for the subject.
4. Evaluate candidate rules using immutable definition snapshots.
5. Build `qualificationKey = achievementId:ruleVersion:subject:periodOrOnce`.
6. If absent, append award plus reward ledger effects using unique effect keys.
7. Update progress/earned projections and enqueue a deduplicated notification.
8. Advance the cursor only after effects are durably recorded; retries discover existing keys.

Evaluation order cannot change the result except where a documented ordered-event rule (streak) uses `occurredAt` plus stable event-ID tie breaking. Full replay must match live projection checksums.

## 7. Versioning without breaking existing users

* Stable achievement and badge IDs are never reused for different meanings.
* `definitionVersion` changes executable criteria, reward, eligibility, event contracts, window, or repeatability and is immutable after publication.
* `contentRevision` changes typo/localization/art/alt text only and never qualification.
* Published definitions have effective intervals. Events evaluate against the version effective at occurrence, not “latest.”
* Award stores embed achievement ID, definition version, badge ID/art revision, evidence summary, and reward effect IDs.
* Existing awards are grandfathered when a harder version launches. Never silently revoke because criteria changed.
* Easier replacement rules require an explicit migration decision: prospective only, or deterministic backfill for all eligible users.
* Defects use a new version plus an audited correction run. Original awards remain in history with `revokedAt/reason`; rewards receive compensating entries.
* Retired definitions stop new qualification but remain readable for award history.
* Split/merged achievements receive new IDs and a published mapping; no implicit equivalence.
* Versioned projection cursors permit side-by-side rebuild before activation.

## 8. Seasonal events

A season definition includes ID/version, UTC bounds, enrollment/eligibility, theme, approved objectives, XP caps, late window, close workflow, and permanent participation awards. Event-specific achievements prefer variety (for example, qualify on four weeks with any three healthy categories) rather than volume. Alternative paths support disability, equipment, climate, and nutrition restrictions. Seasonal content receives fitness-safety, accessibility, privacy, and moderation approval.

## 9. Evidence and privacy

Awards store a safe evidence summary such as `12 qualifying weeks`, not raw nutrition/bodyweight/assessment/GPS data. API shows progress only to the owner unless explicitly shared. Public badge sharing is opt-in and emits static safe metadata. Hidden criteria and anti-fraud flags never appear in public catalogue responses.

## 10. Corrections and revocation

Legitimate late data can grant awards; invalidated source data triggers targeted replay. Revocation is reserved for invalid source evidence, rule defects, or approved moderation—not changed product taste. Append `awardRevocation` with reason code, correction run, timestamp, and operator/system provenance. Reverse currency separately. Notify users neutrally and provide support/appeal path where appropriate.

## 11. Initial policy guardrails

* No achievement based on lowest calories, greatest deficit, rapid weight loss, maximum consecutive exercise days, pain, sleep deprivation, extreme distance/reps, or unsupported advanced skill.
* Streak achievements include recovery-compatible definitions and no shame language.
* Personal bests use comparable verified measures, percentage bands, cooldowns, and caps.
* Community achievements require positive moderated interactions, distinct members, and anti-collusion limits.
* Yoga/gymnastics definitions remain `draft` until their current-platform authoritative services and expert-reviewed safety gates exist.

## 12. Definition lifecycle

`draft → review_pending → approved → published → retired`; `rejected` is terminal. Required approvals: product/economy, domain safety, content/localization, privacy/security, accessibility, and engineering validation. Publication records checksum and approvers. Runtime reads only published immutable snapshots.

## 13. Acceptance criteria

No award can be client-created; every award is traceable; replay is idempotent; version changes preserve history; repeat periods cannot double-award; hidden details do not leak; corrections balance ledgers; rule graphs are acyclic; unsafe definitions fail publication; and catalogue/projection APIs distinguish `locked`, `in_progress`, `earned`, `retired`, `hidden`, and `revoked` accurately.
