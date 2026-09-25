# Experiment Manager follow-up

PR #888 now contains a tested internal core. This PR adds EM-1 proposal reasoning. Read README.md for actual phase status and IMPLEMENTATION_CONTRACT.md for the original E0–E8 target. Do not report all phases complete or Platinum from internal tests.

## Review repairs completed

- Approval identity comes from a server-owned authentication adapter and a live kernel authorization check. No verifier means no approval. Start/replay/resume recheck authority.
- Immutable approval and proposal versions, cumulative reservations across runs and approvals, cent arithmetic, request-bound idempotency and exact boundaries are enforced.
- Measurements preserve missing versus zero, require source/sample references, reject stale/future observations and overwrites, and enforce the configured minimum sample count.
- Pause/resume/stop/cancel and declared stop signals preserve transition history. Stopped/cancelled experiments cannot be promoted to success.
- Result work identity and exact stored result provenance are checked. Both DESIGN_EXPERIMENT and INTERPRET_EXPERIMENT execute through the canonical coordinator.
- 27 real Academy executors exercise the implemented core. Readiness rejects arbitrary, cloned or incomplete reports. A negative control proves the runner detects a bypass.
- EM-1 adds a real Analyst-to-proposal Academy executor and rejects weak, contradictory, incomplete, mismatched or unsupported Analyst context.

## Next implementation slices

1. Finish E1/E3/E5: durable versioned lifecycle storage, transactional reservations and restart-safe idempotency; preparation/QA/archive stages; explicit metric/window definitions and verified source adapters.
2. Finish E6: real coordinator handoffs to independent QA, Economics, Learning and Manager. Preserve their ownership of acceptance, profit, lesson promotion and authorization. The Experiment Manager recommends decisions.
3. Extend E7 coverage through those production paths and add independently verified outcome/Finance/human evidence gates to E8.

Use the canonical readiness CLI and append audit evidence. Keep human verification pending until authenticated user acceptance. External campaign, publication, contact, payment and scale capabilities require separately implemented, tested authority boundaries and remain unavailable in the current package.
