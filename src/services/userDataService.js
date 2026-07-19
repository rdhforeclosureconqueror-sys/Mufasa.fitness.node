"use strict";

const { adaptTraining } = require("./trainingAdaptationService");

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
const DAY_MS = 24 * 60 * 60 * 1000;


function isNonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function isCompleteTimestamp(value) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0;
}

function buildSection(status, completedAt = null, updatedAt = null) {
  return {
    status,
    completedAt: isCompleteTimestamp(completedAt) ? Number(completedAt) : null,
    updatedAt: isCompleteTimestamp(updatedAt) ? Number(updatedAt) : null
  };
}

function deriveOnboardingStatus(userId, user) {
  const intake = user?.clientIntake || null;
  const goals = user?.goalsBaseline || null;
  const ohsaItems = Array.isArray(user?.ohsa) ? user.ohsa : [];
  const workouts = Array.isArray(user?.workoutTracking) ? user.workoutTracking : [];
  const completedWorkout = workouts.find((item) => String(item?.completionStatus || "").toLowerCase() === "completed") || null;
  const latestOhsa = ohsaItems.length ? ohsaItems[ohsaItems.length - 1] : null;

  const intakeComplete = Boolean(
    intake
    && isCompleteTimestamp(intake.completedAt)
    && isNonEmptyString(intake.name)
    && Array.isArray(intake.goals)
    && intake.goals.length > 0
    && intake.medicalDisclaimerConsent === true
  );
  const goalsComplete = Boolean(
    goals
    && isNonEmptyString(goals.goal)
    && goals.baseline
    && typeof goals.baseline === "object"
  );
  const medicalHistoryComplete = intakeComplete;
  const ohsaComplete = Boolean(latestOhsa && (latestOhsa.ts || latestOhsa.createdAt));
  const firstWorkoutComplete = Boolean(completedWorkout);

  const sections = {
    intake: buildSection(intakeComplete ? "complete" : "pending", intake?.completedAt, intake?.updatedAt),
    goals: buildSection(goalsComplete ? "complete" : "pending", goals?.completedAt, goals?.updatedAt),
    medicalHistory: buildSection(medicalHistoryComplete ? "complete" : "pending", intake?.completedAt, intake?.updatedAt),
    overheadSquatAssessment: buildSection(ohsaComplete ? "complete" : "not_started", latestOhsa?.ts || latestOhsa?.createdAt, latestOhsa?.ts || latestOhsa?.createdAt),
    firstWorkout: buildSection(firstWorkoutComplete ? "complete" : "pending", completedWorkout?.ts, completedWorkout?.ts)
  };
  const ordered = ["intake", "goals", "medicalHistory", "overheadSquatAssessment", "firstWorkout"];
  const completionCount = ordered.filter((key) => sections[key].status === "complete").length;
  const nextKey = ordered.find((key) => sections[key].status === "pending") || null;
  const links = {
    intake: "client-intake",
    goals: "goals-baseline",
    medicalHistory: "client-intake",
    overheadSquatAssessment: "ohsa",
    firstWorkout: "workout"
  };
  return {
    userId,
    sections,
    completionCount,
    totalCount: ordered.length,
    nextRequiredAction: nextKey ? { section: nextKey, action: links[nextKey] } : null,
    editableSections: ordered.map((section) => ({ section, action: links[section] })),
    updatedAt: Math.max(...ordered.map((key) => sections[key].updatedAt || sections[key].completedAt || 0), Number(user?.updatedAt) || 0) || null
  };
}

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
  function isoDay(ts) {
    return new Date(ts).toISOString().slice(0, 10);
  }

  function listCompletedWorkouts(workouts = []) {
    return workouts.filter((w) => String(w?.completionStatus || "").toLowerCase() === "completed");
  }

  function summarizeStreak(workouts = [], { nowTs = Date.now(), weeklyTarget = 4 } = {}) {
    const completed = listCompletedWorkouts(workouts);
    const dayKeys = Array.from(new Set(
      completed.map((item) => isoDay(Number(item.ts) || nowTs)).filter(Boolean)
    )).sort();
    const today = isoDay(nowTs);
    const yesterday = isoDay(nowTs - DAY_MS);
    let currentStreak = 0;
    let cursor = nowTs;
    while (dayKeys.includes(isoDay(cursor))) {
      currentStreak += 1;
      cursor -= DAY_MS;
    }
    if (currentStreak === 0 && dayKeys.includes(yesterday)) {
      cursor = nowTs - DAY_MS;
      while (dayKeys.includes(isoDay(cursor))) {
        currentStreak += 1;
        cursor -= DAY_MS;
      }
    }
    const weekStartTs = nowTs - WEEK_MS;
    const weeklyWorkoutsCompleted = completed.filter((item) => Number(item.ts) >= weekStartTs).length;
    const consistencyPercentage = Math.max(0, Math.min(100, Math.round((weeklyWorkoutsCompleted / Math.max(1, weeklyTarget)) * 100)));
    const missedWorkouts = Math.max(0, weeklyTarget - weeklyWorkoutsCompleted);
    return {
      currentStreak,
      weeklyWorkoutsCompleted,
      weeklyTarget,
      consistencyPercentage,
      missedWorkouts,
      comebackStatus: missedWorkouts > 0 && currentStreak > 0 ? "comeback_active" : (missedWorkouts > 0 ? "needs_comeback" : "on_track")
    };
  }

  function buildCoachMessages({ latestWorkout = null, streak = null, goalsBaseline = null, program = null } = {}) {
    const messages = [];
    const formScore = Number(latestWorkout?.formScore);
    const completedToday = latestWorkout ? `You showed up today. That counts.` : "Your plan is alive—next session builds momentum.";
    messages.push({ type: "encouragement", text: completedToday });
    messages.push({ type: "correction", text: Number.isFinite(formScore) && formScore < 75 ? "Slow the tempo next session and brace before every rep." : "Your form improved this session." });
    messages.push({ type: "comeback", text: streak?.missedWorkouts > 0 ? "You missed a day, but the plan is still alive." : "No missed sessions this week—keep stacking wins." });
    messages.push({ type: "streak", text: `${streak?.currentStreak || 0}-day streak active.` });
    messages.push({ type: "progress", text: `You are progressing toward ${goalsBaseline?.goal || program?.goal || "your goal"}.` });
    messages.push({ type: "weekly_focus", text: "Weekly focus: clean reps, consistent sleep, and finish every session." });
    messages.push({ type: "next_workout", text: `Next workout is ${program?.movementFocus?.[0] || "full body"} strength.` });
    return messages;
  }

  function summarizeReward({ workout = null, allWorkouts = [], program = null }) {
    if (!workout) return null;
    const exercisesCompleted = Array.isArray(workout.exercisesCompleted) ? workout.exercisesCompleted : [];
    const reps = Number(workout.reps) || 0;
    const currentForm = Number(workout.formScore);
    const previousScores = listCompletedWorkouts(allWorkouts)
      .filter((entry) => entry.workoutId !== workout.workoutId)
      .map((entry) => Number(entry.formScore))
      .filter((score) => Number.isFinite(score));
    const previousBest = previousScores.length ? Math.max(...previousScores) : null;
    const bestFormCueImproved = Number.isFinite(currentForm) && Number.isFinite(previousBest) && currentForm > previousBest
      ? "Bracing and tempo control improved."
      : "Rep quality stayed steady.";
    const streak = summarizeStreak(allWorkouts, { weeklyTarget: Number(program?.daysPerWeek) || 4 });
    return {
      workoutCompleted: true,
      exercisesCompleted: exercisesCompleted.length,
      exercises: exercisesCompleted,
      totalReps: reps,
      formScoreSummary: Number.isFinite(currentForm) ? currentForm : null,
      bestFormCueImproved,
      streakUpdate: `${streak.currentStreak}-day streak`,
      nextScheduledWorkout: `Next ${program?.movementFocus?.[0] || "training"} workout is queued.`,
      momentumMessage: "You’re building momentum."
    };
  }

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
      const previous = user.clientIntake || {};
      const complete = isNonEmptyString(intake.name)
        && Array.isArray(intake.goals)
        && intake.goals.length > 0
        && intake.medicalDisclaimerConsent === true;
      user.clientIntake = {
        ...previous,
        ...intake,
        completedAt: complete ? (previous.completedAt || now) : null,
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
      const previous = user.goalsBaseline || {};
      const complete = isNonEmptyString(payload.goal) && payload.baseline && typeof payload.baseline === "object";
      user.goalsBaseline = {
        ...previous,
        ...payload,
        completedAt: complete ? (previous.completedAt || now) : null,
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
    let latestReward = null;
    userStore.updateUser(userId, (user) => {
      user.workoutTracking = Array.isArray(user.workoutTracking) ? user.workoutTracking : [];
      const record = { ...tracking, ts: now, source };
      user.workoutTracking.push(record);
      latestReward = summarizeReward({ workout: record, allWorkouts: user.workoutTracking, program: user.program });
      user.latestRewardSummary = latestReward;
      totalLogged = user.workoutTracking.length;
      user.events = user.events || [];
      user.events.push({ command: "fitness.workoutTracked", ts: now, payload: { workoutId: tracking.workoutId, source } });
      return user;
    });
    return { userId, totalLogged, rewardSummary: latestReward };
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
    const trainingAdaptation = adaptTraining(user);
    const workouts = user.workoutTracking || [];
    const checkIns = user.checkIns || [];
    const formScores = workouts.map((w) => w.formScore).filter((n) => Number.isFinite(n));
    const strengthSamples = workouts.map((w) => ({ workoutId: w.workoutId, reps: w.reps ?? null, sets: w.sets ?? null }));
    const streak = summarizeStreak(workouts, { weeklyTarget: Number(user?.program?.daysPerWeek) || 4 });
    const completedWorkouts = listCompletedWorkouts(workouts);
    const latestCheckIn = checkIns.length ? checkIns[checkIns.length - 1] : null;
    const currentWeek = user?.program?.assignedAt
      ? Math.max(1, Math.floor((Date.now() - user.program.assignedAt) / WEEK_MS) + 1)
      : 1;
    const weekSummary = latestCheckIn
      ? `You completed ${streak.weeklyWorkoutsCompleted} workouts this week. ${latestCheckIn.formTrendNotes || "Your form is trending upward."} Next week, focus on ${latestCheckIn.nextWeekFocus || "hip control and consistency"}.`
      : `You completed ${streak.weeklyWorkoutsCompleted} workouts this week. Next week, focus on quality reps and consistency.`;
    const latestWorkout = completedWorkouts.length ? completedWorkouts[completedWorkouts.length - 1] : null;
    const coachMessages = buildCoachMessages({
      latestWorkout,
      streak,
      goalsBaseline: user.goalsBaseline || null,
      program: user.program || null
    });
    const startForm = Number(user?.goalsBaseline?.baseline?.formScoreBaseline);
    const currentForm = formScores.length ? Number(formScores[formScores.length - 1]) : null;
    const formImprovement = Number.isFinite(startForm) && Number.isFinite(currentForm) ? currentForm - startForm : null;
    const retentionChecks = {
      postWorkoutRewardScreenReady: Boolean((user.latestRewardSummary || {}).workoutCompleted),
      streakSystemReady: Number.isFinite(streak.consistencyPercentage),
      weeklyReviewReady: Boolean(latestCheckIn),
      coachMessagingReady: coachMessages.length > 0,
      progressNarrativeReady: true,
      habitLoopReady: true
    };
    const retentionMotivationStatus = Object.values(retentionChecks).every(Boolean)
      ? "READY"
      : (Object.values(retentionChecks).some(Boolean) ? "READY_WITH_WARNINGS" : "NOT_READY");
    const generatedPlans = Array.isArray(user.generatedWorkoutPlans) ? user.generatedWorkoutPlans : [];
    const currentGeneratedPlan = generatedPlans.find((plan) => ["active", "recommended", "restricted"].includes(plan.status)) || generatedPlans.at(-1) || null;
    const latestGeneratedProgression = (user.generatedWorkoutProgressions || []).at(-1) || null;

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
      },
      rewardSummary: user.latestRewardSummary || summarizeReward({ workout: latestWorkout, allWorkouts: workouts, program: user.program }),
      streak,
      weeklyReview: {
        workoutsCompletedThisWeek: streak.weeklyWorkoutsCompleted,
        formScoreTrend: formScores.slice(-6),
        strengthProgressionNotes: latestCheckIn?.strengthProgressionNotes || null,
        soreness: latestCheckIn?.soreness || null,
        energy: latestCheckIn?.energy || null,
        motivation: latestCheckIn?.motivation || null,
        sleep: latestCheckIn?.sleep || null,
        bodyMeasurementsOptional: latestCheckIn?.bodyMeasurementsOptional || null,
        visualScanOptional: latestCheckIn?.visualScanOptional || null,
        nextWeekFocus: latestCheckIn?.nextWeekFocus || null,
        weekSummary
      },
      coachMessaging: {
        deterministic: true,
        messages: coachMessages
      },
      progressNarrative: {
        startingPoint: user.goalsBaseline?.baseline || {},
        currentWeek,
        workoutsCompleted: completedWorkouts.length,
        streak: streak.currentStreak,
        formImprovement,
        strengthImprovement: strengthSamples.slice(-1)[0] || null,
        checkInTrend: checkIns.slice(-6).map((item) => ({ ts: item.ts, motivation: item.motivation, energy: item.energy })),
        visualProgressScanLink: (user.visualProgressScans || []).slice(-1)[0]?.frontImageUrl || user.goalsBaseline?.baseline?.visualProgressScan || null,
        nextMilestone: `Complete ${Math.max(0, streak.weeklyTarget - streak.weeklyWorkoutsCompleted)} more workout(s) this week.`
      },
      habitLoopPrompts: {
        beforeWorkout: "Today’s mission: complete Workout 2.",
        duringWorkout: "Set 2 of 3 — stay steady.",
        afterWorkout: "You completed today’s mission.",
        weekly: "Review your week and lock in next week."
      },
      retentionChecks,
      retentionMotivationStatus,
      generatedWorkoutProgression: {
        currentWeek: currentGeneratedPlan?.weekNumber || user.generatedWorkoutPlan?.plan?.week || null,
        weeklyAdherence: latestGeneratedProgression?.inputSummary?.sessionAdherencePercent ?? null,
        outcome: latestGeneratedProgression?.outcome || null,
        nextRecommendedAction: latestGeneratedProgression?.status === "recommended" ? "ACCEPT_NEXT_WEEK" : null
      },
      trainingAdaptation: trainingAdaptation.dashboard,
      memberTrainingInsights: trainingAdaptation.insights
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

  function getOnboardingStatus(userId) {
    const user = userStore.loadUser(userId);
    return deriveOnboardingStatus(userId, user);
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
    getOnboardingStatus,
    getHistory
  };
}

module.exports = {
  createUserDataService
};
