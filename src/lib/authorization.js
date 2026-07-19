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
  OPS_READ_AUTHZ: "ops.read_authz",
  TRAINER_WORKSPACE_READ: "trainer.workspace.read",
  TRAINER_CLIENTS_READ: "trainer.clients.read",
  TRAINER_CLIENT_PROGRAMS_WRITE: "trainer.clients.programs.write",
  TRAINER_CLIENT_NOTES_READ: "trainer.clients.notes.read",
  TRAINER_CLIENT_NOTES_WRITE: "trainer.clients.notes.write",
  ADMIN_TRAINER_ASSIGNMENTS_MANAGE: "admin.trainer_assignments.manage"
});

const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.SUPER_ADMIN]: Object.values(PERMISSIONS),
  [ROLES.ADMIN]: Object.values(PERMISSIONS),
  [ROLES.TRAINER]: [PERMISSIONS.TRAINER_WORKSPACE_READ, PERMISSIONS.TRAINER_CLIENTS_READ,
    PERMISSIONS.TRAINER_CLIENT_PROGRAMS_WRITE, PERMISSIONS.TRAINER_CLIENT_NOTES_READ,
    PERMISSIONS.TRAINER_CLIENT_NOTES_WRITE],
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
  const adminEmails = String(env.ADMIN_EMAILS || "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);

  return {
    adminEmails,
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
  const adminEmails = toLookup(config.adminEmails || []);
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
    const email = String(auth.email || "").toLowerCase();
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

    if (email && adminEmails.has(email)) {
      return {
        role: ROLES.ADMIN,
        permissions: ROLE_PERMISSIONS[ROLES.ADMIN],
        isBootstrapSuperAdmin: false,
        resolutionReason: "admin_email_allowlist"
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
        adminEmailCount: (config.adminEmails || []).length,
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
