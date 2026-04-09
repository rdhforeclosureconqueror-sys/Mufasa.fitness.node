"use strict";

const ROLES = Object.freeze({
  SUPER_ADMIN: "super_admin",
  ADMIN: "admin",
  TRAINER: "trainer",
  USER: "user"
});

const PERMISSIONS = Object.freeze({
  OPS_READ_OBSERVABILITY: "ops.read_observability",
  OPS_MANAGE_ENFORCEMENT: "ops.manage_enforcement",
  OPS_READ_AUTHZ: "ops.read_authz"
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: [PERMISSIONS.OPS_READ_OBSERVABILITY, PERMISSIONS.OPS_MANAGE_ENFORCEMENT, PERMISSIONS.OPS_READ_AUTHZ],
  [ROLES.TRAINER]: [],
  [ROLES.USER]: []
});

function parseCsvList(raw) {
  return String(raw || "")
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function toLookup(items) {
  return new Set(items.map((v) => String(v).toLowerCase()));
}

function parseAuthorizationConfig(env = process.env) {
  return {
    bootstrap: {
      superAdminUserIds: parseCsvList(env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS),
      superAdminSubjects: parseCsvList(env.AUTHZ_BOOTSTRAP_SUPER_ADMIN_SUBJECTS)
    },
    roleAssignments: {
      adminUserIds: parseCsvList(env.AUTHZ_ADMIN_USER_IDS),
      adminSubjects: parseCsvList(env.AUTHZ_ADMIN_SUBJECTS),
      trainerUserIds: parseCsvList(env.AUTHZ_TRAINER_USER_IDS),
      trainerSubjects: parseCsvList(env.AUTHZ_TRAINER_SUBJECTS)
    }
  };
}

function createAuthorizationResolver(config = parseAuthorizationConfig(process.env)) {
  const bootstrapUserIds = toLookup(config.bootstrap.superAdminUserIds);
  const bootstrapSubjects = toLookup(config.bootstrap.superAdminSubjects);
  const adminUserIds = toLookup(config.roleAssignments.adminUserIds);
  const adminSubjects = toLookup(config.roleAssignments.adminSubjects);
  const trainerUserIds = toLookup(config.roleAssignments.trainerUserIds);
  const trainerSubjects = toLookup(config.roleAssignments.trainerSubjects);

  function resolveRole(auth) {
    if (!auth || !auth.userId) {
      return {
        role: ROLES.USER,
        permissions: ROLE_PERMISSIONS[ROLES.USER],
        isBootstrapSuperAdmin: false,
        resolutionReason: "anonymous_user"
      };
    }

    const userId = String(auth.userId || "").toLowerCase();
    const providerSubject = String(auth.providerSubject || "").toLowerCase();

    if ((userId && bootstrapUserIds.has(userId)) || (providerSubject && bootstrapSubjects.has(providerSubject))) {
      return {
        role: ROLES.SUPER_ADMIN,
        permissions: ROLE_PERMISSIONS[ROLES.SUPER_ADMIN],
        isBootstrapSuperAdmin: true,
        resolutionReason: "bootstrap_allowlist"
      };
    }

    if ((userId && adminUserIds.has(userId)) || (providerSubject && adminSubjects.has(providerSubject))) {
      return {
        role: ROLES.ADMIN,
        permissions: ROLE_PERMISSIONS[ROLES.ADMIN],
        isBootstrapSuperAdmin: false,
        resolutionReason: "configured_admin"
      };
    }

    if ((userId && trainerUserIds.has(userId)) || (providerSubject && trainerSubjects.has(providerSubject))) {
      return {
        role: ROLES.TRAINER,
        permissions: ROLE_PERMISSIONS[ROLES.TRAINER],
        isBootstrapSuperAdmin: false,
        resolutionReason: "configured_trainer"
      };
    }

    return {
      role: ROLES.USER,
      permissions: ROLE_PERMISSIONS[ROLES.USER],
      isBootstrapSuperAdmin: false,
      resolutionReason: "default_user"
    };
  }

  function hasPermission(authz, permission) {
    if (!authz) return false;
    if (authz.role === ROLES.SUPER_ADMIN) return true;
    return Array.isArray(authz.permissions) && authz.permissions.includes(permission);
  }

  function describe() {
    return {
      roles: Object.values(ROLES),
      permissions: Object.values(PERMISSIONS),
      rolePermissionMap: ROLE_PERMISSIONS,
      bootstrapConfigured: {
        hasSuperAdminUserIdAllowlist: config.bootstrap.superAdminUserIds.length > 0,
        hasSuperAdminSubjectAllowlist: config.bootstrap.superAdminSubjects.length > 0,
        superAdminUserIdCount: config.bootstrap.superAdminUserIds.length,
        superAdminSubjectCount: config.bootstrap.superAdminSubjects.length
      },
      roleAssignmentCounts: {
        adminUserIdCount: config.roleAssignments.adminUserIds.length,
        adminSubjectCount: config.roleAssignments.adminSubjects.length,
        trainerUserIdCount: config.roleAssignments.trainerUserIds.length,
        trainerSubjectCount: config.roleAssignments.trainerSubjects.length
      }
    };
  }

  return {
    ROLES,
    PERMISSIONS,
    resolveRole,
    hasPermission,
    describe,
    rawConfig: config
  };
}

module.exports = {
  ROLES,
  PERMISSIONS,
  ROLE_PERMISSIONS,
  parseAuthorizationConfig,
  createAuthorizationResolver
};
