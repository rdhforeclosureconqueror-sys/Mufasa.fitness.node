"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("node:child_process");

const { createApp } = require("../server");
const { createAdminAuditLog } = require("../src/lib/adminAuditLog");
const { runControlPlanePreflight } = require("../src/lib/controlPlanePreflight");
const { ALERT_TYPES } = require("../src/lib/controlPlaneAlerts");

function makeTmpRoot() {
  const tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), "mufasa-phase-next-"));
  fs.mkdirSync(path.join(tmpRoot, "public", "exercise-db"), { recursive: true });
  fs.writeFileSync(path.join(tmpRoot, "public", "exercise-db", "index.json"), "[]");
  return tmpRoot;
}

async function post(baseUrl, route, body, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json };
}

async function put(baseUrl, route, body, headers = {}) {
  const res = await fetch(baseUrl + route, {
    method: "PUT",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify(body)
  });
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json };
}

async function get(baseUrl, route, headers = {}) {
  const res = await fetch(baseUrl + route, { method: "GET", headers });
  let json = null;
  try { json = await res.json(); } catch {}
  return { res, json };
}

async function authBridge(baseUrl, userId) {
  const { json, res } = await post(baseUrl, "/api/auth/bridge", { userId });
  assert.equal(res.status, 201);
  return json.data.auth.token;
}

test("break-glass endpoint is super-admin only, requires reason, and audits with annotation", async (t) => {
  const prevSuper = process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
  const prevAdmin = process.env.AUTHZ_ADMIN_USER_IDS;
  process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = "rooter";
  process.env.AUTHZ_ADMIN_USER_IDS = "plain_admin";
  t.after(() => {
    if (prevSuper == null) delete process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
    else process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = prevSuper;
    if (prevAdmin == null) delete process.env.AUTHZ_ADMIN_USER_IDS;
    else process.env.AUTHZ_ADMIN_USER_IDS = prevAdmin;
  });

  const rootDir = makeTmpRoot();
  const app = createApp({ rootDir });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const adminToken = await authBridge(baseUrl, "plain_admin");
  const superToken = await authBridge(baseUrl, "rooter");

  const denied = await put(baseUrl, "/api/ops/enforcement-config/break-glass", {
    reason: "incident",
    enabledByAction: { session_start: true }
  }, { authorization: `Bearer ${adminToken}` });
  assert.equal(denied.res.status, 403);

  const missingReason = await put(baseUrl, "/api/ops/enforcement-config/break-glass", {
    enabledByAction: { session_start: true }
  }, { authorization: `Bearer ${superToken}` });
  assert.equal(missingReason.res.status, 400);

  const okRes = await put(baseUrl, "/api/ops/enforcement-config/break-glass", {
    reasonCode: "SEV1_RECOVERY",
    enabledByAction: { session_start: true }
  }, { authorization: `Bearer ${superToken}` });
  assert.equal(okRes.res.status, 200);
  assert.equal(okRes.json.data.breakGlass, true);

  const audit = await get(baseUrl, "/api/ops/admin-audit?limit=10", { authorization: `Bearer ${superToken}` });
  const bg = audit.json.audit.entries.find((e) => e.action === "enforcement_config_break_glass_update");
  assert.ok(bg);
  assert.equal(bg.annotations.breakGlass, true);
  assert.equal(bg.annotations.reason, "SEV1_RECOVERY");
});

test("audit verify endpoint reports failures and emits alert hook", async (t) => {
  const prevSuper = process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
  process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = "verify_admin";
  t.after(() => {
    if (prevSuper == null) delete process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
    else process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = prevSuper;
  });

  const rootDir = makeTmpRoot();
  const alerts = [];
  const app = createApp({ rootDir, controlPlaneAlertSink: (evt) => alerts.push(evt) });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const token = await authBridge(baseUrl, "verify_admin");
  const read1 = await get(baseUrl, "/api/ops/enforcement-config", { authorization: `Bearer ${token}` });
  assert.equal(read1.res.status, 200);

  const auditPath = path.join(rootDir, "data", "ops", "admin-audit.ndjson");
  const lines = fs.readFileSync(auditPath, "utf8").trim().split("\n");
  const modified = JSON.parse(lines[0]);
  modified.action = "tampered";
  lines[0] = JSON.stringify(modified);
  fs.writeFileSync(auditPath, `${lines.join("\n")}\n`);

  const verify = await get(baseUrl, "/api/ops/admin-audit/verify", { authorization: `Bearer ${token}` });
  assert.equal(verify.res.status, 200);
  assert.equal(verify.json.ok, false);
  assert.equal(verify.json.auditIntegrity.verified, false);
  assert.ok(alerts.some((a) => a.type === ALERT_TYPES.AUDIT_INTEGRITY_FAILURE));
});

test("checkpointing writes periodic checkpoint records", () => {
  const tmpRoot = makeTmpRoot();
  const filePath = path.join(tmpRoot, "data", "ops", "admin-audit.ndjson");
  const cpPath = path.join(tmpRoot, "data", "ops", "admin-audit.checkpoints.ndjson");
  let fakeNow = 0;
  const log = createAdminAuditLog({
    filePath,
    checkpointFilePath: cpPath,
    checkpointIntervalMs: 100,
    now: () => fakeNow
  });

  log.appendEvent({ category: "enforcement", action: "a", status: "ok" });
  fakeNow = 150;
  log.appendEvent({ category: "enforcement", action: "b", status: "ok" });

  const lines = fs.readFileSync(cpPath, "utf8").trim().split("\n").filter(Boolean);
  assert.ok(lines.length >= 1);
  const first = JSON.parse(lines[0]);
  assert.equal(first.mode, "interval");
  assert.ok(first.latestHash);
});

test("preflight lint flags invalid actions and missing bootstrap super-admin", () => {
  const result = runControlPlanePreflight({
    env: {
      LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS: "session_start,not_real",
      AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS: ""
    },
    enforceableActions: ["session_start", "session_complete"]
  });

  assert.equal(result.ok, false);
  assert.ok(result.issues.some((i) => i.includes("Invalid action names")));
  assert.ok(result.issues.some((i) => i.includes("Missing bootstrap super-admin")));
});

test("version conflict and break-glass usage emit alert hooks", async (t) => {
  const prevSuper = process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
  process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = "alert_admin";
  t.after(() => {
    if (prevSuper == null) delete process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS;
    else process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS = prevSuper;
  });

  const rootDir = makeTmpRoot();
  const alerts = [];
  const app = createApp({ rootDir, controlPlaneAlertSink: (evt) => alerts.push(evt) });
  const server = app.listen(0);
  await new Promise((resolve, reject) => { server.once("listening", resolve); server.once("error", reject); });
  t.after(() => server.close());
  const baseUrl = `http://127.0.0.1:${server.address().port}`;

  const token = await authBridge(baseUrl, "alert_admin");
  const update1 = await put(baseUrl, "/api/ops/enforcement-config", {
    enabledByAction: { session_start: true },
    ifVersion: 0
  }, { authorization: `Bearer ${token}` });
  assert.equal(update1.res.status, 200);

  const conflict = await put(baseUrl, "/api/ops/enforcement-config", {
    enabledByAction: { session_start: false },
    ifVersion: 0
  }, { authorization: `Bearer ${token}` });
  assert.equal(conflict.res.status, 409);

  const breakGlass = await put(baseUrl, "/api/ops/enforcement-config/break-glass", {
    reason: "restore service",
    enabledByAction: { session_start: false }
  }, { authorization: `Bearer ${token}` });
  assert.equal(breakGlass.res.status, 200);

  assert.ok(alerts.some((a) => a.type === ALERT_TYPES.ENFORCEMENT_VERSION_CONFLICT));
  assert.ok(alerts.some((a) => a.type === ALERT_TYPES.BREAK_GLASS_USED));
});

test("CLI verification script fails when chain is tampered", () => {
  const rootDir = makeTmpRoot();
  const filePath = path.join(rootDir, "data", "ops", "admin-audit.ndjson");
  const log = createAdminAuditLog({ filePath });
  log.appendEvent({ category: "enforcement", action: "x", status: "ok" });
  log.appendEvent({ category: "enforcement", action: "y", status: "ok" });

  const lines = fs.readFileSync(filePath, "utf8").trim().split("\n");
  const tampered = JSON.parse(lines[1]);
  tampered.action = "evil";
  lines[1] = JSON.stringify(tampered);
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);

  const run = spawnSync("node", ["scripts/verify-admin-audit-chain.js"], {
    cwd: path.resolve(__dirname, ".."),
    env: { ...process.env, ADMIN_AUDIT_PATH: filePath },
    encoding: "utf8"
  });
  assert.equal(run.status, 1);
  assert.ok(run.stderr.includes("FAIL admin audit chain verification"));
});
