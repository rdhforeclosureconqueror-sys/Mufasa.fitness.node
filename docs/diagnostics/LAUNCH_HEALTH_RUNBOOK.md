# Launch Health Runbook

1. Open the dashboard with an administrator identity having `ops.read_observability`.
2. Run **Run Full Diagnostic** and confirm deployment identifiers, environment metadata, storage, catalogs, and capability groups.
3. Export the redacted report; inspect blockers before sharing it.
4. Only when provider verification is desired, run **Run Safe External Checks**. Stripe performs a read-only Price lookup with a five-second timeout.
5. Run production environment and route validation commands from launch documentation.
6. Redeploy the frontend separately when `frontend_stale`/`build_mismatch` appears, then invalidate static cache and confirm asset revision tokens.
7. Never paste secrets into reports or change provider resources from diagnostics.

Rollback is one code rollback of the launch-health commit. Existing `/api/admin/diagnostics/report` and `/recent` remain compatible; disabling the new UI does not alter member services. Do not roll back data catalogs or member persistence to undo console presentation.
