(function initWorkoutControlActivation(global) {
  "use strict";
  function visibleStatus(message, bad = false) { const target = global.document?.getElementById("poseStatus"); if (target) { target.textContent = message; target.classList?.toggle?.("status-bad", bad); } }
  function bindCamera() {
    const button = global.document?.getElementById("connectBtn"); if (!button || button.dataset.cameraActivationBound === "true") return false;
    button.dataset.cameraActivationBound = "true";
    button.onclick = function connectCameraFromGesture() { if (typeof global.WorkoutRuntime?.connectCamera !== "function") { visibleStatus("Camera setup is currently unavailable. Refresh and try again.", true); return false; } return global.WorkoutRuntime.connectCamera(); };
    return true;
  }
  function bindAvatarFallback() {
    const button = global.document?.getElementById("avatarCreateBtn"); if (!button || button.dataset.avatarActivationBound === "true") return false;
    button.dataset.avatarActivationBound = "true";
    button.onclick = function openAvatarSetupImmediately() {
      const modal = global.document?.getElementById("avatarModal"), status = global.document?.getElementById("avatarCreationStatus");
      if (!global.AvatarRuntime?.openModal && !modal) { visibleStatus("Avatar setup is currently unavailable. Refresh and try again.", true); return false; }
      if (modal) modal.classList.remove("hidden");
      if (status) status.textContent = global.AvatarRuntime ? "Idle." : "Avatar setup is currently unavailable. You may close this dialog and retry.";
      global.AvatarRuntime?.openModal?.(); return true;
    }; return true;
  }
  function bind() { return { camera: bindCamera(), avatar: bindAvatarFallback() }; }
  if (global.document?.readyState === "loading") global.document.addEventListener("DOMContentLoaded", bind, { once: true }); else bind();
  global.WorkoutControlActivation = Object.freeze({ bind, bindCamera, bindAvatarFallback });
})(window);
