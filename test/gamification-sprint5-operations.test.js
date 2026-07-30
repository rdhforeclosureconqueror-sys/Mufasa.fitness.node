"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { createReplayJobStore } = require("../src/repositories/replayJobStore");
const { createReplayWorker } = require("../src/gamification/replayWorker");
const { createPolicyManager } = require("../src/gamification/policyManager");
const { validateXpPolicy } = require("../src/gamification/xpPolicyService");
const { loadGamificationConfig } = require("../src/config/gamification");

function temporary(name) { const dir = fs.mkdtempSync(path.join(os.tmpdir(), `sprint5-${name}-`)); return path.join(dir, `${name}.json`); }
function tick() { return new Promise((resolve) => setImmediate(resolve)); }
function policy(version, from, to = null) { const base = require("../data/gamification/xp-policy.json").policies[0]; return { ...structuredClone(base), policyVersion: version, effectiveFrom: from, effectiveTo: to }; }

test("replay worker serializes jobs, persists progress/history, and releases its lock", async () => {
  const filePath = temporary("queue"); const order = []; let active = 0; let maximum = 0;
  const worker = createReplayWorker({ store: createReplayJobStore({ filePath }), enabled: true, idFactory: (() => { let n = 0; return () => `job_${++n}`; })(),
    execute: async (job, progress) => { active++; maximum = Math.max(maximum, active); order.push(job.jobId); progress({ progressPercentage: 50, currentPhase: "halfway" }); await tick(); active--; return { eventsProcessed: 4, usersProcessed: 2, checksum: job.jobId }; } });
  const first = worker.enqueue({ type: "replay_all", initiatedBy: "admin" });
  const second = worker.enqueue({ type: "rebuild_projection", initiatedBy: "admin" });
  assert.throws(() => worker.enqueue({ type: "replay_all" }), (error) => error.code === "DUPLICATE_REPLAY");
  await tick(); await tick(); await tick();
  assert.deepEqual(order, [first.jobId, second.jobId]); assert.equal(maximum, 1);
  assert.equal(worker.progress(first.jobId).progressPercentage, 100);
  assert.equal(worker.history().length, 2); assert.equal(worker.history()[0].checksum, first.jobId);
  const restarted = createReplayWorker({ store: createReplayJobStore({ filePath }), enabled: false, execute: async () => ({}) });
  assert.equal(restarted.history().length, 2, "history survives process/service recreation");
  assert.equal(worker.metrics().queueDepth, 0);
});

test("cancellation, execution failure, recovery, and automatic lock release are safe", async () => {
  const store = createReplayJobStore({ filePath: temporary("failure") }); let release;
  const worker = createReplayWorker({ store, enabled: true, execute: (job) => job.replayType === "replay_all" ? new Promise((resolve) => { release = resolve; }) : Promise.reject(new Error("boom")) });
  const running = worker.enqueue({ type: "replay_all" }); await tick();
  assert.equal(worker.progress(running.jobId).status, "running"); assert.equal(worker.cancel(running.jobId).cancelRequested, true);
  release({ eventsProcessed: 1, usersProcessed: 1 }); await tick(); await tick();
  assert.equal(worker.progress(running.jobId).status, "cancelled");
  const failed = worker.enqueue({ type: "replay_user", userId: "user_1" }); await tick(); await tick();
  assert.equal(worker.progress(failed.jobId).status, "failed");
  const queued = worker.enqueue({ type: "replay_user", userId: "user_1" });
  assert.equal(queued.status, "queued", "failed jobs release duplicate lock");
});

test("a recovered running job returns to the queue and scheduling rejects invalid times", async () => {
  const store = createReplayJobStore({ filePath: temporary("recovery") });
  store.update((state) => state.jobs.push({ jobId: "interrupted", signature: "replay_all:*", replayType: "replay_all", status: "running", queuedAt: "2026-01-01T00:00:00.000Z", startedAt: "2026-01-01T00:00:01.000Z" }));
  let resolveRun; const worker = createReplayWorker({ store, enabled: true, execute: () => new Promise((resolve) => { resolveRun = resolve; }) });
  await tick(); assert.equal(worker.progress("interrupted").status, "running");
  assert.throws(() => worker.schedule({ type: "replay_user", userId: "u", runAt: "invalid" }), /future/);
  resolveRun({ eventsProcessed: 0, usersProcessed: 0 }); await tick(); await tick(); assert.equal(worker.progress("interrupted").status, "completed");
});

test("policy publication enforces validation, immutability, windows, archive, and durable lifecycle", () => {
  const filePath = temporary("policies"); const manager = createPolicyManager({ filePath, validate: validateXpPolicy, clock: () => new Date("2026-07-30T00:00:00.000Z") });
  manager.create(policy("1.0.0", "2026-01-01T00:00:00.000Z", "2027-01-01T00:00:00.000Z"));
  assert.throws(() => manager.publish("1.0.0"), /validated/); manager.validate("1.0.0"); manager.publish("1.0.0");
  assert.equal(manager.published().length, 1); assert.throws(() => manager.archive("1.0.0"), /immutable/);
  manager.create(policy("2.0.0", "2026-06-01T00:00:00.000Z")); manager.validate("2.0.0"); assert.throws(() => manager.publish("2.0.0"), /overlapping/);
  manager.deprecate("1.0.0");
  assert.throws(() => manager.publish("2.0.0"), (error) => error.code === "HISTORICAL_POLICY_REPLACEMENT");
  manager.create(policy("9.0.0", "not-a-date")); assert.throws(() => manager.validate("9.0.0")); assert.equal(manager.metrics().policyValidationFailures, 1);
  manager.create(policy("3.0.0", "2027-01-01T00:00:00.000Z")); manager.validate("3.0.0"); manager.archive("3.0.0");
  assert.equal(createPolicyManager({ filePath, validate: validateXpPolicy }).inspect("3.0.0").lifecycleState, "archived");
});

test("Sprint 5 operations are independently disabled by default", () => {
  assert.equal(loadGamificationConfig({}).operations, false);
  assert.equal(loadGamificationConfig({ GAMIFICATION_EVENT_CAPTURE: "true", GAMIFICATION_EVALUATION: "true", GAMIFICATION_READ_API: "true", GAMIFICATION_OPERATIONS: "true" }).operations, true);
  const worker = createReplayWorker({ store: createReplayJobStore({ filePath: temporary("disabled") }), enabled: false, execute: async () => ({}) });
  assert.throws(() => worker.enqueue({ type: "replay_all" }), (error) => error.code === "REPLAY_DISABLED");
});

test("multiple worker instances coordinate through a durable fenced lease", async () => {
  const filePath = temporary("distributed"); let active = 0; let maximum = 0; const executions = [];
  const execute = async (job) => { active++; maximum = Math.max(maximum, active); executions.push(job.jobId); await tick(); active--; return { eventsProcessed: 1, usersProcessed: 1 }; };
  const first = createReplayWorker({ store: createReplayJobStore({ filePath, ownerId: "store-a" }), enabled: true, instanceId: "instance-a", execute });
  const second = createReplayWorker({ store: createReplayJobStore({ filePath, ownerId: "store-b" }), enabled: true, instanceId: "instance-b", execute });
  first.enqueue({ type: "replay_all" }); first.enqueue({ type: "rebuild_projection" }); second.pump();
  await tick(); await tick(); await tick();
  assert.equal(maximum, 1); assert.equal(new Set(executions).size, 2);
  assert.equal(first.history().length, 2);
});

test("a worker that loses its fencing token cannot publish after the new owner", async () => {
  const store = createReplayJobStore({ filePath: temporary("stale-fence") });
  let continueExecution;
  const worker = createReplayWorker({ store, enabled: true, instanceId: "old-worker", execute: async (_job, _progress, { assertCommitOwner }) => {
    await new Promise((resolve) => { continueExecution = resolve; });
    assertCommitOwner();
    return { eventsProcessed: 1, usersProcessed: 1 };
  } });
  const job = worker.enqueue({ type: "replay_all" }); await tick();
  store.update((state) => { const current = state.jobs.find((item) => item.jobId === job.jobId); current.leaseOwner = "new-worker"; current.fencingToken += 1; });
  continueExecution(); await tick(); await tick();
  assert.equal(worker.history().length, 0, "the stale executor cannot mark or publish completion");
  assert.equal(store.read().jobs.find((item) => item.jobId === job.jobId).leaseOwner, "new-worker");
});

test("replay store is checksummed, revisioned, migrates v1, and recovers its backup", () => {
  const filePath = temporary("durability");
  fs.writeFileSync(filePath, JSON.stringify({ schemaVersion: 1, jobs: [], history: [], schedules: [] }));
  const store = createReplayJobStore({ filePath }); store.update((state) => state.jobs.push({ jobId: "one", status: "completed" }));
  store.update((state) => state.jobs.push({ jobId: "two", status: "completed" }));
  const before = store.read(); assert.equal(before.schemaVersion, 2); assert.ok(before.revision >= 2); assert.match(before.checksum, /^[a-f0-9]{64}$/);
  fs.writeFileSync(filePath, "{corrupt");
  assert.equal(store.read().jobs.some((job) => job.jobId === "one"), true);
});
