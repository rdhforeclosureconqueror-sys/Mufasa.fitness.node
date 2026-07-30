# Yoga launch runbook

## Configuration and preflight

1. Publish versioned pose/session JSON only after content and movement review.
2. Verify auth and membership enforcement on all `/api/yoga/*` routes.
3. Run the full tests, Yoga tests, security, gamification, AI Coach, lint and diff checks.
4. Smoke-test camera granted, denied, unsupported and camera-free completion on mobile and desktop; confirm no video/landmark network payloads.
5. Confirm `yoga.session.completed` appears after the user result commit, replay projections, XP cap behavior and celebration delivery.
6. Check keyboard, screen reader, 200% zoom, high contrast and reduced motion.
7. Sample model init, frame rate, identification and completion latency without logging landmarks.

## Rollback

Disable Yoga navigation or route exposure at the release layer, restore the prior pose content version, and stop accepting new completions. Keep committed member results and immutable gamification events; use the existing revocation/replay operations for a confirmed policy defect rather than deleting history. Never roll back by restoring the legacy service or CSV classifier.

## Launch gate

Launch only after deterministic fixture results and rules receive movement-professional approval and a real-device MoveNet browser matrix passes. Dancer and all legacy-only poses remain deferred. Landmark animation, MediaPipe, raw landmark retention, medical claims and advanced gymnastics are explicitly out of scope.
