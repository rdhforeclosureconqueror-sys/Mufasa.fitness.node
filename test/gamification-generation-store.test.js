"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { execFileSync } = require("child_process");
const { createGamificationGenerationStore } = require("../src/repositories/gamificationGenerationStore");

function directory() { return fs.mkdtempSync(path.join(os.tmpdir(), "gamification-generation-")); }
function entry(key, delta = 100) { return { effectKey: key, entryId: `id-${key}`, kind: "lifetime_xp", delta, subjectUserId: "user_1", sourceEventId: `event-${key}`, achievementId: null, policyVersion: key, reason: "awarded", occurredAt: "2026-07-30T00:00:00.000Z", reversalOf: null }; }

test("derived awards, ledger, and projections publish as one checksummed generation", () => {
  const store = createGamificationGenerationStore({ directory: directory() });
  store.begin({ sourceCursor: 1, policyVersions: ["1.0.0"] });
  store.awardStore.append({ recordKey: "award:one" }); store.ledgerStore.append(entry("1.0.0")); store.projectionStore.replace({ user_1: { lifetimeXp: 100 } });
  const first = store.commit();
  assert.equal(store.active().ledger.length, 1);

  store.begin({ sourceCursor: 1, policyVersions: ["2.0.0"] });
  store.ledgerStore.append(entry("2.0.0", 75)); store.projectionStore.replace({ user_1: { lifetimeXp: 75 } });
  const second = store.commit();
  assert.notEqual(second.generationId, first.generationId);
  assert.deepEqual(store.active().ledger.map((item) => item.policyVersion), ["2.0.0"], "replacement policy does not retain obsolete XP effects");
  assert.equal(store.rollback(), first.generationId);
  assert.equal(store.active().projections.user_1.lifetimeXp, 100);
});

test("lease loss and interrupted staging cannot expose a partial or stale generation", () => {
  const store = createGamificationGenerationStore({ directory: directory() });
  store.begin({ sourceCursor: 1 }); store.ledgerStore.append(entry("1.0.0")); store.projectionStore.replace({ user_1: { lifetimeXp: 100 } }); store.commit();
  const active = store.readManifest().activeGeneration;
  store.begin({ sourceCursor: 2 }); store.awardStore.append({ recordKey: "partial" });
  assert.throws(() => store.commit(() => { throw Object.assign(new Error("lost lease"), { code: "STALE_REPLAY_FENCE" }); }), /lost lease/);
  assert.equal(store.readManifest().activeGeneration, active);
  assert.equal(store.active().awards.length, 0);
  const restarted = createGamificationGenerationStore({ directory: store.directory });
  assert.equal(restarted.readManifest().activeGeneration, active, "uncommitted staging disappears on restart");
});

test("complete migration validates every store, verifies a backup, and records a compatible manifest", () => {
  const data = directory();
  const output = JSON.parse(execFileSync(process.execPath, [path.resolve(__dirname, "../scripts/migrate-gamification-operations.js"), "--apply"], { env: { ...process.env, POCKET_PT_DATA_DIR: data }, encoding: "utf8" }));
  assert.equal(output.ok, true); assert.equal(output.applied, true);
  assert.ok(fs.existsSync(output.backup.path));
  const manifest = JSON.parse(fs.readFileSync(path.join(data, "gamification", "migration-manifest.json"), "utf8"));
  assert.equal(manifest.version, 3); assert.equal(manifest.status, "applied"); assert.match(manifest.checksum, /^[a-f0-9]{64}$/);
  assert.ok(createGamificationGenerationStore({ directory: path.join(data, "gamification") }).active().generationId);
});
