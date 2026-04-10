"use strict";

const crypto = require("crypto");
const { ApiError } = require("./apiResponse");

function b64urlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function b64urlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function asFiniteNumber(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function createAuthTokenLib({
  secret,
  issuer = "mufasa-fitness-node",
  minSecretLength = 16,
  maxTtlMs = 1000 * 60 * 60 * 24 * 14,
  clockSkewMs = 5000,
  isRevokedJti = null
}) {
  const effectiveSecret = String(secret || "").trim();
  if (!effectiveSecret) {
    throw new Error("AUTH_TOKEN_SECRET is required");
  }
  if (effectiveSecret.length < minSecretLength) {
    throw new Error(`AUTH_TOKEN_SECRET must be at least ${minSecretLength} characters`);
  }

  function sign(payload) {
    const header = { alg: "HS256", typ: "MUFASA" };
    const encodedHeader = b64urlEncode(JSON.stringify(header));
    const encodedPayload = b64urlEncode(JSON.stringify(payload));
    const toSign = `${encodedHeader}.${encodedPayload}`;
    const signature = crypto.createHmac("sha256", effectiveSecret).update(toSign).digest("base64url");
    return `${toSign}.${signature}`;
  }

  function verify(token) {
    const parts = String(token || "").split(".");
    if (parts.length !== 3) {
      throw new ApiError("UNAUTHENTICATED", "Invalid auth token", 401);
    }

    const [encodedHeader, encodedPayload, signature] = parts;
    const toSign = `${encodedHeader}.${encodedPayload}`;
    const expected = crypto.createHmac("sha256", effectiveSecret).update(toSign).digest("base64url");

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new ApiError("UNAUTHENTICATED", "Invalid auth token signature", 401);
    }

    let header;
    let payload;
    try {
      header = JSON.parse(b64urlDecode(encodedHeader));
      payload = JSON.parse(b64urlDecode(encodedPayload));
    } catch {
      throw new ApiError("UNAUTHENTICATED", "Invalid auth token payload", 401);
    }

    if (!header || header.alg !== "HS256" || header.typ !== "MUFASA") {
      throw new ApiError("UNAUTHENTICATED", "Invalid auth token header", 401);
    }

    const exp = asFiniteNumber(payload?.exp);
    const iat = asFiniteNumber(payload?.iat);
    if (!payload || payload.iss !== issuer || !payload.sub || !payload.jti || !exp || !iat) {
      throw new ApiError("UNAUTHENTICATED", "Invalid auth token claims", 401);
    }

    const now = Date.now();
    if (iat - clockSkewMs > now) {
      throw new ApiError("UNAUTHENTICATED", "Auth token not active yet", 401);
    }

    if (exp + clockSkewMs < now) {
      throw new ApiError("UNAUTHENTICATED", "Auth token expired", 401);
    }

    if (exp <= iat || exp - iat > maxTtlMs + clockSkewMs) {
      throw new ApiError("UNAUTHENTICATED", "Invalid auth token lifetime", 401);
    }

    if (typeof isRevokedJti === "function" && isRevokedJti(payload.jti)) {
      throw new ApiError("UNAUTHENTICATED", "Auth token revoked", 401);
    }

    return payload;
  }

  function issueUserToken({
    userId,
    provider = "manual",
    providerSubject = null,
    providerVerified = false,
    identityClass = "manual_unverified",
    ttlMs = maxTtlMs
  }) {
    const now = Date.now();
    const effectiveTtl = Number(ttlMs);
    if (!Number.isFinite(effectiveTtl) || effectiveTtl <= 0 || effectiveTtl > maxTtlMs) {
      throw new ApiError("VALIDATION_ERROR", `ttlMs must be > 0 and <= ${maxTtlMs}`, 400);
    }

    const payload = {
      iss: issuer,
      sub: userId,
      provider,
      providerSubject,
      providerVerified: Boolean(providerVerified),
      identityClass,
      iat: now,
      exp: now + effectiveTtl,
      jti: crypto.randomUUID()
    };

    return {
      token: sign(payload),
      expiresAt: payload.exp,
      issuedAt: payload.iat,
      userId,
      provider,
      providerVerified: payload.providerVerified,
      identityClass: payload.identityClass,
      jti: payload.jti
    };
  }

  return {
    issueUserToken,
    verify
  };
}

module.exports = {
  createAuthTokenLib
};