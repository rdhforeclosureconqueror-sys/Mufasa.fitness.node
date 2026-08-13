"use strict";

const crypto = require("crypto");
const { ApiError } = require("../lib/apiResponse");

function tokenHandoffDiagnostics(value) {
  const text = typeof value === "string" ? value : "";
  const [header = "", payload = "", signature = ""] = text.split(".");
  const fingerprint = (part) => crypto.createHash("sha256").update(part, "utf8").digest("hex").slice(0, 12);
  return {
    checkpoint: "token extracted by backend middleware immediately after removing Bearer",
    compactTokenSha256Prefix: fingerprint(text), headerSegmentSha256Prefix: fingerprint(header),
    payloadSegmentSha256Prefix: fingerprint(payload), signatureSegmentSha256Prefix: fingerprint(signature),
    compactLength: text.length, headerLength: header.length, payloadLength: payload.length, signatureLength: signature.length,
    leadingTrailingWhitespacePresent: /^\s|\s$/.test(text) ? "YES" : "NO",
    quoteCharactersPresent: /["']/.test(text) ? "YES" : "NO",
    percentEncodingIndicatorsPresent: /%[0-9a-f]{2}/i.test(text) ? "YES" : "NO",
    signatureCharacterFlags: Object.fromEntries(["+", "/", "=", "-", "_"].map(character => [character, signature.includes(character) ? "YES" : "NO"])),
    transformationSincePreviousCheckpoint: "Bearer prefix removed",
    source: "src/middleware/auth.js/authContext"
  };
}

function readBearerToken(req) {
  const authHeader = req.get("authorization") || "";
  const [scheme, token] = authHeader.split(" ");
  if (!scheme || scheme.toLowerCase() !== "bearer" || !token) return null;
  return token.trim();
}

function hasMultipleBearerCredentials(value) {
  const authorization = typeof value === "string" ? value : "";
  return authorization.includes(",") || (authorization.match(/\bbearer\s+/ig) || []).length > 1;
}

function authContext(authTokenLib, authorizationResolver = null, options = {}) {
  const pilotBypass = options?.pilotBypass || null;
  const trace = typeof options?.trace === "function" ? options.trace : null;
  return function attachAuthContext(req, _res, next) {
    const authorization = req.get("authorization") || "";
    const headerPresent = Boolean(authorization);
    const bearerAfterPrefixRemoval = authorization.replace(/^Bearer /i, "");
    const backendTokenHandoff = headerPresent && req.path === "/api/auth/me" ? tokenHandoffDiagnostics(bearerAfterPrefixRemoval) : null;
    if (backendTokenHandoff) trace?.({ event: "token_handoff", requestId: req.requestId, tokenHandoff: backendTokenHandoff });
    if (hasMultipleBearerCredentials(authorization)) {
      const reason = "multiple_bearer_credentials";
      const authTrace = { authorizationHeaderPresent: true, bearerParsingSucceeded: false, tokenHandoff: backendTokenHandoff, signature: "NOT_RUN", issuer: "NOT_RUN", audience: "NOT_RUN", expiration: "NOT_RUN", notBefore: "NOT_RUN", subjectLookup: "NOT_RUN", reason, httpStatus: 401 };
      if (req.path === "/api/auth/me") trace?.({ event: "verification", requestId: req.requestId, ...authTrace });
      throw new ApiError("UNAUTHENTICATED", "Authentication required", 401, { reason, ...(req.path === "/api/auth/me" ? { authTrace: options.publicTrace?.(authTrace, req) || authTrace } : {}) });
    }
    const token = readBearerToken(req);
    if (!token) {
      if (pilotBypass?.enabled && pilotBypass?.runtimeAllowed === true) {
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
        req.authz = pilotBypass?.enabled && pilotBypass?.runtimeAllowed === true
          ? {
            role: pilotBypass.role || "admin",
            permissions: Object.values(authorizationResolver.PERMISSIONS || {}),
            isBootstrapSuperAdmin: false,
            resolutionReason: "pilot_login_disabled"
          }
          : authorizationResolver.resolveRole(null);
      }
      if (req.path === "/api/auth/me") {
        req.authTrace = { authorizationHeaderPresent: headerPresent, bearerParsingSucceeded: false, signature: "NOT_RUN", issuer: "NOT_RUN", audience: "NOT_RUN", expiration: "NOT_RUN", notBefore: "NOT_RUN", subjectLookup: "NOT_RUN", reason: "missing_bearer", httpStatus: 401 };
        trace?.({ event: "verification", requestId: req.requestId, ...req.authTrace });
      }
      return next();
    }

    let claims;
    try {
      claims = authTokenLib.verify(token);
    } catch (error) {
      if (req.path === "/api/auth/me") {
        req.authTrace = { authorizationHeaderPresent: true, bearerParsingSucceeded: true, tokenHandoff: backendTokenHandoff, tokenFingerprint: authTokenLib.fingerprintToken(token), ...(error?.details?.verification || {}), subjectLookup: error?.details?.reason === "subject_missing" ? "FAIL" : "NOT_RUN", reason: error?.details?.reason || "unknown_verification_failure", httpStatus: error?.status || 401 };
        error.details = { ...(error.details || {}), authTrace: options.publicTrace?.(req.authTrace, req) || req.authTrace };
        trace?.({ event: "verification", requestId: req.requestId, ...req.authTrace });
      }
      throw error;
    }
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

    if (req.path === "/api/auth/me") {
      req.authTrace = { authorizationHeaderPresent: true, bearerParsingSucceeded: true, tokenHandoff: backendTokenHandoff, tokenFingerprint: authTokenLib.fingerprintToken(token), receivedCompact: authTokenLib.compactDiagnostics(token), verifierKeyMaterial: authTokenLib.configuration.keyMaterial, verifierLibrary: authTokenLib.configuration.library, failureStage: null, signature: "PASS", issuer: "PASS", audience: authTokenLib.configuration.audience == null ? "NOT_ENFORCED" : "PASS", expiration: "PASS", notBefore: "PASS", subjectLookup: "PASS", reason: null, httpStatus: 200, issuerExpected: authTokenLib.configuration.issuer, issuerReceived: claims.iss ?? null, audienceExpected: authTokenLib.configuration.audience, audienceReceived: claims.aud ?? null };
      trace?.({ event: "verification", requestId: req.requestId, ...req.authTrace });
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
