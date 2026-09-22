# ADR-0002: Modular domains and contract-first extraction

- **Status:** Accepted for Phase 0 gate
- **Date:** 2026-09-22

## Context

Universal Pilot, Garvey, and Mufasa contain valuable patterns plus substantial Real Estate, Education, and Fitness assumptions. Architecture documentation demonstrates intent, while implementation and tests demonstrate reusable behavior.

## Decision

Keep domain applications modular. Define generic, versioned contracts before extracting code. Prefer adapters when a predecessor should retain ownership. Direct reuse requires code, dependency, test, ownership, failure-mode, and domain-assumption verification. Architecture-document claims alone never authorize direct reuse.

## Consequences

No mechanical Case-to-Work or skill-to-knowledge rename, destructive move, or repository merger is allowed. Unverified candidates remain generalize/reimplement/integrate candidates. Phase 1 records parity evidence for every extraction.
