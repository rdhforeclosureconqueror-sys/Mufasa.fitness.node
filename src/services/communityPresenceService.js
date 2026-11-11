"use strict";

// Presence is intentionally short-lived. It is a live "who is here now"
// signal, not a member activity history or a location record.
function createCommunityPresenceService({ cardService, userStore, clock = () => Date.now(), ttlMs = 90_000 } = {}) {
  if (!cardService?.visibleToMember) throw new Error("Community card service required");
  const active = new Map();

  function prune() {
    const cutoff = clock() - ttlMs;
    for (const [userId, seenAt] of active) if (seenAt < cutoff) active.delete(userId);
  }

  function heartbeat(userId) {
    prune();
    active.set(String(userId), clock());
    return { online: true, expiresInMs: ttlMs };
  }

  function onlineMembers() {
    prune();
    return [...active.entries()]
      .map(([userId, seenAt]) => {
        const card = cardService.visibleToMember(userId);
        return card ? { userId, ...card, seenAt } : null;
      })
      .filter(Boolean)
      .sort((a, b) => b.seenAt - a.seenAt || a.displayName.localeCompare(b.displayName));
  }

  function memberCard(userId) {
    const memberId = String(userId);
    const card = cardService.visibleToMember(memberId);
    if (!card) return null;
    // The model itself is never exposed here. The authenticated shared-card avatar
    // endpoint re-checks the member's asset ownership before sending any bytes.
    const avatarModelUrl = userStore?.loadUser(memberId)?.profile?.avatar?.avatarModelUrl;
    return {
      userId: memberId,
      ...card,
      avatarModelUrl: avatarModelUrl ? `/api/community/members/${encodeURIComponent(memberId)}/avatar` : null
    };
  }

  return Object.freeze({ heartbeat, onlineMembers, memberCard, ttlMs });
}

module.exports = { createCommunityPresenceService };
