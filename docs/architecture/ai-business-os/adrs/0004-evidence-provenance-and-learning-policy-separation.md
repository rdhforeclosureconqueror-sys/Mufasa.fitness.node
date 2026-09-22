# ADR-0004: Evidence/provenance and learning-policy separation

- **Status:** Accepted for Phase 0 gate
- **Date:** 2026-09-22

## Context

Reasoning requires evidence and learning, but confidence or repetition must not turn inference into fact or silently rewrite operational policy.

## Decision

Evidence and provenance are first-class. Preserve distinctions among observation, derivation, inference, hypothesis, decision, and knowledge, including source, context, version, contradiction, confidence limits, and lineage. Learning may update bounded beliefs and recommendations first. Policy, authority, model promotion, and other governed operational changes use separate authorized and audited paths.

## Consequences

Garvey supplies patterns, not generic educational scoring formulas. Phase 1 defines the kernel evidence seam; later phases define full knowledge/learning semantics. Derived records retain links to their inputs and cannot overwrite history silently.
