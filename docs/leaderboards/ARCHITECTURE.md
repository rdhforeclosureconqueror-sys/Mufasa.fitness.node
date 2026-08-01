# Universal leaderboard architecture

Version 1 exposes `xp_lifetime`, `xp_weekly` (rolling seven days), and `xp_monthly` (rolling 30 days). The metric is positive and negative **approved XP** from the authoritative server ledger; clients never calculate standings. Ranking is XP descending, earliest positive ledger entry, then stable member key. Pages are capped at 50 and calculated on request with projection version 1. Push-Up score standings are a separate domain and are never merged.
