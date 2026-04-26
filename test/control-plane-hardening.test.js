"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");

const { createApp, ENFORCEABLE_ACTIONS, parseActionEnforcementFromEnv } = require("../server");
const { createEnforcementStateStore } = require("../src/lib/enforcementStateStore");
const { createAdminAuditLog } = require("../src/lib/adminAuditLog");
const { validateAuthorizationConfigShape } = require("../src/lib/authzEnforcementValidation");

function makeTmpRoot() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-hardening-test-"));
  fs.mkdirSync(path.join(tmpRoot, "public", "exercise-db"), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, "public", "exercise-db", "index.json"), "[]");
  return tmpRoot;
}

async function withServer(t, fn) {
  const rootDir = makeTmpRoot();
  const app = createApp({ rootDir });
  const server = app.listen(0);

  await new Promise((resolve, reject) => {
    server.once("listening", resolve);
    server.once("error", reject);
  });

  t.after(() => server.close());
  return fn({
    rootDir,
    baseUrl: `http://127.0.0.1:${server.address().port}`
  });
}

async function post(baseUrl, route, body, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json };
}

async function put(baseUrl, route, body, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      ...headers
    },
    body: JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json };
}

async function get(baseUrl, route, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "GET",
    headers
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json };
}

async function authBridge(baseUrl, payload) {
  const trustMode = payload?.googleIdToken
    ? "google_verified"
    : (payload?.googleSub || payload?.googleEmail ? "provider_unverified" : "manual_unverified");
  const bridgePayload = { ...payload, trustMode };
  const { res, json } = await post(baseUrl, "/api/auth/bridge", bridgePayload);
  assert.equal(res.status, 201);
  return json.data.auth.token;
}

test("enforcement override store saves and reloads valid shape", () => {
  const tmpRoot = makeTmpRoot();
  const filePath = path.join(tmpRoot, "data", "ops", "enforcement-overrides.json");
  const store = createEnforcementStateStore({ filePath, enforceableActions: ENFORCEABLE_ACTIONS });

  store.save({ session_start: true, rep_update: false });
  const loaded = store.load();

  assert.equal(loaded.loaded, true);
  assert.equal(loaded.version, 1);
  assert.deepEqual(loaded.overrides, { session_start: true, rep_update: false });
});

test("enforcement override store rejects stale version writes", () => {
  const tmpRoot = makeTmpRoot();
  const filePath = path.join(tmpRoot, "data", "ops", "enforcement-overrides.json");
  const store = createEnforcementStateStore({ filePath, enforceableActions: ENFORCEABLE_ACTIONS });

  const first = store.save({ session_start: true });
  assert.equal(first.version, 1);

  assert.throws(
    () => store.save({ session_start: false }, { ifVersion: 0 }),
    (err) => err && err.code === "VERSION_CONFLICT" && err.details.currentVersion === 1
  );
});

test("invalid persisted override data is ignored safely", () => {
  const tmpRoot = makeTmpRoot();
  const filePath = path.join(tmpRoot, "data", "ops", "enforcement-overrides.json");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({
    version: 1,
    overrides: {
      not_a_real_action: true,
      session_start: "yes"
    }
  }));

  const store = createEnforcementStateStore({ filePath, enforceableActions: ENFORCEABLE_ACTIONS });
  const loaded = store.load();

  assert.equal(loaded.loaded, false);
  assert.deepEqual(loaded.overrides, {});
  assert.ok(loaded.warnings.length >= 1);
});

test("admin audit log appends entries and preserves append-only order", () => {
  const tmpRoot = makeTmpRoot();
  const filePath = path.join(tmpRoot, "data", "ops", "admin-audit.ndjson");
  const log = createAdminAuditLog({ filePath });

  log.appendEvent({ category: "enforcement", action: "enforcement_config_read", status: "ok" });
  log.appendEvent({ category: "enforcement", action: "enforcement_config_update", status: "ok" });

  const entries = log.readRecentEntries(5);
  assert.equal(entries.length, 2);
  assert.equal(entries[0].action, "enforcement_config_read");
  assert.equal(entries[1].action, "enforcement_config_update");
  assert.equal(typeof entries[1].hash, "string");
  assert.equal(entries[1].hashPrev, entries[0].hash);
});

test("admin audit log rotates with bounded retention and reads across archives", () => {
  const tmpRoot = makeTmpRoot();
  const filePath = path.join(tmpRoot, "data", "ops", "admin-audit.ndjson");
  const log = createAdminAuditLog({ filePath, maxBytes: 220, maxArchives: 2 });

  for (let i = 0; i < 10; i += 1) {
    log.appendEvent({
      category: "enforcement",
      action: `rotation_${i}`,
      status: "ok",
      details: { idx: i, pad: "x".repeat(20) }
    });
  }

  assert.equal(fs.existsSync(filePath), true);
  assert.equal(fs.existsSync(`${filePath}.1`), true);
  const combined = log.readRecentEntries(20);
  assert.ok(combined.length >= 2);
});

test("admin audit tamper evidence detects modified entries", () => {
  const tmpRoot = makeTmpRoot();
  const filePath = path.join(tmpRoot, "data", "ops", "admin-audit.ndjson");
  const log = createAdminAuditLog({ filePath });
  log.appendEvent({ category: "enforcement", action: "safe_write", status: "ok" });
  log.appendEvent({ category: "enforcement", action: "safe_read", status: "ok" });

  const lines = fs.readFileSync(filePath, "utf8").trim().split("\n");
  const tampered = JSON.parse(lines[1]);
  tampered.action = "tampered_action";
  lines[1] = JSON.stringify(tampered);
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);

  const page = log.readRecentPage({ limit: 10 });
  assert.equal(page.integrity.enabled, true);
  assert.equal(page.integrity.verified, false);
  assert.ok(page.integrity.issues.some((issue) => issue.includes("hash_mismatch")));
});

test("startup restores persisted overrides and reports recovery in health", async (t) => {
  const previousAdmin = process.env.AUTHZ_ADMIN_USER_IDS;
  process.env.AUTHZ_ADMIN_USER_IDS = "health_admin";
  t.after(() => {
    if (previousAdmin == null) delete process.env.AUTHZ_ADMIN_USER_IDS;
    else process.env.AUTHZ_ADMIN_USER_IDS = previousAdmin;
  });

  const rootDir = makeTmpRoot();
  const app1 = createApp({ rootDir });
  const server1 = app1.listen(0);
  await new Promise((resolve, reject) => {
    server1.once("listening", resolve);
    server1.once("error", reject);
  });
  const baseUrl1 = `http://127.0.0.1:${server1.address().port}`;

  const adminToken = await authBridge(baseUrl1, { userId: "health_admin" });
  const updated = await put(baseUrl1, "/api/ops/enforcement-config", {
    enabledByAction: { session_start: true }
  }, { authorization: `Bearer ${adminToken}` });
  assert.equal(updated.res.status, 200);

  await new Promise((resolve) => server1.close(resolve));

  const app2 = createApp({ rootDir });
  const server2 = app2.listen(0);
  await new Promise((resolve, reject) => {
    server2.once("listening", resolve);
    server2.once("error", reject);
  });
  t.after(() => server2.close());
  const baseUrl2 = `http://127.0.0.1:${server2.address().port}`;

  const health = await get(baseUrl2, "/health");
  assert.equal(health.res.status, 200);
  assert.equal(health.json.persistedOverrideRecovery.loaded, true);
  assert.equal(health.json.persistedOverrideRecovery.version, 1);
  assert.equal(health.json.actionFallbackEnforcement.effective.enabledByAction.session_start, true);
});

test("strict startup mode fails fast for unrecoverable persisted override state", (t) => {
  const prevStrict = process.env.CONTROL_PLANE_STRICT_STARTUP;
  process.env.CONTROL_PLANE_STRICT_STARTUP = "true";
  t.after(() => {
    if (prevStrict == null) delete process.env.CONTROL_PLANE_STRICT_STARTUP;
    else process.env.CONTROL_PLANE_STRICT_STARTUP = prevStrict;
  });

  const rootDir = makeTmpRoot();
  const filePath = path.join(rootDir, "data", "ops", "enforcement-overrides.json");
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, JSON.stringify({ version: 1, overrides: { unknown_action: true } }));

  assert.throws(
    () => createApp({ rootDir }),
    (err) => err && err.code === "STRICT_STARTUP_FAILED" && Array.isArray(err.issues) && err.issues.length > 0
  );
});

test("authorization/enforcement config validation surfaces obvious invalid action names", () => {
  const parsed = parseActionEnforcementFromEnv({
    LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS: "session_start,not_real_action"
  });
  assert.deepEqual(parsed.invalidActions, ["not_real_action"]);

  const warnings = validateAuthorizationConfigShape({
    bootstrap: { superAdminUserIds: ["good", "bad value"], superAdminSubjects: [] },
    roleAssignments: { adminUserIds: [], adminSubjects: [], trainerUserIds: [], trainerSubjects: [] }
  });
  assert.ok(warnings.some((w) => w.includes("whitespace")));
});

test("ops surfaces expose recent audit summary after enforcement access", async (t) => {
  const previousAdmin = process.env.AUTHZ_ADMIN_USER_IDS;
  process.env.AUTHZ_ADMIN_USER_IDS = "audit_surface_admin";
  t.after(() => {
    if (previousAdmin == null) delete process.env.AUTHZ_ADMIN_USER_IDS;
    else process.env.AUTHZ_ADMIN_USER_IDS = previousAdmin;
  });

  await withServer(t, async ({ baseUrl }) => {
    const adminToken = await authBridge(baseUrl, { userId: "audit_surface_admin" });
    const update1 = await put(baseUrl, "/api/ops/enforcement-config", {
      enabledByAction: { session_start: true },
      ifVersion: 0
    }, { authorization: `Bearer ${adminToken}` });
    assert.equal(update1.res.status, 200);
    const updateConflict = await put(baseUrl, "/api/ops/enforcement-config", {
      enabledByAction: { session_start: false },
      ifVersion: 0
    }, { authorization: `Bearer ${adminToken}` });
    assert.equal(updateConflict.res.status, 409);
    assert.equal(updateConflict.json.error.code, "VERSION_CONFLICT");

    const read = await get(baseUrl, "/api/ops/enforcement-config", { authorization: `Bearer ${adminToken}` });
    assert.equal(read.res.status, 200);
    assert.ok(read.json.adminAudit.recentCount >= 1);
    assert.equal(read.json.actionFallbackEnforcement.persistedVersion, 1);

    const obs = await get(baseUrl, "/api/ops/write-observability", { authorization: `Bearer ${adminToken}` });
    assert.equal(obs.res.status, 200);
    assert.ok(obs.json.adminAudit.recentCount >= 1);

    const auditTail = await get(baseUrl, "/api/ops/admin-audit?limit=5", { authorization: `Bearer ${adminToken}` });
    assert.equal(auditTail.res.status, 200);
    assert.ok(Array.isArray(auditTail.json.audit.entries));
    assert.ok(auditTail.json.audit.entries.length >= 1);
    assert.equal(auditTail.json.audit.integrity.enabled, true);
  });
});
