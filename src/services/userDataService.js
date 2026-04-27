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

  function upsertClientIntake({ userId, intake, source = "api" }) {
    const now = Date.now();
    let saved = null;
    userStore.updateUser(userId, (user) => {
      user.clientIntake = {
        ...(user.clientIntake || {}),
        ...intake,
        completedAt: user.clientIntake?.completedAt || now,
        updatedAt: now,
        source
      };
      saved = user.clientIntake;
      user.events = user.events || [];
      user.events.push({ command: "fitness.clientIntake", ts: now, payload: { source } });
      return user;
    });
    return { userId, intake: saved };
  }

  function getClientIntake(userId) {
    const user = userStore.loadUser(userId);
    return {
      userId,
      intake: user.clientIntake || null,
      completed: Boolean(user.clientIntake?.completedAt)
    };
  }

  function upsertGoalsBaseline({ userId, payload, source = "api" }) {
    const now = Date.now();
    let goalsBaseline = null;
    userStore.updateUser(userId, (user) => {
      user.goalsBaseline = {
        ...(user.goalsBaseline || {}),
        ...payload,
        updatedAt: now,
        source
      };
      goalsBaseline = user.goalsBaseline;
      user.events = user.events || [];
      user.events.push({ command: "fitness.goalsBaseline", ts: now, payload: { source } });
      return user;
    });
    return { userId, goalsBaseline };
  }

  function getGoalsBaseline(userId) {
    const user = userStore.loadUser(userId);
    return {
      userId,
      goalsBaseline: user.goalsBaseline || null
    };
  }

  function assignProgram({ userId, program, actorUserId = null, source = "api" }) {
    const now = Date.now();
    let saved = null;
    userStore.updateUser(userId, (user) => {
      user.program = {
        ...program,
        programId: user.program?.programId || `prog_${now}`,
        assignedAt: now,
        assignedBy: actorUserId,
        source
      };
      saved = user.program;
      user.events = user.events || [];
      user.events.push({ command: "fitness.programAssigned", ts: now, payload: { actorUserId, source } });
      return user;
    });
    return { userId, program: saved };
  }

  function getProgram(userId) {
    const user = userStore.loadUser(userId);
    const program = user.program || null;
    let currentWeek = null;
    if (program?.assignedAt && Number.isFinite(program.durationWeeks)) {
      const week = Math.floor((Date.now() - program.assignedAt) / (7 * 24 * 60 * 60 * 1000)) + 1;
      currentWeek = Math.max(1, Math.min(program.durationWeeks, week));
    }
    return { userId, program, currentWeek };
  }

  function appendWorkoutTracking({ userId, tracking, source = "api" }) {
    const now = Date.now();
    let totalLogged = 0;
    userStore.updateUser(userId, (user) => {
      user.workoutTracking = Array.isArray(user.workoutTracking) ? user.workoutTracking : [];
      user.workoutTracking.push({ ...tracking, ts: now, source });
      totalLogged = user.workoutTracking.length;
      user.events = user.events || [];
      user.events.push({ command: "fitness.workoutTracked", ts: now, payload: { workoutId: tracking.workoutId, source } });
      return user;
    });
    return { userId, totalLogged };
  }

  function upsertWeeklyCheckIn({ userId, checkIn, source = "api" }) {
    const now = Date.now();
    let latest = null;
    let count = 0;
    userStore.updateUser(userId, (user) => {
      user.checkIns = Array.isArray(user.checkIns) ? user.checkIns : [];
      latest = { ...checkIn, ts: now, source };
      user.checkIns.push(latest);
      count = user.checkIns.length;
      user.events = user.events || [];
      user.events.push({ command: "fitness.weeklyCheckIn", ts: now, payload: { source } });
      return user;
    });
    return { userId, latest, count };
  }

  function getCheckIns(userId, { limit = 12 } = {}) {
    const user = userStore.loadUser(userId);
    const items = (user.checkIns || []).slice(-Math.max(1, Math.min(52, limit))).reverse();
    return { userId, items, count: items.length };
  }

  function saveVisualProgressScan({ userId, scan, source = "api" }) {
    const now = Date.now();
    let saved = null;
    userStore.updateUser(userId, (user) => {
      user.visualProgressScans = Array.isArray(user.visualProgressScans) ? user.visualProgressScans : [];
      saved = {
        scanId: `scan_${now}_${Math.random().toString(36).slice(2, 8)}`,
        ...scan,
        ts: now,
        source
      };
      user.visualProgressScans.push(saved);
      user.events = user.events || [];
      user.events.push({ command: "fitness.visualProgressScanSaved", ts: now, payload: { source } });
      return user;
    });
    return { userId, scan: saved };
  }

  function getVisualProgressScans(userId) {
    const user = userStore.loadUser(userId);
    return { userId, scans: (user.visualProgressScans || []).slice().reverse() };
  }

  function getVisualProgressScanComparison(userId, firstScanId, secondScanId) {
    const user = userStore.loadUser(userId);
    const scans = user.visualProgressScans || [];
    const first = scans.find((scan) => scan.scanId === firstScanId) || null;
    const second = scans.find((scan) => scan.scanId === secondScanId) || null;
    return {
      userId,
      comparison: {
        first,
        second,
        summary: first && second
          ? "Visual change comparison generated from selected scans."
          : "One or more scan IDs were not found."
      }
    };
  }

  function getProgressDashboard(userId) {
    const user = userStore.loadUser(userId);
    const workouts = user.workoutTracking || [];
    const checkIns = user.checkIns || [];
    const formScores = workouts.map((w) => w.formScore).filter((n) => Number.isFinite(n));
    const strengthSamples = workouts.map((w) => ({ workoutId: w.workoutId, reps: w.reps ?? null, sets: w.sets ?? null }));

    return {
      userId,
      weeklyConsistency: checkIns.slice(-4).map((item) => ({ ts: item.ts, adherence: item.adherence })),
      workoutsCompleted: workouts.filter((w) => String(w.completionStatus).toLowerCase() === "completed").length,
      formScoreTrend: formScores,
      strengthImprovements: strengthSamples,
      checkInTrend: checkIns.slice(-12).map((item) => ({ ts: item.ts, energy: item.energy, soreness: item.soreness, motivation: item.motivation })),
      visualProgressScans: (user.visualProgressScans || []).slice(-6),
      goalProgress: {
        goal: user.goalsBaseline?.goal || user.program?.goal || null,
        status: workouts.length > 0 ? "in_progress" : "not_started"
      }
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
    upsertClientIntake,
    getClientIntake,
    upsertGoalsBaseline,
    getGoalsBaseline,
    assignProgram,
    getProgram,
    appendWorkoutTracking,
    upsertWeeklyCheckIn,
    getCheckIns,
    saveVisualProgressScan,
    getVisualProgressScans,
    getVisualProgressScanComparison,
    getProgressDashboard,
    submitOhsa,
    getOhsaHistory,
    getHistory
  };
}

module.exports = {
  createUserDataService
};
