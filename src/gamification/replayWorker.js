"use strict";

const { randomUUID } = require("crypto");
const fs = require("fs");
const { spawn } = require("child_process");
const path = require("path");

const TYPES = new Set(["replay_all", "replay_user", "rebuild_projection", "recalculate_xp", "recalculate_achievements"]);
const ACTIVE = new Set(["queued", "running"]);

function createReplayWorker({ store, execute, enabled = false, clock = () => new Date(), idFactory = () => `replay_${randomUUID()}`, defer = setImmediate,
  replayVersion = 1, policyVersion = null, projectionVersion = 1, instanceId = `worker_${randomUUID()}`, leaseMs = 15 * 60_000, heartbeatMs = 10_000,
  pollMs = 1_000, audit = () => {} }) {
  const startedAt = clock();
  let pumping = false;
  let timer = null;
  const counters = { failures: 0, cancelled: 0, completed: 0, projectionRebuilds: 0, integrityFailures: 0 };
  const heartbeatPath = (jobId) => `${store.filePath}.${encodeURIComponent(jobId)}.lease`;
  function markerIsFresh(job) { try { return Date.now() - fs.statSync(heartbeatPath(job.jobId)).mtimeMs < Math.max(heartbeatMs * 3, 30_000); } catch { return false; } }
  function startHeartbeat(jobId) {
    const marker = heartbeatPath(jobId); fs.writeFileSync(marker, instanceId);
    const child = spawn(process.execPath, [path.join(__dirname, "replayLeaseHeartbeat.js"), marker, String(process.pid), String(heartbeatMs)], { stdio: "ignore" });
    child.unref(); return { child, marker };
  }
  function stopHeartbeat(value) { if (!value) return; try { value.child.kill(); } catch {} try { fs.rmSync(value.marker, { force: true }); } catch {} }

  function signature(type, userId) { return `${type}:${userId || "*"}`; }
  function enqueue({ type, userId = null, initiatedBy = "system", scheduledFor = null }) {
    if (!enabled) throw Object.assign(new Error("replay operations are disabled"), { code: "REPLAY_DISABLED" });
    if (!TYPES.has(type)) throw new TypeError("invalid replay type");
    let created;
    store.update((state) => {
      const key = signature(type, userId);
      if (state.jobs.some((job) => ACTIVE.has(job.status) && job.signature === key)) throw Object.assign(new Error("duplicate replay request"), { code: "DUPLICATE_REPLAY" });
      const now = clock().toISOString();
      created = { jobId: idFactory(), signature: key, replayType: type, userId, initiatedBy, queuedAt: now, scheduledFor, startedAt: null, completedAt: null,
        elapsedMs: null, eventsProcessed: 0, usersProcessed: 0, progressPercentage: 0, currentPhase: scheduledFor ? "scheduled" : "queued", status: "queued", error: null };
      state.jobs.push(created);
    });
    audit({ action: "gamification.replay.queued", jobId: created.jobId, replayType: type, initiatedBy });
    pump(); return structuredClone(created);
  }
  function schedule(input) {
    if (!enabled) throw Object.assign(new Error("replay operations are disabled"), { code: "REPLAY_DISABLED" });
    const when = new Date(input.runAt);
    if (!Number.isFinite(when.getTime()) || when <= clock()) throw new TypeError("runAt must be in the future");
    const job = enqueue({ ...input, scheduledFor: when.toISOString() });
    armSchedule(); return job;
  }
  function armSchedule() {
    if (timer) clearTimeout(timer);
    const next = store.read().jobs.filter((j) => j.status === "queued" && j.scheduledFor).sort((a, b) => a.scheduledFor.localeCompare(b.scheduledFor))[0];
    if (next) { timer = setTimeout(() => { timer = null; pump(); }, Math.min(2_147_483_647, Math.max(0, new Date(next.scheduledFor) - clock()))); timer.unref?.(); }
  }
  function cancel(jobId) {
    let result;
    store.update((state) => { const job = state.jobs.find((item) => item.jobId === jobId); if (!job) return;
      if (!ACTIVE.has(job.status)) { result = job; return; }
      job.cancelRequested = true;
      if (job.status === "queued") finish(state, job, "cancelled", null, {});
      result = job;
    });
    if (result) audit({ action: "gamification.replay.cancellation_requested", jobId, initiatedBy: result.initiatedBy });
    return result ? structuredClone(result) : null;
  }
  function finish(state, job, status, error, stats) {
    const completed = clock();
    Object.assign(job, stats, { status, completedAt: completed.toISOString(), elapsedMs: job.startedAt ? Math.max(0, completed - new Date(job.startedAt)) : 0,
      progressPercentage: status === "completed" ? 100 : job.progressPercentage, currentPhase: status, error: error ? String(error.message || error) : null });
    const history = { ...job, replayVersion, policyVersion, projectionVersion, durationMs: job.elapsedMs, checksum: stats.checksum || null, completionState: status,
      replayStatistics: { eventsProcessed: job.eventsProcessed, usersProcessed: job.usersProcessed } };
    state.history.push(history); delete job.leaseOwner; delete job.leaseExpiresAt; delete job.leaseClaimedAt; delete job.fencingToken;
    if (status === "failed") counters.failures++; else if (status === "cancelled") counters.cancelled++; else { counters.completed++; if (job.replayType === "rebuild_projection") counters.projectionRebuilds++; }
  }
  function pump() {
    if (!enabled || pumping) return;
    pumping = true;
    defer(async () => {
      try {
        while (true) {
          let selected;
          store.update((state) => { const active = state.jobs.find((j) => j.status === "running" && (markerIsFresh(j) || Date.parse(j.leaseClaimedAt || 0) + Math.max(heartbeatMs * 3, 30_000) > clock())); if (active) return;
            selected = state.jobs.find((j) => (j.status === "queued" || (j.status === "running" && Date.parse(j.leaseExpiresAt || 0) <= clock())) && (!j.scheduledFor || new Date(j.scheduledFor) <= clock()));
            if (selected) { const recovered = selected.status === "running"; selected.status = "running"; selected.startedAt ||= clock().toISOString(); selected.currentPhase = recovered ? "recovered" : "replaying_events"; selected.progressPercentage = Math.max(1, selected.progressPercentage || 0); selected.leaseOwner = instanceId; selected.fencingToken = (selected.fencingToken || 0) + 1; selected.leaseClaimedAt = clock().toISOString(); selected.leaseExpiresAt = new Date(clock().getTime() + leaseMs).toISOString(); } });
          if (!selected) break;
          const token = selected.fencingToken;
          const externalHeartbeat = startHeartbeat(selected.jobId);
          const heartbeat = setInterval(() => store.update((state) => { const job = state.jobs.find((j) => j.jobId === selected.jobId); if (job?.status === "running" && job.leaseOwner === instanceId && job.fencingToken === token) job.leaseExpiresAt = new Date(clock().getTime() + leaseMs).toISOString(); }), heartbeatMs); heartbeat.unref?.();
          try {
            const assertCommitOwner = () => { const job = store.read().jobs.find((item) => item.jobId === selected.jobId); if (job?.status !== "running" || job.leaseOwner !== instanceId || job.fencingToken !== token) throw Object.assign(new Error("stale replay worker cannot publish"), { code: "STALE_REPLAY_FENCE" }); };
            const stats = await execute(structuredClone(selected), (progress) => store.update((state) => { const job = state.jobs.find((j) => j.jobId === selected.jobId); if (job?.status === "running" && job.leaseOwner === instanceId && job.fencingToken === token) Object.assign(job, progress); }), { assertCommitOwner });
            store.update((state) => { const job = state.jobs.find((j) => j.jobId === selected.jobId); if (job?.leaseOwner === instanceId && job.fencingToken === token) finish(state, job, job.cancelRequested ? "cancelled" : "completed", null, stats || {}); });
            audit({ action: "gamification.replay.completed", jobId: selected.jobId, replayType: selected.replayType });
          } catch (error) { store.update((state) => { const job = state.jobs.find((j) => j.jobId === selected.jobId); if (job?.leaseOwner === instanceId && job.fencingToken === token) finish(state, job, "failed", error, {}); }); audit({ action: "gamification.replay.failed", jobId: selected.jobId, errorCode: error.code || "REPLAY_FAILED" }); }
          finally { clearInterval(heartbeat); stopHeartbeat(externalHeartbeat); }
        }
      } finally { pumping = false; armSchedule(); if (enabled && !timer) { timer = setTimeout(() => { timer = null; pump(); }, pollMs); timer.unref?.(); } }
    });
  }
  function jobs() { return store.read().jobs; }
  function progress(jobId) { return jobs().find((job) => job.jobId === jobId) || null; }
  function history() { return store.read().history; }
  function metrics() {
    const all = jobs(), historyItems = history(), completed = historyItems.filter((h) => h.completionState === "completed");
    const sum = (items, field) => items.reduce((n, item) => n + (Number(item[field]) || 0), 0);
    return { replayDurationMs: sum(completed, "durationMs"), replayFrequency: historyItems.length, replayFailures: historyItems.filter((h) => h.completionState === "failed").length,
      averageThroughput: completed.length ? sum(completed, "eventsProcessed") / Math.max(1, sum(completed, "durationMs") / 1000) : 0,
      queueDepth: all.filter((j) => j.status === "queued").length, averageWaitMs: completed.length ? sum(completed.map((h) => ({ wait: new Date(h.startedAt) - new Date(h.queuedAt) })), "wait") / completed.length : 0,
      projectionRebuildCount: historyItems.filter((h) => h.replayType === "rebuild_projection" && h.completionState === "completed").length, integrityFailures: counters.integrityFailures, policyValidationFailures: 0,
      cancelledJobs: historyItems.filter((h) => h.completionState === "cancelled").length, workerUptimeMs: Math.max(0, clock() - startedAt), workerActive: enabled, workerInstanceId: instanceId,
      activeLease: all.find((j) => j.status === "running") ? { owner: all.find((j) => j.status === "running").leaseOwner, expiresAt: all.find((j) => j.status === "running").leaseExpiresAt } : null };
  }
  function recordIntegrityResult(valid) { if (!valid) counters.integrityFailures++; }
  if (enabled) { pump(); armSchedule(); }
  return Object.freeze({ enqueue, schedule, cancel, jobs, progress, history, metrics, pump, recordIntegrityResult });
}

module.exports = { createReplayWorker, REPLAY_TYPES: TYPES };
