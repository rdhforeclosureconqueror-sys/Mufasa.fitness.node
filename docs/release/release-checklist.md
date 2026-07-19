# Release checklist

Record evidence, operator, timestamp, environment, commit, artifact digest, backup ID, and result for every applicable item. A checkbox without evidence is not acceptance.

## Pre-deployment

- [ ] Clean reviewed documentation/code diff and approved release commit; no secrets or runtime `data/users` artifacts.
- [ ] `npm ci` succeeds with the locked dependency tree on supported Node 18+.
- [ ] `npm test` passes.
- [ ] `npm run lint` passes.
- [ ] `npm run test:security` and `npm run ops:preflight` pass; authorization contract and low-trust flags reviewed.
- [ ] `npm start` succeeds on a production-like copy; graceful stop/restart verified.
- [ ] `/health` returns HTTP 200, `ok: true`, exercise index present, auth configured, strict startup passed, no unexplained degradation/audit warning.
- [ ] Backup and restore rehearsal completed; one-process/persistent-volume assumption confirmed.

## Browser acceptance

- [ ] Latest supported Chrome (desktop): auth and member/trainer/admin smoke.
- [ ] Latest supported Edge (desktop): auth and core workflows.
- [ ] Latest supported Firefox (desktop): auth and core workflows.
- [ ] Latest supported Safari on macOS: auth, camera/pose permissions, and core workflows.
- [ ] JavaScript errors, network failures, responsive layout, focus, storage/token lifecycle, and logout checked in each.

## Mobile

- [ ] iOS Safari on supported phone sizes: portrait/landscape, safe areas, keyboard, touch targets, camera permission, workout controls.
- [ ] Android Chrome on supported phone sizes: equivalent checks.
- [ ] Slow/interrupted network, background/resume, refresh, and double-submit behavior checked.

## Accessibility

- [ ] Keyboard-only traversal, visible focus, logical order, skip/navigation, dialogs, and no keyboard traps.
- [ ] Labels, names/roles/values, errors/status announcements, headings, landmarks, alt text, and color contrast checked.
- [ ] 200% zoom/reflow, reduced motion, high contrast, and text resizing checked.
- [ ] Screen-reader verification completed on agreed desktop/mobile combinations, or release risk explicitly accepted (currently a known gap).

## Workflow acceptance

### Member
- [ ] Register/login/logout/relogin; membership/trial boundary.
- [ ] Draft, resume, validate, submit versioned intake; Journey Profile/personalization/Member Home.
- [ ] Generated plan; execution start/update/complete; reward/history.
- [ ] Progression evaluate/accept and adaptation read.
- [ ] Nutrition lookup/journal/meal/weekly plan/grocery/mission/review.

### Trainer
- [ ] Trainer page permission; assigned-client list/search/detail only.
- [ ] Unassigned client denied; deactivated assignment loses access.
- [ ] Read/write program and read/append notes; rate-limit/error UX.

### Administrator
- [ ] Admin page permission and directory autocomplete.
- [ ] List/create idempotent/deactivate assignment; trainer access changes immediately.
- [ ] Operations diagnostics/audit permissions; super-admin break-glass remains separately constrained.

## Deployment

- [ ] Maintenance/change window open; owner and rollback authority present.
- [ ] Consistent encrypted backup verified immediately before change.
- [ ] Immutable artifact/digest deployed; secrets/origins/roles/provider modes verified without printing secrets.
- [ ] Persistent volume mounted with correct owner/mode and adequate space; exactly one writer process.
- [ ] HTTPS, forwarded headers, WebSocket, proxy timeouts/body limits/edge rate limits checked.
- [ ] Process stable and logs/metrics/alerts flowing before traffic ramp.

## Rollback

- [ ] Define triggers: health/startup failure, elevated 5xx, auth leakage, data integrity, core workflow regression, or unacceptable latency.
- [ ] Drain/stop writes and preserve current logs/volume snapshot.
- [ ] Confirm previous application version is compatible with current data; otherwise restore the matched pre-deployment backup.
- [ ] Deploy previous immutable artifact, restore required secrets/config, start one process.
- [ ] Repeat health and role/workflow smokes; document data window and incident follow-up.

## Post-deployment verification

- [ ] External `/health` and local upstream health both pass; release/version is expected.
- [ ] Public landing plus authenticated member, trainer, and administrator smoke tests pass.
- [ ] A representative write/read round trip succeeds without duplicate data.
- [ ] Error, latency, 401/402/403/429, disk, restart, provider, and audit-integrity metrics normal through observation window.
- [ ] Backup schedule still runs and first post-release backup verifies.
- [ ] Change record includes results, exceptions, known gaps, incident links, and final go/no-go sign-off.
