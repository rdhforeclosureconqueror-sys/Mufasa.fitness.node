(function (window, document) {
  "use strict";

  async function loadAssessment() {
    var runtime = window.MotionLabRuntime;
    var contract = window.PocketPTOverheadSquatAssessmentMotionSpec;
    var retarget = window.PocketPTMotionLabLungePreview;
    var coach = window.PocketPTAvatarProfiles?.profiles?.personalized;
    if (!runtime || !contract || !retarget?.buildCoachSpec || !coach) return { status:"failed", code:"dependency_load_failed" };

    var activeAvatarId = retarget.currentAvatarProfileId?.(runtime);
    if (activeAvatarId !== retarget.coachProfileId) {
      var avatar = await runtime.loadAvatar(coach);
      if (avatar?.status !== "ready") return avatar;
    }

    var mapped = retarget.buildCoachSpec(contract);
    if (mapped.status !== "ready") return mapped;
    var loaded = await runtime.loadMotionSpec(mapped.contract);
    if (loaded?.status !== "ready") return loaded;
    return Object.freeze({
      ...loaded,
      diagnostics:Object.freeze({
        ...(loaded.diagnostics || {}),
        assessmentType:"overhead_squat_assessment",
        sourceMotionId:mapped.spec.motionId || null,
        sourceMotionVersion:mapped.spec.version ?? null,
        overheadPoseStatus:mapped.spec.synthesisBoundary?.overheadPoseStatus || null,
        ownerCalibrationTarget:"setup_overhead",
        reviewViews:Object.freeze((mapped.spec.assessmentObservationContract?.views || []).slice()),
        reviewCheckpoints:Object.freeze((mapped.spec.assessmentObservationContract?.checkpoints || []).slice()),
        retarget:mapped.diagnostics
      })
    });
  }

  function wire() {
    var button = document.getElementById("loadOverheadSquatAssessment");
    if (!button || button.dataset.ohsaWired === "1") return;
    button.dataset.ohsaWired = "1";
    var spec = window.PocketPTOverheadSquatAssessmentMotionSpec?.spec;
    var version = spec?.version == null ? "current" : "v" + spec.version;
    button.textContent = "Load Overhead Squat Assessment " + version + " (Coach Avatar)";
    button.title = "Load the phase-first overhead squat assessment test onto the personalized Coach Avatar. Initial overhead arm geometry requires owner visual calibration.";
    button.disabled = false;
    button.addEventListener("click", loadAssessment);
  }

  window.PocketPTMotionLabOverheadSquatAssessmentPreview = Object.freeze({ wire, load:loadAssessment });
})(window, document);
