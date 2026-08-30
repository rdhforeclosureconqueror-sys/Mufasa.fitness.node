# Repository agent instructions

## Readiness / Kanban development contract

For every implementation task, before coding, determine whether it affects a readiness card. If it does, record the board ID and card ID, start the card, and select it as `CURRENT` when it is the active task. If significant tracked work has no card, create one through the canonical readiness mechanism rather than leaving it untracked.

Before completion, update every affected card with the implementation reference, changed files, commit/PR when available, automated results, browser/production QA performed, physical-device and human requirements, blockers/notes, and machine evidence. Use `npm run readiness:update -- ...`; do not edit operational JSON directly. A PR number is not required when work starts and may be attached later.

Agents may record implementation completion, repository/file/commit/PR evidence, automated PASS/FAIL, and browser technical evidence. **Agents must never self-approve visual quality, physical-device acceptance, movement naturalness, UX acceptance, or any human-required criterion.** Technically complete work awaiting authorized human acceptance has effective status `HUMAN_TEST_REQUIRED`. Only an authorized human may record `humanVerified`.

An implementation task is not complete until applicable readiness evidence is updated. Run `npm run readiness:validate` before reporting completion.
