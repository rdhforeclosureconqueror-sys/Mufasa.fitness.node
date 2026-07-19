"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const { ADAPTATIONS, summarizeTrainingHistory, adaptTraining } = require("../src/services/trainingAdaptationService");

function member(overrides = {}) {
  const plans = [1, 2, 3].map(version => ({ planVersion: version, status: "completed", completedAt: `2026-07-0${version}T00:00:00Z`, sessions: [{ sessionId: `s${version}a` }, { sessionId: `s${version}b` }] }));
  const executions = plans.flatMap(plan => plan.sessions.map(session => ({ planVersion: plan.planVersion, sessionId: session.sessionId, status: "completed", exerciseProgress: [{ completed: true }, { completed: true }] })));
  return { generatedWorkoutPlans: plans, generatedWorkoutExecutions: executions, generatedWorkoutProgressions: [{ outcome: "PROGRESS", evaluatedAt: "a" }, { outcome: "MAINTAIN", evaluatedAt: "b" }], checkIns: [{ sleep: 8, soreness: 2, energy: 8 }], journeyProfile: { equipmentAvailability: { equipment: [] } }, ...overrides };
}

test("aggregates persisted history, completion, outcomes and recovery without mutation", () => {
  const user = member(); const before = structuredClone(user); const result = summarizeTrainingHistory(user);
  assert.deepEqual(user, before); assert.equal(result.completedWeeks, 3); assert.equal(result.completedSessions, 6); assert.equal(result.missedSessions, 0); assert.equal(result.adherencePercent, 100); assert.equal(result.exerciseCompletionPercent, 100); assert.deepEqual(result.averageRecoveryIndicators, { sleep: 8, soreness: 2, energy: 8 }); assert.deepEqual(result.progressionHistory, ["PROGRESS", "MAINTAIN"]); assert.equal(result.maintainHistory.length, 1);
});

test("excellent consistency deterministically recommends one-variable earlier review", () => {
  const first = adaptTraining(member()), second = adaptTraining(member()); assert.deepEqual(first, second); assert.equal(first.recommendation.action, ADAPTATIONS.PROGRESS_EARLIER); assert.equal(first.recommendation.changeLimit, "ONE_VARIABLE"); assert.equal(first.recommendation.progressionPhaseChange, 0); assert.equal(first.recommendation.variableToReview, "repetitions"); assert.match(first.insights[0], /100%/); assert.match(first.insights[1], /excellent/); assert.equal(first.dashboard.consistencyScore, 100); assert.equal(first.dashboard.recommendedFocus, "bounded progression");
});

test("multiple incomplete weeks slow progression and frequent deloads prioritize recovery", () => {
  const incomplete = adaptTraining(member({ generatedWorkoutProgressions: [{ outcome: "INCOMPLETE_WEEK" }, { outcome: "PROGRESS" }, { outcome: "INCOMPLETE_WEEK" }] })); assert.equal(incomplete.recommendation.action, ADAPTATIONS.REDUCE_PROGRESSION_RATE);
  const recovery = adaptTraining(member({ generatedWorkoutProgressions: [{ outcome: "DELOAD" }, { outcome: "MAINTAIN" }, { outcome: "DELOAD" }] })); assert.equal(recovery.recommendation.action, ADAPTATIONS.EXTEND_RECOVERY); assert.match(recovery.insights.at(-1), /recovery week/);
});

test("assigned programs and health-review restrictions always take precedence", () => {
  const assigned = member({ program: { programId: "coach" } }); const before = structuredClone(assigned); assert.equal(adaptTraining(assigned).recommendation.action, ADAPTATIONS.FOLLOW_ASSIGNED_PROGRAM); assert.deepEqual(assigned, before);
  const restricted = adaptTraining(member({ journeyProfile: { healthReviewRequired: true } })); assert.equal(restricted.recommendation.action, ADAPTATIONS.COMPLETE_HEALTH_REVIEW); assert.match(restricted.dashboard.nextMilestone, /health review/);
});

test("legacy and empty members receive compatible deterministic projections", () => {
  const legacy = adaptTraining({ generatedWorkoutPlan: { plan: { version: 1, sessions: [{ sessionId: "one" }] } }, generatedWorkoutExecutions: [] }); assert.equal(legacy.history.prescribedSessions, 1); assert.equal(legacy.history.missedSessions, 1); assert.equal(legacy.recommendation.action, ADAPTATIONS.MAINTAIN); assert.equal(typeof legacy.dashboard.adherenceTrend, "string");
  assert.deepEqual(adaptTraining({}), adaptTraining({}));
});
