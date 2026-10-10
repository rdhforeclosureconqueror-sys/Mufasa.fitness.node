# Milele Fit Partner Workspace — implementation contract

## Purpose
Create a shared operating environment for owner and invited collaborator Amelia, without granting platform-wide admin rights. This is a planned feature, not a live capability.

## Organization and roles
- Workspace belongs to Milele Fit; owner is global owner.
- Invite Amelia by verified email to an explicit organization-scoped `workspace_admin` role; do not grant global admin or assume her account ID.
- All reads and writes require server-side workspace membership and resource authorization. Never rely on hidden UI controls.
- Owner can revoke access; revoke active sessions/tokens or recheck permissions on every request.
- Workspace admin can manage shared boards and co-hosted events; client records and messaging require explicit assignment/consent.
- Every membership change, export, client message and sensitive data access gets an audit event.

## Workspace MVP
1. Workspace home: shared priorities, assigned work, event registrations, check-ins and completion metrics.
2. Kanban: goals -> projects -> tasks with title, owner, assignee, due date, priority, status, notes and activity log. Columns: Ideas, Planned, In Progress, Review, Done. Atomic moves, concurrency handling and audit trail.
3. Event hub: event owner, co-host user IDs, confirmed status, capacity, registrations, attendance, paired surveys and aggregated results. Amelia sees only events she co-hosts or events separately shared with her.
4. Shared client workspace: distinguish leads, participants and clients; explicit organization-sharing/assignment; per-client consent and role-based access; avoid automatically sharing the owner's private clients.
5. Messaging: only authorized participants with opt-in and unsubscribe/stop handling; conversation audit, rate limiting, abuse prevention and notification preferences.
6. Notifications: in-app primary; opt-in email summaries only for assigned events, tasks and client threads. Avoid emailing private survey content.
7. Responsive iPhone layout, accessible navigation, search/filter, empty states and first-failure diagnostics.

## Data and security
Use durable storage and canonical authenticated identities; tenant/workspace isolation on every query and mutation. Avoid sensitive wellness detail in generic task descriptions. Explicit consent, retention/deletion, data export policy, least-privilege roles, audit logs and pagination. No unverified client access or default co-host privileges.

## Integration with PR #973
PR #973 is a draft survey service, not production. Integrate only after confirmed event catalog, public check-in flow, server authorization, and trial entitlement are ready. Do not claim email or trial works before verifying it.

## Acceptance tests
- Amelia can move shared tasks but cannot view global platform admin or unrelated clients/events.
- She can see registrants and event summary for events she co-hosts, not other events.
- She can message only consented/assigned clients; unauthorized direct API requests fail.
- Revoked collaborator immediately loses access; cross-workspace ID guessing fails.
- Registration and reflection counts reflect real records; email failure does not lose submissions.
- Owner validates actual production experience on iPhone after reviewed merge.

## Rollback
Require PR-specific rollback runbook before merging. Revert merge commit via reviewed PR, redeploy and verify; no force pushes. Preserve existing client and survey data during code rollback and assess any schema migrations separately.

## Delivery phases
Phase 1: auth/organization/role foundation and shared Kanban.
Phase 2: event registrations and co-hosted dashboards integrated with completed check-in feature.
Phase 3: shared client CRM and consent-based messaging.
Phase 4: notifications, analytics, audit and exports.
