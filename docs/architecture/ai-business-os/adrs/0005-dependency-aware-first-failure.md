# ADR-0005: Dependency-aware FIRST FAILURE

- **Status:** Accepted for Phase 0 gate
- **Date:** 2026-09-22

## Context

Flat health lists misreport downstream effects as independent failures and obscure the earliest actionable boundary.

## Decision

Diagnostics form declared dependency graphs and use `PASS`, `FAIL`, `BLOCKED`, `NOT_RUN`, `PENDING`, and `NOT_APPLICABLE`. Only an executed check with direct failure evidence reports `FAIL`. Checks prevented by a failed dependency report `BLOCKED`; unattempted checks without that causal claim report `NOT_RUN`. FIRST FAILURE is the earliest observed failed dependency under deterministic declared ordering.

## Consequences

Certification views must show the first failure and downstream blocked states while retaining all evidence. FIRST FAILURE begins investigation and is not itself proof of ultimate root cause. Phase 1 adds graph, branch, and cascade-prevention tests.
