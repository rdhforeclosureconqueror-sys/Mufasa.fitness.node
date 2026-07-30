# Mufasa Achievement System

**Status:** Phase 1 authoritative design specification; implementation is not authorized by this document.

**System of record:** the current Mufasa Node/Express application and its authoritative domain services.

**Companion specifications:** `PHASE_1_IMPLEMENTATION_PLAN.md`, `EVENT_MODEL.md`, `POINTS_AND_XP.md`, and `BADGE_LIBRARY.md`. If a companion document conflicts with this specification, work must stop until the documents are reconciled and explicitly approved; implementation must not choose a convenient interpretation.

## 1. Purpose and scope

This document defines the permanent product and engineering contract for achievements, badges, XP, points, titles, levels, prestige, rarity, seasons, and user progression on Mufasa. It describes a reward layer over accepted health and fitness activity. It does not create a second fitness domain, alternate account system, new event-ingestion API, or independent source of truth.

The achievement engine consumes minimal, immutable facts emitted only after existing services accept and persist a domain action. It evaluates published, versioned definitions; records append-only awards and reward ledger effects; builds disposable projections; and provides optional progress and notification experiences. A failure in gamification must never undo or misreport a successful workout, walk, run, trail activity, nutrition action, assessment, coaching interaction, or challenge result.

This specification covers Phase 1 and reserves safe extension points for later features. Yoga and gymnastics examples are design inventory only and must remain inactive until Mufasa has authoritative current-platform workflows and the required expert safety controls.

## 2. Achievement philosophy

Mufasa achievements exist to reinforce sustainable behavior and make progress legible. The system follows these principles:

1. **Celebrate participation before performance.** Showing up, learning, recovering, and practicing consistently should provide most attainable rewards.
2. **Reward healthy patterns, not maximal output.** Raw repetitions, distance, pace, calorie deficit, weight change, pain tolerance, and uninterrupted exercise are not proxies for worth.
3. **Make rest compatible with progress.** Streak and seasonal rules must include rest opportunities, grace semantics, broad windows, or alternative paths.
4. **Be inclusive by design.** Equivalent pathways should accommodate ability, equipment, geography, weather, schedule, dietary eligibility, and supported activity preferences.
5. **Be truthful and deterministic.** The same accepted evidence under the same published version produces the same result. No loot mechanics, randomized unlocks, or false urgency are permitted.
6. **Keep rewards optional.** Core capabilities, health information, and coaching access cannot depend on rank. Users may hide progress, mute notifications, and decline competitive surfaces.
7. **Protect private context.** Achievement evidence uses safe summaries and never turns meals, bodyweight, assessment answers, medical context, or precise location into public content.
8. **Prefer mastery and consistency over collection pressure.** Catalogue size, hidden items, seasons, and limited-time content must not pressure unsafe activity or completionism.
9. **Preserve history.** Earned recognition is not silently removed when a definition, economy, or visual design changes.
10. **Keep the current application authoritative.** Gamification recognizes current services; it does not recreate their validation or persistence rules.

### 2.1 Prohibited incentives

Definitions must be rejected if they reward or imply approval of:

* rapid or directional bodyweight change;
* eating the fewest calories, skipping meals, or exceeding nutrition/hydration targets;
* exercise through pain, illness, unsafe conditions, or a prescribed rest restriction;
* maximum consecutive exercise days without recovery semantics;
* extreme duration, pace, distance, repetitions, or unsupported advanced skill;
* perfect pose, body shape, or automated medical/fitness diagnosis;
* public comparison of sensitive health measures;
* harassment, engagement spam, referral farming, or unmoderated social volume; or
* purchases, subscription spend, or payment level as evidence of fitness accomplishment.

## 3. Architectural fit and ownership

The achievement system is a consumer of current-platform facts:

```text
authenticated current route
  -> existing domain service validates and commits the action
  -> narrow server-side event adapter records a minimal immutable fact
  -> achievement evaluator selects effective published definitions
  -> append-only award and XP/point ledger records
  -> rebuildable achievement, level, title, season, and notification projections
  -> authenticated existing application surfaces
```

### 3.1 Existing services to reuse

| Capability | Current authority to reuse | Achievement relationship |
|---|---|---|
| Workouts and form learning | `src/services/sessionService.js` | Accepted starts, completions, rep/session evidence, and approved technique-learning facts. The engine does not decide whether a session was completed. |
| Generated workouts | `src/services/generatedWorkoutService.js` and `src/services/generatedWorkoutProgressionService.js` | Accepted generated-plan/day completion and plan progression. A generated workout shares the base workout reward pool. |
| Walking, running, run club, and stepping | `src/services/steppingIntoGreatnessService.js` plus existing stepping/session components | Accepted activity completion, bounded metrics, and club participation. Raw GPS is not copied. |
| Nearby trails | `src/services/nearbyTrailService.js`, walking/trail services, and canonical trail storage | Discovery and verified completion of canonical routes. Search or viewing a recommendation alone is not physical completion. |
| Push-up challenge | `src/services/challengeService.js` | Accepted, deduplicated challenge results and participation. Client-reported scores are not independently trusted by gamification. |
| Nutrition | `src/services/nutritionService.js` | Persisted journal actions and approved goal/mission completion, represented by booleans or bands rather than meal details. |
| Assessments and profile facts | `src/services/userDataService.js` and current profile/intake flows | Completion and eligible reassessment occurrence only; answers and exact bodyweight stay out of achievement evidence. |
| Coaching | Existing trainer workspace and future approved coaching adapters, including `src/services/trainerWorkspaceService.js` | Completed/acknowledged coaching workflows only after a contract exists; no award from private note contents or favorable coach ratings. |
| Member experience | `src/services/memberHomeService.js` and active `public/` runtime | Reads projections and presents progress; it never calculates or grants rewards. |
| Identity, access, and persistence | Current auth/membership middleware, `src/repositories/userStore.js`, and `POCKET_PT_DATA_DIR` conventions | Identity, isolation, atomic storage patterns, and existing response envelopes remain authoritative. |

No browser endpoint may submit an achievement event, XP amount, point amount, badge, title, level, rarity, verification status, or award decision. No legacy Express/SQLite/Firebase runtime is revived. Legacy seed files may be normalized only as reviewed, disabled-by-default content as described in the implementation plan.

### 3.2 Core invariants

1. An authoritative domain commit precedes its reward event.
2. Every award and reward effect traces to one immutable event or approved deterministic aggregate, one subject, and one published definition/policy version.
3. Events describe facts and never contain calculated reward amounts.
4. Awards and ledgers are append-only; correction uses revocation and compensating entries.
5. A deterministic uniqueness key makes live processing, retries, reconciliation, and replay idempotent.
6. Projections may be deleted and rebuilt without losing truth.
7. Definition evaluation uses occurrence time, not processing time or the current latest rule.
8. Gamification failure cannot fail a committed domain workflow.
9. Hidden criteria, fraud signals, and private evidence are never leaked to unauthorized clients.
10. All clocks, periods, windows, units, and eligibility rules are explicit and versioned.

## 4. Domain vocabulary

| Term | Definition |
|---|---|
| **Achievement** | A stable, versioned goal whose typed criteria evaluate authoritative events or aggregates. |
| **Achievement family** | Related achievements arranged as tiers or a themed progression; family membership does not imply automatic award. |
| **Award** | Append-only evidence that a subject qualified for an exact achievement definition in a specific period or once-only scope. |
| **Badge** | Visual and textual recognition attached to an award; never the executable rule itself. |
| **Milestone** | An immutable threshold crossing, typically lifetime or season scoped. |
| **Progress** | A rebuildable, typed projection toward a definition; it is not proof of award. |
| **XP** | Non-spendable progression value recorded in a ledger. Lifetime XP determines levels; season XP is separately scoped. |
| **Points** | A distinct, ledgered recognition balance reserved for approved future cosmetic/community uses; no cash value in Phase 1. |
| **Title** | An earned, user-selectable cosmetic label that cannot imply professional or medical credentials. |
| **Level** | A permanent progression band derived from lifetime XP under a versioned curve. |
| **Prestige** | A future opt-in, non-destructive post-cap progression track with no competitive multiplier. |
| **Rarity** | Editorial classification of expected healthy effort and elapsed consistency, not random probability. |
| **Season** | A bounded, versioned program with explicit dates, eligibility, objectives, caps, close policy, and archive. |
| **Event** | A minimal immutable server-authored fact accepted from a current domain workflow. |
| **Definition version** | An immutable executable interpretation of an achievement. |
| **Content revision** | A non-semantic update to copy, localization, art, or accessibility metadata. |

## 5. Achievement definition architecture

Every executable definition must contain the following conceptual fields. The storage encoding is finalized during implementation approval, but semantics may not be weakened.

| Field group | Required semantics |
|---|---|
| Identity | Stable `achievementId`, optional stable `familyId`, immutable `definitionVersion`, and non-semantic `contentRevision`. IDs are opaque, unique, and never reused. |
| Lifecycle | `draft`, `review_pending`, `approved`, `published`, `retired`, or `rejected`; publication checksum and approval record. Only published definitions execute. |
| Classification | Category, tags, tier, rarity, visibility, permanence, repeatability, and seasonal/limited-time scope. |
| Effective interval | Inclusive `effectiveFrom`, exclusive `effectiveTo` where present, plus timezone/period policy. |
| Inputs | Explicit accepted `eventType + schemaVersion` pairs, verification methods/statuses, source eligibility, and privacy-safe fields. |
| Criteria | A typed, bounded rule tree with units, filters, aggregate, threshold, window, distinctness, cooldown, and alternatives. |
| Reward | Fixed XP/points effects, badge/title grants, overlap group, caps, provisional policy, and repeat-award behavior. |
| Presentation | Localized name/description/progress keys, safe evidence template, badge reference, hidden-state presentation, and accessibility metadata. |
| Dependencies | Explicit prerequisite achievement IDs or derived aggregates, validated as acyclic. |
| Governance | Owners, rationale, rarity justification, safety/privacy/accessibility/economy approvals, and supersession/backfill policy. |

### 5.1 Rule language

The engine supports a small declarative rule vocabulary: `count`, `sum`, `distinct_count`, `consecutive_periods`, `streak`, `threshold_crossing`, `percent_delta`, `all_of`, and `any_of`. Rules may filter only allow-listed typed event fields. Windows may be lifetime, rolling duration, local calendar period, season, challenge instance, or a fixed interval.

Arbitrary JavaScript, SQL, regular expressions over private narratives, client expressions, dynamically fetched code, and unbounded recursion are prohibited. Publication must reject unknown operators, ambiguous units, cyclic dependencies, negative thresholds, non-monotonic tiers, impossible alternatives, and reward paths whose maximum issuance cannot be calculated.

### 5.2 Definition example

The following is illustrative data, not implementation code or an approved live definition:

```json
{
  "achievementId": "consistency.rhythm_builder.silver",
  "familyId": "consistency.rhythm_builder",
  "definitionVersion": 1,
  "contentRevision": 1,
  "state": "draft",
  "visibility": "public",
  "rarity": "uncommon",
  "availability": { "kind": "permanent", "effectiveFrom": "2026-10-01T00:00:00Z" },
  "repeatability": { "mode": "one_time", "maxAwards": 1 },
  "acceptedEvents": [{ "eventType": "habit.day_qualified", "schemaVersions": [1] }],
  "criteria": {
    "operator": "consecutive_periods",
    "period": "user_local_week",
    "where": { "minimumDistinctActiveDays": 3 },
    "threshold": 4,
    "window": "lifetime"
  },
  "reward": { "lifetimeXp": 150, "lifetimePoints": 0, "overlapGroup": "rhythm-tier" },
  "badgeId": "badge.consistency.rhythm_builder.silver"
}
```

## 6. Achievement lifecycle

### 6.1 Definition lifecycle

`draft → review_pending → approved → published → retired`

`rejected` is terminal for that candidate. A rejected concept may be redesigned under a new review record but is never silently promoted.

1. **Draft:** an owner defines purpose, audience, evidence, alternatives, bounds, reward, rarity, copy, and operational metrics.
2. **Review pending:** automated validation and human product/economy, fitness-safety, privacy/security, content/localization, accessibility, and engineering reviews occur.
3. **Approved:** immutable candidate and checksum are ready for a scheduled effective interval. Approval alone does not execute it.
4. **Published:** runtime may evaluate the immutable snapshot when its effective interval applies.
5. **Retired:** new qualification stops according to the effective interval; history and safe catalogue metadata remain readable.

Emergency disablement prevents new evaluation without rewriting publication history. It requires an audited reason, operator, timestamp, user-impact assessment, and correction plan.

### 6.2 User-facing lifecycle

An achievement projection has one of these states:

* `locked`: visible but no displayable progress has begun;
* `in_progress`: eligible evidence exists below the threshold;
* `earned`: an active award exists;
* `hidden`: identity/criteria are concealed according to policy;
* `expired`: the opportunity ended without an award, with non-shaming copy;
* `retired`: no longer earnable, retained for historical context; or
* `revoked`: prior qualification was invalidated, with owner-safe correction information.

An earned limited-time or seasonal achievement remains earned after its availability closes. Catalogue removal never deletes the award.

### 6.3 Award lifecycle

An award is created once with a unique qualification key and can become `active` or `revoked`; it is never edited into a different achievement. It records subject, achievement and definition version, qualifying period, badge/art reference, safe evidence summary, source evidence references, award time, qualification occurrence time, reward effect IDs, and provenance. Provisional evidence may update progress but cannot create a final public award until policy permits it.

## 7. Evaluation and event relationships

Achievements consume the canonical events defined in `EVENT_MODEL.md`. Event adapters belong beside or immediately after existing authoritative service commits; they do not duplicate domain validation.

### 7.1 Processing flow

1. Persist or locate the immutable event using `(subjectUserId, idempotencyKey)`.
2. Select definitions published and effective at `occurredAt` that accept the exact event schema and verification status.
3. Update only typed aggregates referenced by those definitions.
4. Evaluate direct and aggregate-dependent candidates in a validated acyclic order.
5. Compute `qualificationKey = achievementId:definitionVersion:subjectUserId:periodOrOnce`.
6. If absent, append the award and fixed reward effects using unique effect keys.
7. Rebuild affected XP, points, level, title, badge, season, and achievement projections.
8. Enqueue a deduplicated notification only after all authoritative outcomes are durable.
9. Advance the durable evaluation cursor. A retry discovers existing outcomes and adds no value.

Full replay must produce the same awards, balances, and projection checksums as live processing. Ordered rules such as streaks use `occurredAt` plus stable event-ID tie breaking. Processing arrival order otherwise cannot affect qualification.

### 7.2 Source and derived relationships

Source events may update multiple progress aggregates, but reward overlap groups prevent the same action from paying multiple base rewards. For example:

* `workout.completed` can grant the base workout effect, update lifetime workout count, and qualify an active day;
* `generated_workout.completed` can update generated-plan progress, but shares the workout base reward pool;
* a trail completion can update walking/cardio participation, trail count, unique-trail progress, and a healthy day while receiving only its approved action reward;
* `habit.day_qualified` may advance a streak and cause `streak.milestone_reached`; the milestone event cannot qualify another active day; and
* a challenge attempt linked to a workout may advance both challenge and workout achievements but cannot triple-pay the underlying effort.

Derived events must record causation, may be produced only by named projectors, and cannot feed their own ancestry. Publication validates the complete dependency graph.

### 7.3 Late, corrected, and invalid evidence

Late facts retain their true occurrence time and may qualify definitions effective then, subject to published late windows. Timezone history determines local dates. Corrections never mutate original events. An invalidated domain fact triggers targeted replay, award revocation when required, and equal-and-opposite ledger entries. The system must not revoke merely because a definition became harder, a badge became rarer, or product preferences changed.

## 8. Badge architecture

A badge is presentation attached to an award, not a criteria container. Badge records have a stable `badgeId`, localized content keys, family/category, tier, rarity, icon asset concept, accessible alternative text, art revision, availability, and content status.

### 8.1 Badge rules

* Badge IDs and art revisions are immutable references; IDs are never reassigned to a different meaning.
* An award snapshots the badge and art revision presented at award time. A later art revision may be shown globally only under an explicit migration/display policy.
* Color is never the sole tier distinction. Shape, label, border, and alt text convey tier.
* Icons must be original or properly licensed, localized where needed, usable at supported sizes, high contrast, and meaningful without animation.
* Badges do not imply certification, diagnosis, coaching authority, or skill safety clearance.
* Public sharing is opt-in and contains only safe static metadata chosen by the user.

### 8.2 Tiers

| Tier | Product meaning | Default treatment |
|---|---|---|
| Bronze | A healthy behavior has begun or formed a foundation. | Simple bronze frame and one motif. |
| Silver | The behavior has repeated over meaningful elapsed time. | Silver frame and an additional motif. |
| Gold | Sustained, balanced, or diverse practice. | Gold frame with richer detail; no compulsory animation. |
| Platinum | Long-term mastery, consistency, or service with strict safe caps. | High-contrast platinum frame; never a professional credential. |

Tier thresholds are family-specific, strictly increasing, and independently awardable. A member retains every earned lower tier. Higher tiers should increase elapsed consistency or breadth rather than unsafe raw volume.

## 9. XP architecture

XP is integer, non-transferable, non-spendable progression value recorded only through an append-only ledger.

### 9.1 XP kinds

* **Lifetime XP** never resets and drives the published level curve.
* **Season XP** is scoped to one season, begins at zero for each new season, and remains archived after close.

Each entry records kind, integer delta, subject, source event, policy/version, reason, effective season when applicable, timestamp, unique effect key, and optional `reversalOf`. Balances are sums, never fields directly edited by a route or administrator. A reversal is equal and opposite, references one original, and cannot recursively reverse another reversal.

Action XP and achievement XP are separate effects but share policy caps and overlap groups. Achievement completion must never produce an event loop that grants itself further XP. Exact Phase 1 values, source caps, target weekly issuance, and curve thresholds are governed by `POINTS_AND_XP.md`; this document governs the architecture and invariants.

## 10. Point architecture

Points are distinct from XP and use separate `lifetime_points` and, only when explicitly published, `season_points` ledgers. They do not determine level and have no cash value, peer transfer, purchase path, wagering use, or redemption in Phase 1.

Any future spending or expiration system requires a separate approved design for debit authorization, refunds, fraud, tax, consumer law, minors, negative balances, expiration notice, and reconciliation. Until then, the UI calls points recognition value and must not imply money or a promised future exchange.

Season points may expire only when users were shown the exact expiration before earning them. Lifetime points do not silently expire. Presentation may clamp an anomalous corrected balance at zero while accounting retains the true ledger sum for resolution.

## 11. Titles

Titles are localized cosmetic labels earned by level bands or explicit achievement awards. Members may select one title from their active entitlements, use the default level title, or show none.

* Stable title IDs are separate from copy and from achievement IDs.
* Titles cannot claim `Coach`, `Trainer`, `Doctor`, `Therapist`, certification, medical status, or guaranteed mastery unless a future independently governed credential system authorizes it.
* Level-title mappings use a versioned table. Achievement-granted titles name their grant source.
* Revocation removes future selection but preserves the historical entitlement audit record.
* Public title display follows the same privacy and block controls as the surrounding surface.
* Copy changes use content revisions; eligibility changes require a definition/version change.

The initial level-title bands are specified in `POINTS_AND_XP.md`. Examples of achievement titles include `Trail Steward`, `Rhythm Keeper`, and `Community Encourager`, subject to publication review.

## 12. Levels

Levels are permanent bands derived from lifetime XP using reviewed cumulative thresholds in a versioned level table. Runtime must not rely on an unversioned formula.

* Level 1 begins at zero XP.
* Thresholds are monotonic integers and validated at publication.
* A ledger reversal can correct current level, but the account retains `highestLevelAchieved` for historical recognition unless fraud/safety review explicitly determines otherwise.
* A new curve applies prospectively or under a documented grandfathering policy and must not silently demote legitimate prior progress.
* Above the published maximum, XP continues to accrue and the UI uses a truthful capped display such as `Level 50+` until an expansion is approved.
* Level has no effect on medical advice, workout eligibility, membership rights, or coach authority.

## 13. Prestige

Prestige is deferred and inactive in Phase 1. A future proposal may allow a member at the published level cap to opt into a post-cap emblem or journey. It must:

1. preserve lifetime XP, level, points, achievements, streak history, badges, and titles;
2. never reset or erase health progress;
3. grant no XP multiplier, ranking advantage, paid benefit, or access to unsafe content;
4. require new post-eligibility XP plus a minimum elapsed period, initially proposed as at least 90 days;
5. be reversible as a display preference without reversing earned history; and
6. undergo economy, accessibility, behavioral-safety, and fairness review based on real capped-level data.

Prestige count is not evidence of fitness expertise. No implementation may activate it solely because the data model reserves a field.

## 14. Rarity

Rarity communicates expected healthy effort, breadth, and elapsed consistency. It is editorial metadata—not randomized odds, scarcity ownership, or a promise that a fixed percentage of users will qualify.

| Rarity | Design intent | Typical rationale |
|---|---|---|
| Common | An accessible beginning. | First safe completion or short introductory pattern. |
| Uncommon | Repeated behavior across meaningful days or weeks. | Several sessions, categories, or learning milestones. |
| Rare | Sustained or diverse practice over months. | Long windows, breadth, or verified community contribution. |
| Epic | Exceptional long-term consistency with inclusive alternatives. | Multi-season or multi-year healthy engagement. |
| Legendary | Extraordinary long-term legacy; used sparingly. | Years of safe consistency or service, never extreme single-event output. |

Every rarity assignment needs a written rationale and pre-publication simulation. Completion data may inform future definitions but does not automatically relabel existing earned awards. A rarity metadata change uses a content/catalog revision and must not reduce rewards or invalidate awards. The UI never uses rarity to shame members or conceal attainability.

## 15. Availability and repeatability

Availability and repeatability are independent dimensions. Every definition declares both.

### 15.1 Permanent achievements

Permanent achievements have no planned earning end date. Their published version remains effective until superseded or retired. “Permanent” describes availability policy, not a promise that criteria can never be versioned. Earned awards remain historical permanently subject only to documented correction.

### 15.2 Limited-time achievements

Limited-time achievements have explicit UTC start/end times, user-local display dates, late-event rules, timezone semantics, eligibility, and an expiration experience. They must provide a reasonable completion window, avoid dangerous countdown pressure, and offer no requirement to exercise every day. Starting an activity before the deadline does not qualify unless the definition explicitly states whether start or completion occurrence controls.

Users must see availability and material eligibility before participating. Once the window closes, progress becomes `expired` or archived; it is never deceptively shown as still earnable. An award earned in the window remains visible afterward.

### 15.3 Seasonal achievements

Seasonal achievements bind to one versioned `seasonId` and consider only eligible occurrence-time facts within that season. A season declares:

* exact UTC bounds and local display policy;
* enrollment, age/privacy, membership, and geographic eligibility;
* approved objectives and alternative paths;
* XP/point/leaderboard caps and overlap behavior;
* a bounded late-event and correction window;
* close, snapshot, award, archive, and communication workflows; and
* permanent participation/finisher recognition, if any.

Season objectives should favor healthy-day consistency and activity variety. Lifetime XP, lifetime points, permanent awards, levels, longest historical streaks, and archived season history never reset when a new season begins.

### 15.4 Hidden achievements

Hidden achievements may conceal surprise, never material safety or eligibility information. Before unlock, visibility policy is either:

* `secret`: omit it completely from owner/public catalogues; or
* `placeholder`: expose only localized “Secret achievement,” broad category if safe, and accessible generic art.

The server withholds name, exact criteria, progress, icon, evidence, and anti-exploit details until award. Hidden achievements cannot require risky experimentation, purchase, private-data disclosure, social spam, location guessing, or actions a reasonable member would avoid without instructions. After unlock, the member sees normal safe metadata. Hidden status must not be used to bypass review.

### 15.5 Repeatable achievements

Repeatability modes are `one_time`, `calendar_period`, `rolling_window`, `season`, and `challenge_instance`. Repeatable definitions declare period ID, timezone, cooldown, maximum awards per period and lifetime, whether progress resets, and first-versus-repeat rewards.

The award uniqueness key includes the repeat period or challenge instance. Repeat XP should be zero or sharply capped after the first award unless economy review approves otherwise. Repeat achievements recognize recurring balanced patterns, not farmable atomic actions. Example: `Balanced Week` may award recognition once per calendar month after a qualifying week, with no additional badge tier and a bounded repeat reward.

## 16. Streaks and user progression

### 16.1 Progression loop

A healthy progression loop is:

1. the member completes an already-useful current-platform action;
2. the domain service accepts it independently of rewards;
3. the member receives base action recognition within caps;
4. safe projections show progress toward a nearby milestone;
5. the milestone grants a badge/title or modest fixed reward;
6. level and longer-term catalogue progress update; and
7. messaging recommends sustainable next actions and rest where appropriate.

The system must always provide multiple viable progression paths. A member who cannot run, use trails, log nutrition, join a club, or share data can still progress through other supported healthy activities. No single category is mandatory for general account level.

### 16.2 Streak semantics

Streaks are named, versioned aggregates, not a single global counter. Each declares qualifying event categories, local-day timezone history, minimum action, daily deduplication, grace/recovery behavior, late window, and milestone thresholds.

* Daily login alone cannot preserve an activity streak.
* Multiple actions on one day count once unless the definition explicitly measures variety without extra streak value.
* Streaks must not demand endless daily exercise. Prefer weekly rhythms, “X of Y days,” recovery-compatible days, or bounded campaigns.
* A missed day uses neutral language; no XP debt, badge confiscation, shame animation, or paid streak repair.
* Timezone changes, DST, leap day, offline sync, and late facts follow recorded timezone history and deterministic fixtures.
* Current and longest streaks are projections; milestone awards are immutable history.

### 16.3 Progress display

Display only understandable, actionable progress: current value, threshold, unit, window, reset/expiry information, and projection timestamp. Do not expose anti-fraud bounds or private evidence. Approximate progress must be labeled; the UI cannot announce an unlock before the award exists. Completed tiers remain visible while the next eligible tier is shown separately.

## 17. Reward architecture and balancing

An achievement may grant a badge, title entitlement, fixed XP, fixed points, or no currency. Rewards are snapshotted with the award and do not change retroactively when economy policy changes.

### 17.1 Balancing rules

1. Most weekly XP must come from verified participation and consistency, not performance.
2. Base actions have daily/weekly caps; achievement rewards are fixed threshold bonuses, never linear unbounded multipliers.
3. Overlap groups choose or cap combined effects when one effort satisfies multiple event relationships.
4. Higher tiers reward elapsed consistency and diversity more than raw accumulation.
5. Repeat, hidden, limited-time, referral, and community rewards have especially strict maximum issuance.
6. Equivalent accessible paths should have comparable attainable value and time commitment.
7. Performance improvement requires comparable history, safe percentage bands, confidence gates, cooldowns, and an award cap.
8. Season rewards cannot dominate permanent progression or coerce participation through fear of missing out.
9. Theoretical daily, weekly, season, and lifetime issuance must be calculable before publication.
10. Economy changes affect only a new effective policy/definition version; earned value is never silently nerfed.

Phase 1 targets and proposed action values live in `POINTS_AND_XP.md`. Quarterly review must examine XP percentiles, source mix, time-to-level, cap-hit rates, achievement completion, provisional/reversal rates, cohort fairness, streak anxiety, notification opt-outs, accessibility feedback, and anomaly patterns. Proposed policies are simulated against de-identified event distributions before approval.

### 17.2 No circular rewards

Awards and ledger entries may update projections but cannot become generic healthy-action evidence. An `achievement.awarded` fact, if later introduced for analytics, is ineligible for base XP and cannot satisfy its own or an ancestor definition. Title selection, badge sharing, catalogue viewing, and notification opening never earn currency.

## 18. Notification flow

Notifications are optional projections of durable outcomes, not award authority.

1. The evaluator persists an award and all ledger effects.
2. A notification intent is enqueued with a deterministic key such as `award:<awardId>:unlock`.
3. A projector creates owner-safe content from the snapshotted definition/content revision.
4. The active frontend refreshes authenticated projections after the domain success response and may display at most one queued contextual toast.
5. Additional unlocks are bundled into an inbox/summary, never an interruptive toast storm.
6. Delivery/read/dismiss state is recorded separately and cannot change the award.

### 18.1 Notification policy

* Core action success never waits for evaluation or delivery.
* Messages identify what was recognized without exposing sensitive evidence.
* Hidden achievements reveal only after persistence.
* Repeat awards may be summarized rather than toasted.
* Corrections use neutral language, explain impact safely, and offer a support/appeal route where appropriate.
* Members can mute categories and all gamification notifications while retaining earned history.
* In-app, push, or email channels require separate consent and channel governance; Phase 1 should begin in-app.
* Respect reduced motion, screen readers, focus order, localization, quiet hours, age/privacy controls, and notification rate limits.

## 19. Example achievement catalogue

These examples establish intended coverage and safety posture. They are proposed definitions, not approval to publish. Exact IDs, criteria, rewards, and source contracts must pass the full lifecycle.

| Area | Example | Type | Proposed qualifying evidence | Safety and overlap notes |
|---|---|---|---|---|
| Workouts | **Strength Starter** | Permanent, one-time, common | First verified completed strength workout. | Completion, not load or calories; base workout XP is separate and capped. |
| Workouts | **Steady Strength — Silver** | Permanent tier, one-time, uncommon | 24 verified strength workouts across at least 12 distinct weeks. | Elapsed consistency; no consecutive-day requirement. |
| Generated workouts | **Plan in Motion** | Permanent, one-time, common | Complete the first active generated workout day. | Shares base workout pool; achievement recognizes plan use only. |
| Generated workouts | **Adaptive Journey** | Permanent, one-time, rare | Complete approved generated sessions in 8 distinct plan weeks and accept at least one server-authored progression transition. | No reward for regenerating plans or rejecting safe adaptations. |
| Walking | **Walk One** | Permanent, one-time, common | First credible `walking.activity_completed`. | Supports approved accessible mobility equivalents in a future version. |
| Walking | **Walking Weeks — Bronze** | Permanent tier, one-time, uncommon | Walk on 2 distinct days in each of 4 distinct weeks. | Rest compatible; bounded credibility checks. |
| Nearby trails | **Local Explorer — Bronze** | Permanent tier, one-time, uncommon | Complete 3 distinct canonical nearby trails. | Searching/viewing does not qualify; public evidence omits locations. |
| Nearby trails | **Trail Welcome** | Permanent, one-time, common | First verified known-trail completion. | Trail service remains route authority; raw GPS is excluded. |
| Running | **First Run** | Permanent, one-time, common | First credible run or supported run-walk completion. | Pace and placement do not alter reward. |
| Running | **Run-Walk Builder** | Permanent, one-time, common | 5 eligible run/run-walk activities across at least 3 weeks. | Encourages sustainable spacing rather than speed. |
| Run club | **Club Welcome** | Permanent, one-time, common | First verified run-club participation. | Joining or RSVP alone is insufficient; no placement reward. |
| Run club | **Community Regular** | Permanent, one-time, rare | 8 verified club participations across at least 8 weeks. | Opt-in social visibility and anti-collusion controls apply. |
| Push-up challenge | **Push-Up Participant** | Challenge-instance/permanent recognition, common | First accepted deduplicated push-up challenge result. | Repetitions do not scale base reward; workout overlap applies. |
| Push-up challenge | **Patient PR** | Repeatable with cooldown, uncommon | Safe comparable improvement after 2 prior accepted attempts and at least 14 days. | Banded improvement, plausibility gate, hard lifetime cap; never unlimited reps. |
| Nutrition | **Journal Beginning** | Permanent, one-time, common | First persisted nutrition journal entry. | No meal text or calorie value in evidence. |
| Nutrition | **Nourishment Week** | Limited-window pattern, one-time, common | 5 complete journal days within 7 local days. | Completeness means useful logging, never calorie restriction. |
| Nutrition | **Hydration Rhythm** | Permanent, one-time, uncommon | Meet an approved personalized hydration goal on 5 distinct days within 14 days. | Never reward exceeding the target; support clinical ineligibility/alternative path. |
| Streaks | **Rhythm Builder — Bronze** | Permanent tier, one-time, common | 3 healthy-active days in one local week. | Weekly rhythm, not an endless daily streak. |
| Streaks | **Comeback Courage** | Repeatable, uncommon | Complete an eligible action 21–180 days after a prior eligible action. | Non-shaming; repeat at most once per 180 days with zero or low repeat XP. |
| Assessments | **Know Your Baseline** | Permanent, one-time, common | First eligible current-platform assessment completed. | Rewards completion, not score, body measurement, or diagnosis. |
| Assessments | **Progress Check** | Permanent, one-time, uncommon | Eligible reassessment 28–180 days after baseline. | No requirement that results “improve.” |
| Coaching | **Coach Connection** | Permanent, one-time, common | Complete and acknowledge the first approved coaching interaction through an authoritative workflow. | No reward for private note content, rating, purchase, or message spam. |
| Coaching | **Practice the Plan** | Permanent, one-time, uncommon | Complete 4 coach-assigned eligible sessions across at least 4 weeks. | Session service proves completion; coach assignment alone grants nothing. |
| Seasonal | **Season Finisher** | Seasonal/limited, one-time, rare | Meet published participation criteria across at least 3 supported healthy categories. | Alternative paths required; permanent badge, season XP scoped. |
| Hidden | **Quiet Restart** | Hidden, repeatable with cap, rare | After 90–365 days away, complete 3 healthy-active days within 14 days. | Normal safe actions reveal it; repeat at most annually and no repeat XP. |
| Hidden | **Variety Is Strength** | Hidden, one-time, rare | Qualify in 6 supported healthy categories within 60 days. | Categories and alternatives reviewed; no unsafe guessing. |
| Future yoga | **Yoga Welcome** | Draft/inactive permanent, common | First session accepted by a future authoritative yoga service. | Inactive until Phase 3; no flexibility/body-shape scoring. |
| Future yoga | **Pose Learner** | Draft/inactive permanent, rare | Approved learning milestones for 5 distinct foundational poses. | Expert-reviewed criteria, evidence confidence, and non-diagnostic copy required. |
| Future gymnastics | **Foundations First** | Draft/inactive permanent, uncommon | Qualified workflow verifies all approved safety prerequisites. | Coach/equipment/safeguarding gates; no self-asserted advanced skills. |
| Future gymnastics | **Safe Landing** | Draft/inactive permanent, rare | Approved landing education plus qualified foundational assessment. | Badge is not clearance to attempt advanced skills. |

The expanded proposed launch inventory and icon concepts belong in `BADGE_LIBRARY.md`. That catalogue cannot override the lifecycle, safety, versioning, or authority rules here.

## 20. Achievement versioning

### 20.1 Version rules

* `achievementId` represents one stable meaning and is never reused.
* `definitionVersion` increases when criteria, input events, accepted schemas, verification, eligibility, window, threshold, repeatability, reward, dependency, or effective behavior changes.
* `contentRevision` increases only for copy, localization, art, alt text, or other non-qualification presentation changes.
* Published definition snapshots are immutable and have non-overlapping effective intervals unless an explicit parallel cohort policy exists.
* Events evaluate against the version effective at occurrence. Late processing does not move them to the newest version.
* Awards snapshot the exact definition, badge/art reference, safe evidence, and reward effects.

### 20.2 Change policy

* **Harder replacement:** prior legitimate awards are grandfathered; new evidence uses the new effective version.
* **Easier replacement:** owners choose and document prospective-only evaluation or deterministic equitable backfill for all eligible users.
* **Defect:** publish a corrected version, disable the defective path if necessary, run an audited impact analysis, and use deterministic correction/replay.
* **Split or merge:** issue new stable IDs and an explicit mapping; do not imply award equivalence.
* **Retirement:** stop new qualification but retain history, metadata, and owner access.
* **Reward rebalance:** use a new effective version/policy; do not rewrite old ledger effects.
* **Tier expansion:** add a new tier ID/version without changing the meaning of prior tiers.

Projection schema/version and cursor are independent of achievement definition version. A new projector must rebuild side by side, compare checksums and sampled outcomes, and activate only after validation.

## 21. Corrections, revocation, and appeals

Revocation is permitted only for invalid source evidence, confirmed abuse under approved policy, rule defect, or approved moderation—not because a user later became inactive or a catalogue changed.

The correction record includes award ID, reason code, correction run, source invalidation, timestamp, actor/system provenance, safe owner message, and any appeal/support state. Currency is reversed separately using unique equal-and-opposite ledger entries. Original events, awards, and ledger entries remain in the audit trail.

Targeted replay rebuilds affected aggregates and may grant another achievement that valid evidence still supports. Public surfaces remove revoked recognition promptly; owner history distinguishes corrected records without accusatory language. Automated anomaly detection should hold value provisionally rather than publicly accuse or punish.

## 22. Privacy, accessibility, and sharing

* Achievement APIs are owner-only unless a specific safe field is deliberately shared.
* Safe evidence says, for example, `12 qualifying weeks`; it does not include meals, answers, diagnoses, exact bodyweight, raw GPS, home trail, contact data, or private coach content.
* Badge/title sharing and leaderboard participation are opt-in and independently revocable.
* Hidden definitions and anomaly/risk data never appear in public catalogue responses.
* Deletion/export handling follows account and legal policy while preserving only the minimal separately authorized audit requirements.
* All names, descriptions, progress, dates, rarity, state, and controls are localizable and screen-reader accessible.
* Motion is optional; reduced-motion mode receives equivalent static feedback.
* Color, sound, animation, and spatial position are never the only carrier of achievement state.
* Copy avoids shame, moral judgments about food/body, false scarcity, and professional claims.

## 23. Anti-exploit considerations

The engine uses layered controls without turning gamification into a punitive fitness gate:

1. **Server authority:** only committed current-service facts enter evaluation.
2. **Idempotency:** unique subject/event/effect/qualification keys stop retries and concurrent duplication.
3. **Credibility:** bounded duration, distance, pace, repetitions, timestamps, source confidence, and supported metric combinations.
4. **Caps:** per event, source, local day, week, season, challenge, referral, repeat period, and lifetime where applicable.
5. **Overlap groups:** one effort cannot collect multiple base rewards through workout, generated-plan, trail/run, and challenge relationships.
6. **Distinctness:** unique entity/day/trail/member requirements prevent repeated edits or refreshes from counting.
7. **Cooldowns and history:** personal improvements require comparable verified baselines, elapsed time, banded changes, and capped repeats.
8. **Provisional holds:** anomalous evidence can await review without public accusation; held value does not affect rank.
9. **Social protection:** distinct recipients, moderation acceptance, block/report state, self-referral detection, qualification delay, and anti-collusion limits.
10. **Location protection:** location confidence may validate internally, but raw routes and anti-spoof signals are not exposed as achievement evidence.
11. **Definition analysis:** publication computes maximum issuance and rejects cyclic, unbounded, or combinatorially duplicative rewards.
12. **Reconciliation:** compare committed source records, events, awards, ledgers, cursors, and projection checksums; alert on divergence.
13. **Audit and correction:** immutable provenance, authorized correction runs, compensating entries, and sampled human review.
14. **Rate limiting:** existing auth/rate-limit controls remain in force; gamification adds no unauthenticated write surface.

Anti-exploit bounds must not encourage users to approach a published “maximum.” Operational thresholds and risk flags remain private. False-positive rates and cohort disparities are reviewed, and an appropriate support/appeal route is required before punitive enforcement.

## 24. Future extensibility

Extensibility occurs through registered event schemas, declarative definition operators, new current-service adapters, and versioned catalogue content—not feature-specific conditionals scattered through routes.

### 24.1 Adding a capability

A future activity such as yoga, gymnastics, mobility, cycling, or education must:

1. have an authoritative current-platform workflow and owner;
2. define minimal accepted event contracts in `EVENT_MODEL.md`;
3. document verification, correction, privacy, safety, and idempotency behavior;
4. add typed operators only if existing declarative rules cannot express the need safely;
5. provide inclusive alternatives and reward-overlap analysis;
6. publish inactive definitions and validate replay/simulation before enabling them; and
7. pass the same product, domain-safety, economy, privacy, accessibility, content, and engineering reviews.

Reserved yoga/gymnastics event names and draft badges do not authorize emission or award. Future team, household, coach-authored, education, or community achievements require separate actor/subject, consent, moderation, minors, and collusion policies.

### 24.2 Storage and scale evolution

Repository interfaces may later move from current versioned file storage to another approved current-platform datastore. Immutable IDs, uniqueness constraints, cursor semantics, ledgers, award snapshots, and replay contracts must remain stable. A datastore change is a migration, not permission to create a parallel reward architecture.

## 25. Governance and operations

Named owners are required for product/economy, fitness safety, engineering, privacy/security, accessibility/content, and operations. Publication records all approvals and a checksum. Operational tooling may validate, shadow-evaluate, dry-run replay/backfill, rebuild projections, compare checksums, and perform authorized corrections; it may not hand-edit balances or awards.

Feature flags independently control event capture, evaluation, read APIs, notifications, leaderboards, and each event source. Rollback disables presentation and evaluation while leaving core domain flows available and preserving immutable history. Backfill requires an approved source/date boundary, deterministic adapter, dry-run report, cap application, user-communication decision, restartability, and reconciliation.

Metrics must avoid sensitive payloads and include event/evaluation lag, duplicate rate, invalid/provisional rate, award and ledger counts, cap hits, notification delivery/opt-out, projection checksum, correction rate, economy distribution, cohort fairness, and support/safety signals.

## 26. Acceptance criteria

The achievement engine is not implementation-ready until the approved design and later implementation demonstrate all of the following:

1. Every outcome traces to immutable evidence and exact published versions.
2. No client can create events, awards, ledger value, levels, titles, rarity, or verification state.
3. Reprocessing and concurrency create no duplicate event, award, or ledger effect.
4. Two full rebuilds produce identical balances, awards, states, and projection checksums.
5. Definition changes preserve legitimate award history and follow explicit effective/backfill policy.
6. Repeat periods, seasons, local days, DST, timezone changes, late events, and corrections pass documented boundary fixtures.
7. Base actions and related achievements cannot multiply-pay the same effort beyond approved overlap caps.
8. Hidden content and private health, nutrition, coaching, assessment, identity, and location data do not leak.
9. All reward paths have bounded theoretical issuance and satisfy the economy targets.
10. Unsafe, discriminatory, inaccessible, circular, ambiguous, or unsupported definitions fail publication.
11. Notifications are deduplicated, optional, accessible, non-blocking, and grounded in durable awards.
12. Permanent, repeatable, seasonal, hidden, and limited-time states are accurately represented before, during, and after availability.
13. Current domain workflows succeed when all gamification components are disabled or unavailable.
14. Yoga and gymnastics remain inactive until authoritative services and required safety governance exist.
15. Correction and revocation conserve ledger accounting, preserve audit history, and provide safe user communication.
16. Backfill, rollout, rollback, observability, owner responsibilities, and support paths are documented and exercised before general availability.

## 27. Explicit non-goals

Phase 1 does not include purchasable XP, cash or crypto value, point redemption, peer transfer, loot boxes, wagering, public-by-default leaderboards, punitive demotion, paid streak repair, health diagnosis, professional credentialing, calorie-deficit or weight-loss competition, rewards for unsafe volume, browser-authored evidence, yoga/gymnastics runtime activation, or revival of legacy infrastructure.

This document authorizes design alignment only. Coding begins only after explicit implementation approval.
