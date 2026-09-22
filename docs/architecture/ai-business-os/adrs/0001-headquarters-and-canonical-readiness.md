# ADR-0001: Headquarters and canonical readiness

- **Status:** Accepted for Phase 0 gate
- **Date:** 2026-09-22

## Context

AI Business OS needs one headquarters and one certification evidence authority. Mufasa already implements repository-backed development definitions/evidence, OPS-backed operational/human state, CLI updates, validation, and human-versus-machine boundaries.

## Decision

`Mufasa.fitness.node` is headquarters. The existing Mufasa readiness architecture remains canonical and will be extended through compatible modules/adapters. The future Control & Certification Panel consumes that evidence; it does not own an unrelated store. Only `readiness:update` may update readiness from machine workflows; authenticated authorized Admin paths retain human-verification authority.

## Consequences

No second readiness implementation, hand-edited readiness JSON, or machine-generated human acceptance is permitted. Phase 1 must verify status/schema compatibility before extending runtime behavior.
