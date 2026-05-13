#!/usr/bin/env node
"use strict";

const { ENFORCEABLE_ACTIONS } = require("../server");
const { runControlPlanePreflight } = require("../src/lib/controlPlanePreflight");

const DEFAULT_OR_DEV_AUTH_SECRETS = new Set([
  "dev-only-secret-change-me",
  "change-me",
  "changeme",
  "default",
  "secret",
  "test-secret"
]);

function isPilotOrProductionEnv(env) {
  const nodeEnv = String(env.NODE_ENV || "").trim().toLowerCase();
  const appEnv = String(env.APP_ENV || env.DEPLOY_ENV || env.RENDER_ENV || "").trim().toLowerCase();
  const pilotMode = String(env.PILOT_MODE || env.PILOT_DEPLOYMENT || "").trim().toLowerCase();
  return nodeEnv === "production" || appEnv === "production" || appEnv === "pilot" || pilotMode === "true" || pilotMode === "pilot";
}

function hasNonEmptyCsv(raw) {
  return String(raw || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean).length > 0;
}

function runPilotAuthEnvironmentChecks(env = process.env) {
  const issues = [];
  const warnings = [];
  const requiredForPass = [
    "AUTH_TOKEN_SECRET",
    "PILOT_LOGIN_PASSWORD",
    "LOGIN_SEED_EMAIL",
    "ALLOWED_ORIGINS",
    "AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS or AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS",
    "ENABLE_TTS_NO_AUTH=false",
    "AUTH_BRIDGE_ALLOW_MANUAL=false",
    "AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE=false"
  ];

  const authSecret = String(env.AUTH_TOKEN_SECRET || "").trim();
  if (!authSecret) {
    issues.push("AUTH_TOKEN_SECRET is required for pilot/production auth.");
  } else if (DEFAULT_OR_DEV_AUTH_SECRETS.has(authSecret.toLowerCase())) {
    issues.push("AUTH_TOKEN_SECRET must not use a default/dev-only value.");
  }

  if (!String(env.PILOT_LOGIN_PASSWORD || "").trim()) {
    issues.push("PILOT_LOGIN_PASSWORD is required for pilot/production login.");
  }

  if (!String(env.LOGIN_SEED_EMAIL || "").trim()) {
    issues.push("LOGIN_SEED_EMAIL is required so the deterministic pilot login principal is explicit.");
  }

  if (!hasNonEmptyCsv(env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS) && !hasNonEmptyCsv(env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS)) {
    issues.push("AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS or AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS is required for deterministic admin bootstrap.");
  }

  if (env.ENABLE_TTS_NO_AUTH !== "false") {
    issues.push("ENABLE_TTS_NO_AUTH must be set to false for pilot/production auth hardening.");
  }

  if (env.AUTH_BRIDGE_ALLOW_MANUAL !== "false") {
    issues.push("AUTH_BRIDGE_ALLOW_MANUAL must be set to false; manual auth bridge issuance is low-trust.");
  }

  if (env.AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE !== "false") {
    issues.push("AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE must be set to false; unverified Google bridge issuance is low-trust.");
  }

  if (isPilotOrProductionEnv(env) && !hasNonEmptyCsv(env.ALLOWED_ORIGINS)) {
    issues.push("ALLOWED_ORIGINS is required and must not be empty in pilot/production mode.");
  } else if (!hasNonEmptyCsv(env.ALLOWED_ORIGINS)) {
    warnings.push("ALLOWED_ORIGINS is empty; set it before running pilot/production preflight.");
  }

  return {
    ok: issues.length === 0,
    issues,
    warnings,
    summary: {
      pilotOrProductionMode: isPilotOrProductionEnv(env),
      requiredForPass
    }
  };
}

function mergePreflightResults(controlPlaneResult, pilotAuthResult) {
  const suppressedControlPlaneIssues = new Set([
    "GOOGLE_OAUTH_CLIENT_ID is required when AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE=false."
  ]);
  const controlPlaneIssues = controlPlaneResult.issues.filter((issue) => !suppressedControlPlaneIssues.has(issue));
  return {
    ...controlPlaneResult,
    ok: controlPlaneIssues.length === 0 && pilotAuthResult.ok,
    issues: [...new Set([...controlPlaneIssues, ...pilotAuthResult.issues])],
    warnings: [...new Set([...controlPlaneResult.warnings, ...pilotAuthResult.warnings])],
    summary: {
      ...controlPlaneResult.summary,
      pilotAuthEnvironment: pilotAuthResult.summary
    }
  };
}

function main() {
  const jsonOnly = process.argv.includes("--json");
  const controlPlaneResult = runControlPlanePreflight({ env: process.env, enforceableActions: ENFORCEABLE_ACTIONS });
  const pilotAuthResult = runPilotAuthEnvironmentChecks(process.env);
  const result = mergePreflightResults(controlPlaneResult, pilotAuthResult);

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
}

if (require.main === module) {
  main();
}

module.exports = {
  runPilotAuthEnvironmentChecks,
  mergePreflightResults
};
