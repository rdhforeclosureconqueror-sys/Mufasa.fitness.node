"use strict";

const { ApiError } = require("../lib/apiResponse");
const NOTE_MAX_LENGTH = 4000;
const clone = (value) => value == null ? value : structuredClone(value);

function createTrainerWorkspaceService({ store, userStore, authorizationResolver }) {
  function requireAccess(trainerUserId, clientUserId) {
    if (trainerUserId === clientUserId || !store.hasActiveAccess(trainerUserId, clientUserId)) {
      throw new ApiError("CLIENT_ACCESS_DENIED", "Client access is not permitted", 403);
    }
  }
  function identity(user) {
    return { userId: user.userId, displayName: String(user.profile?.displayName || user.profile?.name || user.name || user.userId).slice(0, 160) };
  }
  function summary(user) {
    const journey = user.journeyProfile || user.retention?.journeyProfile || {};
    const intake = user.journeyIntake || user.retention?.intake || {};
    const sessions = Object.values(user.sessions || {}).filter((s) => s.completedAt || s.endedAt || s.status === "completed");
    const completedAt = (session) => session.completedAt || (session.endedAt ? new Date(session.endedAt).toISOString() : null);
    const last = sessions.sort((a, b) => String(completedAt(b) || "").localeCompare(String(completedAt(a) || "")))[0];
    return { ...identity(user), clientStatus: "active", journeyPathway: journey.pathway || journey.primaryGoal || null,
      intakeStatus: intake.status || (journey.submittedAt ? "complete" : "incomplete"),
      healthReviewStatus: journey.healthReviewRequired ? "required" : "clear",
      programStatus: user.program ? "trainer_assigned" : user.selectedProgram ? "member_selected" : user.generatedWorkoutPlan ? "generated" : "none",
      mostRecentWorkoutDate: last ? completedAt(last) : null, progressionStatus: user.generatedWorkoutProgressions?.at(-1)?.status || null,
      nextAction: journey.healthReviewRequired ? "Complete health review" : user.program ? "Continue assigned program" : "Review training plan" };
  }
  function listClients(trainerUserId, query = {}) {
    let clients = store.listByTrainer(trainerUserId, true).map((a) => summary(userStore.loadUser(a.clientUserId)));
    const search = String(query.search || "").trim().toLowerCase();
    if (search) clients = clients.filter((c) => c.displayName.toLowerCase().includes(search));
    for (const key of ["intakeStatus", "healthReviewStatus", "programStatus"]) if (query[key]) clients = clients.filter((c) => c[key] === query[key]);
    if (query.recentActivity === "yes") clients = clients.filter((c) => c.mostRecentWorkoutDate);
    if (query.recentActivity === "no") clients = clients.filter((c) => !c.mostRecentWorkoutDate);
    return clients;
  }
  function detail(trainerUserId, clientUserId) {
    requireAccess(trainerUserId, clientUserId); const user = userStore.loadUser(clientUserId), journey = user.journeyProfile || {};
    return { summary: summary(user), journey: { pathway: journey.pathway || null, goals: clone(journey.goals || journey.primaryGoal || null), submittedAt: journey.submittedAt || null },
      health: { restrictions: clone(journey.healthRestrictions || journey.healthFlags || []), reviewRequired: Boolean(journey.healthReviewRequired), warnings: clone(journey.reviewWarnings || []) },
      training: { activeProgram: clone(user.program || user.selectedProgram || user.generatedWorkoutPlan || null), source: summary(user).programStatus,
        recentWorkouts: Object.values(user.sessions || {}).filter((s) => s.completedAt || s.endedAt).slice(-10).map((s) => ({ id: s.id || s.sessionId, completedAt: s.completedAt || new Date(s.endedAt).toISOString() })), progression: clone(user.generatedWorkoutProgressions?.at(-1) || null), adaptation: clone(user.trainingAdaptation?.recommendation || null) },
      nutrition: { recommendation: clone(user.nutritionRecommendation?.summary || null), weeklyMission: clone(user.nutritionMissions?.find((m) => m.status === "active") || null), completedCount: (user.nutritionMissions || []).filter((m) => m.status === "completed").length },
      assessments: { summaries: clone([
        ...(user.assessments || []).map((a) => ({ id: a.id, type: a.type, status: a.status, completedAt: a.completedAt })),
        ...(user.ohsa || []).map((a, index) => ({ id: a.id || `ohsa_${index}`, type: "overhead_squat", status: "completed", completedAt: a.completedAt || (a.ts ? new Date(a.ts).toISOString() : null) }))
      ]), pending: clone(journey.assessmentRequirements || []) } };
  }
  function program(trainerUserId, clientUserId) { requireAccess(trainerUserId, clientUserId); const u = userStore.loadUser(clientUserId); return { active: clone(u.program || null), history: clone(u.trainerProgramAssignments || []) }; }
  function assignProgram(trainerUserId, clientUserId, payload) {
    requireAccess(trainerUserId, clientUserId);
    if (payload?.status === "inactive") {
      let ended = null;
      userStore.updateUser(clientUserId, (user) => { const at = new Date().toISOString(); const history = Array.isArray(user.trainerProgramAssignments) ? user.trainerProgramAssignments : [];
        ended = history.find((assignment) => assignment.status === "active") || null;
        if (!ended) throw new ApiError("PROGRAM_ASSIGNMENT_NOT_FOUND", "No active trainer program assignment exists", 409);
        ended.status = "inactive"; ended.endedAt = at; ended.updatedAt = at; ended.reason = String(payload.reason || "removed").slice(0, 200);
        if (user.program?.assignedByTrainerUserId === trainerUserId) delete user.program; return user; });
      return clone(ended);
    }
    if (!payload || typeof payload !== "object" || Array.isArray(payload) || !/^[A-Za-z0-9._-]{1,128}$/.test(String(payload.programId || "")) || typeof payload.title !== "string" || !payload.title.trim() || payload.title.length > 200) throw new ApiError("INVALID_PROGRAM", "programId and title are required", 422);
    let result; userStore.updateUser(clientUserId, (user) => { const at = new Date().toISOString(); user.trainerProgramAssignments = Array.isArray(user.trainerProgramAssignments) ? user.trainerProgramAssignments : [];
      const old = user.trainerProgramAssignments.find((a) => a.status === "active");
      if (old?.programId === payload.programId && old?.title === payload.title.trim()) { result = old; return user; }
      if (old) { old.status = "inactive"; old.endedAt = at; old.updatedAt = at; old.reason = "replaced"; }
      result = { id: crypto.randomUUID(), clientUserId, trainerUserId, programId: payload.programId, title: payload.title.trim(), status: "active", assignedAt: at, endedAt: null, reason: null, createdAt: at, updatedAt: at };
      user.trainerProgramAssignments.push(result); user.program = { programId: result.programId, title: result.title, assignedByTrainerUserId: trainerUserId, assignedAt: at }; return user; });
    return clone(result);
  }
  function notes(trainerUserId, clientUserId) { requireAccess(trainerUserId, clientUserId); return store.listNotes(trainerUserId, clientUserId); }
  function addNote(trainerUserId, clientUserId, input) { requireAccess(trainerUserId, clientUserId); const body = typeof input?.body === "string" ? input.body.trim() : ""; if (!body || body.length > NOTE_MAX_LENGTH) throw new ApiError("INVALID_NOTE", `Note must be 1-${NOTE_MAX_LENGTH} characters`, 422); return store.createNote({ trainerUserId, clientUserId, body }); }
  return { requireAccess, listClients, detail, program, assignProgram, notes, addNote };
}

const crypto = require("crypto");
module.exports = { createTrainerWorkspaceService, NOTE_MAX_LENGTH };
