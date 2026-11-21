# Simba notification runtime isolation

This is an **opt-in integration contract**, not a deployed database connection.

1. DBA verifies backup/restore and existing Simba `public` tables.
2. DBA runs the approved notification schema migration using the authorized Simba database owner.
3. DBA creates a separate, dedicated LOGIN role with a unique secret. Ensure it has no inherited Simba application grants or direct privileges on `public` tables; audit existing `PUBLIC` grants. Use `notificationRuntimeGrantSQL(role)` as a **reviewed** grant template, not an automated migration.
4. Store the dedicated role connection string in a secret manager and configure the notification service only. Never reuse the Simba owner connection string.
5. Create a `pg.Pool(createSimbaNotificationPoolConfig({connectionString}))` for the notification adapters. Do not pass Simba's existing app pool.
6. Verify with that role: notification tables can be queried; `SELECT * FROM public.<existing_simba_table>` fails with insufficient privilege; `SHOW search_path` lists `business_os_notifications,pg_catalog`.
7. Validate rollback before production writes. Revert application routing/credentials first; **do not drop the schema or tables containing audit history**. Restore only from a reviewed backup if necessary.

The search path alone is not a security boundary; dedicated role privileges and verified denial of access to Simba's `public` tables are required. This module does not create users, rotate secrets, execute migrations, send notifications, or alter production Render settings.
