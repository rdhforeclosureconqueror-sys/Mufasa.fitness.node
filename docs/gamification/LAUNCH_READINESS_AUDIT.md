# Gamification Phase Launch Readiness Audit

## Scope Reviewed

This audit is limited to the completed gamification phase chain: event capture, validation and idempotency; achievement evaluation and revocation; streak projection; XP policy evaluation, caps and overlap handling; append-only awards and XP ledger; projections and read models; replay, recalculation and integrity checks; policy lifecycle; replay jobs, scheduling, leases and fencing; administrative authorization; metrics and audit records; the Sprint 5 migration; rollback; and gamification-specific persistence and deployment requirements.

The workout session adapter was reviewed only as the authoritative producer of `workout.completed`. Shared authentication, authorization, data-directory configuration, and administrator audit facilities were reviewed only where they directly protect or persist gamification operations. Nearby Trails, GPS, nutrition, dashboards, frontend behavior, unrelated APIs, and platform-wide architecture are excluded.

## Commits Reviewed

The three supplied object IDs (`aed13a946278f95b71bf9d67a400dff4881cb421`, `a1a80b0809817b8360b64f889652ed5546c5e7d3`, and `b689bc6f85153415a82d24b5a86d1a910a47ab8d`) are not present in this shallow checkout. Their reachable phase equivalents and the directly related chain were reviewed:

- `73d6ae2` — Sprint 1 event infrastructure merge.
- `0d4b2e9` — Sprint 2 achievement engine.
- `7f360ec` — Sprint 3 XP and level policy.
- `b7e57f3` — Sprint 4 read model.
- `d42da7a` — Sprint 5 operations.
- `fa0ca6c` — Sprint 5 launch hardening.

## Launch-Blocking Findings — Remediation Verification (2026-07-30)

All six code launch blockers identified below have been remediated. Each entry preserves the original failing path and records the minimal event-sourced correction and regression proof.

### G-01 — Critical — The source event store is not safe with more than one application writer

**Why it matters:** every process loads `events.json` once into memory. `append` deduplicates and calculates the next sequence against that process-local snapshot, then replaces the shared file without a cross-process lock or reload. Concurrent instances can assign the same sequence and overwrite one another, permanently losing authoritative events and producing incorrect XP and achievements.

**Current implementation:** checksummed snapshots, atomic rename, `fsync`, backup recovery, quarantine metadata, pagination, and in-process idempotency are strong. They protect torn writes and some corruption, but not lost updates between processes.

**Required fix:** use a transactional event database with a unique `(subject_user_id, idempotency_key)` constraint and monotonic cursor, or implement a proven cross-process transaction around reload/deduplicate/append/persist. Add a two-writer contention test that proves no event loss, duplicate sequence, or idempotency violation.

**Effort:** 3–5 days for a safe locked-file implementation; 1–2 weeks for the recommended database implementation and migration.

**Blocks launch:** **Yes.** A single-writer deployment restriction reduces exposure but does not make the documented shared-volume/multi-instance topology safe.

**Remediated:** `gamificationEventStore.append` now acquires an atomic cross-process filesystem lock, reloads the checksummed authoritative snapshot while holding it, deduplicates against that snapshot, assigns the next cursor, and durably publishes before releasing the lock. Reads also reload the active snapshot. The previous exact failure path was two store instances loading cursor N, both selecting N+1, then the second rename overwriting the first. The multi-process regression test starts 12 independent Node writers and proves 12 unique events and contiguous cursors.

### G-02 — Critical — Replay fencing does not fence projection, award, or ledger writes

**Why it matters:** the worker fencing token protects only replay-job progress and terminal status. `execute` mutates awards, ledger entries, and projections before the worker verifies that it still owns the lease. If a lease is reclaimed after heartbeat loss, a stale worker can still replace projections or append derived records after the new owner completes.

**Current implementation:** replay-job acquisition, heartbeat markers, leases, fencing tokens, stale-job recovery, and fenced job-state updates exist. The domain write path has no lease assertion or generation/commit token.

**Required fix:** calculate into isolated versioned staging state, verify ownership immediately before an atomic generation switch, and reject a commit with a stale fencing token. Alternatively serialize replay through a transactional advisory lock that covers every derived-state commit. Add a forced lease-loss test where the original executor completes last and is unable to publish.

**Effort:** 4–7 days.

**Blocks launch:** **Yes when replay operations are enabled.**

**Remediated:** the worker now supplies an ownership assertion containing its lease owner and fencing token. Replay builds an isolated derived generation and invokes that assertion while holding the generation publication lock, immediately before switching the active manifest. The previous exact path was `replayWorker.execute -> achievementService.replay -> award/ledger/projection writes -> replay job fence check`; therefore the destructive writes preceded the check. Regression tests steal a running worker's token and prove it cannot publish or complete, and directly prove a rejected generation commit leaves the prior active generation unchanged.

### G-03 — High — Recalculation can retain obsolete XP effects and double-count policy results

**Why it matters:** base-XP effect keys contain the policy version and replay only appends. Deprecating one published policy and publishing a replacement over historical time allows recalculation to append replacement-policy entries while retaining the old entries. Projection totals then include both policies rather than the authoritative recalculation result.

**Current implementation:** evaluation is deterministic for a fixed event stream and fixed policy set; duplicate effect keys conflict safely and exact replay is idempotent. There is no derived-generation replacement or supersession model for legitimate policy changes.

**Required fix:** store calculation generations and atomically activate one complete generation, or append explicit supersession reversals for every obsolete effect before activating a new policy result. Define whether historical policy publication is permitted and reject it unless an approved recalculation plan is supplied. Add replacement-policy and rollback tests.

**Effort:** 4–7 days.

**Blocks launch:** **Yes because recalculation and policy lifecycle are launch scope.**

**Remediated:** every replay now starts from an empty derived generation and atomically replaces the complete active calculation. Policy-version effect keys remain immutable inside a generation, while obsolete policy effects are absent from its replacement. Historical replacement through the lifecycle API is additionally rejected unless a future approved generation recalculation plan is introduced. The prior path appended `base-xp:<old-version>` and then `base-xp:<new-version>` into one permanent ledger. Regression coverage publishes a replacement generation, proves only the new policy effect is active, and rolls back to the prior generation.

### G-04 — High — Derived stores do not provide a recoverable atomic replay generation

**Why it matters:** award, ledger, and projection files are committed independently. A process failure can leave awards updated, the ledger partially updated, and projections stale. Award, ledger, and projection stores lack the event/replay stores' checksum and backup recovery; several writes omit `fsync`. Startup replay can repair some partial states, but an existing conflicting or corrupt file can stop repair.

**Current implementation:** individual writes use temporary-file rename and append keys prevent ordinary duplicates. Projection state is disposable. There is no transaction or manifest tying the three derived files to the same source cursor, policy version, and replay generation.

**Required fix:** build a checksummed immutable derived generation containing award state, ledger state, projections, source cursor, policy versions, and algorithm version; validate it fully; then atomically switch a small manifest. Retain the prior valid generation for rollback.

**Effort:** 1–2 weeks.

**Blocks launch:** **Yes.**

**Remediated:** awards, ledger, and projections are now fields of one checksummed immutable generation with source cursor, policy versions, and algorithm version. Replay writes only staging memory, persists and fsyncs the complete generation, then atomically switches a checksummed manifest. The previous active generation is retained for validated rollback. The former failure path independently renamed `awards.json`, `xp-ledger.json`, and `projections.json`, so a crash between any two renames exposed mixed state. Regression tests prove partial staging and failed/stale commits are invisible after restart and that rollback restores the complete prior generation.

### G-05 — High — Revoked achievements cannot be validly re-earned

**Why it matters:** after evidence revocation, later valid evidence can qualify the same once-only award key. The original award append is treated as a duplicate, so the last revocation record remains authoritative and the projection stays revoked despite current qualification.

**Current implementation:** first qualification is deterministic; award and reversal keys prevent duplication; evidence revocation appends equal-and-opposite XP. No reinstatement record/state transition exists.

**Required fix:** define the product rule. If re-earning is permitted, append a deterministic reinstatement tied to new qualifying evidence and restore achievement XP exactly once. If revocation is permanent, evaluator and read-model state must explicitly report permanent disqualification rather than qualified-but-revoked. Test multiple revoke/re-earn cycles and XP conservation.

**Effort:** 2–4 days.

**Blocks launch:** **Yes until the state rule is explicit and enforced.**

**Remediated — product rule:** a revoked once-only achievement may be re-earned from new qualifying evidence. The service appends a deterministic reinstatement record and a distinct reinstatement XP effect; a later revocation reverses the currently active positive effect rather than attempting to reverse the original twice. Projections treat awards and reinstatements as active and revocations as inactive. The former path retried the original `award:<once-key>`, received `duplicate`, and left the last revocation authoritative. Regression coverage proves two revoke/re-earn cycles, exact XP conservation, earned projection state, and replay idempotency.

### G-06 — High — Migration and readiness do not validate the complete persisted system

**Why it matters:** the migration only reads and rewrites `replay-jobs.json`. It does not version, validate, back up, or cross-check events, policies, awards, ledger, and projections. Operational readiness reports replay storage as readable without actually checking every store and does not require a valid integrity report or successful startup replay.

**Current implementation:** replay-job v1-to-v2 migration is dry-run by default, checksummed, revisioned, backed up, and documented. Event and policy stores have independent recovery features. Startup catches replay failure and continues serving.

**Required fix:** add a gamification preflight/migration manifest that validates all store schemas/checksums and relationships, records source cursor and versions, takes/verifies a backup, and refuses evaluation/readiness on failure. Readiness must require successful replay, valid integrity, writable persistence, required flags, and compatible migration version.

**Effort:** 4–6 days.

**Blocks launch:** **Yes.**

**Remediated:** migration Version 3 loads and validates the event, replay, legacy award, ledger, projection, and policy-registry files; records counts and source cursor; takes a full directory backup; verifies every copied file checksum; creates/imports the first immutable generation; migrates replay storage; and writes a checksummed migration manifest. Runtime preflight validates the source store, active generation, replay store, published policy, writable volume, integrity report, successful startup replay, and compatible applied migration. Readiness now returns 503 unless preflight, worker, policy, and audit-chain checks all pass. Regression coverage applies migration in a temporary production data directory and verifies its backup, manifest, and active generation.

## Non-Blocking Findings

### G-07 — Medium — Integrity verification is incomplete

Verification compares projected XP and level with the ledger and compares only the count of earned achievements. It does not detect ledger users missing from projections, incorrect achievement identities/states/progress, orphan reversals, duplicate IDs, source events missing from ledger evidence, policy-version drift, or a stale source cursor. Expand verification after the generation model is fixed. **Effort:** 3–5 days. **Blocks launch independently:** No; it is part of G-04/G-06.

### G-08 — Medium — Operational history and several metrics reset on process restart

Replay-job history is durable, but read-model replay history, replay failure counters, integrity failure counts, and policy validation failure counts are process-local. Dashboards can under-report failures after deploy. Derive metrics from durable history/audit events or export them to the production metrics backend. **Effort:** 2–3 days. **Blocks launch:** No if durable audit/alert export is configured.

### G-09 — Low — Policy audit events are duplicated and inconsistently shaped

The policy manager emits lifecycle audit events and the route wrapper emits an additional generic mutation event. This is not corrupting, but complicates incident reconstruction. Standardize one event per attempted transition with actor, before/after state, request ID, result, and policy checksum. **Effort:** 1 day. **Blocks launch:** No.

## Data Integrity Assessment

Event validation, deterministic ordering, idempotency keys, stable effect/award IDs, exact reversal validation, and checksummed source snapshots provide the event-sourced foundation. Cross-process serialization now protects the authoritative append, and one atomic immutable generation makes interrupted replay recoverable without exposing partial derived state.

## Replay and Projection Assessment

Replay is deterministic, paginates the full event stream, sorts policy evaluation by occurrence time and event ID, and rebuilds disposable projections inside an isolated generation. Job scheduling, cancellation, lease recovery, heartbeat, job-state fencing, and generation-publication fencing are implemented. User-specific operations intentionally perform a bounded-scope request over a full authoritative replay; this is inefficient but cannot corrupt state.

## Policy and XP Assessment

Policy documents validate semantic versions, canonical UTC intervals, non-overlapping windows, caps, overlap strategies, and action shapes. Publication requires validation, prevents overlapping published windows, rejects unplanned historical replacement, and makes published policies immutable except deprecation. Recalculation replaces the complete active derived generation, so obsolete policy effects cannot remain active or double-count.

## Achievement and Ledger Assessment

Achievement definitions are versioned and bounded; typed rules, verification methods, effective periods, hidden states, streaks, deterministic qualification, duplicate prevention, append-only revocations/reinstatements, and equal/opposite ledger reversals are tested. The ledger and awards are validated members of the checksummed active replay generation.

## Persistence and Migration Assessment

`POCKET_PT_DATA_DIR` is required for production persistence. Authoritative events, policy state, replay jobs, immutable generations, and the active manifest use durable atomic publication appropriate to their roles. Migration Version 3 validates all legacy stores, verifies a full backup, imports one complete generation, and records a compatible checksummed migration manifest.

## Operations and Recovery Assessment

Operational APIs cover queueing, scheduling, cancellation, policy lifecycle, integrity, metrics, and readiness. Replay mutations are audited and a recovery runbook exists. Feature dependencies fail closed, mutations require `gamification.operations.manage`, generation commits are staged and fenced, and readiness incorporates full-store preflight, verified migration state, startup replay, and integrity.

## Security and Permission Assessment

Gamification endpoints require authenticated permission checks. Read operations require `ops.read_observability`; mutating both current and Sprint 5 operations routes now require `gamification.operations.manage`. Administrator and super-administrator roles currently receive both permissions, while trainer and user roles receive neither. Permission separation is technically enforced, though the present role mapping does not yet delegate read-only operations to a distinct role; that is a deployment authorization choice, not a data-integrity blocker.

## Tests and Validation

Existing tests cover event envelopes, rejection/quarantine, idempotency, restart persistence, corruption recovery, authoritative session integration, achievement operators and replay, revocations, XP caps and overlaps, ledger conflicts/reversals, level boundaries, read-model determinism, simulation immutability, replay operations, cancellation, scheduling, multi-worker serialization, checksummed replay migration, and policy lifecycle. This review also added fail-closed feature-dependency coverage.

The former critical gaps now have regression coverage: concurrent process writers; forced stale replay completion; invisible interrupted staging; replacement-policy generation and rollback; repeated achievement re-earning; and full-store migration with verified backup. Deployment restore drills remain an operational responsibility.

## Required Fixes Before Launch

No code launch blockers remain. G-01 through G-06 and their regression tests are complete. G-07 through G-09 remain non-blocking operational/observability improvements and do not compromise authoritative events or the atomic active derived generation.

## Deployment-Only Responsibilities

After the code fixes above: mount durable storage at `POCKET_PT_DATA_DIR`; run the complete dry-run and applied migration against a verified backup; configure the full ordered flag chain (`GAMIFICATION_EVENT_CAPTURE`, workout source, evaluation, read API, then operations); provision administrator identities and least-privilege permissions; deploy the worker topology supported by the corrected persistence design; configure encrypted off-host backup retention and a restore drill; export audit logs and metrics; alert on readiness, integrity, replay failure, queue age, lease age, policy validation failure, and backup failure; canary event capture before evaluation; and retain a rollback window with the prior valid derived generation.

## Final Status

**READY FOR GAMIFICATION LAUNCH — DEPLOYMENT/CONFIGURATION TASKS REMAIN**

The code now preserves authoritative events under concurrent writers, prevents stale replay publication, activates one complete derived generation, safely replaces or rolls back policy calculations, represents achievement reinstatement with conserved XP, and fails readiness until complete persisted-state preflight succeeds. The remaining responsibilities are the deployment-only tasks listed above, including mounted durable storage, applying Migration Version 3 against a verified backup, ordered flag activation, off-host backup/restore drills, least-privilege operator identities, and production alert/export configuration.
