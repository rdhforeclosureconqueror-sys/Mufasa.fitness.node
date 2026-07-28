"use strict";

const { createGpsProcessor } = require("./gpsEngine");
const { ACTIVITY_TYPES } = require("./domain");

function createCardioSessionEngine({ clock = () => Date.now(), locationTracker = null, gpsOptions } = {}) {
  let state = "idle", session = null, processor = null, activeSince = null, movingTimeMs = 0, pausedAt = null, finished = null;
  function requireState(...allowed) { if (!allowed.includes(state)) throw new Error(`Cannot perform action while session is ${state}`); }
  async function start(activityType) {
    requireState("idle"); if (!ACTIVITY_TYPES.includes(activityType)) throw new Error("Unsupported activity type"); state = "requesting_permission";
    try { if (locationTracker?.requestPermission) await locationTracker.requestPermission(); state = "ready"; processor = createGpsProcessor(activityType, gpsOptions); session = { activityType, startedAtMs: clock() }; activeSince = clock(); state = "active"; if (locationTracker?.start) locationTracker.start((sample) => addSample(sample)); return snapshot(); }
    catch (error) { state = "error"; throw error; }
  }
  function addSample(sample) { requireState("active", "paused"); return processor.add(sample, { paused: state === "paused", nowMs: clock() }); }
  function pause() { requireState("active"); movingTimeMs += clock() - activeSince; pausedAt = clock(); state = "paused"; processor.resetBaseline(); return snapshot(); }
  function resume() { requireState("paused"); session.pausedTimeMs = (session.pausedTimeMs || 0) + clock() - pausedAt; pausedAt = null; activeSince = clock(); state = "active"; processor.resetBaseline(); return snapshot(); }
  function stopTracking() { if (locationTracker?.stop) locationTracker.stop(); }
  function finish() { if (finished) return { ...finished, duplicateFinish: true }; requireState("active", "paused"); state = "finishing"; stopTracking(); const now = clock(); if (activeSince && pausedAt === null) movingTimeMs += now - activeSince; if (pausedAt !== null) session.pausedTimeMs = (session.pausedTimeMs || 0) + now - pausedAt; const gps = processor.summary(); state = "completed"; finished = { ...session, endedAtMs: now, elapsedTimeMs: now - session.startedAtMs, movingTimeMs, pausedTimeMs: session.pausedTimeMs || 0, ...gps }; return finished; }
  function cancel() { requireState("active", "paused", "ready"); stopTracking(); state = "cancelled"; return snapshot(); }
  function snapshot() { return { state, ...(session || {}), movingTimeMs, distanceMeters: processor?.summary().distanceMeters || 0 }; }
  return { start, pause, resume, finish, cancel, addSample, snapshot };
}

module.exports = { createCardioSessionEngine };
