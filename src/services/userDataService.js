"use strict";

function normalizeProfile(profile) {
  if (!profile) {
    return {
      age: null,
      height_cm: null,
      weight_kg: null,
      goals: null,
      injuries: [],
      notes: null
    };
  }

  return {
    age: profile.age ?? null,
    height_cm: profile.height_cm ?? profile.heightCm ?? null,
    weight_kg: profile.weight_kg ?? profile.weightKg ?? null,
    goals: profile.goals ?? null,
    injuries: Array.isArray(profile.injuries) ? profile.injuries : [],
    notes: profile.notes ?? profile.historyText ?? null,
    avatar: profile.avatar && typeof profile.avatar === "object" ? {
      avatarProvider: profile.avatar.avatarProvider ?? profile.avatar.provider ?? "custom",
      avatarModelUrl: profile.avatar.avatarModelUrl ?? profile.avatar.modelUrl ?? null,
      avatarThumbnailUrl: profile.avatar.avatarThumbnailUrl ?? profile.avatar.thumbnailUrl ?? null,
      avatarUpdatedAt: profile.avatar.avatarUpdatedAt ?? profile.avatar.updatedAt ?? null
    } : null
  };
}

function createUserDataService({ userStore }) {
  function getProfile(userId) {
    const user = userStore.loadUser(userId);
    return {
      userId,
      profile: normalizeProfile(user.profile)
    };
  }

  function upsertProfile({ userId, profilePayload, source = "api" }) {
    const profile = normalizeProfile(profilePayload);
    userStore.updateUser(userId, (user) => {
      user.profile = profile;
      user.events = user.events || [];
      user.events.push({
        command: "fitness.saveProfile",
        ts: Date.now(),
        payload: { profile: user.profile, source }
      });
      return user;
    });

    return {
      userId,
      profile
    };
  }

  function submitOhsa({ userId, summary, source = "api" }) {
    const record = {
      ...summary,
      source,
      ts: Date.now()
    };
    let count = 0;

    userStore.updateUser(userId, (user) => {
      user.ohsa = user.ohsa || [];
      user.ohsa.push(record);
      count = user.ohsa.length;
      user.events = user.events || [];
      user.events.push({ command: "fitness.ohsaResult", ts: Date.now(), payload: { summary: record, source } });
      return user;
    });

    return {
      userId,
      latest: record,
      count
    };
  }

  function getOhsaHistory(userId, { limit = 20 } = {}) {
    const user = userStore.loadUser(userId);
    const history = (user.ohsa || []).slice(-limit).reverse();
    return {
      userId,
      items: history,
      count: history.length
    };
  }

  function getHistory(userId, { limit = 10 } = {}) {
    const user = userStore.loadUser(userId);
    const normalizedLimit = Number.isFinite(limit) ? Math.max(1, Math.min(50, Math.floor(limit))) : 10;
    const sessions = Object.values(user.sessions || {});
    const completedSessions = sessions
      .filter(s => !!s.endedAt)
      .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0))
      .slice(0, normalizedLimit)
      .map(s => ({
        sessionId: s.sessionId,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        programId: s.programId || null,
        exerciseId: s.exerciseId || null,
        repsCompleted: s.summary?.repsCompleted ?? null
      }));

    const recentActivity = (user.events || [])
      .slice(-normalizedLimit)
      .reverse()
      .map(e => ({
        command: e.command,
        ts: e.ts,
        source: e.payload?.source || null
      }));

    const ohsaHistory = (user.ohsa || [])
      .slice(-normalizedLimit)
      .reverse()
      .map(item => ({
        ts: item.ts,
        score: item.score ?? null,
        riskLevel: item.riskLevel ?? null,
        recommendations: Array.isArray(item.recommendations)
          ? item.recommendations.slice(0, 5)
          : []
      }));

    return {
      userId,
      limits: {
        itemLimit: normalizedLimit
      },
      summary: {
        totalCompletedSessions: completedSessions.length,
        totalEvents: (user.events || []).length,
        totalOhsaSubmissions: (user.ohsa || []).length
      },
      completedSessions,
      recentActivity,
      ohsaHistory,
      ohsa: ohsaHistory
    };
  }

  return {
    getProfile,
    upsertProfile,
    submitOhsa,
    getOhsaHistory,
    getHistory
  };
}

module.exports = {
  createUserDataService
};
