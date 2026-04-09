"use strict";

const ROUTE_ACTIONS = Object.freeze([
  "profile",
  "session_start",
  "rep_update",
  "session_complete",
  "ohsa"
]);

function createActionCounts() {
  return ROUTE_ACTIONS.reduce((acc, action) => {
    acc[action] = 0;
    return acc;
  }, {});
}

function mapRouteAction(req) {
  const method = (req.method || "").toUpperCase();
  const path = req.path || "";

  if (method === "PUT" && path === "/api/me/profile") return "profile";
  if (method === "POST" && path === "/api/sessions") return "session_start";
  if (method === "POST" && /^\/api\/sessions\/[^/]+\/reps$/.test(path)) return "rep_update";
  if (method === "POST" && /^\/api\/sessions\/[^/]+\/complete$/.test(path)) return "session_complete";
  if (method === "POST" && path === "/api/ohsa") return "ohsa";

  if (method === "POST" && path === "/command") {
    const command = req.body?.command;
    if (command === "fitness.saveProfile") return "profile";
    if (command === "fitness.startSession") return "session_start";
    if (command === "fitness.repUpdate") return "rep_update";
    if (command === "fitness.endSession") return "session_complete";
    if (command === "fitness.ohsaResult") return "ohsa";
  }

  return null;
}

function sanitizeReason(raw) {
  if (!raw) return "unspecified";
  const reason = String(raw).toLowerCase();
  if (reason.includes("auth") || reason.includes("unauthor")) return "auth";
  if (reason.includes("timeout")) return "timeout";
  if (reason.includes("network") || reason.includes("fetch") || reason.includes("offline")) return "network";
  if (reason.includes("validation")) return "validation";
  if (reason.includes("request_failed") || reason.includes("5")) return "server_error";
  return "other";
}

function createWriteObservability() {
  const state = {
    explicit: {
      success: createActionCounts(),
      failure: createActionCounts()
    },
    legacyFallback: {
      total: 0,
      byAction: createActionCounts(),
      lastReason: null
    },
    enforcement: {
      enabledByAction: createActionCounts(),
      blocked: {
        total: 0,
        byAction: createActionCounts(),
        lastBlocked: null
      }
    },
    authorization: {
      config: null,
      adminOpsChecks: {
        total: 0,
        allowed: 0,
        denied: 0,
        byPermission: {},
        lastDecision: null,
        bootstrapSuperAdminHits: 0
      }
    },
    alerts: {
      total: 0,
      byType: {},
      lastEvent: null
    },
    lastUpdatedAt: null
  };

  function stamp() {
    state.lastUpdatedAt = new Date().toISOString();
  }

  function trackExplicit(action, success) {
    if (!action || !(action in state.explicit.success)) return;
    if (success) state.explicit.success[action] += 1;
    else state.explicit.failure[action] += 1;
    stamp();
  }

  function trackLegacyFallback(action, reason) {
    if (!action || !(action in state.legacyFallback.byAction)) return;
    state.legacyFallback.total += 1;
    state.legacyFallback.byAction[action] += 1;
    state.legacyFallback.lastReason = {
      action,
      reason: sanitizeReason(reason),
      at: new Date().toISOString()
    };
    stamp();
  }

  function setEnforcementState(enabledByAction = {}) {
    for (const action of ROUTE_ACTIONS) {
      state.enforcement.enabledByAction[action] = Boolean(enabledByAction[action]);
    }
    stamp();
  }

  function setAuthorizationState(configSummary) {
    state.authorization.config = configSummary || null;
    stamp();
  }

  function trackAdminOpsAuthorization({ permission, allowed, role, isBootstrapSuperAdmin = false, reason = "unknown" }) {
    state.authorization.adminOpsChecks.total += 1;
    if (allowed) state.authorization.adminOpsChecks.allowed += 1;
    else state.authorization.adminOpsChecks.denied += 1;
    const key = permission || "unknown";
    state.authorization.adminOpsChecks.byPermission[key] = state.authorization.adminOpsChecks.byPermission[key] || { allowed: 0, denied: 0 };
    if (allowed) state.authorization.adminOpsChecks.byPermission[key].allowed += 1;
    else state.authorization.adminOpsChecks.byPermission[key].denied += 1;
    if (isBootstrapSuperAdmin) state.authorization.adminOpsChecks.bootstrapSuperAdminHits += 1;

    state.authorization.adminOpsChecks.lastDecision = {
      permission: key,
      allowed,
      role: role || "user",
      isBootstrapSuperAdmin: Boolean(isBootstrapSuperAdmin),
      reason: sanitizeReason(reason),
      at: new Date().toISOString()
    };
    stamp();
  }

  function trackLegacyFallbackBlocked(action, reason = "fallback_blocked") {
    if (!action || !(action in state.enforcement.blocked.byAction)) return;
    state.enforcement.blocked.total += 1;
    state.enforcement.blocked.byAction[action] += 1;
    state.enforcement.blocked.lastBlocked = {
      action,
      reason: sanitizeReason(reason),
      at: new Date().toISOString()
    };
    stamp();
  }


  function trackControlPlaneAlert(type, details = {}) {
    const key = type || "unknown";
    state.alerts.total += 1;
    state.alerts.byType[key] = (state.alerts.byType[key] || 0) + 1;
    state.alerts.lastEvent = {
      type: key,
      details,
      at: new Date().toISOString()
    };
    stamp();
  }

  function snapshot() {
    return JSON.parse(JSON.stringify(state));
  }

  return {
    mapRouteAction,
    sanitizeReason,
    trackExplicit,
    trackLegacyFallback,
    setEnforcementState,
    setAuthorizationState,
    trackAdminOpsAuthorization,
    trackLegacyFallbackBlocked,
    trackControlPlaneAlert,
    snapshot
  };
}

module.exports = {
  ROUTE_ACTIONS,
  createWriteObservability,
  mapRouteAction,
  sanitizeReason
};
