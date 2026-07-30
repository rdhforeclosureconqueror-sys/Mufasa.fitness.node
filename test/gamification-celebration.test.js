"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const { CelebrationQueue, celebrationsBetween, MOTION } = require("../public/gamification.js");

const prior = { state: "ready", level: { current: 2, lifetimeXp: 190 }, achievements: [{ id: "a", state: "locked" }], badges: [] };
const current = { state: "ready", level: { current: 3, lifetimeXp: 340 }, achievements: [{ id: "a", name: "First Light", state: "earned" }], badges: [{ id: "b", name: "First Light" }] };

test("authoritative projection changes produce deterministic celebration ordering", () => {
  assert.deepEqual(celebrationsBetween(prior, current).map((item) => item.type), ["xp", "level", "achievement", "badge"]);
  assert.equal(celebrationsBetween(current, current).length, 0);
});

test("celebration queue presents simultaneous rewards sequentially", async () => {
  const started = [], releases = [];
  const queue = new CelebrationQueue({ present: (item) => new Promise((resolve) => { started.push(item.type); releases.push(resolve); }) });
  queue.enqueue({ type: "xp" }, { type: "achievement" }, { type: "badge" });
  await new Promise(setImmediate); assert.deepEqual(started, ["xp"]);
  releases.shift()(); await new Promise(setImmediate); assert.deepEqual(started, ["xp", "achievement"]);
  releases.shift()(); await new Promise(setImmediate); assert.deepEqual(started, ["xp", "achievement", "badge"]);
  releases.shift()(); await new Promise(setImmediate); assert.equal(queue.active, false);
});

test("dismiss delegates to the active non-modal presentation and reduced motion is retained", async () => {
  let dismissed = false;
  const queue = new CelebrationQueue({ reducedMotion: true, present: (_item, controls) => { assert.equal(controls.reducedMotion, true); controls.setDismiss(() => { dismissed = true; }); return Promise.resolve(); } });
  queue.enqueue({ type: "xp" }); await new Promise(setImmediate); queue.dismiss();
  assert.equal(dismissed, false, "completed presentations clear their dismiss handler");
  assert.equal(MOTION.progress, 800);
});

test("regressions and missing projections never manufacture rewards", () => {
  assert.deepEqual(celebrationsBetween(null, current), []);
  assert.deepEqual(celebrationsBetween(current, prior), []);
});
