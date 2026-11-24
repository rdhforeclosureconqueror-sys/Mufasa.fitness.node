# Rugby HQ Conditioning Knowledge Index

Status: thread harvest / implementation resource  
Harvest date: 2026-11-24  
Scope: Rugby HQ physical-performance, periodisation, assessment, monitoring and Athlete #001 pilot context.

## Purpose

This folder converts the conditioning discussion into durable Rugby HQ resources that a future bot, coach-facing assistant, or implementation agent can discover and use without relying on chat history.

Read in this order:

1. `THREAD_HARVEST_HANDOFF.md` — complete decision and concept handoff from the discussion.
2. `ASSESSMENT_ENGINE.md` — assessment domains, data contract, interpretation boundaries and test inventory.
3. `ATHLETE_001_PRESEASON_CASE.md` — de-identified pilot athlete goal and proposed 10-week operating model.
4. `../../../data/rugby/rugby-hq-conditioning-context.v1.json` — machine-readable context for agents.

Also read the existing architecture authority:
- `docs/architecture/RUGBY_COACHING_OS_INTEGRATION_PLAN.md`
- `docs/rugby/attack-intelligence/**`
- `docs/rugby/web-integration.md`

## Knowledge-status labels

Every future implementation should preserve these distinctions:

- **SPEC-CONFIRMED** — explicitly represented in the uploaded Pocket PT × Advanced Conditioning Integration Specification v1.0.
- **THREAD-CONFIRMED** — agreed or clarified in the discussion, but not necessarily a complete official protocol.
- **USER-REPORTED** — athlete goal/history/equipment/preferences supplied by the athlete.
- **NEEDS-VERIFICATION** — exact governing-body protocol, normative threshold, residual-duration number, licensing/attribution detail, or medical interpretation must be checked before hard-coding.

## Core operating principle

Rugby HQ should not become a random workout library. It should implement the loop:

**ASSESS → CLASSIFY → PRIORITISE → PROGRAMME → TRAIN → MONITOR → RETEST → ADAPT**

The central object remains the athlete timeline. Training plans and recommendations are derived from timestamped evidence, not overwritten profile fields.

## Safety/product boundary

This resource supports performance decision-making, not diagnosis or medical clearance. Preserve the existing Rugby Coaching OS rule that medical/safeguarding states are separately permissioned and that coach selection remains a human decision.

Do not market these resources as "medical-grade" merely because they record advanced testing. Preferred product language: **Athlete Performance Intelligence** or **Rugby Performance Intelligence**.

## Implementation opportunity

Rugby HQ can expose these resources through:
- Player Physical Performance Profile
- Assessment Lab
- Preseason Block Builder
- Speed Lab
- Conditioning / MAS / RSA / RHIE Lab
- Movement Screen and Retest
- Athlete #001 longitudinal case study
- Position-demand comparison
- Readiness and load monitoring
- Explainable "Why this priority?" cards

No UI activation is implied by this documentation-only harvest.
