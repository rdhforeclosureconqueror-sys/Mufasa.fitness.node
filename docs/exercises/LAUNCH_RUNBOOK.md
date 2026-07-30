# Exercise Intelligence Launch Runbook

## Preflight

1. Run the exercise, Program Engine, AI Coach, full test, lint, and diff checks.
2. Confirm catalog identity uniqueness and relationship integrity.
3. Sample program payloads for `exerciseId`, version metadata, and relationship/progression IDs.
4. Verify camera-supported records name a detector, landmarks, confidence, scoring, and coaching rules.
5. Confirm member access is read-only and any future administrative write route is authenticated, authorized, validated, audited, and safely rendered.
6. Keyboard-test filters and relationship navigation; verify semantic labels, result announcements, responsive cards, screen-reader text, and reduced-motion behavior in the consuming UI.

## Observability

Track unknown exercise IDs, validation failures, empty substitution sets, search latency, camera compatibility misses, and catalog/content-version mismatch. Derive popularity, completion, substitution, progression, camera, difficulty, and program-usage metrics from source events.

## Rollback

Revert the deployment commit and restore the prior Program Engine artifact. Canonical records are additive and immutable, and no derived search index is persisted, so rollback requires no data migration. Programs already containing `exerciseId` remain compatible because IDs match the prior deterministic program IDs. Retain event data; do not delete or rewrite analytics sources.

## Launch decision

Launch only when all automated checks pass, version integrity is confirmed, no unknown program IDs occur, and security/accessibility preflight is signed off. Otherwise hold deployment and keep the existing exercise presentation active while correcting catalog content.
