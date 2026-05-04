"use strict";

const { parseAuthorizationConfig } = require("./authorization");
const { validateAuthorizationConfigShape, validateParsedEnforcementConfig } = require("./authzEnforcementValidation");
const { parseTrustPolicyConfig, validateTrustPolicy, summarizeTrustPolicy } = require("./trustPolicy");

function runControlPlanePreflight({ env = process.env, enforceableActions = [], trustPolicy = null } = {}) {
  const issues = [];
  const warnings = [];

  const authzConfig = parseAuthorizationConfig(env);
  const authzWarnings = validateAuthorizationConfigShape(authzConfig);
  warnings.push(...authzWarnings);

  const defaults = Object.fromEntries(enforceableActions.map((a) => [a, false]));

  const list = String(env.LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS || "")
    .split(",")
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
  const invalidActions = list.filter((a) => !enforceableActions.includes(a));
  const duplicateActions = list.filter((a, i) => list.indexOf(a) !== i);

  if (invalidActions.length > 0) {
    issues.push(`Invalid action names in LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS: ${invalidActions.join(", ")}`);
  }
  if (duplicateActions.length > 0) {
    warnings.push(`Duplicate action names in LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS: ${[...new Set(duplicateActions)].join(", ")}`);
  }

  const parsedLike = {
    enabledByAction: { ...defaults },
    invalidActions
  };

  for (const action of list) {
    if (action in parsedLike.enabledByAction) parsedLike.enabledByAction[action] = true;
  }

  for (const action of enforceableActions) {
    const envKey = `LEGACY_FALLBACK_REQUIRE_EXPLICIT_${action.toUpperCase()}`;
    const v = env[envKey];
    if (v != null && v !== "true" && v !== "false") {
      issues.push(`${envKey} must be 'true' or 'false' when set`);
      continue;
    }
    if (v === "true") parsedLike.enabledByAction[action] = true;
    if (v === "false") parsedLike.enabledByAction[action] = false;
  }

  const enforcementWarnings = validateParsedEnforcementConfig(parsedLike, enforceableActions);
  warnings.push(...enforcementWarnings);

  if (
    (!Array.isArray(authzConfig.bootstrap.superAdminUserIds) || authzConfig.bootstrap.superAdminUserIds.length === 0) &&
    (!Array.isArray(authzConfig.bootstrap.superAdminSubjects) || authzConfig.bootstrap.superAdminSubjects.length === 0)
  ) {
    issues.push("Missing bootstrap super-admin config (AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS or AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS).");
  }

  if (env.LEGACY_FALLBACK_ENABLED === "false" && Object.values(parsedLike.enabledByAction).some(Boolean)) {
    warnings.push("LEGACY_FALLBACK_ENABLED=false while explicit fallback enforcement flags are set; these flags are inert until fallback is enabled.");
  }
  const parsedTrustPolicy = trustPolicy || parseTrustPolicyConfig(env);
  const trustValidation = validateTrustPolicy(parsedTrustPolicy);
  warnings.push(...trustValidation.warnings);
  issues.push(...trustValidation.issues);

  const manualBridgeEnabled = env.AUTH_BRIDGE_ALLOW_MANUAL !== "false";
  const unverifiedGoogleEnabled = env.AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE !== "false";
  const googleClientId = String(env.GOOGLE_OAUTH_CLIENT_ID || "").trim();

  if (manualBridgeEnabled) {
    warnings.push("AUTH_BRIDGE_ALLOW_MANUAL is enabled; manual identity path is low-trust.");
  }
  if (unverifiedGoogleEnabled) {
    warnings.push("AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE is enabled; Google claims may be unverified.");
  }
  if (!unverifiedGoogleEnabled && !googleClientId) {
    issues.push("GOOGLE_OAUTH_CLIENT_ID is required when AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE=false.");
  }

  return {
    ok: issues.length === 0,
    issues: [...new Set(issues)],
    warnings: [...new Set(warnings)],
    summary: {
      enforceableActionCount: enforceableActions.length,
      invalidActionCount: invalidActions.length,
      trustPolicy: summarizeTrustPolicy(parsedTrustPolicy),
      manualBridgeEnabled,
      unverifiedGoogleEnabled
    }
  };
}

module.exports = {
  runControlPlanePreflight
};
