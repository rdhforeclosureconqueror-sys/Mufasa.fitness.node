# Gamification Launch Runbook

## Status and hard safety boundary

**READY FOR GAMIFICATION LAUNCH — DEPLOYMENT/CONFIGURATION TASKS REMAIN.** The implementation is feature-complete. All flags remain `false` by default. This runbook does not authorize a production change. Public UI, notifications, and leaderboards remain disabled throughout this rollout.

Commands marked **PRODUCTION — APPROVAL REQUIRED** may be run only by the deployment operator after repository-administrator, security, product, and fitness-content approvals are recorded. Replace every `<OPERATOR_INPUT>`; never paste secrets into tickets, terminals with history, or reports.

## Configuration inventory

| Configuration | Purpose | Requirement | Default | Local development | Staging | Production | Sensitivity | Startup validation | Failure behavior |
|---|---|---|---|---|---|---|---|---|---|
| `POCKET_PT_DATA_DIR` | Root for events, generations, ledgers, projections, policies, replay jobs, and migration manifest | Required when any flag is on | repository `data/` | temporary dedicated directory | durable staging volume | **Operator input:** shared durable POSIX volume | High: contains user-derived records, not a secret | Directory is created; readiness probes write access | Startup/storage operations fail; keep flags off |
| `GAMIFICATION_EVENT_CAPTURE` | Creates event service | Required for any runtime stage | `false` | `false` except fixture verification | stage 2 onward | stage 2 onward after approval | Low | Boolean parser accepts only case-insensitive `true`; dependency graph checked | Invalid dependencies abort startup |
| `GAMIFICATION_SOURCE_WORKOUT_COMPLETED` | Captures accepted workout facts after commit | Optional source flag | `false` | `false` | shadow stage only after global capture | approved shadow/rollout stages | Low | Requires event capture | Invalid combination aborts startup; adapter failures cannot undo workout commit |
| `GAMIFICATION_EVALUATION` | Enables deterministic XP, awards, projection, and startup replay | Optional rollout flag | `false` | fixture only | internal evaluation stage | approved evaluation stage | Low | Requires capture; policy/definition files load when enabled | Invalid config/data aborts; replay error is logged and readiness fails |
| `GAMIFICATION_READ_API` | Enables authenticated internal operator reads/mutations | Optional | `false` | fixture only | after evaluation verification | operator-only after approval | Low | Requires evaluation | Routes absent while off; invalid chain aborts startup |
| `GAMIFICATION_OPERATIONS` | Enables replay worker, policy operations, preflight/readiness endpoints | Optional | `false` | fixture only | after read API | one controlled worker cohort initially | Low | Requires read API; migration/readiness checks exposed | Routes/worker absent while off; failed readiness blocks promotion |
| `GAMIFICATION_NOTIFICATIONS` | Reserved notification exposure | Forbidden for this launch | `false` | `false` | `false` | `false` | Low | Parsed only | No notifications |
| `GAMIFICATION_LEADERBOARDS` | Reserved leaderboard exposure | Forbidden for this launch | `false` | `false` | `false` | `false` | Low | Parsed only | No leaderboards |
| `data/gamification/achievements.json`, `levels.json`, `xp-policy.json` | Approved definitions and policies | Required when evaluation is on | committed versions | committed versions | exact deployed commit | exact approved commit | Integrity-sensitive, not secret | Schema validation during startup | Startup fails; do not edit during rollout |
| `<DATA_DIR>/gamification/*` | Authoritative and derived stores | Required according to enabled stage | created lazily | disposable fixture | persistent restricted volume | backed-up restricted volume | High | Migration and readiness validate checksums, generation, policy, replay, integrity and writability | No promotion; disable evaluation/capture as appropriate |
| `ops.read_observability` | Internal read permission | Required for operator GET/simulate APIs | no implicit grant | dedicated admin | staging operator role | approved operator role | Security-sensitive | Existing authorization middleware | 403; never bypass |
| `gamification.operations.manage` | Replay/policy mutation permission | Required for operational mutations | no implicit grant | dedicated admin | restricted deployment operator | least-privilege approved operator | Security-sensitive | Existing authorization middleware | 403; never broaden role |
| migration v3 / `migration-manifest.json` | Applies checksummed operational layout and generation | Required before operations | absent | verifier creates fixture | apply once after backup | apply once after backup and approval | High operational impact | Readiness verifies version/status/checksum | Readiness is false; flags remain off |
| replay lease/fencing settings | Serial worker coordination | Built-in; no environment override | implementation defaults | unchanged | shared POSIX storage | shared POSIX storage | Medium | Worker store checksum/lease ownership | Failed/stale jobs alert; stale owner cannot publish |

**Operator Inputs Required:** hosting service and deployment commands; volume path, size, encryption, mount sharing and retention; backup product, immutable retention and restore command; secret/permission administration; instance count; authenticated operator identity/token delivery; monitoring platform/query syntax; alert routing/on-call roster; release commit; staging and production base URLs; test-account IDs; maintenance window; DNS/network rules. Their absence is not an application defect.

## Prerequisites and backups

1. Developer records the release commit: `git rev-parse HEAD`.
2. Repository administrator confirms the commit is protected and deployable.
3. Security reviewer confirms volume encryption/access, `ops.read_observability`, and `gamification.operations.manage` assignments.
4. Product and fitness-content approvers confirm the committed policies/definitions (no edits).
5. Deployment operator provisions a shared POSIX durable volume and backup/restore procedure; monitoring owner creates the alerts below.
6. Use a dedicated synthetic account; never copy production users to staging.

**Local development:**
```bash
TMP_DATA_DIR="$(mktemp -d)"
npm run ops:verify-gamification-staging -- --data-dir="$TMP_DATA_DIR"
```

**Staging:**
```bash
export POCKET_PT_DATA_DIR='<STAGING_PERSISTENT_VOLUME>'
test -d "$POCKET_PT_DATA_DIR" && test -w "$POCKET_PT_DATA_DIR"
<STAGING_BACKUP_COMMAND> "$POCKET_PT_DATA_DIR"
npm run ops:migrate-gamification
npm run ops:migrate-gamification -- --apply
npm run ops:verify-gamification-staging -- --data-dir='<EMPTY_DEDICATED_STAGING_VERIFICATION_VOLUME>'
```

**PRODUCTION — APPROVAL REQUIRED:**
```bash
export POCKET_PT_DATA_DIR='<PRODUCTION_PERSISTENT_VOLUME>'
test -d "$POCKET_PT_DATA_DIR" && test -w "$POCKET_PT_DATA_DIR"
<PRODUCTION_IMMUTABLE_BACKUP_COMMAND> "$POCKET_PT_DATA_DIR"
<PRODUCTION_BACKUP_VERIFY_COMMAND> '<BACKUP_ID>'
npm run ops:migrate-gamification
npm run ops:migrate-gamification -- --apply
```
Do not run the staging verifier against production: it intentionally refuses known production environments and requires an empty dedicated directory.

## Rollout matrix

| Stage | Enabled flags | Expected behavior | Verification and monitoring | Rollback | Promotion gate / owner |
|---|---|---|---|---|---|
| 0 Infrastructure | none | Code/volume deployed; existing domains unchanged | health checks; migration dry run; baseline error rates | revert code; retain stores | Backup restore rehearsed; Deployment operator |
| 1 Migrated dark | none | v3 manifest and empty/previous generation available | migration checksum, writable storage | restore only for physical corruption | Readiness inputs valid; Deployment operator |
| 2 Shadow capture | `EVENT_CAPTURE`, `SOURCE_WORKOUT_COMPLETED` | Accepted synthetic/staged workouts append events; no rewards/read APIs | append count, duplicates, workout error baseline | source off, then capture off | zero unexplained append/duplicate differences; Developer + monitoring owner |
| 3 Internal evaluation | stage 2 + `EVALUATION` | XP, awards, levels, generations and projections computed, invisible publicly | two replay checksums match; corrections/reversals balance | evaluation off; retain history | deterministic fixture and integrity pass; Fitness-content + product approval |
| 4 Operator reads | stage 3 + `READ_API` | authorized internal APIs only | 200 for allowed operator, 403 for unprivileged user; latency/errors | read API off | security authorization sign-off; Security reviewer |
| 5 Operations canary | stage 4 + `OPERATIONS` on one worker cohort | readiness, queue and fenced replay available | readiness ready, queue drains, no stale fences/checksum mismatch | operations off; await lease expiry | 24-hour clean staging/canary window; Deployment operator |
| 6 Limited cohort | same backend flags; capture source restricted by approved deployment controls | approved internal/synthetic cohort only | all launch alerts and domain baselines | operations/evaluation/source/capture off in order | agreed observation window and no threshold breach; Product approval |
| 7 Broader/full backend | same; expand approved capture cohort | backend active; public surfaces still absent | capacity/storage trend and integrity | contract cohort or flags off | explicit product/deployment go; Product + deployment operator |

`GAMIFICATION_NOTIFICATIONS=false` and `GAMIFICATION_LEADERBOARDS=false` at every stage. Member-facing presentation waits for a separately approved UI sprint.

## Preflight and internal verification

After deploying each flag set, restart all intended instances, then:
```bash
curl --fail-with-body -H 'Authorization: Bearer <STAGING_OPERATOR_TOKEN>' '<STAGING_BASE_URL>/internal/gamification/operations/readiness'
curl --fail-with-body -H 'Authorization: Bearer <STAGING_OPERATOR_TOKEN>' '<STAGING_BASE_URL>/internal/gamification/operations/integrity'
curl --fail-with-body -H 'Authorization: Bearer <STAGING_OPERATOR_TOKEN>' '<STAGING_BASE_URL>/internal/gamification/operations/metrics'
```
Readiness must report `ready:true`, migration version 3, a valid generation, published policy, successful startup replay, zero integrity mismatches, readable stores, and writable storage. Exercise duplicate delivery and correction only with the synthetic staging account, then replay twice and compare checksums. Record command output after removing tokens and user data.

## Monitoring and conservative initial alerts

| Signal | Initial threshold | Response |
|---|---|---|
| event append failures | any in 5 min | page; disable affected source |
| replay failures | any | page; stop operations claims |
| replay duration | >5 min or >2x staging baseline | warn/page if repeated |
| queue depth | >5 for 10 min | page; stop promotion |
| lock contention | >3 failed claims/min for 5 min | investigate topology |
| stale replay fencing | any stale publication attempt | page immediately |
| duplicate events | >1% deliveries or unexpected increase | warn; reconcile source |
| checksum mismatches | any | page; stop evaluation/operations |
| migration failures | any | stop deployment |
| startup preflight failures | any instance | remove instance; no promotion |
| generation publication failures | any | page; disable evaluation |
| XP reversal mismatches | any non-zero imbalance | page; disable evaluation |
| projection rebuild failures | any | page; keep public surfaces off |
| storage growth | >10%/day or >70% capacity | warn; at 85% page |

All rate, duration, depth, and storage thresholds are deliberately conservative and **must be tuned after 7 and 30 days of real traffic** without weakening integrity alerts (which remain “any”). Monitoring owner records dashboards and alert destinations as operator inputs.

## Rollback and rehearsal

Local/staging rehearsal:
```bash
npm run ops:rehearse-gamification-rollback -- --data-dir='<DEDICATED_NON_PRODUCTION_DATA_DIR>'
npm test
```
The full suite is intentional here: it is the repository's executable regression gate for workouts and the unrelated domains named in this launch plan.

**PRODUCTION — APPROVAL REQUIRED:**
```bash
<SET_ENV_COMMAND> GAMIFICATION_OPERATIONS=false
<RESTART_AND_WAIT_HEALTHY_COMMAND>
<SET_ENV_COMMAND> GAMIFICATION_EVALUATION=false GAMIFICATION_READ_API=false
<RESTART_AND_WAIT_HEALTHY_COMMAND>
<SET_ENV_COMMAND> GAMIFICATION_SOURCE_WORKOUT_COMPLETED=false GAMIFICATION_EVENT_CAPTURE=false
<RESTART_AND_WAIT_HEALTHY_COMMAND>
git revert <GAMIFICATION_DEPLOYMENT_COMMIT>
<DEPLOY_APPROVED_REVERT_COMMAND>
```
Preserve events, ledgers, awards, audit records, replay stores, and generations. Never delete or hand-edit them. Restore a prior active generation via the approved storage restore mechanism only after checksum investigation; rebuild only disposable projections. A backup restore is for physical corruption, requires security/deployment approval, and must be followed by reconciliation. Confirm prior generation/checksum, core workflows, and disabled public surfaces before closing the incident.

## Responsibility matrix

| Step | Accountable owner | Required consulted/approval |
|---|---|---|
| release/tests and fixture verifier | Developer | Repository administrator review |
| branch protection, release tag, revert availability | Repository administrator | Developer |
| volume, backup, migration, deploy, flags, restart | Deployment operator | Security; production approval required |
| permissions, encryption, audit review | Security reviewer | Deployment operator |
| policy/definition fitness safety sign-off | Fitness-content approver | Developer; no policy changes |
| cohort and promotion decisions | Product approver | Monitoring and fitness-content owners |
| dashboards, alerts, observation log, incident lead | Post-launch monitoring owner | Deployment operator |
| public UI/notification/leaderboard state remains off | Product approver | Developer and deployment operator verify |

No step is jointly accountable: the first named role owns it. Approval does not transfer execution ownership.

## Post-launch validation

At 1 hour, 24 hours, 7 days, and 30 days: run the production smoke checklist; compare append/source counts, replay checksums, reversal balance, storage growth and unrelated-domain error/latency baselines; review audit logs; tune traffic thresholds; and record explicit continue/rollback decisions. Immutable-integrity thresholds are never tuned away.
