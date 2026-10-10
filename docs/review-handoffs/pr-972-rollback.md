# PR #972 — production verification and rollback

Base main SHA: `b9b3f5eee8bedab3d865eaed5f4144a1d63ac002`.

Scope: community hub HTML/JS, residential community service/routes, AGENTS policy. No schema migration. Writes member weekly-interest votes to canonical user records; reverting code does not delete those votes. Other member data must not be deleted during rollback.

Before merge: separate technical review and applicable automated/readiness checks. Report any unavailable checks. Owner physical-device approval is deferred until after production deploy.

After merge: record merge SHA and verify both Render services deployed that SHA: static `Mufasafitsite` and Node `Mufasa.fitness.node`. Test logged-out redirect, login, community join, Wednesday vote, saved vote after reload, 7-interest threshold, 14-cap, 15th rejection, week rollover, chat, and no phantom events. Owner checks on iPhone Safari. Status stays PENDING OWNER ACCEPTANCE until authorized owner signs off.

Rollback triggers: login loop, production 500, unauthorized data access, lost member data, broken community entry, vote duplication, incorrect cap or serious usability regression. Stop further merges. Branch from current main and run `git revert -m 1 <MERGE_SHA>` for standard merge; use `git revert <SQUASH_SHA>` if squash. Open rollback PR, inspect diff, merge, confirm static and backend redeploy and repeat login/community smoke tests. Never force-push main. If persistence is affected, separately inspect member data and restore only from verified backup with owner approval.

This PR does NOT implement courtesy seven-day entitlement, Stripe payments, owner approval notifications, confirmed reservations, or private calendar booking. Do not advertise those as live.