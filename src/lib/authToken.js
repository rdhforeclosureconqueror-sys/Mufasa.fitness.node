"use strict";

const crypto = require("crypto");
const { ApiError } = require("./apiResponse");

function b64urlEncode(value) {
  return Buffer.from(value).toString("base64url");
}

function b64urlDecode(value) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function createAuthTokenLib({ secret, issuer = "mufasa-fitness-node", isRevokedJti = null }) {
  const effectiveSecret = String(secret || "").trim();
  if (!effectiveSecret) {
    throw new Error("AUTH_TOKEN_SECRET is required");
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
    if (parts.length !== 3) throw new ApiError("UNAUTHENTICATED", "Invalid auth token", 401);

    const [encodedHeader, encodedPayload, signature] = parts;
    const toSign = `${encodedHeader}.${encodedPayload}`;
    const expected = crypto.createHmac("sha256", effectiveSecret).update(toSign).digest("base64url");

    const sigBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      throw new ApiError("UNAUTHENTICATED", "Invalid auth token signature", 401);
    }

    let payload;
    try {
      payload = JSON.parse(b64urlDecode(encodedPayload));
    } catch {
      throw new ApiError("UNAUTHENTICATED", "Invalid auth token payload", 401);
    }

    if (!payload || payload.iss !== issuer || !payload.sub || !payload.exp || !payload.jti) {
      throw new ApiError("UNAUTHENTICATED", "Invalid auth token claims", 401);
    }

    if (Date.now() > payload.exp) {
      throw new ApiError("UNAUTHENTICATED", "Auth token expired", 401);
    }

    if (typeof isRevokedJti === "function" && isRevokedJti(payload.jti)) {
      throw new ApiError("UNAUTHENTICATED", "Auth token revoked", 401);
    }

    return payload;
  }

  function issueUserToken({ userId, provider = "manual", providerSubject = null, ttlMs = 1000 * 60 * 60 * 24 * 14 }) {
    const now = Date.now();
    const payload = {
      iss: issuer,
      sub: userId,
      provider,
      providerSubject,
      iat: now,
      exp: now + ttlMs,
      jti: crypto.randomUUID()
    };

    return {
      token: sign(payload),
      expiresAt: payload.exp,
      issuedAt: payload.iat,
      userId,
      provider,
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
