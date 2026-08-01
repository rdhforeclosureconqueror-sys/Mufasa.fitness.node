"use strict";

const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");

const SAFE_ROUTES = new Set(["/dashboard.html", "/workout.html", "/yoga.html", "/greatness.html", "/push-up-challenge.html"]);
const SOURCE_COPY = Object.freeze({
  "workout.completed": ["WORKOUT_COMPLETE", "Workout complete", "Your completed workout was recorded."],
  "yoga.session.completed": ["YOGA_COMPLETE", "Yoga session complete", "Your Yoga practice was recorded."],
  "program.week.completed": ["PROGRAM_MILESTONE", "Program milestone", "You completed a program milestone."],
  "greatness.activity.completed": ["GREATNESS_ACTIVITY", "Greatness activity complete", "Your verified activity was recorded."],
  "greatness.challenge.completed": ["GREATNESS_MILESTONE", "Greatness milestone", "You completed a Greatness challenge."],
  "pushup.session.completed": ["PUSHUP_SESSION", "Push-Up session complete", "Your verified Push-Up session was recorded."],
  "pushup.milestone.completed": ["PUSHUP_MILESTONE", "Push-Up milestone", "You reached a Push-Up Challenge milestone."]
});

function createNotificationService({ filePath, clock = () => new Date(), maxPerMember = 500 }) {
  function load() {
    if (!fs.existsSync(filePath)) return { schemaVersion: 1, notifications: [] };
    const value = JSON.parse(fs.readFileSync(filePath, "utf8"));
    return value?.schemaVersion === 1 && Array.isArray(value.notifications) ? value : { schemaVersion: 1, notifications: [] };
  }
  function save(value) {
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    const tmp = `${filePath}.${process.pid}.tmp`;
    fs.writeFileSync(tmp, JSON.stringify(value));
    fs.renameSync(tmp, filePath);
  }
  function create(input) {
    const copy = SOURCE_COPY[input.type];
    if (!copy || !/^[A-Za-z0-9._:-]{1,200}$/.test(String(input.sourceEventId || ""))) return { status: "ignored" };
    const state = load();
    const deduplicationKey = `${input.memberId}:${input.type}:${input.sourceEventId}:${input.sourceAwardId || ""}`;
    const duplicate = state.notifications.find(item => item.deduplicationKey === deduplicationKey);
    if (duplicate) return { status: "duplicate", notification: duplicate };
    const createdAt = clock().toISOString();
    const notification = { notificationId: `ntf_${crypto.createHash("sha256").update(deduplicationKey).digest("hex").slice(0, 24)}`, memberId: input.memberId,
      type: copy[0], title: copy[1], body: copy[2], sourceEventId: input.sourceEventId, sourceAwardId: input.sourceAwardId || null,
      createdAt, readAt: null, dismissedAt: null, priority: input.priority || "normal", actionRoute: SAFE_ROUTES.has(input.actionRoute) ? input.actionRoute : "/dashboard.html",
      version: 1, deduplicationKey };
    state.notifications.push(notification);
    const member = state.notifications.filter(x => x.memberId === input.memberId);
    if (member.length > maxPerMember) {
      const remove = new Set(member.sort((a, b) => a.createdAt.localeCompare(b.createdAt)).slice(0, member.length - maxPerMember).map(x => x.notificationId));
      state.notifications = state.notifications.filter(x => !remove.has(x.notificationId));
    }
    save(state);
    return { status: "created", notification };
  }
  function ingestEvents(events) {
    const results = [];
    for (const event of events || []) if (SOURCE_COPY[event.eventType]) {
      try { results.push(create({ memberId: event.subjectUserId, type: event.eventType, sourceEventId: event.eventId, actionRoute: event.eventType.startsWith("yoga") ? "/yoga.html" : "/dashboard.html" })); } catch { results.push({ status: "failed" }); }
    }
    return results;
  }
  function list(memberId, { cursor = 0, limit = 20 } = {}) {
    const bounded = Math.max(1, Math.min(50, Number(limit) || 20));
    const offset = Math.max(0, Number(cursor) || 0);
    const all = load().notifications.filter(x => x.memberId === memberId && !x.dismissedAt).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    return { notifications: all.slice(offset, offset + bounded).map(({ memberId: _memberId, deduplicationKey: _key, ...safe }) => safe), nextCursor: offset + bounded < all.length ? offset + bounded : null, hasMore: offset + bounded < all.length };
  }
  function unreadCount(memberId) { return load().notifications.filter(x => x.memberId === memberId && !x.readAt && !x.dismissedAt).length; }
  function mutate(memberId, notificationId, field) {
    const state = load(); const item = state.notifications.find(x => x.memberId === memberId && x.notificationId === notificationId);
    if (!item) return null; item[field] ||= clock().toISOString(); save(state); return { notificationId: item.notificationId, [field]: item[field] };
  }
  function readAll(memberId) { const state = load(); const now = clock().toISOString(); let updated = 0; for (const item of state.notifications) if (item.memberId === memberId && !item.readAt && !item.dismissedAt) { item.readAt = now; updated++; } save(state); return { updated, readAt: now }; }
  function health() { try { const state = load(); save(state); return { instantiated: true, persistenceWritable: true, projectionAvailable: true, duplicateSuppression: true, boundedHistory: maxPerMember, channels: ["in_app"] }; } catch { return { instantiated: true, persistenceWritable: false, projectionAvailable: false, duplicateSuppression: true, channels: ["in_app"] }; } }
  return Object.freeze({ create, ingestEvents, list, unreadCount, markRead: (u, n) => mutate(u, n, "readAt"), dismiss: (u, n) => mutate(u, n, "dismissedAt"), readAll, health });
}

module.exports = { createNotificationService, SAFE_ROUTES, SOURCE_COPY };
