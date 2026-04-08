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
    notes: profile.notes ?? profile.historyText ?? null
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
    const user = userStore.loadUser(userId);
    user.profile = normalizeProfile(profilePayload);
    user.events = user.events || [];
    user.events.push({
      command: "fitness.saveProfile",
      ts: Date.now(),
      payload: { profile: user.profile, source }
    });
    userStore.saveUser(user);

    return {
      userId,
      profile: user.profile
    };
  }

  function submitOhsa({ userId, summary, source = "api" }) {
    const user = userStore.loadUser(userId);
    user.ohsa = user.ohsa || [];

    const record = {
      ...summary,
      source,
      ts: Date.now()
    };

    user.ohsa.push(record);
    user.events = user.events || [];
    user.events.push({ command: "fitness.ohsaResult", ts: Date.now(), payload: { summary: record, source } });
    userStore.saveUser(user);

    return {
      userId,
      latest: record,
      count: user.ohsa.length
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
    const sessions = Object.values(user.sessions || {});
    const completedSessions = sessions
      .filter(s => !!s.endedAt)
      .sort((a, b) => (b.endedAt || 0) - (a.endedAt || 0))
      .slice(0, limit)
      .map(s => ({
        sessionId: s.sessionId,
        startedAt: s.startedAt,
        endedAt: s.endedAt,
        programId: s.programId || null,
        exerciseId: s.exerciseId || null,
        repsCompleted: s.summary?.repsCompleted ?? null
      }));

    const recentActivity = (user.events || [])
      .slice(-limit)
      .reverse()
      .map(e => ({
        command: e.command,
        ts: e.ts
      }));

    const ohsa = (user.ohsa || []).slice(-limit).reverse();

    return {
      userId,
      completedSessions,
      recentActivity,
      ohsa
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
