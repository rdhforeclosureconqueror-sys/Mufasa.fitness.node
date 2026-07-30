"use strict";

const MAX_RECENT_WORKOUTS = 5;

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

function createCoachContextService({ userStore, memberGamificationService = null, clock = () => Date.now() }) {
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
    const program = user.program || user.generatedWorkoutPlan || null;
    const yogaSessions = (Array.isArray(user.yogaSessions) ? user.yogaSessions : []).slice().sort((a,b)=>b.completedAt-a.completedAt).slice(0,5);

    return {
      schemaVersion: 1,
      generatedAt: new Date(clock()).toISOString(),
      member: { displayName: user.profile?.name || user.clientIntake?.name || null },
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
      }
    };
  }

  return Object.freeze({ build });
}

module.exports = { createCoachContextService, compactWorkout, MAX_RECENT_WORKOUTS };
