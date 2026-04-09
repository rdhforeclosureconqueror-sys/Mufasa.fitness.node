#!/usr/bin/env node
"use strict";

const { ENFORCEABLE_ACTIONS } = require("../server");
const { runControlPlanePreflight } = require("../src/lib/controlPlanePreflight");

const result = runControlPlanePreflight({ env: process.env, enforceableActions: ENFORCEABLE_ACTIONS });

if (result.ok) {
  console.log("PASS control-plane preflight", JSON.stringify(result));
  process.exit(0);
}

console.error("FAIL control-plane preflight", JSON.stringify(result));
process.exit(1);
