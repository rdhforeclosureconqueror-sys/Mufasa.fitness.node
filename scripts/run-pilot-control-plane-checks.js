#!/usr/bin/env node
"use strict";

const { spawnSync } = require("node:child_process");

function runCheck(name, script) {
  const run = spawnSync(process.execPath, [script, "--json"], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8"
  });

  let parsed = null;
  try {
    parsed = JSON.parse((run.stdout || "").trim().split("\n").filter(Boolean).at(-1) || "null");
  } catch {
    parsed = null;
  }

  return {
    name,
    ok: run.status === 0,
    status: run.status,
    result: parsed,
    stderr: (run.stderr || "").trim() || null
  };
}

const checks = [
  runCheck("control_plane_preflight", "scripts/control-plane-preflight.js"),
  runCheck("admin_audit_chain", "scripts/verify-admin-audit-chain.js")
];

const failed = checks.filter((c) => !c.ok);
const payload = {
  ok: failed.length === 0,
  timestamp: new Date().toISOString(),
  checks
};

process.stdout.write(`${JSON.stringify(payload)}\n`);
process.exit(payload.ok ? 0 : 1);
