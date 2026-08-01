"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const SAFE_ROUTES = new Set(["/dashboard.html", "/workout.html", "/yoga.html", "/greatness.html", "/push-up-challenge.html"]);
const SOURCE_COPY = Object.freeze({
  "workout.completed": ["WORKOUT_COMPLETE", "Workout complete", "Your completed workout was recorded.", "/dashboard.html"],
  "yoga.session.completed": ["YOGA_COMPLETE", "Yoga session complete", "Your Yoga practice was recorded.", "/yoga.html"],
  "program.milestone": ["PROGRAM_MILESTONE", "Program milestone", "You completed a program milestone.", "/dashboard.html"],
  "week.completed": ["PROGRAM_MILESTONE", "Program week complete", "Your completed program week was recorded.", "/dashboard.html"],
  "greatness.activity.completed": ["GREATNESS_ACTIVITY", "Greatness activity complete", "Your verified activity was recorded.", "/greatness.html"],
  "greatness.challenge.completed": ["GREATNESS_MILESTONE", "Greatness milestone", "You completed a Greatness challenge.", "/greatness.html"],
  "pushup.session.completed": ["PUSHUP_SESSION", "Push-Up session complete", "Your verified Push-Up session was recorded.", "/push-up-challenge.html"],
  "pushup.milestone.completed": ["PUSHUP_MILESTONE", "Push-Up milestone", "You reached a Push-Up Challenge milestone.", "/push-up-challenge.html"],
  "achievement.awarded": ["ACHIEVEMENT_AWARDED", "Achievement earned", "A new achievement was added to your Progress & Rewards history.", "/dashboard.html"],
  "badge.awarded": ["BADGE_AWARDED", "Badge earned", "A new badge was added to your Progress & Rewards history.", "/dashboard.html"]
});

function createNotificationService({ filePath, clock = () => new Date(), maxPerMember = 500 }) {
  const appendPath = filePath.endsWith(".ndjson") ? filePath : `${filePath}.ndjson`;
  let migrationError = null;
  if (appendPath !== filePath && !fs.existsSync(appendPath) && fs.existsSync(filePath)) {
    try { const legacy=JSON.parse(fs.readFileSync(filePath,"utf8")); if (legacy?.schemaVersion!==1 || !Array.isArray(legacy.notifications)) throw new Error("invalid legacy notification store"); fs.mkdirSync(path.dirname(appendPath),{recursive:true}); fs.writeFileSync(appendPath,legacy.notifications.map(notification=>JSON.stringify({schemaVersion:1,operation:"created",occurredAt:notification.createdAt,notification})).join("\n")+(legacy.notifications.length?"\n":"")); }
    catch { migrationError="LEGACY_MIGRATION_FAILED"; }
  }
  function withLock(operation) {
    fs.mkdirSync(path.dirname(appendPath), { recursive: true });
    const lock = `${appendPath}.lock`, deadline = Date.now() + 5000;
    while (true) { try { fs.mkdirSync(lock); break; } catch (error) { if (error.code !== "EEXIST" || Date.now() >= deadline) throw error; Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 5); } }
    try { return operation(); } finally { fs.rmdirSync(lock); }
  }
  function events() {
    if (!fs.existsSync(appendPath)) return [];
    return fs.readFileSync(appendPath, "utf8").split("\n").filter(Boolean).map(line => JSON.parse(line)).filter(item => item?.schemaVersion === 1);
  }
  function appendUnsafe(event) { const fd = fs.openSync(appendPath, "a"); try { fs.writeSync(fd, `${JSON.stringify(event)}\n`); fs.fsyncSync(fd); } finally { fs.closeSync(fd); } return event; }
  function append(event) { return withLock(() => appendUnsafe(event)); }
  function projection() {
    const records = new Map();
    for (const event of events()) {
      if (event.operation === "created") records.set(event.notification.notificationId, structuredClone(event.notification));
      else { const item = records.get(event.notificationId); if (item && item.memberId === event.memberId && !item[event.field]) item[event.field] = event.occurredAt; }
    }
    return [...records.values()];
  }
  function create(input) {
    const copy = SOURCE_COPY[input.type], memberId = String(input.memberId || ""), sourceEventId = String(input.sourceEventId || "");
    if (!copy || !/^[A-Za-z0-9._-]{1,128}$/.test(memberId) || !/^[A-Za-z0-9._:-]{1,256}$/.test(sourceEventId)) return { status: "ignored" };
    const deduplicationKey = `${memberId}:${input.type}:${sourceEventId}:${input.sourceAwardId || ""}`;
    return withLock(() => {
      const duplicate = projection().find(item => item.deduplicationKey === deduplicationKey);
      if (duplicate) return { status: "duplicate", notification: duplicate };
      const notification = { notificationId: `ntf_${crypto.createHash("sha256").update(deduplicationKey).digest("hex").slice(0, 24)}`, memberId, type: copy[0], title: copy[1], body: copy[2], sourceEventId,
        sourceAwardId: input.sourceAwardId || null, createdAt: clock().toISOString(), readAt: null, dismissedAt: null, priority: input.priority === "high" ? "high" : "normal",
        actionRoute: SAFE_ROUTES.has(input.actionRoute) ? input.actionRoute : copy[3], version: 1, deduplicationKey };
      appendUnsafe({ schemaVersion: 1, operation: "created", occurredAt: notification.createdAt, notification });
      return { status: "created", notification };
    });
  }
  function ingestFacts(facts) { return (facts || []).map(fact => { try { return create(fact); } catch { return { status: "failed" }; } }); }
  function ingestEvents(authoritativeEvents) { return ingestFacts((authoritativeEvents || []).filter(event => SOURCE_COPY[event.eventType]).map(event => ({ memberId: event.subjectUserId, type: event.eventType, sourceEventId: event.eventId }))); }
  function visible(memberId) { return projection().filter(item => item.memberId === memberId).sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, maxPerMember); }
  function list(memberId, { cursor = 0, limit = 20 } = {}) { const bounded = Math.max(1, Math.min(50, Number(limit) || 20)), offset = Math.max(0, Number(cursor) || 0); const all = visible(memberId).filter(item => !item.dismissedAt); return { notifications: all.slice(offset, offset + bounded).map(({ memberId: _member, deduplicationKey: _key, ...safe }) => safe), nextCursor: offset + bounded < all.length ? String(offset + bounded) : null, hasMore: offset + bounded < all.length }; }
  function unreadCount(memberId) { return visible(memberId).filter(item => !item.readAt && !item.dismissedAt).length; }
  function transition(memberId, notificationId, field) { const item = projection().find(record => record.memberId === memberId && record.notificationId === notificationId); if (!item) return null; if (!item[field]) append({ schemaVersion: 1, operation: field === "readAt" ? "read" : "dismissed", memberId, notificationId, field, occurredAt: clock().toISOString() }); return { notificationId, [field]: projection().find(record => record.notificationId === notificationId)[field] }; }
  function readAll(memberId) { const pending = visible(memberId).filter(item => !item.readAt && !item.dismissedAt); for (const item of pending) transition(memberId, item.notificationId, "readAt"); return { updated: pending.length, readAt: clock().toISOString() }; }
  function health() { try { if(migrationError) throw new Error(migrationError); fs.mkdirSync(path.dirname(appendPath), { recursive: true }); fs.accessSync(path.dirname(appendPath), fs.constants.W_OK); const items=projection(), keys=items.map(item=>item.deduplicationKey); return { instantiated: true, persistenceWritable: true, appendOnlyAudit: true, projectionAvailable: true, unreadCountProjectionCheck:items.every(item=>Boolean(item.memberId) && (!item.readAt || Number.isFinite(Date.parse(item.readAt)))), duplicateSuppression:new Set(keys).size===keys.length, boundedHistory: maxPerMember, channels: ["in_app"] }; } catch { return { instantiated: true, persistenceWritable: false, appendOnlyAudit: true, projectionAvailable: false, unreadCountProjectionCheck:false, duplicateSuppression:false, channels: ["in_app"] }; } }
  return Object.freeze({ create, ingestFacts, ingestEvents, list, unreadCount, markRead: (u, n) => transition(u, n, "readAt"), dismiss: (u, n) => transition(u, n, "dismissedAt"), readAll, health, _events: events });
}
module.exports = { createNotificationService, SAFE_ROUTES, SOURCE_COPY };
