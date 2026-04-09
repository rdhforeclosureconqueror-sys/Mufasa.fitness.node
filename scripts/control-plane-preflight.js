#!/usr/bin/env node
"use strict";

const { ENFORCEABLE_ACTIONS } = require("../server");
const { runControlPlanePreflight } = require("../src/lib/controlPlanePreflight");

const jsonOnly = process.argv.includes("--json");
const result = runControlPlanePreflight({ env: process.env, enforceableActions: ENFORCEABLE_ACTIONS });

if (jsonOnly) {
  process.stdout.write(`${JSON.stringify({ check: "control_plane_preflight", ...result })}\n`);
  process.exit(result.ok ? 0 : 1);
}

if (result.ok) {
  console.log("PASS control-plane preflight", JSON.stringify(result));
  process.exit(0);
}

console.error("FAIL control-plane preflight", JSON.stringify(result));
process.exit(1);
