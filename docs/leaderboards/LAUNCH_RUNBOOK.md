# Universal leaderboard launch runbook

Enable the complete gamification read pipeline and `GAMIFICATION_LEADERBOARDS=true`. Confirm writable user preferences, current replay status, three definitions, deterministic ties, net reversal handling, bounded pagination, safe aliases, self position, opt-out, banned/admin exclusion, semantic table behavior, empty/error/loading states, keyboard use, and mobile horizontal containment.

Independently verify `/api/challenges/pushup/leaderboard`; its score rows and tie rules must remain unchanged. Roll back the universal UI/API by disabling its flag. Do not modify XP ledgers or Push-Up results.
