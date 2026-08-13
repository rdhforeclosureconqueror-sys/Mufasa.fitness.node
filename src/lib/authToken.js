"use strict";

const crypto = require("crypto");
const { ApiError } = require("./apiResponse");

const ALGORITHM = "HS256";
const TOKEN_TYPE = "MUFASA";
const fingerprint = value => crypto.createHash("sha256").update(String(value || "")).digest("hex").slice(0, 12);
const bytesFingerprint = value => crypto.createHash("sha256").update(value).digest("hex").slice(0, 12);
const encode = value => Buffer.from(value).toString("base64url");
const decode = value => Buffer.from(value, "base64url").toString("utf8");
const finite = value => typeof value === "number" && Number.isFinite(value) ? value : null;

function authFailure(reason, message, stages = {}) {
  throw new ApiError("UNAUTHENTICATED", message, 401, { reason, verification: stages });
}

function createAuthTokenLib({
  secret,
  secretSource = "AUTH_TOKEN_SECRET",
  issuer = "mufasa-fitness-node",
  audience = null,
  minSecretLength = 16,
  maxTtlMs = 1000 * 60 * 60 * 24 * 14,
  clockSkewMs = 5000,
  isRevokedJti = null
}) {
  const inputType = Buffer.isBuffer(secret) ? "Buffer" : secret === null ? "null" : typeof secret;
  const untrimmedSecret = String(secret || "");
  const effectiveSecret = untrimmedSecret.trim();
  if (!effectiveSecret) throw new Error("AUTH_TOKEN_SECRET is required");
  if (effectiveSecret.length < minSecretLength) throw new Error(`AUTH_TOKEN_SECRET must be at least ${minSecretLength} characters`);

  // Pass one immutable byte representation to both HMAC operations. Diagnostics
  // describe these bytes, never the source secret.
  const effectiveKey = Buffer.from(effectiveSecret, "utf8");
  const keyMaterial = Object.freeze({
    fingerprint: bytesFingerprint(effectiveKey),
    byteLength: effectiveKey.byteLength,
    inputType,
    effectiveType: "Buffer",
    trimmingOccurred: untrimmedSecret !== effectiveSecret,
    decodingOccurred: false,
    base64ConversionOccurred: false,
    source: secretSource
  });
  const configuration = Object.freeze({
    source: secretSource,
    algorithm: ALGORITHM,
    library: "node:crypto/createHmac",
    issuer,
    audience,
    tokenType: TOKEN_TYPE,
    keyFingerprint: keyMaterial.fingerprint,
    keyMaterial
  });

  function compactDiagnostics(token) {
    const [encodedHeader = "", encodedPayload = "", signature = ""] = String(token || "").split(".");
    const signingInput = `${encodedHeader}.${encodedPayload}`;
    let algorithm = null;
    try { algorithm = JSON.parse(decode(encodedHeader))?.alg ?? null; } catch (_) {}
    return {
      tokenFingerprint: fingerprint(token), algorithm,
      encodedHeaderFingerprint: fingerprint(encodedHeader),
      encodedPayloadFingerprint: fingerprint(encodedPayload),
      signatureFingerprint: fingerprint(signature),
      signingInputFingerprint: fingerprint(signingInput)
    };
  }

  function sign(payload) {
    const header = { alg: ALGORITHM, typ: TOKEN_TYPE };
    const unsigned = `${encode(JSON.stringify(header))}.${encode(JSON.stringify(payload))}`;
    return `${unsigned}.${crypto.createHmac("sha256", effectiveKey).update(unsigned).digest("base64url")}`;
  }

  function verify(token) {
    const stages = { failureStage: "compact_parse", signature: "FAIL", issuer: "FAIL", audience: "FAIL", expiration: "FAIL", notBefore: "FAIL", issuerExpected: issuer, issuerReceived: null, audienceExpected: audience, audienceReceived: null, algorithmExpected: ALGORITHM, algorithmReceived: null, ...compactDiagnostics(token), verifierKeyMaterial: keyMaterial, verifierLibrary: configuration.library };
    const parts = String(token || "").split(".");
    if (parts.length !== 3 || parts.some(part => !part)) authFailure("malformed_token", "Invalid auth token", stages);
    const [encodedHeader, encodedPayload, signature] = parts;
    let header;
    let payload;
    try {
      header = JSON.parse(decode(encodedHeader));
      payload = JSON.parse(decode(encodedPayload));
      stages.algorithmReceived = header?.alg ?? null;
      stages.issuerReceived = payload?.iss ?? null;
      stages.audienceReceived = payload?.aud ?? null;
    } catch {
      authFailure("malformed_token", "Invalid auth token payload", stages);
    }
    stages.failureStage = "algorithm_validation";
    if (header?.alg !== ALGORITHM) authFailure("algorithm_mismatch", "Invalid auth token algorithm", stages);
    if (header?.typ !== TOKEN_TYPE) authFailure("token_type_invalid", "Invalid auth token type", stages);

    const unsigned = `${encodedHeader}.${encodedPayload}`;
    stages.failureStage = "signature_validation";
    const expected = crypto.createHmac("sha256", effectiveKey).update(unsigned).digest("base64url");
    const actualBuffer = Buffer.from(signature);
    const expectedBuffer = Buffer.from(expected);
    if (actualBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(actualBuffer, expectedBuffer)) {
      authFailure("signature_invalid", "Invalid auth token signature", stages);
    }
    stages.signature = "PASS";
    stages.failureStage = "issuer_validation";
    if (payload?.iss !== issuer) authFailure("issuer_mismatch", "Invalid auth token issuer", stages);
    stages.issuer = "PASS";
    stages.failureStage = "audience_validation";
    if (audience != null && payload?.aud !== audience) authFailure("audience_mismatch", "Invalid auth token audience", stages);
    stages.audience = audience == null ? "NOT_ENFORCED" : "PASS";
    stages.failureStage = "claims_validation";
    if (!payload?.sub) authFailure("subject_missing", "Auth token subject is missing", stages);
    if (!payload?.jti) authFailure("malformed_token", "Auth token identifier is missing", stages);
    const exp = finite(payload.exp);
    const iat = finite(payload.iat);
    const nbf = payload.nbf == null ? iat : finite(payload.nbf);
    if (!exp || !iat || !nbf || exp <= iat || exp - iat > maxTtlMs + clockSkewMs) authFailure("malformed_token", "Invalid auth token lifetime", stages);
    const now = Date.now();
    if (nbf - clockSkewMs > now) authFailure("not_before", "Auth token not active yet", stages);
    stages.notBefore = "PASS";
    if (exp + clockSkewMs < now) authFailure("expired_token", "Auth token expired", stages);
    stages.expiration = "PASS";
    if (typeof isRevokedJti === "function" && isRevokedJti(payload.jti)) authFailure("unknown_verification_failure", "Auth token revoked", stages);
    stages.failureStage = null;
    return payload;
  }

  function issueUserToken({ userId, provider = "manual", providerSubject = null, email = null, providerVerified = false, identityClass = "manual_unverified", ttlMs = maxTtlMs }) {
    const now = Date.now();
    const effectiveTtl = Number(ttlMs);
    if (!Number.isFinite(effectiveTtl) || effectiveTtl <= 0 || effectiveTtl > maxTtlMs) throw new ApiError("VALIDATION_ERROR", `ttlMs must be > 0 and <= ${maxTtlMs}`, 400);
    const payload = { iss: issuer, sub: userId, provider, providerSubject, email: email ? String(email).trim().toLowerCase() : null, providerVerified: Boolean(providerVerified), identityClass, iat: now, exp: now + effectiveTtl, jti: crypto.randomUUID() };
    const token = sign(payload);
    return { token, fingerprint: fingerprint(token), compact: compactDiagnostics(token), expiresAt: payload.exp, issuedAt: payload.iat, userId, provider, providerVerified: payload.providerVerified, identityClass: payload.identityClass, jti: payload.jti, claims: payload };
  }

  return { issueUserToken, verify, configuration, fingerprintToken: fingerprint, compactDiagnostics };
}

module.exports = { createAuthTokenLib, fingerprintToken: fingerprint };
