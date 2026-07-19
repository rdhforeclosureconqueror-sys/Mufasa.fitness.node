"use strict";

const crypto = require("crypto");
const { ApiError } = require("../lib/apiResponse");
const { byId } = require("../workouts/exerciseCatalog");

const EXECUTION_VERSION = 1;
const STATUSES = new Set(["in_progress", "completed"]);
const iso = () => new Date().toISOString();
const text = (value, field, max = 500) => {
  if (value == null) return null;
  if (typeof value !== "string" || value.length > max) throw new ApiError("VALIDATION_ERROR", `${field} must be at most ${max} characters`, 400, { field });
  return value.trim();
};
const integer = (value, field, min, max) => {
  if (!Number.isInteger(value) || value < min || value > max) throw new ApiError("VALIDATION_ERROR", `${field} must be an integer from ${min} to ${max}`, 400, { field });
  return value;
};

function sessionId(session, index) { return session.sessionId || `week_${session.week || 1}_session_${index + 1}`; }
function exerciseId(item, index) { return item.exerciseId || `exercise_${index + 1}`; }

function createGeneratedWorkoutService({ userStore, userDataService }) {
  function readModel(userId) {
    const user = userStore.loadUser(userId);
    const persisted = user.generatedWorkoutPlan;
    if (!persisted?.plan) return { available: false, plan: null, activeProgramSource: user.program ? "coach_assigned" : user.selectedProgram ? "member_selected" : "legacy_fallback" };
    const plan = persisted.plan;
    const executions = Array.isArray(user.generatedWorkoutExecutions) ? user.generatedWorkoutExecutions : [];
    const recommendation = user.programRecommendation?.recommendedProgram || {};
    return {
      available: true,
      activeProgramSource: user.program ? "coach_assigned" : user.selectedProgram ? "member_selected" : "generated_recommendation",
      assignedProgram: user.program ? { programId: user.program.programId || null, title: user.program.title || "Assigned program" } : null,
      plan: {
        planVersion: plan.version,
        generatorVersion: persisted.generatorVersion,
        recommendationOnly: persisted.recommendationOnly !== false,
        recommendedProgram: { id: recommendation.id || null, title: recommendation.title || "Recommended weekly plan" },
        week: plan.week || 1,
        status: plan.status || "recommended",
        healthReviewRestriction: plan.status === "health_review_restricted" ? "Health review is required. Only the restricted session may be started; completing it does not provide medical clearance." : null,
        generatedAt: persisted.generatedAt,
        sessions: (plan.sessions || []).map((session, si) => {
          const sid = sessionId(session, si);
          const latest = executions.filter(x => x.planVersion === plan.version && x.sessionId === sid).sort((a,b) => String(b.updatedAt).localeCompare(String(a.updatedAt)))[0];
          return { sessionId: sid, weekNumber: session.week || plan.week || 1, day: session.day, title: session.session, focus: session.focus || plan.pathway || "Full body", durationMinutes: session.durationMinutes, notes: session.notes || null, status: latest?.status || "not_started", executionId: latest?.executionId || null, exercises: (session.exercises || []).map((item, ei) => ({ exerciseId: exerciseId(item, ei), name: item.displayName, sets: item.sets, reps: item.reps ?? null, duration: item.duration ?? null, restSeconds: item.restSeconds, notes: item.notes || null, equipment: item.equipment || byId[item.exerciseId]?.equipment || "bodyweight", progressionGuidance: plan.status === "health_review_restricted" ? "No progression is permitted until review." : item.progressionGuidance || item.notes || null })) };
        })
      }
    };
  }

  function findSession(userId, requestedSessionId) {
    const model = readModel(userId);
    if (!model.available) throw new ApiError("GENERATED_PLAN_NOT_FOUND", "No generated workout plan is available", 404);
    const session = model.plan.sessions.find(item => item.sessionId === requestedSessionId);
    if (!session) throw new ApiError("SESSION_NOT_FOUND", "Generated workout session was not found", 404);
    if (model.plan.status === "health_review_restricted" && model.plan.sessions.length !== 1) throw new ApiError("HEALTH_REVIEW_REQUIRED", "Only the restricted health-review session can be started", 403);
    return { model, session };
  }

  function start(userId, requestedSessionId) {
    const { model, session } = findSession(userId, requestedSessionId);
    let execution;
    userStore.updateUser(userId, user => {
      user.generatedWorkoutExecutions = Array.isArray(user.generatedWorkoutExecutions) ? user.generatedWorkoutExecutions : [];
      execution = user.generatedWorkoutExecutions.find(x => x.planVersion === model.plan.planVersion && x.sessionId === session.sessionId && x.status === "in_progress");
      if (execution) return user;
      const now = iso();
      execution = { executionVersion: EXECUTION_VERSION, executionId: crypto.randomUUID(), planVersion: model.plan.planVersion, sessionId: session.sessionId, weekNumber: session.weekNumber, status: "in_progress", startedAt: now, updatedAt: now, completedAt: null, exerciseProgress: session.exercises.map(item => ({ exerciseId:item.exerciseId, prescribedSets:item.sets, completedSets:0, actualReps:null, actualDuration:null, completed:false, notes:null })) };
      user.generatedWorkoutExecutions.push(execution);
      return user;
    });
    return { execution };
  }

  function update(userId, executionId, input = {}) {
    let result;
    userStore.updateUser(userId, user => {
      const execution = (user.generatedWorkoutExecutions || []).find(x => x.executionId === executionId);
      if (!execution) throw new ApiError("EXECUTION_NOT_FOUND", "Generated workout execution was not found", 404);
      if (execution.status === "completed") throw new ApiError("EXECUTION_COMPLETED", "A completed execution cannot be changed", 409);
      const { session } = findSession(userId, execution.sessionId);
      const item = session.exercises.find(x => x.exerciseId === input.exerciseId);
      const progress = execution.exerciseProgress.find(x => x.exerciseId === input.exerciseId);
      if (!item || !progress) throw new ApiError("EXERCISE_NOT_FOUND", "Exercise is not part of this session", 404);
      if (Object.hasOwn(input,"completedSets")) progress.completedSets=integer(input.completedSets,"completedSets",0,Number(item.sets)||100);
      if (Object.hasOwn(input,"actualReps")) progress.actualReps=input.actualReps == null ? null : text(input.actualReps,"actualReps",120);
      if (Object.hasOwn(input,"actualDuration")) progress.actualDuration=input.actualDuration == null ? null : text(input.actualDuration,"actualDuration",120);
      if (Object.hasOwn(input,"notes")) progress.notes=text(input.notes,"notes",500);
      if (Object.hasOwn(input,"completed")) { if(typeof input.completed!=="boolean") throw new ApiError("VALIDATION_ERROR","completed must be boolean",400); progress.completed=input.completed; }
      execution.updatedAt=iso(); result=execution; return user;
    });
    return { execution: result };
  }

  function complete(userId, executionId) {
    let result, track = false;
    userStore.updateUser(userId, user => {
      const execution=(user.generatedWorkoutExecutions||[]).find(x=>x.executionId===executionId);
      if(!execution) throw new ApiError("EXECUTION_NOT_FOUND","Generated workout execution was not found",404);
      if(execution.status==="completed") { result=execution; return user; }
      const now=iso(); execution.status="completed"; execution.completedAt=now; execution.updatedAt=now; execution.exerciseProgress.forEach(x=>{ if(x.completedSets>=Number(x.prescribedSets||0))x.completed=true; }); result=execution; track=true; return user;
    });
    if(track && userDataService) userDataService.appendWorkoutTracking({userId,tracking:{workoutId:`generated:${result.planVersion}:${result.sessionId}`,programId:`generated-plan-v${result.planVersion}`,completionStatus:"completed",exercisesCompleted:result.exerciseProgress.filter(x=>x.completed).map(x=>x.exerciseId),sets:result.exerciseProgress.reduce((n,x)=>n+x.completedSets,0)},source:"generated-workout"});
    return { execution: result, alreadyCompleted: !track };
  }

  return { readModel, start, update, complete };
}
module.exports = { EXECUTION_VERSION, createGeneratedWorkoutService };
