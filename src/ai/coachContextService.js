"use strict";
const {exerciseService}=require("../exercise-intelligence");

const MAX_RECENT_WORKOUTS = 5;
const MAX_CONTEXT_LIST_ITEMS = 6;

function compactWorkout(item = {}) {
  return {
    id: item.workoutId || item.sessionId || item.id || null,
    completedAt: item.completedAt || item.ts || null,
    name: item.name || item.workoutName || item.title || null,
    durationMinutes: item.durationMinutes ?? null,
    exercisesCompleted: Array.isArray(item.exercisesCompleted) ? item.exercisesCompleted : null,
    totalReps: item.reps ?? item.totalReps ?? null,
    formScore: item.formScore ?? null,
    completionStatus: item.completionStatus || item.status || null
  };
}

function boundedList(value, limit = MAX_CONTEXT_LIST_ITEMS) {
  return Array.isArray(value) ? value.filter(item => item !== null && item !== undefined).slice(0, limit) : [];
}

function compactJourneyProfile(profile = null) {
  if (!profile || typeof profile !== "object") return null;
  const recommendations = profile.recommendations || {};
  const training = profile.trainingAvailability || {};
  const equipment = profile.equipmentAvailability || {};
  const pathways = boundedList(profile.pathways);
  return {
    authority: "derived_journey_profile",
    version: profile.version ?? null,
    primaryPathway: profile.primaryPathway || pathways[0] || null,
    pathways,
    experienceLevel: profile.experienceLevel || null,
    trainingAvailability: {
      days: boundedList(training.days, 7),
      times: boundedList(training.times, 6),
      sessionsPerWeek: training.sessionsPerWeek ?? training.daysPerWeek ?? null,
      sessionMinutes: training.sessionMinutes ?? training.durationMinutes ?? null
    },
    equipmentAvailability: {
      location: equipment.location || null,
      equipment: boundedList(equipment.equipment, 12)
    },
    coachingRecommendations: {
      workoutCategory: recommendations.workouts?.category || null,
      assessments: boundedList(recommendations.assessments?.items),
      nutritionPriorities: boundedList(recommendations.nutrition?.items),
      dashboardModules: boundedList(recommendations.dashboard?.modules),
      reviewStatus: recommendations.reviewStatus || null
    },
    featureFlags: {
      athletePerformance: pathways.includes("athlete_performance"),
      yogaWellness: pathways.includes("yoga_wellness"),
      rugbyEnabled: profile.rugbyEnabled === true,
      healthReviewRequired: profile.healthReviewRequired === true
    },
    privacyPolicy: "bounded_coaching_projection_no_raw_intake"
  };
}

function createCoachContextService({ userStore, memberGamificationService = null, programService = null, challengeService = null, clock = () => Date.now() }) {
  function build(userId) {
    // One authoritative member read is intentionally shared by every context section.
    const user = userStore.loadUser(userId);
    const tracked = Array.isArray(user.workoutTracking) ? user.workoutTracking : [];
    const sessions = Object.values(user.sessions || {}).filter((item) => item.completedAt || item.status === "completed");
    const recentWorkouts = [...tracked, ...sessions]
      .sort((a, b) => Number(b.completedAt || b.ts || 0) - Number(a.completedAt || a.ts || 0))
      .slice(0, MAX_RECENT_WORKOUTS)
      .map(compactWorkout);
    const gamification = memberGamificationService?.get(userId) || null;
    const latestAchievement = gamification?.achievements?.filter((item) => item.state === "earned").at(-1) || null;
    const latestCheckIn = Array.isArray(user.checkIns) ? user.checkIns.at(-1) || null : null;
    const programView = programService?.view(userId, clock()) || null;
    const program = programView?.available ? programView.assignment.program : user.program || user.generatedWorkoutPlan || null;
    const yogaSessions = (Array.isArray(user.yogaSessions) ? user.yogaSessions : []).slice().sort((a,b)=>b.completedAt-a.completedAt).slice(0,5);
    const greatness = user.steppingIntoGreatness || null;
    const greatnessActivities = (greatness?.activities || []).filter((item) => item.status === "completed" && !item.deletedAt);
    const journeyProfile = compactJourneyProfile(user.journeyProfile || user.retention?.journeyProfile || null);

    return {
      schemaVersion: 2,
      generatedAt: new Date(clock()).toISOString(),
      member: { displayName: user.profile?.name || user.clientIntake?.name || null },
      journey: journeyProfile,
      progress: gamification ? {
        currentLevel: gamification.level?.current ?? null,
        lifetimeXp: gamification.level?.lifetimeXp ?? null,
        xpToNextLevel: gamification.level?.nextLevelMinimumXp === null ? null : gamification.level?.xpToNextLevel ?? null,
        currentStreak: gamification.streaks?.[0]?.days ?? null,
        latestAchievement,
        latestBadge: gamification.badges?.at(-1) || null,
        recentRewards: gamification.recentRewards || []
      } : null,
      workouts: {
        recent: recentWorkouts,
        latestCompletionSummary: user.latestRewardSummary || null,
        upcoming: program?.nextWorkout || program?.sessions?.find((item) => item.status !== "completed") || null,
        currentProgram: program ? { id: program.programId || program.id || null, title: program.title || null, goal: program.goal || null, daysPerWeek: program.daysPerWeek ?? null, movementFocus: program.movementFocus || null } : null
      },
      program: programView?.available ? {
        authority: "program_engine",
        currentProgram: { id: program.programId, title: program.title, goal: program.goal },
        currentPhase: programView.assignment.currentPhase,
        currentWeek: programView.assignment.currentWeek,
        today: programView.today,
        nextWorkout: programView.nextWorkout,
        remainingSessions: programView.upcoming.length,
        deloadStatus: programView.assignment.deloadStatus,
        recentAdherence: programView.analytics.weeklyAdherence.slice(-2),
        completedPercentage: programView.analytics.completionPercentage,
        goalProgress: { goal: program.goal, completionPercentage: programView.analytics.completionPercentage },
        decisionPolicy: "explain_only",
        exerciseIntelligence: (programView.today?.exercises || programView.nextWorkout?.exercises || []).map((item) => exerciseService.coachContext(item.exerciseId || item.id)).filter(Boolean)
      } : null,
      goals: user.goalsBaseline ? { goal: user.goalsBaseline.goal || null, baseline: user.goalsBaseline.baseline || null } : null,
      recovery: latestCheckIn ? {
        recordedAt: latestCheckIn.ts || latestCheckIn.createdAt || null,
        energy: latestCheckIn.energy ?? null,
        soreness: latestCheckIn.soreness ?? null,
        sleep: latestCheckIn.sleep ?? latestCheckIn.sleepHours ?? null,
        motivation: latestCheckIn.motivation ?? null
      } : null,
      yoga: {
        recent: yogaSessions.map((item)=>({sessionId:item.sessionId,completedAt:item.completedAt,summary:item.summary,progression:item.progression,ruleVersion:item.ruleVersion})),
        commonlyDetectedFaults: Object.entries(yogaSessions.flatMap(s=>s.poseResults||[]).flatMap(p=>p.faultIds||[]).reduce((a,id)=>(a[id]=(a[id]||0)+1,a),{})).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([faultId,count])=>({faultId,count})),
        authority: "derived_deterministic_results"
      },
      memberExperiences: {
        steppingIntoGreatness: greatness ? {
          completedActivities: greatnessActivities.length,
          lifetimeDistanceMeters: greatnessActivities.reduce((sum, item) => sum + (Number(item.distanceMeters) || 0), 0),
          latestActivityAt: greatnessActivities.slice().sort((a,b)=>String(b.endedAt).localeCompare(String(a.endedAt)))[0]?.endedAt || null,
          enrolledChallenges: (greatness.enrollments || []).filter((item) => item.status === "active").length,
          authority: "member_persistence",
          decisionPolicy: "explain_only"
        } : null,
        pushUpChallenge: challengeService?.getMemberPushupSummary(userId) || null
      }
    };
  }

  return Object.freeze({ build });
}

module.exports = { createCoachContextService, compactWorkout, compactJourneyProfile, boundedList, MAX_RECENT_WORKOUTS, MAX_CONTEXT_LIST_ITEMS };
