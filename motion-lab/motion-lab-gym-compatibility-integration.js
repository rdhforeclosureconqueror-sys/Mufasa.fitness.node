(function (window, document) {
  "use strict";

  var VERSION = "motion-lab-gym-compatibility-integration-v2";
  var installed = false;
  var diagnostics = {
    version: VERSION,
    status: "idle",
    stage: "NOT_STARTED",
    firstFailure: "NONE",
    detail: "waiting for Motion Lab runtime initialization",
    updatedAt: null
  };

  function publish(patch) {
    diagnostics = Object.assign({}, diagnostics, patch, { updatedAt: new Date().toISOString() });
    window.PocketPTMotionLabGymCompatibilityIntegrationDiagnostics = Object.freeze({
      snapshot: function () { return Object.freeze(Object.assign({}, diagnostics)); },
      text: function () {
        return [
          "POCKETPT MOTION LAB — GYM COMPATIBILITY INTEGRATION",
          "STATUS: " + diagnostics.status,
          "FIRST FAILURE: " + diagnostics.firstFailure,
          "STAGE: " + diagnostics.stage,
          "DETAIL: " + diagnostics.detail
        ].join("\n");
      }
    });
  }

  function fail(stage, detail) {
    publish({ status: "failed", stage: stage, firstFailure: stage, detail: detail });
    return false;
  }

  function scriptAlreadyLoaded(src) {
    return Array.from(document.scripts || []).some(function (node) {
      return node.src && node.src.indexOf(src) !== -1;
    });
  }

  function loadScript(stage, src, authorityCheck) {
    if (authorityCheck()) {
      publish({ status: "loading", stage: stage, firstFailure: "NONE", detail: "authority already available" });
      return Promise.resolve(true);
    }
    return new Promise(function (resolve, reject) {
      publish({ status: "loading", stage: stage, firstFailure: "NONE", detail: "loading " + src });
      var node = document.createElement("script");
      node.src = src;
      node.async = false;
      node.dataset.motionLabGymCompatibility = stage;
      node.onload = function () {
        if (!authorityCheck()) {
          reject(Object.assign(new Error("script loaded without expected authority"), { stage: stage }));
          return;
        }
        resolve(true);
      };
      node.onerror = function () { reject(Object.assign(new Error("dependency failed to load: " + src), { stage: stage })); };
      document.head.appendChild(node);
    });
  }

  function runtimeReady() {
    var snapshot = window.PocketPTMotionLabBootstrapDiagnostics?.snapshot?.();
    return snapshot?.status === "ready" || Boolean(window.MotionLabRuntime?.gymCompatibilityState || window.MotionLabRuntime?.personalizedAvatarState);
  }

  async function install() {
    if (installed && document.getElementById("gymCompatibilityPanel")) {
      window.PocketPTMotionLabGymCompatibilityPanel?.refresh?.();
      return true;
    }
    publish({ status: "starting", stage: "RUNTIME_READY", firstFailure: "NONE", detail: "integration starting" });
    if (!runtimeReady()) return fail("RUNTIME_READY", "Motion Lab runtime has not reached its ready boundary");

    try {
      await loadScript("PERSONAL_AVATAR_COMPATIBILITY", "/motion/personal-avatar-compatibility.js", function () {
        return Boolean(window.PocketPTPersonalAvatarCompatibility?.inspect);
      });
      await loadScript("GYM_COMPATIBILITY_CONTROLLER", "/motion/motion-lab-gym-compatibility.js", function () {
        return Boolean(window.PocketPTMotionLabGymCompatibility?.inspectRuntime);
      });
      await loadScript("GYM_COMPATIBILITY_PANEL_SCRIPT", "/dev/motion-lab-gym-compatibility-panel.js", function () {
        return Boolean(window.PocketPTMotionLabGymCompatibilityPanel?.install);
      });

      publish({ status: "installing", stage: "GYM_COMPATIBILITY_PANEL_INSTALL", firstFailure: "NONE", detail: "installing panel" });
      window.PocketPTMotionLabGymCompatibilityPanel.install();
      if (!document.getElementById("gymCompatibilityPanel")) {
        return fail("GYM_COMPATIBILITY_PANEL_RENDER", "panel component installed but #gymCompatibilityPanel was not rendered");
      }
      installed = true;
      window.PocketPTMotionLabGymCompatibilityPanel.refresh?.();
      publish({ status: "ready", stage: "READY", firstFailure: "NONE", detail: "personalized-avatar gym compatibility panel ready" });
      return true;
    } catch (error) {
      return fail(error?.stage || "INTEGRATION_UNKNOWN", error?.message || String(error));
    }
  }

  function onRuntimeReady() {
    var attempts = 0;
    var timer = window.setInterval(function () {
      attempts += 1;
      if (runtimeReady()) {
        window.clearInterval(timer);
        install();
      } else if (attempts >= 120) {
        window.clearInterval(timer);
        fail("RUNTIME_READY", "Motion Lab runtime did not become ready within 60 seconds");
      }
    }, 500);
  }

  window.PocketPTMotionLabGymCompatibilityIntegration = Object.freeze({ VERSION: VERSION, install: install });
  publish({ status: "waiting", stage: "RUNTIME_READY", firstFailure: "NONE", detail: "waiting for canonical Motion Lab runtime" });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", onRuntimeReady, { once: true });
  else onRuntimeReady();
})(window, document);
