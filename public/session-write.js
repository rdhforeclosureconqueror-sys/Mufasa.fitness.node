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
      commandUrl,
      getUserId,
      getAuthToken,
      repDebounceMs = 450,
      logger = console,
      observabilityStorageKey = "maatWriteObservabilityV1",
      onObservabilityUpdate
    } = options || {};

    if (!baseUrl) throw new Error("baseUrl_required");
    if (!commandUrl) throw new Error("commandUrl_required");

    let pendingRep = null;
    let repTimer = null;
    let repInFlight = false;
    const routeActions = ["profile", "session_start", "rep_update", "session_complete", "ohsa"];
    const observability = {
      explicitSuccess: Object.fromEntries(routeActions.map((a) => [a, 0])),
      fallbackToLegacy: Object.fromEntries(routeActions.map((a) => [a, 0])),
      lastFallback: null,
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
      observability.lastFallback = {
        action,
        reason,
        status: err?.status ?? null,
        code: err?.code || null,
        at: new Date().toISOString()
      };
      persistObservability();
      return reason;
    }

    function getObservabilitySnapshot() {
      return JSON.parse(JSON.stringify(observability));
    }

    function getWriteModeStatus() {
      const token = getAuthToken?.();
      const fallbackTotal = Object.values(observability.fallbackToLegacy).reduce((sum, count) => sum + count, 0);
      if (!token) {
        return { mode: "local_fallback", label: "Local fallback", fallbackTotal, lastFallback: observability.lastFallback };
      }
      if (fallbackTotal > 0) {
        return { mode: "degraded_fallback", label: "Degraded (legacy fallback active)", fallbackTotal, lastFallback: observability.lastFallback };
      }
      return { mode: "explicit_api", label: "Backend synced", fallbackTotal, lastFallback: observability.lastFallback };
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

    function sendLegacyCommand(command, payload) {
      const fallbackReason = payload?._fallbackReason || "unspecified";
      return fetch(commandUrl, {
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
    }

    async function startSession(payload) {
      try {
        await postJSON(`${baseUrl}/api/sessions`, payload, true);
        trackExplicitSuccess("session_start");
      } catch (err) {
        logger.warn("Session start API unavailable; using /command fallback.", err);
        const reason = trackFallback("session_start", err);
        await sendLegacyCommand("fitness.startSession", { ...payload, _fallbackReason: reason });
      }
    }

    async function completeSession(sessionId, payload) {
      if (!sessionId) return;
      try {
        await postJSON(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/complete`, payload, true);
        trackExplicitSuccess("session_complete");
      } catch (err) {
        logger.warn("Session complete API unavailable; using /command fallback.", err);
        const reason = trackFallback("session_complete", err);
        await sendLegacyCommand("fitness.endSession", { sessionId, ...payload, _fallbackReason: reason });
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
        await sendLegacyCommand("fitness.repUpdate", { ...repPayload, _fallbackReason: reason });
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
