# Universal gamification leaderboard architecture

Version 1 provides `xp_lifetime`, `xp_weekly` (rolling seven days), and `xp_monthly` (rolling 30 days). Each uses net approved XP from the authoritative server ledger, including authoritative reversals. Greatness and Push-Up events currently have no XP policy and therefore do not change universal standing.

Eligibility requires at least 1 net XP, visibility enabled, and a non-banned, non-administrative account. Ranking is deterministic: net XP descending, earliest positive ledger entry inside the selected period, then stable internal member key. Only rank, safe display name, XP, and `isSelf` leave the service. Pages are capped at 50. `lastCalculatedAt`, effective dates, projection version, and replay freshness are returned.

The existing Push-Up Challenge score leaderboard is a separate domain with a different metric and tie policy. It is never merged with universal XP.
