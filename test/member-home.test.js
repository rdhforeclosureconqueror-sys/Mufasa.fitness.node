"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { createMemberHomeService, resolveNextBestAction } = require("../src/services/memberHomeService");

function base(overrides = {}) {
  return { journey:{ complete:true, started:true }, healthReview:{ required:false }, inProgressSession:null, assessmentRecommendation:null, nextWorkout:null, weeklyProgression:null, nutritionMission:null, activeProgram:{ source:"No active program", title:"None" }, ...overrides };
}

test("Next Best Action precedence is deterministic and returns only one safe action", () => {
  assert.equal(resolveNextBestAction(base({ journey:{ complete:false, started:true }, healthReview:{ required:true }, inProgressSession:{ title:"A" } })).type, "complete_journey");
  assert.equal(resolveNextBestAction(base({ healthReview:{ required:true }, inProgressSession:{ title:"A" } })).type, "await_health_review");
  assert.equal(resolveNextBestAction(base({ inProgressSession:{ title:"A" }, assessmentRecommendation:{ eligible:true } })).type, "resume_workout");
  assert.equal(resolveNextBestAction(base({ assessmentRecommendation:{ eligible:true, explanation:"Baseline" }, nextWorkout:{ title:"B" } })).type, "complete_assessment");
  assert.equal(resolveNextBestAction(base({ nextWorkout:{ title:"B" }, weeklyProgression:{ acceptanceAvailable:true } })).type, "start_workout");
  assert.equal(resolveNextBestAction(base({ weeklyProgression:{ acceptanceAvailable:true }, nutritionMission:{ active:true, title:"Protein" } })).type, "review_next_week");
  assert.equal(resolveNextBestAction(base({ nutritionMission:{ active:true, title:"Protein" } })).type, "complete_nutrition_mission");
  assert.equal(resolveNextBestAction(base({ activeProgram:{ source:"Assigned program", title:"Strength" } })).type, "continue_program");
  assert.equal(resolveNextBestAction(base()).type, "review_progress");
});

function setup(options = {}) {
  const intake = options.intake || { status:"submitted" };
  const service = createMemberHomeService({
    journeyIntakeService:{ get:() => ({ intake, progress:{ completedCount:intake.status === "draft" ? 2 : 8, totalRequiredSteps:8 }, journeyProfile:{ primaryPathway:"general_fitness", pathways:["general_fitness"] } }) },
    personalizationService:{ getPersonalization:() => ({ featureFlags:{ requiresHealthReview:Boolean(options.review) }, healthReviewState:options.review ? "review_required" : "not_required", recommendedAssessments:options.assessment ? ["Overhead squat"] : [], recommendedDashboard:{ modules:["training_progress"] } }) },
    generatedWorkoutService:{ readModel:() => options.workout || { available:false, activeProgramSource:options.assigned ? "coach_assigned" : "legacy_fallback", assignedProgram:options.assigned ? { title:"Assigned strength" } : null, plan:null } },
    generatedWorkoutProgressionService:{ state:() => options.progression || { available:false } },
    trainingAdaptationService:{ read:() => ({ insights:[] }) },
    nutritionService:{ currentWeeklyPlan:() => options.nutrition || { plan:null } },
    userDataService:{ getProgressDashboard:() => ({ workoutsCompleted:0, goalProgress:{ status:"not_started" } }) }
  });
  return service.read("member-a");
}

test("member-home has safe legacy empty states, assigned-program precedence, and no raw health answers", () => {
  const empty = setup({ intake:{ status:"draft" } });
  assert.equal(empty.primaryAction.type, "complete_journey");
  assert.equal(empty.currentWorkoutWeek, null);
  assert.equal(empty.emptyStateGuidance.length, 3);
  assert.equal(JSON.stringify(empty).includes("healthSafety"), false);
  assert.equal(JSON.stringify(empty).includes("healthFlags"), false);
  const assigned = setup({ assigned:true });
  assert.equal(assigned.activeProgram.source, "Assigned program");
  assert.equal(assigned.activeProgram.title, "Assigned strength");
});

test("cross-feature resume, assessment, workout, progression and nutrition states use canonical service outputs", () => {
  const workout = { available:true, activeProgramSource:"generated_active", plan:{ week:2, status:"active", recommendedProgram:{ title:"Foundation" }, sessions:[{ sessionId:"s1", executionId:"e1", title:"Session one", status:"in_progress" },{ sessionId:"s2", title:"Session two", status:"not_started" }] } };
  assert.equal(setup({ workout, assessment:true }).primaryAction.type, "resume_workout");
  workout.plan.sessions[0].status = "completed";
  assert.equal(setup({ workout, assessment:true }).primaryAction.type, "complete_assessment");
  assert.equal(setup({ workout }).primaryAction.type, "start_workout");
  workout.plan.sessions[1].status = "completed";
  assert.equal(setup({ workout, progression:{ available:true, currentPlan:{ status:"recommended" }, nextRecommendedAction:"ACCEPT_NEXT_WEEK" } }).primaryAction.type, "review_next_week");
  assert.equal(setup({ workout, nutrition:{ plan:{ id:"p" }, missions:[{ title:"Add protein", status:"pending" }] } }).primaryAction.type, "complete_nutrition_mission");
});

test("member-home endpoint and accessible mobile UI are present without browser-side rule duplication or localStorage authority", () => {
  const server = fs.readFileSync(path.join(__dirname, "../server.js"), "utf8");
  const html = fs.readFileSync(path.join(__dirname, "../public/dashboard.html"), "utf8");
  const runtime = fs.readFileSync(path.join(__dirname, "../public/member-home-runtime.js"), "utf8");
  assert.match(server, /get\("\/api\/me\/member-home", requireAuth/);
  assert.match(html, /aria-live="polite"/);
  assert.match(html, /aria-label="Member areas"|member-home-runtime/);
  assert.match(html, /min-height:44px/);
  assert.match(html, /max-width:600px/);
  assert.doesNotMatch(runtime, /complete_journey|await_health_review|resume_workout/);
  assert.doesNotMatch(runtime, /localStorage|sessionStorage/);
});
