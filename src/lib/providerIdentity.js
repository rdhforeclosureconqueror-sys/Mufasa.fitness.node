"use strict";

const { ApiError } = require("./apiResponse");

function sanitizeProviderSubject(value, max = 160) {
  return String(value || "").trim().slice(0, max);
}

function normalizeGoogleUserId(subject) {
  return `google_${String(subject || "").replace(/[^a-zA-Z0-9._-]/g, "_").slice(0, 120)}`;
}

async function defaultGoogleIdentityVerifier({ googleIdToken, fetchImpl = fetch }) {
  const endpoint = "https://oauth2.googleapis.com/tokeninfo";
  const url = `${endpoint}?id_token=${encodeURIComponent(googleIdToken)}`;
  const res = await fetchImpl(url, { method: "GET" });
  let payload = null;
  try {
    payload = await res.json();
  } catch {
    payload = null;
  }
  if (!res.ok || !payload) {
    throw new ApiError("UNAUTHENTICATED", "Google identity verification failed", 401);
  }

  return {
    sub: payload.sub || null,
    email: payload.email || null,
    emailVerified: payload.email_verified === true || payload.email_verified === "true",
    aud: payload.aud || null,
    iss: payload.iss || null,
    exp: payload.exp ? Number(payload.exp) : null
  };
}

async function resolveAuthBridgeIdentity(input, options = {}) {
  const {
    env = process.env,
    googleIdentityVerifier = defaultGoogleIdentityVerifier,
    fetchImpl = fetch
  } = options;

  if (input.manualUserId) {
    const allowManual = env.AUTH_BRIDGE_ALLOW_MANUAL !== "false";
    if (!allowManual) {
      throw new ApiError("FORBIDDEN", "Manual auth bridge is disabled", 403);
    }

    return {
      userId: input.manualUserId,
      provider: "manual",
      providerSubject: input.manualUserId,
      providerVerified: false,
      identityClass: "manual_unverified"
    };
  }

  const allowUnverifiedGoogle = env.AUTH_BRIDGE_ALLOW_UNVERIFIED_GOOGLE !== "false";
  const expectedAudience = String(env.GOOGLE_OAUTH_CLIENT_ID || "").trim();

  if (input.googleIdToken) {
    let verified;
    try {
      verified = await googleIdentityVerifier({
        googleIdToken: input.googleIdToken,
        expectedAudience,
        fetchImpl
      });
    } catch (error) {
      const details = {
        reason: "google_verification_failed",
        verificationError: error?.code || error?.message || "unknown"
      };
      throw new ApiError("UNAUTHENTICATED", "Google identity verification failed", 401, details);
    }

    if (!verified?.sub) {
      throw new ApiError("UNAUTHENTICATED", "Google identity verification returned no subject", 401);
    }

    if (expectedAudience && verified.aud !== expectedAudience) {
      throw new ApiError("UNAUTHENTICATED", "Google token audience mismatch", 401, {
        reason: "audience_mismatch"
      });
    }

    const allowedIssuers = new Set(["https://accounts.google.com", "accounts.google.com"]);
    if (verified.iss && !allowedIssuers.has(verified.iss)) {
      throw new ApiError("UNAUTHENTICATED", "Google token issuer invalid", 401, {
        reason: "issuer_invalid"
      });
    }

    if (verified.exp && Number.isFinite(verified.exp) && (verified.exp * 1000) <= Date.now()) {
      throw new ApiError("UNAUTHENTICATED", "Google token expired", 401, {
        reason: "token_expired"
      });
    }

    if (input.googleSub && input.googleSub !== verified.sub) {
      throw new ApiError("UNAUTHENTICATED", "googleSub does not match verified Google token subject", 401);
    }

    if (input.googleEmail && verified.email && input.googleEmail.toLowerCase() !== String(verified.email).toLowerCase()) {
      throw new ApiError("UNAUTHENTICATED", "googleEmail does not match verified Google token email", 401);
    }

    const providerSubject = sanitizeProviderSubject(verified.sub, 256);
    return {
      userId: normalizeGoogleUserId(providerSubject),
      provider: "google_oidc_verified",
      providerSubject,
      providerVerified: true,
      identityClass: "provider_verified",
      providerEmail: verified.email || null,
      providerEmailVerified: Boolean(verified.emailVerified)
    };
  }

  if (!allowUnverifiedGoogle) {
    throw new ApiError("UNAUTHENTICATED", "Unverified Google bridge input is disabled; send googleIdToken", 401);
  }

  const unverifiedSubject = sanitizeProviderSubject(input.googleSub || input.googleEmail, 256);
  return {
    userId: normalizeGoogleUserId(unverifiedSubject),
    provider: "google_bridge_unverified",
    providerSubject: unverifiedSubject,
    providerVerified: false,
    identityClass: "provider_unverified"
  };
}

module.exports = {
  defaultGoogleIdentityVerifier,
  resolveAuthBridgeIdentity,
  normalizeGoogleUserId
};
