# ADR-0003: Constitutional action boundary

- **Status:** Accepted for Phase 0 gate
- **Date:** 2026-09-22

## Context

A capable Brain must not become an alternative authorization, policy, workflow, or persistence engine.

## Decision

All effects follow: domain/agent → structured intent → authority → policy → state/workflow validation → controlled tool/domain service → observation/result → evidence → audit → event → learning/orchestration. AI proposes or structures; the Constitution authorizes; controlled services execute. Policy and authority are rechecked when material context changes. Denial, failure, and attempts are auditable.

## Consequences

Direct model writes, prompt-only business controls, self-issued grants, and bypasses are rejected. Phase 1 must prove the boundary with negative paths, idempotent replay, state-conflict, and failed-side-effect tests before kernel certification.
