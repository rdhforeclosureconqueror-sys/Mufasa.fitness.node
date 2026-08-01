# In-app notification architecture

Authoritative gamification events are projected into an auditable file-backed member notification history. A SHA-256-derived stable ID and `(member, type, source event, award)` deduplication key make replay safe. Creation failures are isolated from the source transaction. Only allow-listed application routes are actions. Reads and mutations derive ownership exclusively from the authenticated token. History is bounded to 500 records per member and API pages to 50.

Launch delivery scope is **in-app only**. Email, Web Push, APNs, FCM, and SMS are not implemented or claimed. Celebrations remain transient; notifications are durable history.
