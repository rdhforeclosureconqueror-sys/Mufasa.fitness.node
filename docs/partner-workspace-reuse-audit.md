# Existing capability reuse audit — 2026-10-10

Baseline: main at d84dfe783359d94362f7aa243907eb131d3eba9c. Source-level/documentation inspection only; no runtime or device verification performed.

## Confirmed reuse
| Requirement | Existing source | Integration action |
|---|---|---|
| Authentication and roles | src/lib/authorization.js, docs/security/authorization.md | Reuse trusted role resolver and permission middleware. Current admin is globally powerful, not appropriate as a default collaborator role. |
| Client directory | public/admin-members.html, public/admin-client.html, admin CRM APIs | Reuse directory and client detail projections with an explicit co-host/assignment scope. |
| Messaging | public/inbox.html; client messaging repository and APIs | Reuse participant-scoped conversations; do not grant all-client messaging to co-host automatically. |
| Trainer assignments | public/trainer.html; trainerWorkspaceService/store | Reuse assignment model where appropriate; event participants are not automatically trainer clients. |
| Kanban | public/admin-launch-readiness.html, public/admin-launch-readiness.js; readiness cards | Reuse board UI patterns, NOT readiness/evidence records as business tasks. Separate business-task persistence may be necessary. |
| Command Center | public/command-center.html and createCommandCenterService | Reuse summary/read-model design; owner observability is privileged, so filter co-host view. |
| Navigation | public/global-nav.js | Add single Partner Operations entry with server-side authorization. |
| Membership/trials | membershipService | Inspect existing entitlement rules before introducing a courtesy trial; never infer seven-day access exists. |
| Wellness events | residentialCommunityService.js | Wednesday Reset is interest-only; DEFAULT_EVENTS empty. A confirmed event authority is missing in inspected service. |
| Surveys | PR #973 draft | Not merged or wired. Integrate with confirmed events and client/event access controls. |

## First-failure / architectural risks
1. **Admin role escalation**: docs/security/authorization.md says admin has all currently defined permissions. Assigning Amelia generic admin would expose unrelated operations and clients. Create scoped staff permission grants or explicitly safe organization admin role while preserving existing owner global admin.
2. **Readiness Kanban != business Kanban**: readiness cards track engineering acceptance/evidence; shared business projects must not mutate these records.
3. **Event ownership gap**: no published event in DEFAULT_EVENTS. Registration counts and co-host visibility need an authoritative confirmed event catalog.
4. **CRM overexposure**: existing admin CRM sees all legitimate non-staff members; co-host view must be filtered before search/pagination.
5. **Messaging isolation**: conversation access is participant-scoped. Co-host must be explicitly added to permitted client conversation, never read another staff member's messages.
6. **Deployment persistence**: current filesystem JSON storage must be evaluated against Render persistence/restarts before relying on event check-ins.

## Recommended minimum integration
A. Owner invites verified Amelia identity to a scoped collaborator role, not global admin.
B. One new Partner Operations home links existing CRM, inbox, and adapted business Kanban; backend validates permissions per resource.
C. Integrate confirmed event registration/check-in from PR #973 with event co-host assignment and owner dashboard.
D. Add event/client-scoped messaging only after explicit assignment and consent.
E. Run security tests, cross-event/cross-client isolation tests, rollback rehearsal and production iPhone acceptance.

## Unverified
Exact working Kanban mutations, current production deployment health, client messaging production delivery, persistence across Render deploys, and live email capability. Do not call any of these verified.
