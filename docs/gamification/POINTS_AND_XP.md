# Points and XP Economy

## 1. Distinct currencies

| Measure | Meaning | Lifetime/reset behavior | Spendable? |
|---|---|---|---|
| **Lifetime XP** | Permanent account progression earned from healthy verified activity. | Never resets; corrections use ledger reversals. | No. |
| **Season XP** | Bounded-period participation used for opt-in seasonal progression. | New season starts at zero; prior seasons remain historical. | No. |
| **Points** | Recognition balance for future cosmetic/community unlocks. | Default lifetime; policies may issue explicitly labeled seasonal points that expire at announced season end. | Not in Phase 1. No cash value or transfer. |
| **Achievement progress** | Typed count/sum/streak/milestone state. | Definition-specific; lifetime or seasonal. | No. |

Never sell XP/points, exchange them for cash, allow peer transfer, or attach health access to rank. If redemption is later introduced it needs a separate ledger, consumer-law, tax, fraud, expiration, and refund design.

## 2. Initial reward budget

Values are launch proposals requiring product/safety/economy approval.

| Healthy action | XP | Points | Caps/notes |
|---|---:|---:|---|
| Credible workout completed | 100 | 20 | Max one base award/day; later completions can progress safe milestones without base currency. |
| Generated workout completed | 0 extra base / 20 plan bonus | 0 / 5 | Shares workout base; bonus max 3/week. |
| Walking activity completed | 35 | 8 | Max two/day; distance milestones separate. |
| Running activity completed | 50 | 10 | Max one/day; pace does not increase reward. |
| Trail completed | 60 | 12 | Max one/day; first unique trail adds 20 XP, max two/week. |
| Run-club participation | 40 | 10 | Max two/week; placement irrelevant. |
| Push-up challenge participation | 40 | 10 | Once/challenge; PR adds max 25 XP after cooldown. |
| Nutrition journal day complete | 25 | 5 | Once/day; completeness, not restriction. |
| Protein or hydration goal | 15 each | 3 each | Once/day/goal; approved personalized goals only. |
| Weekly nutrition mission | 50 | 10 | Once/mission; overlap does not duplicate underlying reward. |
| Check-in completed | 20 | 5 | Max one/day and three/week. |
| Bodyweight update | 10 | 2 | Max one/week; amount/direction earns nothing. |
| Assessment completed | 75 | 15 | Once per assessment version or approved reassessment interval. |
| Profile completion | 100 | 20 | Once per requirements version; never require optional sensitive data. |
| Daily active login | 5 | 0 | First active login/day; max five rewarded days/week; cannot satisfy activity streak. |
| Qualified referral | 100 | 25 | Max five/lifetime initially; consent, anti-self-referral, qualification delay. |
| Community encouragement | 5 | 1 | Max three/day; moderation and distinct recipient. |

Use integer units only. No floating-point accrual. XP effect key uniqueness and policy caps are checked transactionally/logically before append.

## 3. Level curve

Levels are permanent and computed from lifetime XP. For level `L` beginning at 1:

`XP to advance from L to L+1 = 100 × L + 25 × floor((L-1)/5) × L`

Store reviewed cumulative thresholds in versioned `levels.json`; do not recalculate with an unversioned formula at runtime. Initial thresholds:

| Level | Cumulative XP | Level | Cumulative XP |
|---:|---:|---:|---:|
| 1 | 0 | 6 | 1,500 |
| 2 | 100 | 7 | 2,250 |
| 3 | 300 | 8 | 3,125 |
| 4 | 600 | 9 | 4,125 |
| 5 | 1,000 | 10 | 5,250 |
| 11 | 6,500 | 16 | 16,250 |
| 21 | 32,000 | 26 | 55,000 |
| 31 | 86,500 | 36 | 127,750 |
| 41 | 180,000 | 46 | 244,500 |
| 50 | 306,250 | — | — |

The table is authoritative; threshold generation/validation must catch monotonicity and document any corrected figures before publication. Levels above the published maximum display “Level 50+” and retain all XP until an expansion is versioned. Changing future thresholds must never reduce a user's recorded highest level; use a `levelCurveVersion` and grandfather `highestLevelAchieved`.

## 4. Rank titles

Titles are cosmetic, selectable, and never imply medical/coach qualification.

| Lifetime level | Default title |
|---:|---|
| 1–4 | First Step |
| 5–9 | Habit Builder |
| 10–14 | Steady Mover |
| 15–19 | Consistency Keeper |
| 20–24 | Momentum Maker |
| 25–29 | Resilient Regular |
| 30–34 | Community Motivator |
| 35–39 | Balanced Performer |
| 40–44 | Lifelong Learner |
| 45–49 | Pride Leader |
| 50+ | Legacy of Greatness |

Achievement-earned titles (for example `Trail Steward`) require a published title rule. Users choose among earned titles and can hide them. Revocation removes future selection but preserves an audit record.

## 5. Prestige

Prestige is deferred until enough users reach the cap and safety/economy review is complete. Proposed design: at level 50 a user may **opt in** to a prestige emblem while retaining lifetime XP, level, achievements, points, history, and titles. Prestige never resets health progress and never provides an XP multiplier. Each prestige journey requires a fixed amount of new post-eligibility XP and at least 90 elapsed days, preventing volume sprints. No competitive advantage is attached.

## 6. Seasons and resets

Seasons last 8–12 weeks with explicit UTC start/end timestamps and user-local display. Only season XP, seasonal points explicitly issued by a seasonal policy, seasonal milestones, and season leaderboard positions reset/new-cycle. Lifetime XP, lifetime points, levels, permanent achievements, longest streaks, and historical season records never reset.

At close: stop acceptance by `occurredAt` plus a documented seven-day late-event window; freeze standings; process corrections; snapshot; issue participation awards; archive. Users see dates and reset behavior before joining. No season requires risky daily behavior; objectives offer rest days and alternative activities.

## 7. Leaderboards

Leaderboards are opt-in, pseudonymous, age/privacy eligible, and disabled by default.

* Prefer weekly participation bands, diverse-habit points, team/community goals, and “personal best” views over raw global totals.
* Minimum cohort size: 20. Show top 10 plus the member's neighborhood, not a complete user directory.
* Cap leaderboard-credit XP per day/week independently of lifetime XP.
* Ties share rank; deterministic tie display uses earliest threshold time but awards are equal.
* Exclude provisional/reversed events. Recompute after corrections.
* Provide hide/leave/report/block controls; no precise location, email, legal name, weight, calories, or health status.
* Minors and protected cohorts require a dedicated policy before eligibility.

Initial boards: weekly consistency days, community participation, trail diversity, and season participation. Do not launch “most reps,” “most calories burned,” “least calories eaten,” “fastest weight loss,” or unbounded distance boards.

## 8. Reward balancing

Target a typical engaged member at 400–700 XP/week across 3–5 healthy days; extraordinary volume should not exceed roughly 2× typical reward due to caps. Balance across activity families so mobility limitations, equipment, schedule, and nutrition eligibility do not make progress impossible. At least 70% of weekly attainable XP should come from participation/consistency; at most 20% from performance improvement and 10% from community/referral bonuses.

Quarterly review metrics: XP distribution percentiles, time-to-level, source mix, cap-hit rate, provisional/reversal rate, streak anxiety/support feedback, cohort fairness, opt-out rate, and achievement completion. Modify only future effective policy versions. Never silently nerf already-earned value. Simulate proposed policies against de-identified event distributions before publication.

## 9. Anti-exploit protections

1. Server-authoritative committed sources and deterministic idempotency keys.
2. Per-event, per-source, daily, weekly, season, and referral lifetime caps.
3. Credibility bounds for duration, distance, pace, reps, future timestamp, and source confidence.
4. No linear reward beyond safe thresholds; use fixed completion and milestones.
5. Overlap groups prevent workout + generated workout + challenge from triple-paying the same effort.
6. Cooldowns and comparable-history requirements for personal bests.
7. Referral qualification delay, distinct verified accounts, device/payment/risk signals where lawfully approved, and no self-referral.
8. Provisional holds and human review for anomalies; avoid automatic punitive public action.
9. Immutable correction/reversal records, reconciliation, and audit metrics.
10. Definition publication validates maximum theoretical daily/weekly issuance.

## 10. Safety constraints

No bonuses for exercising through pain, skipped rest, excessive hydration, very low calories, maximum daily volume, extreme pace, rapid bodyweight change, advanced unsupported skills, or perfect pose/body scoring. A rest/recovery day can preserve a broad consistency streak when definition policy permits, but is not gamed for repeated currency. Copy celebrates the action, not body shape or moral worth.

## 11. Accounting rules

Ledger kinds are `lifetime_xp`, `season_xp`, `lifetime_points`, and `season_points`. Each entry has integer `delta`, event, policy/version, reason code, effective season, timestamp, and optional `reversalOf`. Balance is the sum of valid entries; it is never directly edited. A reversal must be equal/opposite, unique per original/correction run, and cannot recursively reverse a reversal. Negative displayed balances clamp to zero only in presentation; accounting retains the true sum and operators resolve anomalies.
