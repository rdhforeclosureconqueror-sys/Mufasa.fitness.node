# Implementation contract

## Invariants

1. `SMART_ANALYST` remains configuration on the shared role registry and runtime.
2. Every accepted `AnalystAssessment` contains non-empty reasoning and attributable evidence references.
3. Synthetic and controlled-validation evidence never establishes independent demand.
4. Contradictions, unknowns, provenance, version history, and limitations remain visible.
5. A diagnostic gate is `PASS` only when every required check is `PASS` or `NOT_APPLICABLE`; `NOT_RUN` produces `INCOMPLETE`.
6. Tool success is not business success. Analysis is advisory and may only recommend a governed experiment.
7. Architecture, internal integration, verified live evidence, and authenticated human acceptance are distinct gates.
8. No implementation command launches, deploys, spends, connects an account, or executes Test A.

## Phases and definitions of done

| Phase | Definition of done | Evidence |
|---|---|---|
| A0 | Baseline gaps reproduced and guarded | Empty tool configuration, empty analysis acceptance, and false diagnostic PASS have regression tests. |
| A1 | Contracts and constitutional policy exist | Versioned assessment/evidence/acceptance records and bounded policy. |
| A2 | Shared role and tool configuration is truthful | Seven narrow capability/tool definitions are registered as `DESIGNED`/`UNAVAILABLE`; no execution adapter is claimed or installed. |
| A3 | Production analysis is meaningful | Evidence scoring, uncertainty, contradictions, negative controls, history, and dispositions. |
| A4 | Runtime and coordinator handoff are connected | A constitutional grant authorizes a real role-registry assignment; `createOrganizationalCoordinator` executes it and validates the resulting `AnalystAssessment` work artifact. |
| A5 | Academy scenarios are executable | 42 registered canonical scenarios invoke the production assessment engine. |
| A6 | Internal integration is evidenced | Shared-role, registry, runtime artifact, and Academy tests pass. |
| A7 | Acceptance is authenticated | Injected application-boundary verifiers validate identity and scoped authority; caller-supplied roles and reference strings are ignored. |
| A8 | Readiness and handoff are truthful | Architecture may pass while external live and human gates remain blocked. |
