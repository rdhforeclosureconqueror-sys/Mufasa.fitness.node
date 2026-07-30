# Exercise Hub launch runbook

## Acceptance gates

```bash
npm test
npm run lint
node --test test/exercise-*.test.js
node --test test/program-*.test.js
node --test test/yoga-*.test.js
node --test test/ai-coach-*.test.js
node --test test/gamification-*.test.js
node --test test/phase12a-security-remediation.test.js
git diff --check
git status --short --branch
```

Confirm authorization denial for member tokens, author/reviewer/publisher separation, audit-chain integrity, catalog uniqueness, relationship validity, unknown-ID and version-mismatch dashboards, media 404 sampling, and latency budgets. Keyboard-test search, every filter, cards and dialog at desktop, tablet, 320px portrait, landscape, 200% zoom and reduced motion. Sample long names, missing media and empty technique fields. Qualified reviewers must sign the launch-approved inventory; unreviewed content remains honestly labelled.

## Feature rollback

1. Disable Exercise Hub navigation.
2. Disable member discovery routes.
3. Disable internal curation routes.
4. Preserve the immutable catalog and all canonical IDs referenced by programs.
5. Revert the sprint commit.
6. Retain additive published releases and audit records.
7. Smoke-test Program Engine, workouts, Yoga, Movement Engine, AI Coach and gamification.

Rollback is additive and non-destructive. Do not delete published identities or rewrite history.

## Operator inputs required

Before public enablement, operators must supply the production navigation flag, qualified review decisions, media/caption acceptance, permission assignments, latency/error alert thresholds, retention policy for discovery events, and sign-off from Program, Movement, Coach, accessibility and security owners. Launch is **hold** until the full suite, manual accessibility matrix and reviewer inventory pass.
