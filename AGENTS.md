# Repository agent instructions

## Readiness / Kanban development contract

For every implementation task, before coding, determine whether it affects a readiness card. If it does, record the board ID and card ID, start the card, and select it as `CURRENT` when it is the active task. If significant tracked work has no card, create one through the canonical readiness mechanism rather than leaving it untracked.

Before completion, update every affected card with correlated changed-file evidence, implementation reference, commit/PR when available, automated results, browser/production QA performed, physical-device and human requirements, and blockers/notes. Use `npm run readiness:update -- ...`; it updates both operational state and the repository audit. Do not edit either JSON store directly. A PR number is not required when work starts.

The CLI is machine-authority only. Agents may record implementation completion, repository/file/commit/PR evidence, automated PASS/FAIL, and browser technical evidence. **Agents must never self-approve visual quality, physical-device acceptance, movement naturalness, UX acceptance, or any human-required criterion.** Only the authenticated, authorized Admin UI/API may record human verification.

Development-task definitions and machine evidence are repository-backed in `data/readiness/`; operational status, CURRENT selection, QA, history, and all human state are OPS-backed. Always use `npm run readiness:update -- ...`; never commit generated `data/ops/` state.

If significant tracked work has no applicable card, create a `canonical:false` development card with the CLI. The 20 canonical Avatar requirements, IDs, acceptance rules, and human gates are immutable and cannot be replaced by development cards.

An implementation task is not complete until applicable readiness evidence is updated. Run `npm run readiness:validate` before reporting completion.

## Production-first acceptance and rollback

Owner device acceptance happens after merge and production deployment, never as a prerequisite for merge when no preview environment exists. Merge does not equal owner approval. Each PR requires: a first implementation review; a separate second technical review; applicable automated checks; a recorded rollback procedure; and post-deploy owner testing. Only authorized human acceptance can close human verification requirements. If owner testing fails, fix through another reviewed PR or revert and redeploy, then retest. Merge changes sequentially, awaiting owner verification before dependent changes. Never force-push main for rollback. For merge commits, use git revert -m 1 on the merge SHA in a rollback branch; for squash commits, revert the squash SHA. Identify affected services and data consequences before merge. Record tests not run as unverified, not passed.
