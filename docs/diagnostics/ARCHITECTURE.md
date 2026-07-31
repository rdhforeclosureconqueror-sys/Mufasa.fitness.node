# Launch Health Console Architecture

The admin-only launch health console extends the existing dashboard diagnostic flow; it does not create a parallel diagnostic product. Deterministic checks in `launchHealthService` are canonical. The capability registry declares Version 1 dependencies once, the environment validator emits metadata only, and AI can only summarize an already-built report. Reports use the status vocabulary `READY`, `READY_WITH_LIMITATION`, `DEGRADED`, `BLOCKED`, `DISABLED_INTENTIONALLY`, `EXCLUDED_FROM_V1`, and `UNKNOWN`.

All `/api/admin/diagnostics/*` routes require `ops.read_observability`. Static checks make no provider calls. External checks require an explicit POST opt-in. Export is generated at runtime and redacted by construction.
