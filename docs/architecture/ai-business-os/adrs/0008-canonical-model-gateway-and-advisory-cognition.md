# ADR-0008: Canonical model gateway and advisory cognition

- **Status:** Accepted for Phase 2 implementation
- **Date:** 2026-09-22

## Context

Future Business OS roles need reusable model cognition without provider integrations, authority, sensitive content, or business mutation leaking into each role.

## Decision

All new Business OS cognition uses the domain-neutral gateway under `src/business-os/cognition`. Permission is injected from the constitutional boundary and precedes selection or provider access. Selection uses versioned, deterministic profile policy; adapters return normalized responses; retry, timeout, fallback, structured validation, telemetry, evidence, and audit are controlled by the gateway.

Cognitive results are explicitly non-authoritative. Proposed StructuredIntent data receives no special authority and must separately traverse Phase 1. Safe reasoning summaries exclude hidden chain-of-thought. The Phase 2 repository remains in-process and the provider implementation is deterministic certification infrastructure, not a production provider claim.

## Consequences

Roles cannot bind themselves directly to providers or models. Invalid model output cannot become a successful CognitiveResult. Provider substitution and cost estimation are attributable. Production persistence, live-provider credentials/adapters, complete context/memory/knowledge, learning, and agent behavior remain later decisions.
