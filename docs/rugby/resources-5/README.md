# Rugby HQ Resources 5 — Coaching, Welfare, Readiness & Club Operations

Status: thread harvest / implementation resource  
Harvest date: 2026-11-24  
Scope: World Rugby coaching-course learning, player welfare, Rugby Ready, concussion, safeguarding, Activate, backs readiness, evidence-first coaching, coach onboarding, club operations, USA Rugby compliance framing, and Pocket PT Rugby Coaching OS integration.

## Purpose

This folder preserves the useful decisions and course-derived concepts from the coaching-certification thread so Rugby HQ, the Mufasa bot, Codex, and future implementation agents can use them without relying on chat history.

Read in this order:

1. `THREAD_HARVEST_HANDOFF.md` — complete coaching/welfare/readiness knowledge harvest.
2. `CLUB_STANDARDS_AND_COMPLIANCE.md` — distinguishes club obligations, governing-body best practice, and Pocket PT internal standards.
3. `SYSTEM_ACTIVATION_MAP.md` — maps the harvested knowledge into Rugby HQ / Pocket PT product modules and bot behavior.
4. `../../../data/rugby/rugby-hq-resources-5-context.v1.json` — machine-readable context for agents.

Also read existing authorities:
- `docs/architecture/RUGBY_COACHING_OS_INTEGRATION_PLAN.md`
- `exercise-generation/COACH_OPERATIONS_GUIDE.md`
- `exercise-generation/SYSTEM_DATA_ENTRY_SPEC.md`
- `exercise-generation/ACTIVATE_ADULT_HANDOFF_V1.md`
- `exercise-generation/UPGRADE_NOTES_V2.md` through `UPGRADE_NOTES_V5.md`
- `docs/rugby/conditioning/**`
- `docs/rugby/attack-intelligence/**`

## Knowledge-status labels

Preserve these distinctions in future implementation:

- **COURSE-DERIVED** — directly harvested from the user's World Rugby course material in this thread.
- **THREAD-CONFIRMED** — a product/coaching decision agreed in the discussion.
- **CURRENT-RULE-VERIFY** — external governing-body/legal/compliance status must be rechecked against current USA Rugby / World Rugby / competition rules before hard-coding or marketing as mandatory.
- **POCKET-PT-STANDARD** — an internal coaching/competency standard created for Rugby HQ / Pocket PT; not an official governing-body credential.
- **SAFETY-BOUNDARY** — AI/software may support documentation, routing, education, and evidence but must not diagnose, medically clear, determine guilt, or replace qualified authorities.
- **IMPLEMENTATION-DEPENDENCY** — a product/technical constraint that must exist before dependent Rugby HQ features go live.

## Core product principle

Rugby HQ should translate education into operations:

**LEARN → ASSESS → RECORD EVIDENCE → CLASSIFY → COACH → RETEST → PROGRESS / HOLD / REGRESS → PRESERVE HISTORY**

The system should distinguish:
- governing-body or competition obligations;
- recommended best practice;
- internal Pocket PT competency standards;
- safety restrictions that override performance.

## Evidence-first rule

Do not let coaches manually type arbitrary readiness percentages.

Coaches record evidence. Pocket PT derives status.

Example evidence:
- player;
- team/season;
- position;
- competency;
- evidence type (drill / training / scrimmage / match / video);
- score or rubric result;
- coach observation;
- clip/timestamp;
- evaluator;
- date;
- confidence;
- next action;
- reassessment target.

## Safety rule

Performance never overrides safety.

An athlete may be highly skilled/athletic and still be ineligible for a role because of:
- unsafe tackle competency;
- unresolved concussion restriction;
- injury/medical restriction;
- front-row suitability concern;
- safeguarding or administrative restriction where policy applies.

## Activation principle

This harvest is intended to be used by the bot to build, explain, and operate Rugby HQ. It is not permission to silently convert course notes into official certification rules. External requirements must remain versioned and verifiable.
