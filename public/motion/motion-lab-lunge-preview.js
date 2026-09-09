(function (window, document) {
  "use strict";

  var V3_URL = "/motion/lunge-motion-spec-v3.js";

  function loadScript(src) {
    return new Promise(function (resolve, reject) {
      if (window.PocketPTLungePhaseFirstMotionSpec) return resolve();
      var existing = document.querySelector('script[data-lunge-v3="1"]');
      if (existing) {
        existing.addEventListener("load", resolve, { once: true });
        existing.addEventListener("error", reject, { once: true });
        return;
      }
      var script = document.createElement("script");
      script.src = src;
      script.async = true;
      script.dataset.lungeV3 = "1";
      script.addEventListener("load", resolve, { once: true });
      script.addEventListener("error", function () { reject(new Error("phase_first_lunge_dependency_failed")); }, { once: true });
      document.head.appendChild(script);
    });
  }

  async function loadLunge() {
    var runtime = window.MotionLabRuntime;
    var reference = window.PocketPTAvatarProfiles?.profiles?.reference;
    if (!runtime || !reference) return { status: "failed", code: "dependency_load_failed" };

    try {
      await loadScript(V3_URL);
    } catch (_) {
      return { status: "failed", code: "phase_first_lunge_dependency_failed", moduleUrl: V3_URL };
    }

    var contract = window.PocketPTLungePhaseFirstMotionSpec;
    if (!contract) return { status: "failed", code: "phase_first_lunge_contract_missing" };

    var validation = contract.validate?.(contract.spec);
    if (validation && validation.valid === false) {
      return { status: "failed", code: "phase_first_lunge_validation_failed", errors: validation.errors || [] };
    }

    var snap = runtime.snapshot?.();
    if (snap?.motion?.avatarProfileId !== "phase-e-reference") {
      var avatar = await runtime.loadAvatar(reference);
      if (avatar?.status !== "ready") return avatar;
    }
    return runtime.loadMotionSpec(contract);
  }

  function wire() {
    var button = document.getElementById("loadSynthesizedLunge");
    if (!button || button.dataset.lungeWired === "1") return;
    button.dataset.lungeWired = "1";
    button.textContent = "Load Stationary Lunge Left v3.0 Phase-First (Reference Only)";
    button.disabled = false;
    button.addEventListener("click", loadLunge);
  }

  window.PocketPTMotionLabLungePreview = Object.freeze({ wire: wire, load: loadLunge, version: "3.0-phase-first" });
})(window, document);
