# Universal leaderboard launch runbook

Enable the complete gamification read pipeline and `GAMIFICATION_LEADERBOARDS=true`. Confirm writable user preferences, current replay status, three definitions, deterministic ties, net reversal handling, bounded pagination, safe aliases, self position, opt-out, banned/admin exclusion, semantic table behavior, empty/error/loading states, keyboard use, and mobile horizontal containment.

Independently verify `/api/challenges/pushup/leaderboard`; its score rows and tie rules must remain unchanged. Roll back the universal UI/API by disabling its flag. Do not modify XP ledgers or Push-Up results.

## Browser contract and Safari verification

The member client accepts only `xp_weekly`, `xp_monthly`, and `xp_lifetime`, percent-encodes the selected identifier, and appends the path to a validated absolute HTTP(S) backend origin without `URLPattern`, dynamic regular expressions, or ambiguous relative-URL resolution. Responses must contain the standard `{data}` envelope, matching `leaderboardId`, an entries array with bounded server ranks/aliases/XP, and a string or null cursor. Ranking remains entirely server-side. Zero XP and zero rows are honest populated/empty contracts, not errors; `selfPosition: null` means not ranked.

Raw `DOMException`, fetch, parsing, URL, and preference failures never become member copy. The card exposes distinct loading, empty, populated, private, and safe error states plus **Retry**, with classifications from `LEADERBOARD_REQUEST_INVALID`, `LEADERBOARD_PERIOD_INVALID`, `LEADERBOARD_RESPONSE_INVALID`, `LEADERBOARD_CURSOR_INVALID`, `LEADERBOARD_NOT_AVAILABLE`, `LEADERBOARD_PRIVACY_UPDATE_FAILED`, `LEADERBOARD_NETWORK_ERROR`, and `LEADERBOARD_BROWSER_COMPATIBILITY_ERROR`.

Before launch, use an authenticated fixture to load all three periods on iPhone Safari and desktop, cover zero-XP/empty/not-ranked/private rows, toggle opt-in and opt-out, retry a simulated failed request, and verify no email, phone, user ID, or admin identity is returned. Push-Up scores must remain separate. Roll back presentation by disabling the universal leaderboard feature flag or reverting the application revision; do not alter ledgers or preferences.
