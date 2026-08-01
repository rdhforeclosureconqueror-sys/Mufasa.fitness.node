"use strict";

const PERIODS = Object.freeze({ lifetime: null, weekly: 7 * 86400000, monthly: 30 * 86400000 });
function safeName(user, userId) {
  const candidate = String(user?.profile?.displayName || user?.displayName || "").trim();
  if (candidate && !candidate.includes("@")) return candidate.slice(0, 40);
  return `Member ${String(userId).slice(-4).padStart(4, "•")}`;
}
function createLeaderboardService({ readModelService, userStore, clock = () => new Date() }) {
  function preferences(userId) { const user = userStore.loadUser(userId); return { visible: user.leaderboardPreferences?.visible !== false, displayNameMode: user.leaderboardPreferences?.displayNameMode === "name" ? "name" : "alias" }; }
  function updatePreferences(userId, input) {
    if (typeof input?.visible !== "boolean" || !["alias", "name"].includes(input.displayNameMode)) throw Object.assign(new Error("Invalid leaderboard preferences"), { status: 400 });
    userStore.updateUser(userId, user => { user.leaderboardPreferences = { visible: input.visible, displayNameMode: input.displayNameMode, updatedAt: clock().toISOString() }; return user; });
    return preferences(userId);
  }
  function definitions() { return Object.keys(PERIODS).map(period => ({ leaderboardId: `xp_${period}`, scope: "universal_gamification", metric: "net_approved_xp", period, visibility: "opt_out", minimumEligibilityXp:1, projectionVersion: 1 })); }
  function calculate(requesterId, leaderboardId, { cursor = 0, limit = 25 } = {}) {
    const period = String(leaderboardId).replace(/^xp_/, ""); if (!(period in PERIODS)) return null;
    const cutoff = PERIODS[period] ? clock().getTime() - PERIODS[period] : null;
    const rows = [];
    for (const user of userStore.listUsers()) {
      const userId = user.userId; const pref = preferences(userId);
      if (!pref.visible || user.banned === true || ["admin", "super_admin", "operator"].includes(user.role)) continue;
      const profile = readModelService.profile(userId); if (!profile) continue;
      const periodLedger = readModelService.ledger(userId).filter(x => !cutoff || Date.parse(x.occurredAt) >= cutoff);
      const xp = cutoff ? periodLedger.reduce((sum, x) => sum + x.delta, 0) : profile.lifetimeXp;
      if (xp <= 0) continue;
      rows.push({ memberKey: userId, displayName: pref.displayNameMode === "name" ? safeName(user, userId) : `Member ${String(userId).slice(-4).padStart(4, "•")}`, xp, earnedAt: periodLedger.filter(x => x.delta > 0).map(x => x.occurredAt).sort()[0] || "9999" });
    }
    rows.sort((a, b) => b.xp - a.xp || a.earnedAt.localeCompare(b.earnedAt) || a.memberKey.localeCompare(b.memberKey));
    const ranked = rows.map((row, index) => ({ rank: index + 1, displayName: row.displayName, xp: row.xp, isSelf: row.memberKey === requesterId }));
    const offset = Math.max(0, Number(cursor) || 0), bounded = Math.max(1, Math.min(50, Number(limit) || 25));
    return { leaderboardId, scope: "universal_gamification", metric: "net_approved_xp", period, effectiveStartsAt: cutoff ? new Date(cutoff).toISOString() : null, effectiveEndsAt: clock().toISOString(), minimumEligibilityXp:1, projectionVersion: 1, lastCalculatedAt: clock().toISOString(), calculationFreshness:readModelService.status?.().lastSuccessfulReplay ? "CURRENT_AS_OF_LAST_REPLAY" : "UNKNOWN", tieBreaking: "XP descending, earliest positive ledger entry in period, stable member key", entries: ranked.slice(offset, offset + bounded), nextCursor: offset + bounded < ranked.length ? String(offset + bounded) : null, selfPosition: ranked.find(x => x.isSelf) || null };
  }
  return Object.freeze({ definitions, calculate, preferences, updatePreferences, health: () => ({ rankingService: true, projection: Boolean(readModelService), privacyPolicy: "opt_out", deterministicTieHandling: true, calculationFreshness:readModelService.status?.().lastSuccessfulReplay || null, periods: Object.keys(PERIODS), metric: "net_approved_xp" }) });
}
module.exports = { createLeaderboardService, PERIODS, safeName };
