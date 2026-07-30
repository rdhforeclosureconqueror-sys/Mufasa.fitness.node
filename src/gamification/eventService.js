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
  function recordYogaSessionCompleted({ userId, result, correlationId }) {
    const count=result.poseResults.length, score=result.summary.averageScore ?? 0;
    return record({eventId:idFactory(),eventType:"yoga.session.completed",schemaVersion:1,occurredAt:new Date(result.completedAt).toISOString(),recordedAt:clock().toISOString(),actorUserId:userId,subjectUserId:userId,source:"yoga-service",sourceEntity:{type:"yoga_session",id:result.recordId,version:1},idempotencyKey:`yoga.session.completed:${result.recordId}`,correlationId:correlationId||`yoga:${result.recordId}`,causationEventId:null,verification:{status:"verified",method:"authoritative-write",riskFlags:[]},payload:{scoreBand:score>=85?"strong":score>=65?"steady":"developing",poseCountBand:count===1?"one":count<5?"two_to_four":"five_or_more",cameraAssisted:result.detectorVersion!=="movenet-unknown"}});
  }
  function observe() { return Object.freeze({ ...stats, ...eventStore.metrics() }); }
  return Object.freeze({ record, recordWorkoutCompleted, recordYogaSessionCompleted, observe, logger });
}

module.exports = { createEventService, durationBand, exerciseCountBand };
