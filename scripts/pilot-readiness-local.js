#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");

const env = {
  ...process.env,
  AUTH_TOKEN_SECRET: process.env.AUTH_TOKEN_SECRET || "local-readiness-secret-with-enough-length",
  PILOT_LOGIN_PASSWORD: process.env.PILOT_LOGIN_PASSWORD || "local-readiness-password",
  LOGIN_SEED_EMAIL: process.env.LOGIN_SEED_EMAIL || "local-readiness@example.test",
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS || "http://127.0.0.1:3000",
  AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS: process.env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS || "local_admin",
  ENABLE_TTS_NO_AUTH: process.env.ENABLE_TTS_NO_AUTH || "false",
  AUTH_BRIDGE_ALLOW_MANUAL: process.env.AUTH_BRIDGE_ALLOW_MANUAL || "false",
  AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE: process.env.AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE || "false"
};

const run = spawnSync(process.execPath, ["scripts/run-pilot-control-plane-checks.js"], {
  cwd: process.cwd(),
  env,
  stdio: "inherit"
});

process.exit(run.status ?? 1);
