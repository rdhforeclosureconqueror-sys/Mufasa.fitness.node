/* =========================================================
   backend-read.js — minimal backend-authoritative read helpers
   Primary: /api/me/profile and /api/me/history with safe fallbacks.
========================================================= */
(function () {
  "use strict";

  function readJSON(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : fallback;
    } catch {
      return fallback;
    }
  }

  function writeJSON(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch {
      return false;
    }
  }

  function resolveBaseUrl(baseUrl) {
    return (baseUrl || "").replace(/\/$/, "");
  }

  function createClient({ baseUrl = "", storagePrefix = "maat" } = {}) {
    const apiBase = resolveBaseUrl(baseUrl);
    const tokenKey = `${storagePrefix}AuthToken`;

    function mergeAuthDebug(patch) {
      if (typeof window === "undefined") return;
      const current = window.__MAAT_AUTH_DEBUG && typeof window.__MAAT_AUTH_DEBUG === "object"
        ? window.__MAAT_AUTH_DEBUG
        : {};
      window.__MAAT_AUTH_DEBUG = { ...current, ...patch };
      if (window.__MAAT_AUTH_DEBUG.googleSubPresent == null) {
        window.__MAAT_AUTH_DEBUG.googleSubPresent = Boolean(window.__MAAT_AUTH_DEBUG.googleSub);
      }
    }

    function getAuthToken() {
      const token = localStorage.getItem(tokenKey);
      return token && token.trim() ? token : null;
    }

    function setAuthToken(token) {
      if (token && token.trim()) {
        localStorage.setItem(tokenKey, token.trim());
      }
    }

    function clearAuthToken() {
      localStorage.removeItem(tokenKey);
    }

    function sanitizeManualUserId(value) {
      return String(value || "")
        .trim()
        .toLowerCase()
        .replace(/[^a-z0-9._-]+/g, "_")
        .replace(/^_+|_+$/g, "")
        .slice(0, 128);
    }

    function extractBridgeFailureReason(error) {
      return error?.payload?.error?.details?.reason
        || error?.payload?.error?.details?.diagnostics?.rejectionReason
        || error?.payload?.error?.code
        || error?.code
        || "AUTH_BRIDGE_FAILED";
    }

    async function fetchJSON(path, { method = "GET", body = undefined, auth = false } = {}) {
      const headers = { "content-type": "application/json" };
      if (auth) {
        const token = getAuthToken();
        if (!token) {
          const err = new Error("missing_auth_token");
          err.code = "MISSING_TOKEN";
          throw err;
        }
        headers.authorization = `Bearer ${token}`;
      }

      const res = await fetch(`${apiBase}${path}`, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined
      });

      let payload = null;
      try {
        payload = await res.json();
      } catch {
        payload = null;
      }

      if (res.status === 401 || res.status === 403) {
        const err = new Error("unauthorized");
        err.code = "UNAUTHORIZED";
        err.status = res.status;
        err.payload = payload;
        throw err;
      }

      if (!res.ok || !payload?.ok) {
        const err = new Error(payload?.error?.message || payload?.error || `request_failed_${res.status}`);
        err.code = "REQUEST_FAILED";
        err.status = res.status;
        err.payload = payload;
        throw err;
      }

      return payload.data;
    }

    async function ensureAuthToken(claims, options = {}) {
      const existingToken = getAuthToken();
      const authProvider = String(claims?.authProvider || "").toLowerCase();
      const bridgeReason = options?.bridgeReason || "unspecified";
      const tokenRefreshRequired = Boolean(options?.tokenRefreshRequired);
      if (authProvider === "google" && !claims?.googleIdToken) {
        mergeAuthDebug({
          authProvider,
          claimPath: "missing_google_token",
          lastBridgePayloadKeys: [],
          tokenExists: Boolean(existingToken),
          tokenSource: "google_profile_without_googleIdToken",
          lastBridgeStatus: "skipped",
          lastBridgeErrorCode: "GOOGLE_TOKEN_MISSING",
          lastBridgeTrustMode: null
        });
        const err = new Error("google_token_missing");
        err.code = "GOOGLE_TOKEN_MISSING";
        throw err;
      }

      const body = {};
      if (claims?.googleIdToken) {
        body.googleIdToken = claims.googleIdToken;
        body.provider = "google";
        body.trustMode = "google_verified";
        if (claims?.googleEmail) body.googleEmail = claims.googleEmail;
      } else if (claims?.googleSub && authProvider !== "google") {
        body.googleSub = claims.googleSub;
        body.provider = "google";
        body.trustMode = "provider_unverified";
      } else if (claims?.googleEmail && authProvider !== "google") {
        body.googleEmail = claims.googleEmail;
        body.provider = "google";
        body.trustMode = "provider_unverified";
      } else if (claims?.manualUserId) {
        const sanitized = sanitizeManualUserId(claims.manualUserId);
        if (sanitized) {
          body.userId = sanitized;
          body.provider = "manual";
          body.trustMode = "manual_unverified";
        }
      }

      if (!body.userId && !body.googleSub && !body.googleEmail && !body.googleIdToken) {
        if (existingToken) return existingToken;
        const err = new Error("missing_claims");
        err.code = "MISSING_CLAIMS";
        throw err;
      }
      const claimPath = body.googleIdToken
        ? "googleIdToken"
        : (body.googleSub ? "googleSub" : (body.googleEmail ? "googleEmail" : "manualUserId"));
      console.log("[bridge] claimPath:", claimPath);
      const payloadKeys = Object.keys(body);
      console.info("[auth-bridge] bridge payload (sanitized)", {
        payloadKeys,
        claimPath,
        bridgeReason,
        tokenRefreshRequired,
        hasGoogleIdToken: Boolean(body.googleIdToken),
        googleIdTokenLength: body.googleIdToken ? String(body.googleIdToken).length : 0,
        googleIdTokenPresent: Boolean(body.googleIdToken),
        fallbackUsed: !body.googleIdToken,
        fallbackClaims: {
          googleEmail: Boolean(body.googleEmail),
          googleSub: Boolean(body.googleSub),
          manualUserId: Boolean(body.userId)
        }
      });
      mergeAuthDebug({
        claimPath,
        lastBridgePayloadKeys: payloadKeys,
        tokenExists: Boolean(existingToken),
        tokenSource: body.googleIdToken ? "bridge_payload.googleIdToken" : "bridge_payload.fallback_claims",
        lastBridgeStatus: "requesting",
        lastBridgeErrorCode: null
      });

      try {
        const data = await fetchJSON("/api/auth/bridge", { method: "POST", body, auth: false });
        const token = data?.auth?.token;
        if (!token) {
          const err = new Error("auth_bridge_missing_token");
          err.code = "AUTH_BRIDGE_FAILED";
          throw err;
        }
        setAuthToken(token);
        mergeAuthDebug({
          tokenExists: true,
          tokenSource: "bridge_response.auth.token",
          authBridgeStatus: 201,
          authBridgeFailureReason: null,
          lastBridgeStatus: "success",
          lastBridgeErrorCode: null,
          lastBridgeTrustMode: data?.diagnostics?.effectiveTrustMode || null
        });
        return token;
      } catch (error) {
        const bridgeFailureReason = extractBridgeFailureReason(error);
        mergeAuthDebug({
          authBridgeStatus: error?.status || null,
          authBridgeFailureReason: bridgeFailureReason,
          lastBridgeStatus: "error",
          lastBridgeErrorCode: error?.payload?.error?.code || error?.code || "AUTH_BRIDGE_FAILED",
          lastBridgeTrustMode: error?.payload?.error?.details?.diagnostics?.effectiveTrustMode || null
        });
        if (existingToken) return existingToken;
        throw error;
      }
    }

    function normalizeProfile(profile, fallback = {}) {
      const fallbackAvatar = fallback?.avatar && typeof fallback.avatar === "object" ? fallback.avatar : null;
      return {
        name: fallback.name || "Athlete",
        email: fallback.email || null,
        picture: fallback.picture || null,
        age: profile?.age ?? null,
        weight_lbs: profile?.weight_kg != null ? Math.round(profile.weight_kg * 2.20462) : (fallback.weight_lbs ?? null),
        height: profile?.height_cm ? `${profile.height_cm} cm` : (fallback.height ?? null),
        injuries: Array.isArray(profile?.injuries) ? profile.injuries : (fallback.injuries || []),
        history: fallback.history || {},
        goals: {
          primary: profile?.goals?.primary_goal || fallback?.goals?.primary || "Build full-body strength and mobility",
          frequency_days_per_week: profile?.goals?.frequency_days_per_week || fallback?.goals?.frequency_days_per_week || 3,
          focus: fallback?.goals?.focus || profile?.goals?.notes || null,
          notes: profile?.goals?.notes || null
        },
        notes: profile?.notes || null,
        avatar: profile?.avatar && typeof profile.avatar === "object" ? {
          avatarProvider: profile.avatar.avatarProvider || "custom",
          avatarModelUrl: profile.avatar.avatarModelUrl || null,
          avatarThumbnailUrl: profile.avatar.avatarThumbnailUrl || null,
          avatarUpdatedAt: profile.avatar.avatarUpdatedAt || null
        } : fallbackAvatar
      };
    }

    async function fetchProfile() {
      return fetchJSON("/api/me/profile", { auth: true });
    }

    async function fetchHistory(limit = 25) {
      return fetchJSON(`/api/me/history?limit=${encodeURIComponent(limit)}`, { auth: true });
    }

    return {
      readJSON,
      writeJSON,
      getAuthToken,
      setAuthToken,
      clearAuthToken,
      ensureAuthToken,
      fetchProfile,
      fetchHistory,
      normalizeProfile
    };
  }

  window.MufasaBackendRead = {
    createClient,
    readJSON,
    writeJSON
  };
})();
