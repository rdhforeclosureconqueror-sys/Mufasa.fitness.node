# Full XV assessment and development framework

Status: candidate coaching definitions for adult rugby union XV. Position-aware browsing, local capture bindings and structured observations now use the live adapter described in INTEGRATION_HANDOFF.md. Candidate scoring, independent verification and programme prescription remain separate from raw capture.
Owner request: complete the position assessment foundation while the separate thread connects Rugby HQ assessments and athlete development.

## What the audit found

| Area | Existing repository evidence | Gap addressed here |
|---|---|---|
| Shared assessment principles | `docs/rugby/conditioning/ASSESSMENT_ENGINE.md`; `docs/rugby/rugby-hq-coaching-os-handoff.md` | One explicit map from every jersey number to candidate assessments and development questions |
| Forwards | Handoff section 6.2 covers front row, locks, back row and hooker; `data/rugby/rugby-hq-resources-5-context.v1.json` preserves Scrum Ready stages; `exercise-generation/COACH_OPERATIONS_GUIDE.md` describes contact, ruck, maul, lineout and scrum evidence | Separate profiles for 1–8, assigned-role observations and development links; existing material is reused, not declared absent |
| Backs | `docs/rugby/RUGBY-HQ-RESOURCE-007-BACKS-READINESS-HARVEST/` and matching data cover 10–15; coaching handoff already mentions 9/10 together | Explicit number 9 service/tempo/decision assessment and consistent full-XV coverage |
| Athlete capture | PR #1437, merge `583caa4ecbb8572e395b5843ed1f1fc538cce7b3`, adds movement/physical capture and named batteries | Definitions that can be reviewed before importing; no automatic catalog registration |
| Review and interpretation | PR #1436 displays saved evidence; PR #1435 adds isolated trusted-evidence evaluation | Document precise compatibility gaps before promoting capture to verified evidence |

References to modules in harvested JSON and demonstration screens are evidence of preserved design, not proof of live integration. Demo player values and readiness percentages are not real athlete assessments.

## Files and authority

- `data/rugby/full-xv-assessments/position-profiles.v1.json`: all 15 positions; common assessment menu, role overlays and alternative power measure.
- `data/rugby/full-xv-assessments/assessment-candidates.v1.json`: procedure candidates, units, observation tasks, validity and safety boundaries, and source provenance.
- `data/rugby/full-xv-assessments/development-links.v1.json`: questions, interpretation limits and coach-reviewed exercise/drill menus by domain.
- `scripts/validate-rugby-full-xv.js`: checks position completeness, reference integrity, catalog IDs and candidate-state safeguards.
- `INTEGRATION_HANDOFF.md`: exact next connection for the assessment integration thread.

These are versioned supplemental definitions. Existing source harvests remain unchanged. Do not treat old 1–99 weights or internal starter thresholds as validated tests, official credentials or automatic selection rules. Missing evidence is unknown. No overall score is calculated here.

## Position coverage

| Jerseys | Role observations beyond shared foundations |
|---|---|
| 1 and 3 | Separate loosehead/tighthead scrum review, assigned lineout lift, carry and breakdown |
| 2 | Front-row review, throwing accuracy/timing, assigned lineout role |
| 4 and 5 | Scrum connection, assigned jump/lift/delivery, ruck arrival and repeat involvement |
| 6 and 7 | Assigned flank role, tackle/reload, breakdown decisions, support and field coverage |
| 8 | Scrum role plus base control and connection with 9 |
| 9 | Ground service both ways, tempo, repositioning, distribute/carry/kick choice |
| 10 | Distribution, territory, communication and channel defence |
| 12 and 13 | Carry/distribute and defensive connection; 13's edge reads remain visible |
| 11 and 14 | Finishing, longer sprint speed, kick chase, assigned edge/backfield and aerial role |
| 15 | Backfield organisation, aerial security, counterattack and last-line defence |

Team assignment matters: 6/7 are not universally blindside/openside in the same order; 4/5 need explicit lineout roles; wings can have different duties. Primary and secondary positions require separate evidence rather than copying a rating.

## What the battery should tell the coach

Separate physical capacity, movement control, skill execution, decision quality and outcome. A fast runner is not automatically a good defender; a missed tackle does not identify a strength deficit.

Examples of conditional development questions:

- Good straight sprint but poor planned turn: inspect approach speed, braking and turning technique before selecting strength work.
- Good planned turn but poor reactive tracking: inspect cue recognition, scanning, choice and task familiarity.
- Strong pressing result but ineffective tackle: locate the failing tackle stage; bench strength cannot establish tracking, head placement, wrap or timing.
- Good first sprint but poor repeated output: examine pacing, recovery interval, conditioning and team load before adding density.

A bench/press result measures pushing capacity. Pair it with pulling and lower-body strength where useful; rugby transfer is checked in separate field observations. Body mass supplies context for relative force, not a bigger-is-better target. Record body-mass date/method alongside absolute load; do not invent a ratio when mass is missing.

## Administering and interpreting assessments

This is a menu, not a requirement to exhaust every athlete with every test. Select the smallest battery that answers the development question. Warm up consistently; assess fresh movement, speed and power before fatigue. Schedule substantial strength, conditioning and contact testing with appropriate recovery and club-load context. Contact tasks are technical progressions, not maximal collision competitions.

Each candidate must receive a complete fixed local protocol and qualified coach review before interpretation: equipment, layout, units, side, repetitions, rest, timing trigger, trial-selection rule, validity, pain response, pressure and assessor. Selected published tests require their full administration instructions; a test name alone is insufficient. Local reactive and skill tasks need familiarisation, repeatability checks and assessor agreement before meaningful comparison.

The rugby demands are informed by the source links in the assessment catalog. The particular local batteries, exercise menus and task procedures are AI-assisted coaching proposals, not governing-body tests. The cited match study involved 29 senior international men: associations cannot provide universal club, women's or youth cutoffs. Separate populations and contexts before adopting benchmarks.

Tackling uses tracking, preparation, connection, acceleration and finish, with release/reload observed afterward. Assess balance, coordination and controlled force within those actions. Screens alone do not predict injury or diagnose muscular causes. Qualified coaches control scrum, tackle and lifted-lineout progression; current competition eligibility and clinical restrictions stay separate.

## Review and rollback

Automated validation checks definitions and references, not coaching effectiveness, medical clearance, live save/readback or physical-device usability. Coach approval, protocol reliability, live import and owner acceptance remain pending. This work does not complete a new original roadmap milestone; retain 30/53 until its full criteria are met.

Rollback is a reviewed revert of this PR's squash commit. Only additive definitions, documentation, validation/CI and readiness evidence are affected. No service deployment, database migration or athlete data rewrite is required. Existing live capture/review behavior remains as established by PRs #1436–1437.
