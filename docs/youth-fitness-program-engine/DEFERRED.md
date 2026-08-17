# Youth Fitness Program Engine Deferred Work

This log preserves intentionally postponed work. An item may move into scope only when the phase ledger reaches its owning phase and prerequisites are satisfied.

| ID | Deferred item | Earliest phase | Prerequisite / note |
| --- | --- | --- | --- |
| YF-D-001 | Full canonical master specification checked into the repository | Phase 1 | Preserve the supplied master handoff as normative documentation; Phase 0 records boundaries only. |
| YF-D-002 | Versioned rule and evidence-source persistence, validation, seed sources, and review lifecycle | Phase 1 | Source claims must be reviewed; do not invent citations. |
| YF-D-003 | Conservative approved youth exercise seed library | Phase 2 | Audit shared exercise metadata and add youth eligibility/approval/stop metadata. |
| YF-D-004 | Administrator-approved movement-game registry and seed games | Phase 2 | Needs multiplayer/equipment/age/level/safety fields and approval workflow. |
| YF-D-005 | Opaque participant-reference resolver and canonical youth fitness profile | Phase 3 | Decide guardian/consent, privacy, age verification, and durable persistence policy first. |
| YF-D-006 | Foundation multi-week program planner | Phase 4 | Requires Phase 1 rules, Phase 2 registries, and Phase 3 profile. |
| YF-D-007 | Program-bound adaptive session planner | Phase 5 | No orphan workout endpoint. |
| YF-D-008 | Youth final safety-veto implementation | Phase 6 | Must encode prohibited prescriptions and fail closed. |
| YF-D-009 | Competency counters, one-variable progression/regression, adaptation events, and training memory | Phase 7 | Result-quality contract must distinguish prescribed, attempted, and valid reps. |
| YF-D-010 | Pocket PT youth journey UI and accessibility/user testing | Phase 8 | Requires stable read projection; screenshot and real-device verification required. |
| YF-D-011 | Conservative baseline assessment protocols and movement-observation categories | Phase 9 | Existing OHSA output requires non-diagnostic review before youth reuse. |
| YF-D-012 | Exclusion-aware consistency and personal progress reporting | Phase 10 | Replace generic streak assumptions with eligible scheduled-session denominator. |
| YF-D-013 | Minimal Leader Within assignment/completion bridge | Phase 11 | No integration exists in this repository; agree authentication, idempotency, event schema, and data minimization with owning system. |
| YF-D-014 | Youth-safe gamification | Phase 12 | Existing XP/streak/leaderboard system is reusable only behind minor privacy and anti-overexercise policy. |
| YF-D-015 | Reassessment and next-cycle generation | Phase 13 | Assessment protocol identity must remain stable across comparisons. |
| YF-D-016 | Advanced resistance, sport specialization, maturation modeling, agility analytics, computer vision, ML injury prediction, global score, and extensive coach analytics | Post-V1 | Explicitly outside Version 1. |
| YF-D-017 | Production database selection and normalized youth tables | Before production persistence | Repository currently uses JSON files and has no relational migration framework; requires deployment/backup/retention decision. |
| YF-D-018 | Reconcile duplicate legacy fitness domain implementations | Maintenance phase | `domains/fitness.js` and `src/domains/fitness.js` overlap; avoid expanding either for youth work. |
| YF-D-019 | Remove browser-local random “today workout” generation from youth paths | Before Phase 8 launch | `public/fitness.js` is not authoritative and must never power youth delivery. |
| YF-D-020 | External Ma’at program API disposition | Before youth planner rollout | Treat external generation as untrusted/non-youth until a constrained, versioned adapter and safety validation exist. |

