"use strict";
(() => {
  const ADMIN_ROLES = new Set(["admin", "super_admin"]);
  const TRAINER_ROLES = new Set(["trainer", "admin", "super_admin"]);

  function rolesFor(user) {
    return new Set([user?.role, ...(Array.isArray(user?.roles) ? user.roles : [])]
      .filter(Boolean)
      .map((value) => String(value).toLowerCase()));
  }

  function hasAnyRole(roles, allowed) {
    return [...roles].some((role) => allowed.has(role));
  }

  function installMovementCaptureEntry(user) {
    const roles = rolesFor(user);
    if (!hasAnyRole(roles, ADMIN_ROLES)) return false;
    const card = document.getElementById("developmentLaunchCard");
    const row = card?.querySelector?.(".btn-row");
    if (!row) return false;
    card.hidden = false;
    if (document.getElementById("movementCaptureStudioDashboardLink")) return true;
    const link = document.createElement("a");
    link.id = "movementCaptureStudioDashboardLink";
    link.className = "btn";
    link.href = "/workout.html?movementCaptureStudio=1";
    link.innerHTML = "<strong>Movement Capture Studio</strong><br><small>Record FRONT + SIDE MoveNet evidence, custom movements, pose checkpoints, Motion Lego coverage, and first-failure diagnostics.</small>";
    row.prepend(link);
    return true;
  }

  function applyAccess(user) {
    const roles = rolesFor(user);
    const trainerLink = document.getElementById("trainerWorkspaceNav");
    if (trainerLink) trainerLink.hidden = !hasAnyRole(roles, TRAINER_ROLES);
    installMovementCaptureEntry(user);
  }

  async function initialize() {
    try {
      await window.AuthStateRuntime?.whenReady?.();
      const state = window.AuthStateRuntime?.getCanonicalAuthState?.();
      if (!state?.isAuthenticated || !state.user) return;
      applyAccess(state.user);
    } catch (_) {
      const trainerLink = document.getElementById("trainerWorkspaceNav");
      if (trainerLink) trainerLink.hidden = true;
    }
  }

  window.addEventListener?.("auth:changed", (event) => {
    const state = event?.detail;
    if (state?.isAuthenticated && state.user) applyAccess(state.user);
  });

  initialize();
})();
