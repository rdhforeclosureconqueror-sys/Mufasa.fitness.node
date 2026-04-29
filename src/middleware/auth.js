"use strict";

const { ApiError } = require("../lib/apiResponse");

function readBearerToken(req) {
  const authHeader = req.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

function authContext(authTokenLib, authorizationResolver = null, options = {}) {
  const pilotBypass = options?.pilotBypass || null;
  return function attachAuthContext(req, _res, next) {
    const token = readBearerToken(req);
    if (!token) {
      if (false && pilotBypass?.enabled) {
        req.auth = {
          userId: pilotBypass.userId,
          email: pilotBypass.email,
          name: pilotBypass.name || "Rashad Harbour",
          role: pilotBypass.role || "super_admin",
          roles: Array.isArray(pilotBypass.roles) ? pilotBypass.roles : ["super_admin", "admin", "operator", "trainer", "client"],
          provider: "pilot_bypass",
          providerSubject: pilotBypass.email,
          providerVerified: true,
          identityClass: "pilot_bypass",
          issuedAt: null,
          expiresAt: null,
          jti: null
        };
      } else {
        req.auth = null;
      }
      if (authorizationResolver) {
        req.authz = pilotBypass?.enabled
          ? {
            role: pilotBypass.role || "admin",
            permissions: Object.values(authorizationResolver.PERMISSIONS || {}),
            isBootstrapSuperAdmin: false,
            resolutionReason: "pilot_login_disabled"
          }
          : authorizationResolver.resolveRole(null);
      }
      return next();
    }

    const claims = authTokenLib.verify(token);
    req.auth = {
      userId: claims.sub,
      email: claims.email || null,
      provider: claims.provider,
      providerSubject: claims.providerSubject,
      providerVerified: Boolean(claims.providerVerified),
      identityClass: claims.identityClass || "manual_unverified",
      issuedAt: claims.iat,
      expiresAt: claims.exp,
      jti: claims.jti
    };

    if (authorizationResolver) {
      req.authz = authorizationResolver.resolveRole(req.auth);
    }

    return next();
  };
}

function requireAuth(req, _res, next) {
  if (!req.auth || !req.auth.userId) {
    throw new ApiError("UNAUTHENTICATED", "Authentication required", 401);
  }
  return next();
}

function ensureUserScopedAccess(req, requestedUserId) {
  if (!req.auth?.userId || !requestedUserId) return;
  if (requestedUserId !== req.auth.userId) {
    throw new ApiError("FORBIDDEN", "Authenticated user does not match requested userId", 403);
  }
}

function requirePermission(authorizationResolver, permission, onDecision) {
  return function permissionGuard(req, _res, next) {
    if (!req.auth?.userId) {
      if (typeof onDecision === "function") onDecision({ req, permission, allowed: false, reason: "missing_auth" });
      throw new ApiError("UNAUTHENTICATED", "Authentication required", 401);
    }

    const authz = req.authz || authorizationResolver.resolveRole(req.auth);
    req.authz = authz;
    const allowed = authorizationResolver.hasPermission(authz, permission);
    if (typeof onDecision === "function") onDecision({ req, permission, allowed, reason: allowed ? "granted" : "missing_permission" });
    if (!allowed) {
      throw new ApiError("FORBIDDEN", `Missing permission '${permission}'`, 403);
    }

    return next();
  };
}

module.exports = {
  authContext,
  requireAuth,
  ensureUserScopedAccess,
  requirePermission
};
