(function (root, factory) {
  if (typeof module === "object" && module.exports) {
    module.exports = factory();
    return;
  }
  root.MufasaSessionWrite = factory();
})(typeof globalThis !== "undefined" ? globalThis : window, function () {
  "use strict";

  function createSessionWriteClient(options) {
    const {
      baseUrl,
      getUserId,
      getAuthToken,
      repDebounceMs = 450,
      logger = console,
      observabilityStorageKey = "maatWriteObservabilityV1",
      onObservabilityUpdate,
      onFallbackBlocked,
      onFallbackUsed,
      onSessionSaveSuccess,
      onSessionSaveFailed,
      legacyFallbackRequireExplicitActions = false,
      legacyFallbackAllowedActions = []
    } = options || {};

    if (!baseUrl) throw new Error("baseUrl_required");

    let pendingRep = null;
    let repTimer = null;
    let repInFlight = false;
    const routeActions = ["profile", "session_start", "rep_update", "session_complete", "ohsa"];
    const allowedFallbackActionSet = new Set(
      Array.isArray(legacyFallbackAllowedActions)
        ? legacyFallbackAllowedActions.map((action) => String(action || "").trim()).filter(Boolean)
        : []
    );
    const observability = {
      explicitSuccess: Object.fromEntries(routeActions.map((a) => [a, 0])),
      fallbackToLegacy: Object.fromEntries(routeActions.map((a) => [a, 0])),
      blockedFallback: Object.fromEntries(routeActions.map((a) => [a, 0])),
      lastFallback: null,
      lastBlockedFallback: null,
      updatedAt: null
    };

    function persistObservability() {
      observability.updatedAt = new Date().toISOString();
      if (typeof localStorage !== "undefined") {
        try { localStorage.setItem(observabilityStorageKey, JSON.stringify(observability)); } catch (_) {}
      }
      if (typeof onObservabilityUpdate === "function") {
        onObservabilityUpdate(getObservabilitySnapshot());
      }
    }

    function classifyFallbackReason(err) {
      if (!err) return "unknown";
      if (err.code === "MISSING_AUTH_TOKEN") return "missing_auth_token";
      if (err.code === "UNAUTHORIZED") return "unauthorized";
      if (err.code === "REQUEST_FAILED") {
        if (err.status >= 500) return "explicit_api_5xx";
        if (err.status >= 400) return "explicit_api_4xx";
      }
      if (err.name === "TypeError") return "network_error";
      return "request_error";
    }

    function trackExplicitSuccess(action) {
      if (!(action in observability.explicitSuccess)) return;
      observability.explicitSuccess[action] += 1;
      persistObservability();
    }

    function trackFallback(action, err) {
      if (!(action in observability.fallbackToLegacy)) return;
      const reason = classifyFallbackReason(err);
      observability.fallbackToLegacy[action] += 1;
      const fallbackNotice = {
        action,
        reason,
        status: err?.status ?? null,
        code: err?.code || null,
        at: new Date().toISOString()
      };
      observability.lastFallback = fallbackNotice;
      persistObservability();
      if (typeof onFallbackUsed === "function") {
        onFallbackUsed({ ...fallbackNotice });
      }
      return reason;
    }

    function trackFallbackBlocked(action, err) {
      if (!(action in observability.blockedFallback)) return;
      observability.blockedFallback[action] += 1;
      observability.lastBlockedFallback = {
        action,
        reason: err?.payload?.error?.code || err?.code || "LEGACY_FALLBACK_BLOCKED",
        status: err?.status ?? null,
        at: new Date().toISOString()
      };
      persistObservability();
    }

    function getObservabilitySnapshot() {
      return JSON.parse(JSON.stringify(observability));
    }

    function getWriteModeStatus() {
      const token = getAuthToken?.();
      const fallbackTotal = Object.values(observability.fallbackToLegacy).reduce((sum, count) => sum + count, 0);
      const blockedTotal = Object.values(observability.blockedFallback).reduce((sum, count) => sum + count, 0);
      if (!token) {
        return { mode: "local_fallback", label: "Local fallback", fallbackTotal, blockedTotal, lastFallback: observability.lastFallback, lastBlockedFallback: observability.lastBlockedFallback };
      }
      if (fallbackTotal > 0) {
        return { mode: "degraded_fallback", label: "Degraded (legacy fallback active)", fallbackTotal, blockedTotal, lastFallback: observability.lastFallback, lastBlockedFallback: observability.lastBlockedFallback };
      }
      return { mode: "explicit_api", label: "Backend synced", fallbackTotal, blockedTotal, lastFallback: observability.lastFallback, lastBlockedFallback: observability.lastBlockedFallback };
    }

    function isFallbackAllowedForAction(action) {
      if (!legacyFallbackRequireExplicitActions) return true;
      return allowedFallbackActionSet.has(action);
    }

    function makeFallbackGateError(action, err, reason) {
      const gateErr = new Error(`fallback_not_allowed_for_${action}`);
      gateErr.code = "LEGACY_FALLBACK_REQUIRES_EXPLICIT_ACTION";
      gateErr.action = action;
      gateErr.reason = reason || classifyFallbackReason(err);
      gateErr.cause = err;
      return gateErr;
    }

    async function postJSON(url, body, authRequired) {
      const token = getAuthToken?.();
      if (authRequired && !token) {
        const err = new Error("missing_auth_token");
        err.code = "MISSING_AUTH_TOKEN";
        throw err;
      }

      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { authorization: `Bearer ${token}` } : {})
        },
        body: JSON.stringify(body || {})
      });

      let payload = null;
      try {
        payload = await res.json();
      } catch (_) {}

      if (res.status === 401 || res.status === 403) {
        const err = new Error("unauthorized");
        err.code = "UNAUTHORIZED";
        err.status = res.status;
        err.payload = payload;
        throw err;
      }

      if (!res.ok || (payload && payload.ok === false)) {
        const err = new Error(payload?.error?.message || payload?.error || `request_failed_${res.status}`);
        err.code = "REQUEST_FAILED";
        err.status = res.status;
        err.payload = payload;
        throw err;
      }

      return payload?.data || null;
    }

    async function sendLegacyCommand(command, payload) {
      const fallbackReason = payload?._fallbackReason || "unspecified";
      const res = await fetch(commandUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-fallback-reason": fallbackReason,
          ...(getAuthToken?.() ? { authorization: `Bearer ${getAuthToken()}` } : {})
        },
        body: JSON.stringify({
          domain: "fitness",
          command,
          userId: getUserId?.() || "guest",
          payload: {
            ...payload,
            _fallback: {
              reason: fallbackReason,
              at: new Date().toISOString()
            },
            ts: payload?.ts || Date.now()
          }
        })
      });

      let body = null;
      try {
        body = await res.json();
      } catch (_) {}
      if (!res.ok || body?.ok === false) {
        const err = new Error(body?.error?.message || body?.error || `legacy_request_failed_${res.status}`);
        err.code = body?.error?.code || "LEGACY_REQUEST_FAILED";
        err.status = res.status;
        err.payload = body;
        throw err;
      }
      return body;
    }

    function maybeHandleBlockedFallback(action, err) {
      if (!(err?.code === "LEGACY_FALLBACK_BLOCKED" || err?.payload?.error?.code === "LEGACY_FALLBACK_BLOCKED")) return false;
      trackFallbackBlocked(action, err);
      const friendlyAction = action.replace("_", " ");
      const message = `Unable to save ${friendlyAction} via legacy fallback. Please reconnect and retry.`;
      const notice = {
        action,
        message,
        errorCode: "LEGACY_FALLBACK_BLOCKED",
        adminAccessUnaffected: true
      };
      if (typeof onFallbackBlocked === "function") {
        onFallbackBlocked(notice);
      }
      if (typeof window !== "undefined" && typeof window.dispatchEvent === "function") {
        try {
          window.dispatchEvent(new CustomEvent("mufasa:write-fallback-blocked", { detail: notice }));
        } catch (_) {}
      }
      logger.warn(`${message} Admin access remains available to authorized operators.`, err);
      return true;
    }

    async function startSession(payload) {
      try {
        await postJSON(`${baseUrl}/api/sessions`, payload, true);
        trackExplicitSuccess("session_start");
        if (typeof onSessionSaveSuccess === "function") {
          onSessionSaveSuccess({ action: "session_start", mode: "explicit_api" });
        }
      } catch (err) {
        const reason = trackFallback("session_start", err);
        throw err;
        if (!isFallbackAllowedForAction("session_start")) {
          const gateErr = makeFallbackGateError("session_start", err, reason);
          if (typeof onSessionSaveFailed === "function") {
            onSessionSaveFailed({ action: "session_start", mode: "explicit_api", reason, error: gateErr });
          }
          logger.warn("Session start explicit API failed and fallback is blocked by explicit-action gate.", {
            action: "session_start",
            userId: getUserId?.() || "guest",
            reason
          });
          throw gateErr;
        }
        logger.warn("Session start API unavailable; using /command fallback.", {
          action: "session_start",
          userId: getUserId?.() || "guest",
          reason
        });
        try {
          await sendLegacyCommand("fitness.startSession", { ...payload, _fallbackReason: reason });
          if (typeof onSessionSaveSuccess === "function") {
            onSessionSaveSuccess({ action: "session_start", mode: "legacy_fallback", reason });
          }
        } catch (fallbackErr) {
          if (!maybeHandleBlockedFallback("session_start", fallbackErr)) {
            if (typeof onSessionSaveFailed === "function") {
              onSessionSaveFailed({ action: "session_start", mode: "legacy_fallback", reason, error: fallbackErr });
            }
            throw fallbackErr;
          }
        }
      }
    }

    async function completeSession(sessionId, payload) {
      if (!sessionId) return;
      try {
        await postJSON(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/complete`, payload, true);
        trackExplicitSuccess("session_complete");
        if (typeof onSessionSaveSuccess === "function") {
          onSessionSaveSuccess({ action: "session_complete", mode: "explicit_api" });
        }
      } catch (err) {
        const reason = trackFallback("session_complete", err);
        throw err;
        if (!isFallbackAllowedForAction("session_complete")) {
          const gateErr = makeFallbackGateError("session_complete", err, reason);
          if (typeof onSessionSaveFailed === "function") {
            onSessionSaveFailed({ action: "session_complete", mode: "explicit_api", reason, error: gateErr });
          }
          logger.warn("Session complete explicit API failed and fallback is blocked by explicit-action gate.", {
            action: "session_complete",
            userId: getUserId?.() || "guest",
            sessionId,
            reason
          });
          throw gateErr;
        }
        logger.warn("Session complete API unavailable; using /command fallback.", {
          action: "session_complete",
          userId: getUserId?.() || "guest",
          sessionId,
          reason
        });
        try {
          await sendLegacyCommand("fitness.endSession", { sessionId, ...payload, _fallbackReason: reason });
          if (typeof onSessionSaveSuccess === "function") {
            onSessionSaveSuccess({ action: "session_complete", mode: "legacy_fallback", reason });
          }
        } catch (fallbackErr) {
          if (!maybeHandleBlockedFallback("session_complete", fallbackErr)) {
            if (typeof onSessionSaveFailed === "function") {
              onSessionSaveFailed({ action: "session_complete", mode: "legacy_fallback", reason, error: fallbackErr });
            }
            throw fallbackErr;
          }
        }
      }
    }

    async function writeRepUpdate(repPayload) {
      const sid = repPayload?.sessionId;
      if (!sid) return;

      const explicitBody = {
        exerciseId: repPayload.exerciseId ?? null,
        repsThisSet: repPayload.repsThisSet ?? null,
        totalReps: repPayload.totalReps ?? null,
        depthScore: repPayload.depthScore ?? null,
        goodForm: repPayload.goodForm ?? null,
        ts: repPayload.ts || Date.now()
      };

      try {
        await postJSON(`${baseUrl}/api/sessions/${encodeURIComponent(sid)}/reps`, explicitBody, true);
        trackExplicitSuccess("rep_update");
      } catch (err) {
        logger.warn("Rep update API unavailable; using /command fallback.", err);
        const reason = trackFallback("rep_update", err);
        throw err;
        try {
          await sendLegacyCommand("fitness.repUpdate", { ...repPayload, _fallbackReason: reason });
        } catch (fallbackErr) {
          if (!maybeHandleBlockedFallback("rep_update", fallbackErr)) throw fallbackErr;
        }
      }
    }

    function flushRepQueue() {
      repTimer = null;
      if (!pendingRep) return;
      if (repInFlight) {
        repTimer = setTimeout(flushRepQueue, repDebounceMs);
        return;
      }

      const next = pendingRep;
      pendingRep = null;
      repInFlight = true;

      writeRepUpdate(next)
        .catch((err) => {
          logger.warn("Rep update failed", err);
        })
        .finally(() => {
          repInFlight = false;
          if (pendingRep && !repTimer) {
            repTimer = setTimeout(flushRepQueue, repDebounceMs);
          }
        });
    }

    function enqueueRepUpdate(payload) {
      pendingRep = payload;
      if (repTimer) return;
      repTimer = setTimeout(flushRepQueue, repDebounceMs);
    }

    return {
      startSession,
      completeSession,
      enqueueRepUpdate,
      trackExplicitSuccess,
      trackFallback,
      trackFallbackBlocked,
      getObservabilitySnapshot,
      getWriteModeStatus,
      _classifyFallbackReasonForTests: classifyFallbackReason,
      _flushRepQueueForTests: flushRepQueue
    };
  }

  return {
    createSessionWriteClient
  };
});
