# Academy matrix

The canonical set contains **42 deterministic executors**. Every executor calls `analyzeOpportunity`, the same production assessment function used by the runtime integration. Academy only supplies fixtures and evaluates declared observations.

| Expected disposition | Scenarios | Coverage |
|---|---:|---|
| `ADVANCE_TO_EXPERIMENT` | 7 | verified outcomes/providers, diversity, bounded confidence, version history, bounded recommendation |
| `REQUEST_EVIDENCE` | 13 | empty/unattributed/weak evidence, unknowns, attention, readiness, causality, missing measures, profitability, freshness, geography, sample size |
| `REJECT` | 13 | synthetic/controlled/unverified evidence, unsupported Scout input, injection/privacy/credentials, and six prohibited actions |
| `HOLD` | 3 | partial/designed/missing product capability |
| `ESCALATE_CONTRADICTION` | 4 | source, outcome, freshness, and role dissent |
| Regression variants | 2 | historical preservation and explicit experiment-only boundary (included above in executable total) |

Negative controls replace a registered executor with a false advancement result and prove Academy returns `FAIL`. A missing executor returns `BLOCKED`; scenario declarations alone cannot certify architecture.
