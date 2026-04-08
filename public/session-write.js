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
      logger = console
    } = options || {};

    if (!baseUrl) throw new Error("baseUrl_required");
    if (!commandUrl) throw new Error("commandUrl_required");

    let pendingRep = null;
    let repTimer = null;
    let repInFlight = false;

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
      return fetch(commandUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(getAuthToken?.() ? { authorization: `Bearer ${getAuthToken()}` } : {})
        },
        body: JSON.stringify({
          domain: "fitness",
          command,
          userId: getUserId?.() || "guest",
          payload: {
            ...payload,
            ts: payload?.ts || Date.now()
          }
        })
      });
    }

    async function startSession(payload) {
      try {
        await postJSON(`${baseUrl}/api/sessions`, payload, true);
      } catch (err) {
        logger.warn("Session start API unavailable; using /command fallback.", err);
        await sendLegacyCommand("fitness.startSession", payload);
      }
    }

    async function completeSession(sessionId, payload) {
      if (!sessionId) return;
      try {
        await postJSON(`${baseUrl}/api/sessions/${encodeURIComponent(sessionId)}/complete`, payload, true);
      } catch (err) {
        logger.warn("Session complete API unavailable; using /command fallback.", err);
        await sendLegacyCommand("fitness.endSession", { sessionId, ...payload });
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
      } catch (err) {
        logger.warn("Rep update API unavailable; using /command fallback.", err);
        await sendLegacyCommand("fitness.repUpdate", repPayload);
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
      _flushRepQueueForTests: flushRepQueue
    };
  }

  return {
    createSessionWriteClient
  };
});
