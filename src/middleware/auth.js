"use strict";

const { ApiError } = require("../lib/apiResponse");

function readBearerToken(req) {
  const authHeader = req.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

function authContext(authTokenLib) {
  return function attachAuthContext(req, _res, next) {
    const token = readBearerToken(req);
    if (!token) {
      req.auth = null;
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
    return next();
  };
}

function requireAuth(req, _res, next) {
  if (!req.auth || !req.auth.userId) {
    throw new ApiError("UNAUTHENTICATED", "Authentication required", 401);
  }
  return next();
}

module.exports = {
  authContext,
  requireAuth
};
