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

  function ensureAdminLaunchLink(row, { id, href, title, description }) {
    if (!row || document.getElementById(id)) return Boolean(document.getElementById(id));
    const link = document.createElement("a");
    link.id = id;
    link.className = "btn";
    link.href = href;
    link.innerHTML = `<strong>${title}</strong><br><small>${description}</small>`;
    row.append(link);
    return true;
  }

  function installAdminDevelopmentEntries(user) {
    const roles = rolesFor(user);
    if (!hasAnyRole(roles, ADMIN_ROLES)) return false;

    const card = document.getElementById("developmentLaunchCard");
    const row = card?.querySelector?.(".btn-row");
    if (!row) return false;
    card.hidden = false;

    if (!document.getElementById("movementCaptureStudioDashboardLink")) {
      const link = document.createElement("a");
      link.id = "movementCaptureStudioDashboardLink";
      link.className = "btn";
      link.href = "/workout.html?movementCaptureStudio=1";
      link.innerHTML = "<strong>Movement Capture Studio</strong><br><small>Record FRONT + SIDE MoveNet evidence, custom movements, pose checkpoints, Motion Lego coverage, and first-failure diagnostics.</small>";
      row.prepend(link);
    }

    ensureAdminLaunchLink(row, {
      id: "firstFailureDebugDashboardLink",
      href: "/admin-first-failure.html",
      title: "First-Failure Debug",
      description: "Run read-only system checks in dependency order and stop at the earliest real failure."
    });
    ensureAdminLaunchLink(row, {
      id: "runClubDiagnosticsDashboardLink",
      href: "/admin-run-club-diagnostics.html",
      title: "Run Club Diagnostics",
      description: "Inspect Run Club runtime, route, GPS, session, and backend readiness diagnostics."
    });
    ensureAdminLaunchLink(row, {
      id: "motionLabDashboardLink",
      href: "/dev/motion-lab",
      title: "Motion Lab",
      description: "Open the protected avatar, motion-spec, animation, and movement-engine laboratory."
    });
    ensureAdminLaunchLink(row, {
      id: "clientManagementDashboardLink",
      href: "/admin-members.html",
      title: "Client Management",
      description: "Inspect registered accounts, access state, member journeys, and secure messages."
    });

    // The full Launch Health Console remains canonical in dashboard.html. These
    // links are intentionally duplicated in the stable Development & Launch
    // surface so admin observability cannot disappear when one downstream
    // dashboard runtime fails before revealing its hidden navigation controls.
    const clientManagementCard = document.getElementById("clientManagementCard");
    if (clientManagementCard) clientManagementCard.hidden = false;
    const runClubDiagnosticsNav = document.getElementById("runClubDiagnosticsNav");
    if (runClubDiagnosticsNav) runClubDiagnosticsNav.hidden = false;
    const motionLabNav = document.getElementById("motionLabNav");
    if (motionLabNav) motionLabNav.hidden = false;

    return true;
  }

  function applyAccess(user) {
    const roles = rolesFor(user);
    const trainerLink = document.getElementById("trainerWorkspaceNav");
    if (trainerLink) trainerLink.hidden = !hasAnyRole(roles, TRAINER_ROLES);
    installAdminDevelopmentEntries(user);
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
