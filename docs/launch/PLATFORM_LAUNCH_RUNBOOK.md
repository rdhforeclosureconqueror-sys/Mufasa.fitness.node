# Platform Launch Runbook

1. Pin the release commit and Node version; install from lockfile; run every required validation command.
2. Validate required environment without printing values: auth secret, login/identity provider, storage/database paths, public origins, AI key/model, TTS integration, admin allowlists, rate limits, and all feature flags.
3. Back up durable stores and verify checksums/restoration. Apply migrations in order and validate permissions/generation directories.
4. Enable only reviewed V1 flags in staging. Keep excluded domains hidden. Validate active XP/catalog/content versions against the build manifest.
5. Run deterministic fixture journeys and Chromium/Firefox/WebKit desktop/mobile/tablet acceptance; capture accessibility/content/Yoga sign-offs.
6. Verify health/version endpoints, logs without secrets, alerting, AI cost/rate/circuit limits, completion latency, projection lag, event integrity, and replay parity.
7. Deploy incrementally, run authenticated smoke tests, monitor 4xx/5xx, latency, event capture, projection/replay, and AI failures.
8. On failure disable affected flags, stop writes if integrity is uncertain, preserve evidence, and follow `ROLLBACK_PLAN.md`.

Operators: release engineer owns deploy/rollback; security owner owns auth/permissions/secrets; data owner owns backup/migrations; product owner owns scope/flags; content and movement reviewers own exercise/Yoga approval; accessibility lead owns sign-off; AI owner owns provider budgets and circuit breaker.

