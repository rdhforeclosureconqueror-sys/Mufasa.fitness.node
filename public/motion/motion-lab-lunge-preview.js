(function (window, document) {
  "use strict";

  async function loadLunge() {
    var runtime = window.MotionLabRuntime;
    var contract = window.PocketPTLungeMotionSpec;
    var reference = window.PocketPTAvatarProfiles?.profiles?.reference;
    if (!runtime || !contract || !reference) return { status: "failed", code: "dependency_load_failed" };
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
    button.disabled = false;
    button.addEventListener("click", loadLunge);
  }

  window.PocketPTMotionLabLungePreview = Object.freeze({ wire: wire, load: loadLunge });
})(window, document);
