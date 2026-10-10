# Wellness Experience: release contract

Owner: Milele Fit. Co-host Amelia receives notifications and reports **only** for events explicitly assigning her as co-host. No automatic co-host access to other events. Co-host permissions must be attached to authenticated user IDs, not names.

## Required before release
- Confirmed event record, explicit ownerId and coHostIds; never use placeholder events.
- Mobile NFC check-in, optional first name, brief pre-survey (past seven days stress, arrival relaxation, intention) and post-survey (expectations, relaxation, connection, return intent, improvement).
- Guest-friendly token check-in with secure random token, expiration, one submission per stage, rate limits and duplicate handling; do not force login on arrival.
- Secure persistence and organizer summary; participant-level written comments shared with co-host only when opted in. No sensitive questionnaire content in emails.
- Email notification adapter to owner for own events and assigned co-hosts for co-hosted events. Confirm organizer emails with owner before sending; never hardcode guessed addresses.
- Seven-day courtesy digital access: explicit activation after reflection, start at activation, once per eligible account, no credit card, no auto-renewal, no paid membership or physical-class entitlements. Feedback polarity must not affect eligibility.
- Clear privacy notice, retention period, delete request handling, accessible UI and error states.
- Test check-in/reflection authorization, invalid answers, duplicate requests, co-host isolation, trial repeat abuse, expiry, email delivery, and mobile flow.
- Independent review, readiness validation, rollback plan; merge then owner verifies production. No staging requirement.

## Rollback
Before merge record base and merge SHAs. If serious regression, revert merge commit via a reviewed PR (git revert -m 1 MERGE_SHA), redeploy and verify both services. No force push. Data written during the release remains in storage after code revert and must be reviewed separately. Do not delete survey data during routine rollback.

## Status
The initial service module is a foundation only. It is not yet wired into routes, event records, UI, email, or trial entitlements. Do not present it as live.
