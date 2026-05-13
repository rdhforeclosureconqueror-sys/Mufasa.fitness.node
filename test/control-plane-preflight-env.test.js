"use strict";

const test = require("node:test");
const assert = require("node:assert/strict");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..");

function runPreflight(envPatch) {
  return spawnSync(process.execPath, ["scripts/control-plane-preflight.js", "--json"], {
    cwd: repoRoot,
    env: {
      ...process.env,
      ...envPatch
    },
    encoding: "utf8"
  });
}

function parseJson(run) {
  return JSON.parse((run.stdout || "").trim().split("\n").filter(Boolean).at(-1) || "null");
}

test("ops preflight fails clearly for missing pilot auth environment", () => {
  const run = runPreflight({
    AUTH_TOKEN_SECRET: "",
    PILOT_LOGIN_PASSWORD: "",
    LOGIN_SEED_EMAIL: "",
    ALLOWED_ORIGINS: "",
    AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS: "",
    AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS: "",
    ENABLE_TTS_NO_AUTH: "true",
    AUTH_BRIDGE_ALLOW_MANUAL: "true",
    AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE: "true",
    NODE_ENV: "production"
  });
  const parsed = parseJson(run);

  assert.equal(run.status, 1);
  assert.equal(parsed.ok, false);
  const issueText = parsed.issues.join("\n");
  assert.match(issueText, /AUTH_TOKEN_SECRET/);
  assert.match(issueText, /PILOT_LOGIN_PASSWORD/);
  assert.match(issueText, /LOGIN_SEED_EMAIL/);
  assert.match(issueText, /AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS or AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS/);
  assert.match(issueText, /ENABLE_TTS_NO_AUTH/);
  assert.match(issueText, /AUTH_BRIDGE_ALLOW_MANUAL/);
  assert.match(issueText, /AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE/);
  assert.match(issueText, /ALLOWED_ORIGINS/);
});

test("ops preflight passes with hardened pilot auth environment", () => {
  const run = runPreflight({
    AUTH_TOKEN_SECRET: "pilot-preflight-secret-32-characters",
    PILOT_LOGIN_PASSWORD: "pilot-login-password",
    LOGIN_SEED_EMAIL: "pilot@example.com",
    ALLOWED_ORIGINS: "https://pilot.example.com",
    AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS: "pilot_email_pilot.example.com",
    AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS: "",
    ENABLE_TTS_NO_AUTH: "false",
    AUTH_BRIDGE_ALLOW_MANUAL: "false",
    AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE: "false",
    NODE_ENV: "production"
  });
  const parsed = parseJson(run);

  assert.equal(run.status, 0, run.stderr || JSON.stringify(parsed));
  assert.equal(parsed.ok, true);
  assert.equal(parsed.issues.length, 0);
  assert.equal(parsed.summary.pilotAuthEnvironment.pilotOrProductionMode, true);
});
