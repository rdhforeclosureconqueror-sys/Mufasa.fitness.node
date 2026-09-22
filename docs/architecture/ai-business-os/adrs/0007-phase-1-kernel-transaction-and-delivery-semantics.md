# ADR-0007: Phase 1 kernel transaction and delivery semantics

- **Status:** Accepted for Phase 1 implementation
- **Date:** 2026-09-22

## Context

Phase 1 must prove the constitutional boundary, replay safety, and truthful failure reporting without prematurely building a database platform, tool registry, or distributed worker.

## Decision

Implement a domain-neutral, injected in-memory repository with snapshot/rollback around the post-validation execution commit. Keep the synthetic handler in a private controlled-executor closure. Represent event delivery as at-least-once with idempotent consumer receipts, bounded retry, and dead-letter state. Separate concurrency conflicts from transition denials and derive FIRST FAILURE from ordered dependency evidence.

## Consequences

The implementation proves contracts and invariants deterministically but makes no durability, cross-process locking, or exactly-once claim. A production persistence adapter must later preserve atomic state/evidence/audit/outbox commit and optimistic concurrency semantics without changing the v1 contract. Phase 2 systems remain excluded.

