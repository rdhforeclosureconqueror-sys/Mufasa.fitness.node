/* =========================================================
   dashboard-runtime.js — canonical dashboard/progress/retention bridge
========================================================= */
(function () {
  "use strict";

  const RUNTIME_TAG = "[DASHBOARD_RUNTIME]";
  const PROGRESS_TAG = "[PROGRESS_RUNTIME]";
  const RETENTION_TAG = "[RETENTION_RUNTIME]";
  const FALLBACK_NODE_BASE_URL = "https://mufasa-fitness-node.onrender.com";
  const state = {
    completionKeys: new Set(),
    completionPromises: new Map(),
    lastHistory: null,
    lastProgressDashboard: null,
    latestReward: null,
    checkIns: null,
    errors: []
  };

  function getBaseUrl() {
    const configured = window.localStorage?.getItem("maatNodeBaseUrl")
      || window.MAAT_NODE_BASE_URL
      || FALLBACK_NODE_BASE_URL;
    return String(configured || "").replace(/\/$/, "");
  }

  function getBackendClient() {
    return window.MufasaBackendRead?.createClient?.({ baseUrl: getBaseUrl(), storagePrefix: "maat" }) || null;
  }

  function getAuthToken() {
    const appToken = window.APP_AUTH?.token;
    if (appToken && String(appToken).trim()) return String(appToken).trim();
    return getBackendClient()?.getAuthToken?.() || null;
  }

  function routeError(path, status, payload) {
    const message = payload?.error?.message || payload?.error || `request_failed_${status}`;
    const err = new Error(`${path}: ${message}`);
    err.route = path;
    err.status = status;
    err.payload = payload;
    return err;
  }

  function renderVisibleError(err) {
    const message = err?.message || String(err || "unknown_error");
    state.errors.push({ message, at: new Date().toISOString() });
    console.error(RUNTIME_TAG, message, err);
    const targets = [
      document.getElementById("dashboardRuntimeStatus"),
      document.getElementById("diagnosticStatus"),
      document.getElementById("retentionFlowStatus"),
      document.getElementById("runtimeErrorStatus")
    ].filter(Boolean);
    targets.forEach((target) => {
      const previous = target.textContent && target.textContent.trim() ? `${target.textContent.trim()}\n` : "";
      target.textContent = `${previous}⚠️ ${message}`.trim();
      target.classList?.add?.("status-bad");
    });
    try {
      window.dispatchEvent(new CustomEvent("dashboard-runtime:error", { detail: { message, error: err } }));
    } catch (_) {}
  }

  async function authedRequest(path, { method = "GET", body = null, tag = RUNTIME_TAG } = {}) {
    const token = getAuthToken();
    if (!token) throw routeError(path, "missing_auth_token", { error: { message: "missing_auth_token" } });
    console.log(tag, "route", method, path);
    const res = await fetch(`${getBaseUrl()}${path}`, {
      method,
      headers: {
        authorization: `Bearer ${token}`,
        "content-type": "application/json"
      },
      body: body ? JSON.stringify(body) : undefined
    });
    const payload = await res.json().catch(() => null);
    if (!res.ok || !payload?.ok) throw routeError(path, res.status, payload);
    return payload.data || {};
  }

  async function refreshHistory({ limit = 25, visibleErrors = true } = {}) {
    try {
      const history = await authedRequest(`/api/me/history?limit=${encodeURIComponent(limit)}`, { tag: RUNTIME_TAG });
      state.lastHistory = history;
      try { window.dispatchEvent(new CustomEvent("dashboard:history-refreshed", { detail: history })); } catch (_) {}
      return history;
    } catch (err) {
      if (visibleErrors) renderVisibleError(err);
      throw err;
    }
  }

  async function refreshProgressDashboard({ visibleErrors = true } = {}) {
    try {
      const dashboard = await authedRequest("/api/progress/dashboard", { tag: PROGRESS_TAG });
      state.lastProgressDashboard = dashboard;
      try { window.dispatchEvent(new CustomEvent("progress:dashboard-refreshed", { detail: dashboard })); } catch (_) {}
      return dashboard;
    } catch (err) {
      if (visibleErrors) renderVisibleError(err);
      throw err;
    }
  }

  async function refreshRewardAndCheckIns({ visibleErrors = true } = {}) {
    const refreshes = [
      authedRequest("/api/workouts/reward/latest", { tag: RETENTION_TAG }).then((data) => { state.latestReward = data; return data; }),
      authedRequest("/api/check-ins", { tag: RETENTION_TAG }).then((data) => { state.checkIns = data; return data; })
    ];
    const settled = await Promise.allSettled(refreshes);
    const failures = settled.filter((result) => result.status === "rejected").map((result) => result.reason);
    if (failures.length && visibleErrors) failures.forEach(renderVisibleError);
    return {
      reward: settled[0].status === "fulfilled" ? settled[0].value : null,
      checkIns: settled[1].status === "fulfilled" ? settled[1].value : null,
      errors: failures
    };
  }

  async function getCurrentProgram() {
    const current = await authedRequest("/api/programs/current", { tag: RETENTION_TAG });
    return current.program || current;
  }

  function completionKey(detail) {
    return [detail?.sessionId || "no_session", detail?.workoutId || detail?.scheduledWorkoutId || "no_workout"].join("::");
  }

  function buildTrackingPayload(detail, program) {
    const workoutId = detail?.workoutId || detail?.scheduledWorkoutId;
    const programId = program?.programId || detail?.programId;
    if (!workoutId) throw new Error("/api/workouts/track: missing canonical workout id on workout:completed event");
    if (!programId) throw new Error("/api/workouts/track: missing programId for canonical completion tracking");
    return {
      programId,
      workoutId,
      sessionId: detail?.sessionId || null,
      exercisesCompleted: Array.isArray(detail?.completedExercises) ? detail.completedExercises : [],
      reps: Number(detail?.repsCompleted || detail?.reps || 0),
      sets: Number(detail?.completedSets || detail?.sets || 0),
      formScore: detail?.formScoreSummary ?? null,
      sessionDurationMinutes: Math.max(1, Math.round(Number(detail?.durationSeconds || 0) / 60)),
      notes: detail?.notes || null,
      completedAt: detail?.completedAt || new Date().toISOString(),
      completionStatus: "completed"
    };
  }

  async function propagateCompletion(detail, options = {}) {
    const key = completionKey(detail || {});
    if (state.completionPromises.has(key)) {
      console.info(RETENTION_TAG, "duplicate completion joined", key);
      return state.completionPromises.get(key);
    }
    state.completionKeys.add(key);
    const completionPromise = (async () => {
      console.log(RETENTION_TAG, "propagating completion", { key, sessionId: detail?.sessionId || null, workoutId: detail?.workoutId || detail?.scheduledWorkoutId || null });
      try {
        const program = options.program || options.currentProgram || await getCurrentProgram();
        const trackingPayload = buildTrackingPayload(detail || {}, program || {});
        const tracked = await authedRequest("/api/workouts/track", {
          method: "POST",
          body: trackingPayload,
          tag: RETENTION_TAG
        });
        const [history, progress, retentionRefresh] = await Promise.all([
          refreshHistory({ visibleErrors: true }),
          refreshProgressDashboard({ visibleErrors: true }),
          refreshRewardAndCheckIns({ visibleErrors: true })
        ]);
        window.__liveWorkoutBreakpoints?.markPass?.("dashboard-propagated", { key, workoutId: detail?.workoutId || detail?.scheduledWorkoutId || null });
        try {
          window.dispatchEvent(new CustomEvent("retention:completion-propagated", {
            detail: { key, tracked, history, progress, reward: retentionRefresh.reward, checkIns: retentionRefresh.checkIns }
          }));
        } catch (_) {}
        return { key, tracked, history, progress, retentionRefresh };
      } catch (err) {
        window.__liveWorkoutBreakpoints?.markFail?.("dashboard-propagated", err, { key, workoutId: detail?.workoutId || detail?.scheduledWorkoutId || null });
        renderVisibleError(err);
        state.completionKeys.delete(key);
        state.completionPromises.delete(key);
        throw err;
      }
    })();
    state.completionPromises.set(key, completionPromise);
    return completionPromise;
  }

  async function refreshAll(reason = "manual") {
    console.log(RUNTIME_TAG, "refreshAll", reason);
    const [history, progress, retention] = await Promise.allSettled([
      refreshHistory({ visibleErrors: true }),
      refreshProgressDashboard({ visibleErrors: true }),
      refreshRewardAndCheckIns({ visibleErrors: true })
    ]);
    return { history, progress, retention };
  }

  window.addEventListener("workout:completed", (event) => {
    const detail = event?.detail || {};
    if (!detail?.scheduledWorkoutId && !detail?.workoutId) return;
    propagateCompletion(detail).catch(() => {});
  });

  window.MufasaDashboardRuntime = {
    authedRequest,
    refreshHistory,
    refreshProgressDashboard,
    refreshRewardAndCheckIns,
    propagateCompletion,
    refreshAll,
    renderVisibleError,
    getState: () => ({
      lastHistory: state.lastHistory,
      lastProgressDashboard: state.lastProgressDashboard,
      latestReward: state.latestReward,
      checkIns: state.checkIns,
      errors: state.errors.slice()
    })
  };

  console.log(RUNTIME_TAG, "ready", { baseUrl: getBaseUrl() });
})();
