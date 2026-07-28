# Stepping Into Greatness: Production Readiness

## Architecture and lifecycle

The feature is an authenticated mobile web recorder backed by `steppingIntoGreatnessService` and the user JSON repository. Browser geolocation samples are filtered, accepted points are bounded to 2,000, metrics are calculated, and completion is stored atomically with records, Greatness Marks, challenge contributions, and privacy-safe feed events. Do not treat browser state, submitted verification fields, or community identifiers as authorization authority.

The recording lifecycle is: `idle` → `requesting_permission` → `waiting_for_gps` → `active` ↔ `paused` → `finishing` → `completed`. Permission denial permits retry. GPS errors retain a cancel path. Save failure retains the same `clientSessionId` and permits an idempotent Finish retry. Cancellation discards the draft. On interruption, recovery restores a paused session and requires Resume or Discard; Resume resets the baseline so the interruption is never bridged.

## Verification, recalculation, deletion, and revocation

The server assigns verification. Valid browser GPS becomes `verified_gps`; device, provider, estimated, manual, and unverified levels remain represented, but only valid `verified_gps` and `verified_device` activities are eligible for records, challenge credit, rankings, and aggregate totals. Browser callers cannot submit verification or step counts.

Every completion, deletion, membership/challenge change, or eligibility change recalculates derived records and Greatness Marks from eligible source activities. Contributions are immutable records with idempotent revocation metadata. Soft deletion removes route points, removes feed events, revokes contributions, and recalculates Journey, records, Marks, challenges, and summaries. It does not erase the activity identifier or audit trail.

## Privacy and security

Activity detail, history, deletion, membership settings, and private routes use `/api/me` routes and the authenticated subject; a supplied identifier cannot switch owners. Routes never enter community feed or summary payloads and remain private regardless of membership. Feed fields honor both activity privacy and current membership preferences. Exact time and pace are independently suppressed. Mutation routes are rate limited, completion and deletion are idempotent, verification is server-controlled, and operational analytics contain identifiers/status only—never coordinates, route geometry, or exact locations.

## Deployment

Required production configuration includes a non-default `AUTH_TOKEN_SECRET`, a verified authentication provider configuration, the intended CORS/origin policy, and persistent `USER_DATA_DIR`. Serve only through HTTPS because browser geolocation requires a secure context and tokens/location data must not traverse plaintext. Configure backup, restore testing, log retention/redaction, alerting for authentication failures, HTTP 429/5xx, save failures, latency, disk capacity, and corrupt JSON.

The JSON repository uses same-directory temporary files and atomic rename and is safe only for a single Node process. It is not a multi-process transaction store. Use one writer/process and persistent disk for this phase; migrate to a transactional database or coordinated lock before horizontal scaling. Roll back by stopping writes, retaining a backup, deploying the prior application revision, and restoring data only if schema compatibility has been verified. Never overwrite newer user data casually.

Production validation must verify HTTPS and authentication, complete one controlled GPS activity, test pause/resume and idempotent retry, verify cross-account route denial, exercise privacy suppression, deletion/recalculation, recovery, challenge totals, monitoring, backup restore, and rollback in a staging-equivalent environment before enabling users.

## Manual QA checklist

- Recording: test idle, permission request/grant/denial/retry, waiting/acquired/unavailable/weak/poor GPS, active, Finish, save pending/failure/retry/success, completion, and cancel.
- Pause/resume: confirm controls, timers, no paused distance, baseline reset, and no gap bridge.
- Recovery: interrupt active and paused recordings; confirm paused restore, Resume/Discard, bounded samples, and duplicate-safe save.
- Journey: confirm history/detail, splits, lifetime distance, streak UTC boundaries, empty/error states, and private route preview.
- Deletion/recalculation: confirm owner confirmation, cross-owner denial, route erasure, feed removal, contribution revocation, fallback records, Marks, totals, and duplicate deletion.
- Challenges: enroll twice, complete thresholds, verify active-day uniqueness, verification eligibility, revocation, and membership-dependent community distance.
- Greatness Marks and personal records: test first award, improvement, tie, ineligible activity, deletion fallback, and no duplicate award.
- Privacy/community: test every toggle, leave/rejoin, hidden pace/time/activity, non-member feed denial, weekly summary, and no route/location leakage.
- Accessibility: keyboard-only tab and action order, visible focus, screen-reader names/status announcements, disabled states, confirmation dialogs, 48px touch targets, contrast, and reduced motion.
- Responsive: test 320/360/375/390/414px phones, tablet portrait/landscape, text zoom, long localized/error text, and safe-area behavior on real iPhone and Android browsers.

## Known limitations

No physical-device or browser matrix has been completed by automation. Background geolocation may stop when the OS suspends the page. GPS/elevation accuracy varies by hardware and environment. Streaks and active days use UTC rather than member timezone. Weekly summaries are a rolling seven-day UTC window. JSON storage prevents safe horizontal multi-process writes. Operational event history is bounded. Step achievements and provider imports are unavailable. There are no public routes or live location sharing.

Apple Health, Health Connect, Fitbit, Garmin, Strava, step synchronization, crew management, messaging, followers, public routes, live location sharing, and advanced leaderboards are explicitly future scope.
