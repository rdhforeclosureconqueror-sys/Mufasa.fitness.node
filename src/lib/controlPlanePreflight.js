"use strict";

const { parseAuthorizationConfig } = require("./authorization");
const { validateAuthorizationConfigShape, validateParsedEnforcementConfig } = require("./authzEnforcementValidation");
const { parseTrustPolicyConfig, validateTrustPolicy, summarizeTrustPolicy } = require("./trustPolicy");


function isBillingEnabled(env) {
  return String(env.BILLING_ENABLED || env.STRIPE_BILLING_ENABLED || "").trim().toLowerCase() === "true";
}

function validateBillingPreflight(env, issues, warnings) {
  if (!isBillingEnabled(env)) {
    warnings.push("BILLING_ENABLED is not true; live Stripe billing preflight checks are not enforced.");
    return;
  }

  const required = [
    "STRIPE_SECRET_KEY",
    "STRIPE_PRICE_ID",
    "STRIPE_WEBHOOK_SECRET"
  ];
  for (const key of required) {
    if (!String(env[key] || "").trim()) issues.push(`${key} is required when BILLING_ENABLED=true.`);
  }

  const publishableKey = String(env.STRIPE_PUBLISHABLE_KEY || env.VITE_STRIPE_PUBLISHABLE_KEY || "").trim();
  if (!publishableKey) issues.push("STRIPE_PUBLISHABLE_KEY or VITE_STRIPE_PUBLISHABLE_KEY is required when BILLING_ENABLED=true.");

  const liveMode = String(env.STRIPE_LIVE_MODE || env.NODE_ENV || "").trim().toLowerCase();
  const requireLivePrefixes = liveMode === "true" || liveMode === "live" || liveMode === "production" || String(env.NODE_ENV || "").toLowerCase() === "production";
  const secretKey = String(env.STRIPE_SECRET_KEY || "").trim();
  const webhookSecret = String(env.STRIPE_WEBHOOK_SECRET || "").trim();
  const priceId = String(env.STRIPE_PRICE_ID || "").trim();

  if (requireLivePrefixes && secretKey && !secretKey.startsWith("sk_live_")) issues.push("STRIPE_SECRET_KEY must begin with sk_live_ in production live mode.");
  if (requireLivePrefixes && publishableKey && !publishableKey.startsWith("pk_live_")) issues.push("Stripe publishable key must begin with pk_live_ in production live mode.");
  if (webhookSecret && !webhookSecret.startsWith("whsec_")) issues.push("STRIPE_WEBHOOK_SECRET must begin with whsec_.");
  if (priceId && !priceId.startsWith("price_")) issues.push("STRIPE_PRICE_ID must begin with price_.");
}

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
  validateBillingPreflight(env, issues, warnings);

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
      unverifiedGoogleEnabled,
      billingEnabled: isBillingEnabled(env)
    }
  };
}

module.exports = {
  runControlPlanePreflight,
  isBillingEnabled,
  validateBillingPreflight
};
