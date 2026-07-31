# Notification Checks

A true `GAMIFICATION_NOTIFICATIONS` flag is not proof of delivery. This build has no gamification notification service, projection, member route, queue, preferences, suppression, retry, or external provider integration. Diagnostics therefore return `FLAG_ENABLED_BUT_FEATURE_NOT_IMPLEMENTED`, never claim push/email support, and list the missing layers. This is blocking when the launch configuration intentionally enables notifications.
