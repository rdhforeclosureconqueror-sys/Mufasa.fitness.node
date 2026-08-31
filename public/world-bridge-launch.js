(function initPocketPTWorldLaunch(global) {
  "use strict";

  async function createArenaSession() {
    const readiness = await global.AuthStateRuntime?.whenReady?.();
    const token = readiness?.auth?.token || global.AuthStateRuntime?.getAuthToken?.();
    if (!readiness?.ok || !token) throw new Error("Sign in to PocketPT before entering the arena.");
    const backendOrigin = global.MaatApiClient?.origin?.()
      || global.RuntimeState?.getEndpoints?.().nodeBaseUrl
      || global.RuntimeState?.getBackendOrigin?.()
      || global.MAAT_BACKEND_ORIGIN
      || global.MAAT_NODE_BASE_URL
      || global.location.origin;
    const response = await global.fetch(`${String(backendOrigin).replace(/\/$/, "")}/api/game/sessions`, {
      method: "POST",
      cache: "no-store",
      headers: {
        "Content-Type": "application/json",
        authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ experienceType: "PUSH_UP_ARENA", challengeId: "push_up" })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok || payload?.ok !== true || !payload?.data?.launchUrl) {
      throw new Error(payload?.error?.message || `Arena launch failed (${response.status}).`);
    }
    return payload.data;
  }

  function installButton() {
    const controls = global.document?.querySelector?.(".controls");
    if (!controls || global.document.getElementById("enterBeastArenaBtn")) return false;
    const button = global.document.createElement("button");
    button.id = "enterBeastArenaBtn";
    button.type = "button";
    button.textContent = "Enter Unleash the Beast";
    button.setAttribute("aria-describedby", "cameraStatus");
    button.addEventListener("click", async () => {
      const original = button.textContent;
      button.disabled = true;
      button.textContent = "Connecting to arena…";
      try {
        const session = await createArenaSession();
        global.location.assign(session.launchUrl);
      } catch (error) {
        const target = global.document.getElementById("cameraStatus");
        if (target) {
          target.textContent = error?.message || "Arena launch failed.";
          target.className = "bad";
        }
        button.disabled = false;
        button.textContent = original;
      }
    });
    controls.appendChild(button);
    return true;
  }

  global.PocketPTWorldLaunch = { createArenaSession, installButton };
  if (global.document?.readyState === "loading") global.document.addEventListener("DOMContentLoaded", installButton, { once: true });
  else installButton();
})(typeof window !== "undefined" ? window : globalThis);
