# ADR 0010 — Tool Execution Does Not Equal Verified Outcome

**Status:** Accepted for Phase 4 certification  
**Date:** 2026-09-23

## Context

An adapter can return successfully while the intended business effect is absent, partial, delayed, or unknowable. A model assertion and an HTTP/API acceptance response are therefore insufficient evidence of a business outcome. Tools and organizational capabilities are also different: a mechanism may exist without the complete validated ability to deliver an outcome.

## Decision

Represent and retain separate versioned contracts for Plan, authorized Structured Intent, ExecutionAttempt, ToolInvocation, ToolResult, Observation, VerificationResult, evidence, and PlanOutcome. Only explicit `VERIFIED_SUCCESS` may complete a step. Ambiguous, partial, unverified, malformed, timed-out, and failed results remain non-success states.

Tools and capabilities live in separate organization-scoped registries. Registry organization filtering precedes permission evaluation. Every initial or substituted side-effecting invocation receives a fresh Phase 1 constitutional check. Substitution requires a registered compatible tool for the same registered capability and records its lineage. Execution evidence may produce episodic memory but cannot self-promote into validated knowledge.

## Consequences

The controller carries more records and requires explicit verifier adapters, but audit answers can distinguish intent, permission, invocation, response, observation, verification, and claimed outcome. Model proposals remain advisory, failed tools cannot manufacture success, and later Agent Runtime roles can reuse one governed loop. Phase 4 makes no claim about live tools, distributed durability, commercial delivery, or human acceptance.
