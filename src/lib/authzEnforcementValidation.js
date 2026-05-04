"use strict";

function validateAllowlistShape(name, entries) {
  if (!Array.isArray(entries)) {
    return [`${name} must parse to an array`];
  }
  const warnings = [];
  for (const item of entries) {
    if (typeof item !== "string" || !item.trim()) {
      warnings.push(`${name} contains empty/non-string entry`);
      continue;
    }
    if (/\s/.test(item)) {
      warnings.push(`${name} contains whitespace in '${item}'`);
    }
  }
  return warnings;
}

function validateAuthorizationConfigShape(config) {
  const warnings = [];
  if (!config || typeof config !== "object") {
    return ["Authorization config missing or invalid object"];
  }

  warnings.push(...validateAllowlistShape("bootstrap.superAdminUserIds", config.bootstrap?.superAdminUserIds));
  warnings.push(...validateAllowlistShape("bootstrap.superAdminSubjects", config.bootstrap?.superAdminSubjects));
  warnings.push(...validateAllowlistShape("roleAssignments.adminUserIds", config.roleAssignments?.adminUserIds));
  warnings.push(...validateAllowlistShape("roleAssignments.adminSubjects", config.roleAssignments?.adminSubjects));
  warnings.push(...validateAllowlistShape("roleAssignments.trainerUserIds", config.roleAssignments?.trainerUserIds));
  warnings.push(...validateAllowlistShape("roleAssignments.trainerSubjects", config.roleAssignments?.trainerSubjects));
  const bootstrapUserIds = config.bootstrap?.superAdminUserIds || [];
  const bootstrapSubjects = config.bootstrap?.superAdminSubjects || [];
  const hasBootstrapAllowlist = Array.isArray(bootstrapUserIds) && bootstrapUserIds.length > 0
    || Array.isArray(bootstrapSubjects) && bootstrapSubjects.length > 0;
  const hasModernAdminAllowlist = (config.adminEmails || []).length > 0
    || (config.roleAssignments?.adminUserIds || []).length > 0
    || (config.roleAssignments?.adminSubjects || []).length > 0;
  if (!hasBootstrapAllowlist && !hasModernAdminAllowlist) {
    warnings.push("No bootstrap super-admin allowlist configured (set AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS / AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS for break-glass access).");
  }

  return [...new Set(warnings)];
}

function validateParsedEnforcementConfig(parsed, enforceableActions) {
  const warnings = [];
  const enabledByAction = parsed?.enabledByAction || {};
  for (const action of enforceableActions) {
    if (typeof enabledByAction[action] !== "boolean") {
      warnings.push(`Enforcement state for '${action}' is not boolean`);
    }
  }

  const invalidActions = Array.isArray(parsed?.invalidActions) ? parsed.invalidActions : [];
  if (invalidActions.length) {
    warnings.push(`Unknown action names in LEGACY_FALLBACK_REQUIRE_EXPLICIT_ACTIONS: ${invalidActions.join(", ")}`);
  }

  return warnings;
}

module.exports = {
  validateAuthorizationConfigShape,
  validateParsedEnforcementConfig
};
