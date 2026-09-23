# ADR 0013 — Brain Certification Is Evidence-Based

**Status:** Accepted for Phase 7 machine certification  
**Date:** 2026-09-23

## Context

Passing implementation tests does not establish that the composed Brain behaves correctly under uncertainty, pressure, contradiction, or failure. Conversely, a weak market result is not necessarily a Brain defect. An evaluator that supplies the answer, bypasses governance, or certifies unevidenced output would be another source of false authority.

## Decision

The permanent Brain Academy lives at `src/business-os/academy/`. Versioned, data-driven scenarios declare fixtures, constraints, expected invariants, forbidden behavior, diagnostic boundaries, and declarative assertions. Injected executors must traverse the real Phase 1–6 architectural seams; the Academy may set up controlled fixtures and observe results, but may not reason for a role, grant authority, bypass policy, mutate governed truth, or inspect hidden chain-of-thought.

Certification preserves scenario and Academy versions, Brain/configuration/model/role/tool references, input evidence, observations, assertion evidence, limitations, reproducibility metadata, and distinct Academy versus lower-layer Brain FIRST FAILURE. PASS requires evidence. Human-required criteria remain `PENDING_HUMAN`. Deterministic architectural certification remains separate from repeated stochastic model-quality evaluation and from Phase 8 organism/economic validation.

Reflection compares an immutable pre-action expectation with later observations and creates proposals only. It cannot change policy, authority, autonomy, prompts/configuration, procedures, capabilities, code, or validated knowledge.

The Brain Architecture Complete gate is derived from the certification matrix. Machine success with human acceptance pending is `CONDITIONAL_PASS`; Phase 8 remains disallowed until the complete gate is `PASS` under the authenticated human authority path.

## Consequences

The Academy has its own integrity tests and classifies broken fixtures as `TEST_HARNESS_FAILURE`, not Brain failure. Historical baselines are compared rather than overwritten, and configuration drift is visible. Phase 7 proves a defined reusable architecture contract with synthetic, single-process fixtures; it does not prove commercial viability, unrestricted autonomy, production persistence, live-model quality, or statistical process capability.
