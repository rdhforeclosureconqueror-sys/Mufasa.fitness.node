"use strict";

const { randomUUID } = require("crypto");
const { validateEvent, EventValidationError } = require("./validators");

function durationBand(milliseconds) {
  const minutes = Math.max(0, milliseconds) / 60000;
  if (minutes < 5) return "under_5_min";
  if (minutes < 20) return "5_to_19_min";
  if (minutes < 45) return "20_to_44_min";
  if (minutes < 90) return "45_to_89_min";
  return "90_min_or_more";
}
function exerciseCountBand(count) {
  if (count < 1) return "none";
  if (count === 1) return "one";
  if (count < 5) return "two_to_four";
  return "five_or_more";
}
function createEventService({ eventStore, clock = () => new Date(), idFactory = () => `evt_${randomUUID()}`, logger = console }) {
  const stats = { recorded: 0, duplicates: 0, failures: 0, quarantined: 0 };
  function record(input) {
    try {
      const result = eventStore.append(validateEvent(input, { now: clock().getTime() }));
      if (result.status === "duplicate") stats.duplicates += 1; else stats.recorded += 1;
      return result;
    } catch (error) {
      stats.failures += 1;
      if (error instanceof EventValidationError) {
        stats.quarantined += 1;
        eventStore.quarantineRejected({ eventType: input?.eventType, schemaVersion: input?.schemaVersion, errorCode: error.code, correlationId: input?.correlationId });
      }
      throw error;
    }
  }
  function recordWorkoutCompleted({ userId, session, correlationId }) {
    const recordedAt = clock().toISOString();
    const exercises = new Set((session.repUpdates || []).map((item) => item.exerciseId).filter(Boolean));
    if (session.summary?.exerciseId) exercises.add(session.summary.exerciseId);
    return record({
      eventId: idFactory(), eventType: "workout.completed", schemaVersion: 1,
      occurredAt: new Date(session.endedAt).toISOString(), recordedAt,
      actorUserId: userId, subjectUserId: userId, source: "session-service",
      sourceEntity: { type: "session", id: session.sessionId, version: 1 },
      idempotencyKey: `workout.completed:${session.sessionId}`,
      correlationId: correlationId || `session:${session.sessionId}`, causationEventId: null,
      verification: { status: "verified", method: "authoritative-write", riskFlags: [] },
      payload: { durationBand: durationBand(session.endedAt - session.startedAt), exerciseCountBand: exerciseCountBand(exercises.size), generated: Boolean(session.programId) }
    });
  }
  function recordComebackCompleted({userId,session}){return record({eventId:idFactory(),eventType:"commitment.comeback.completed",schemaVersion:1,occurredAt:session.actualCompletionAt,recordedAt:clock().toISOString(),actorUserId:userId,subjectUserId:userId,source:"challenge-commitment-service",sourceEntity:{type:"commitment_session",id:session.scheduleSessionId,version:1},idempotencyKey:`commitment.comeback.completed:${session.workoutSessionId}`,correlationId:`commitment:${session.workoutSessionId}`,causationEventId:null,verification:{status:"verified",method:"authoritative-write",riskFlags:[]},payload:{weekNumber:session.weekNumber}});}
  function recordYogaSessionCompleted({ userId, result, correlationId }) {
    const count=result.poseResults.length, score=result.summary.averageScore ?? 0;
    return record({eventId:idFactory(),eventType:"yoga.session.completed",schemaVersion:1,occurredAt:new Date(result.completedAt).toISOString(),recordedAt:clock().toISOString(),actorUserId:userId,subjectUserId:userId,source:"yoga-service",sourceEntity:{type:"yoga_session",id:result.recordId,version:1},idempotencyKey:`yoga.session.completed:${result.recordId}`,correlationId:correlationId||`yoga:${result.recordId}`,causationEventId:null,verification:{status:"verified",method:"authoritative-write",riskFlags:[]},payload:{scoreBand:score>=85?"strong":score>=65?"steady":"developing",poseCountBand:count===1?"one":count<5?"two_to_four":"five_or_more",cameraAssisted:result.detectorVersion!=="movenet-unknown"}});
  }
  function recordProgramEvent({ userId, type, assignment, occurredAt = clock().toISOString() }) {
    return record({ eventId:idFactory(),eventType:type,schemaVersion:1,occurredAt,recordedAt:clock().toISOString(),actorUserId:userId,subjectUserId:userId,source:"program-engine",sourceEntity:{type:"program_assignment",id:assignment.assignmentId,version:assignment.version},idempotencyKey:`${type}:${assignment.assignmentId}:${assignment.currentWeek}`,correlationId:`program:${assignment.assignmentId}`,causationEventId:null,verification:{status:"verified",method:"authoritative-write",riskFlags:[]},payload:{} });
  }
  function recordGreatnessActivity({ userId, activity }) {
    const base = { schemaVersion:1, occurredAt:activity.endedAt, recordedAt:clock().toISOString(), actorUserId:userId, subjectUserId:userId, source:"greatness-service", sourceEntity:{type:"greatness_activity",id:activity.activityId,version:activity.schemaVersion||1}, correlationId:`greatness:${activity.activityId}`, causationEventId:null, verification:{status:"verified",method:"authoritative-write",riskFlags:[]} };
    return record({ ...base, eventId:idFactory(), eventType:"greatness.activity.completed", idempotencyKey:`greatness.activity.completed:${activity.activityId}`, payload:{activityType:activity.activityType,goalCompleted:Boolean(activity.goal?.completed),distanceMeters:activity.distanceMeters,trailId:activity.selectedRoute?.routeId||activity.selectedRoute?.routeFingerprint||"none"} });
  }
  function recordGreatnessChallenge({ userId, activity, challengeId }) { return record({ eventId:idFactory(),eventType:"greatness.challenge.completed",schemaVersion:1,occurredAt:activity.endedAt,recordedAt:clock().toISOString(),actorUserId:userId,subjectUserId:userId,source:"greatness-service",sourceEntity:{type:"greatness_challenge",id:`${challengeId}:${activity.activityId}`,version:1},idempotencyKey:`greatness.challenge.completed:${challengeId}:${userId}`,correlationId:`greatness:${activity.activityId}`,causationEventId:null,verification:{status:"verified",method:"authoritative-write",riskFlags:[]},payload:{challengeId} }); }
  function recordTrailPhotoApproved({userId,contribution}) { return record({eventId:idFactory(),eventType:"greatness.trail_photo.approved",schemaVersion:1,occurredAt:contribution.approvedAt,recordedAt:clock().toISOString(),actorUserId:userId,subjectUserId:userId,source:"greatness-service",sourceEntity:{type:"trail_contribution",id:contribution.contributionId,version:1},idempotencyKey:`greatness.trail_photo.approved:${userId}:${contribution.trailId}`,correlationId:`trail:${contribution.trailId}`,causationEventId:null,verification:{status:"verified",method:"moderator-approved",riskFlags:[]},payload:{trailId:contribution.trailId}}); }
  function recordPushupSession({ userId, result, firstVerifiedSession = false }) {
    const base={schemaVersion:1,occurredAt:result.timestamp,recordedAt:clock().toISOString(),actorUserId:userId,subjectUserId:userId,source:"pushup-challenge-service",sourceEntity:{type:"pushup_result",id:result.id,version:1},correlationId:`pushup:${result.id}`,causationEventId:null,verification:{status:"verified",method:"authoritative-write",riskFlags:[]}};
    const session=record({...base,eventId:idFactory(),eventType:"pushup.session.completed",idempotencyKey:`pushup.session.completed:${result.id}`,payload:{scoreBand:result.score>=10?"ten_or_more":result.score>0?"one_to_nine":"zero",leaderboardEligible:true}});
    const milestone=firstVerifiedSession?record({...base,eventId:idFactory(),eventType:"pushup.milestone.completed",idempotencyKey:`pushup.milestone.completed:first:${userId}`,payload:{milestone:"first_verified_session"}}):null;
    return {session,milestone};
  }
  function observe() { return Object.freeze({ ...stats, ...eventStore.metrics() }); }
  return Object.freeze({ record, recordWorkoutCompleted, recordComebackCompleted, recordYogaSessionCompleted, recordProgramEvent, recordGreatnessActivity, recordGreatnessChallenge, recordTrailPhotoApproved, recordPushupSession, observe, logger });
}

module.exports = { createEventService, durationBand, exerciseCountBand };
