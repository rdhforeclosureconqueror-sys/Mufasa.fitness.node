# In-app notification architecture

## Scope and guarantees
Launch scope is authenticated **in-app delivery only**. Email, Web Push, APNs, FCM, SMS, and other external channels are neither implemented nor reported healthy. Celebrations remain immediate transient UI; notifications are durable history.

## Authoritative flow
1. Workout, Yoga, program, verified Greatness, and persisted Push-Up services commit their domain state.
2. A minimized, versioned gamification event is appended after that commit. Event-capture errors are caught and cannot roll back the domain write.
3. The member notification projector reads authenticated-member events plus active achievement/badge awards. Browser state never creates a notification.
4. `notificationService` derives a stable ID and deduplication key from member, type, source event, and source award.
5. Creation, read, and dismissal operations append schema-v1 NDJSON records. The current view is disposable and replayed from this audit log.

The log is append-only; read and dismiss do not rewrite creation records. A lock plus `fsync` serializes writers. Member-visible history is capped at the newest 500 and pages at 50, while audit history remains available for replay. Action routes are restricted to an allow-list. API output removes member IDs and internal deduplication keys.

## Failure and privacy model
Projection failures are logged only by a safe classification. They never undo XP, an award, workout, Yoga result, program completion, Greatness activity, or Push-Up result. Every read and state transition uses `req.auth.userId`; no request body or arbitrary user parameter controls ownership.
