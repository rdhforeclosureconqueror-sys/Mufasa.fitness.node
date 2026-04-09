"use strict";

const { ApiError } = require("../lib/apiResponse");

function readBearerToken(req) {
  const authHeader = req.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

function authContext(authTokenLib, authorizationResolver = null) {
  return function attachAuthContext(req, _res, next) {
    const token = readBearerToken(req);
    if (!token) {
      req.auth = null;
      if (authorizationResolver) {
        req.authz = authorizationResolver.resolveRole(null);
      }
      return next();
    }

    const claims = authTokenLib.verify(token);
    req.auth = {
      userId: claims.sub,
      provider: claims.provider,
      providerSubject: claims.providerSubject,
      issuedAt: claims.iat,
      expiresAt: claims.exp
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
