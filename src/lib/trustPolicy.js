"use strict";

const LOW_TRUST_MODES = Object.freeze(["manual_unverified", "provider_unverified"]);

function parseCsv(raw) {
  return String(raw || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

function normalizeTrustMode(raw) {
  const mode = String(raw || "").trim().toLowerCase();
  if (mode === "manual_unverified" || mode === "provider_unverified") return mode;
  return null;
}

function parseTrustPolicyConfig(env = process.env) {
  const nodeEnv = String(env.NODE_ENV || "development").trim().toLowerCase();
  const policyMode = String(env.AUTH_TRUST_POLICY_MODE || "warn").trim().toLowerCase() === "fail" ? "fail" : "warn";

  const defaultsByEnv = nodeEnv === "development" || nodeEnv === "test"
    ? LOW_TRUST_MODES
    : [];

  const configured = env.AUTH_BRIDGE_ALLOWED_TRUST_MODES == null
    ? defaultsByEnv
    : parseCsv(env.AUTH_BRIDGE_ALLOWED_TRUST_MODES);

  const invalidModes = configured.filter((mode) => !LOW_TRUST_MODES.includes(mode));
  const allowedModes = configured.filter((mode) => LOW_TRUST_MODES.includes(mode));

  return {
    nodeEnv,
    policyMode,
    lowTrustModes: LOW_TRUST_MODES,
    allowedModes: [...new Set(allowedModes)],
    invalidModes: [...new Set(invalidModes)],
    isDevLike: nodeEnv === "development" || nodeEnv === "test"
  };
}

function summarizeTrustPolicy(config) {
  const enabledLowTrustModes = config.allowedModes.filter((mode) => config.lowTrustModes.includes(mode));
  return {
    policyMode: config.policyMode,
    nodeEnv: config.nodeEnv,
    isDevLike: config.isDevLike,
    allowedTrustModes: config.allowedModes,
    lowTrustModes: config.lowTrustModes,
    enabledLowTrustModes,
    lowTrustEnabled: enabledLowTrustModes.length > 0,
    readyForPilot: enabledLowTrustModes.length === 0,
    invalidModes: config.invalidModes
  };
}

function validateTrustPolicy(config) {
  const warnings = [];
  const issues = [];

  if (config.invalidModes.length > 0) {
    issues.push(`Invalid trust mode names in AUTH_BRIDGE_ALLOWED_TRUST_MODES: ${config.invalidModes.join(", ")}`);
  }

  const enabledLowTrustModes = config.allowedModes.filter((mode) => LOW_TRUST_MODES.includes(mode));
  if (!config.isDevLike && enabledLowTrustModes.length > 0) {
    const message = `Low-trust auth bridge modes enabled in ${config.nodeEnv}: ${enabledLowTrustModes.join(", ")}`;
    if (config.policyMode === "fail") issues.push(message);
    else warnings.push(message);
  }

  if (enabledLowTrustModes.length === 0) {
    warnings.push("Low-trust bridge modes are disabled; ensure high-trust identity provider path is ready before rollout.");
  }

  return {
    warnings,
    issues
  };
}

module.exports = {
  LOW_TRUST_MODES,
  normalizeTrustMode,
  parseTrustPolicyConfig,
  summarizeTrustPolicy,
  validateTrustPolicy
};
