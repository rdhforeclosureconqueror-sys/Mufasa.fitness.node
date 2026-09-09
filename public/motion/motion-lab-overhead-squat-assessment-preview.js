(function (window, document) {
  "use strict";

  function lerpNumber(a, b, t) { return Number(a || 0) + (Number(b || 0) - Number(a || 0)) * t; }
  function lerpVec(a, b, t) {
    var length = Math.max(a?.length || 0, b?.length || 0);
    return Object.freeze(Array.from({ length:length }, function (_, index) { return lerpNumber(a?.[index], b?.[index], t); }));
  }

  function interpolatePhase(from, to, t, id, normalizedTime) {
    var fromTargets = new Map((from.boneTargets || []).map(function (item) { return [item.bone, item]; }));
    var toTargets = new Map((to.boneTargets || []).map(function (item) { return [item.bone, item]; }));
    var names = Array.from(new Set([].concat(Array.from(fromTargets.keys()), Array.from(toTargets.keys()))));
    var targets = names.map(function (bone) {
      var a = fromTargets.get(bone)?.rotationOffsetEulerDegrees || [0,0,0];
      var b = toTargets.get(bone)?.rotationOffsetEulerDegrees || a;
      return Object.freeze({ bone:bone, rotationOffsetEulerDegrees:lerpVec(a,b,t) });
    });
    return Object.freeze({
      id:id,
      kind:"generated_grounding_sample",
      normalizedTime:normalizedTime,
      interpolation:"quaternion_slerp",
      root:Object.freeze({
        positionOffset:lerpVec(from.root?.positionOffset || [0,0,0], to.root?.positionOffset || [0,0,0], t),
        positionUnit:to.root?.positionUnit || from.root?.positionUnit || "avatar_height",
        rotationOffsetEulerDegrees:lerpVec(from.root?.rotationOffsetEulerDegrees || [0,0,0], to.root?.rotationOffsetEulerDegrees || [0,0,0], t)
      }),
      boneTargets:Object.freeze(targets),
      contacts:Object.freeze((to.contacts || from.contacts || []).slice()),
      generatedPlaybackSample:true,
      generatedBetween:Object.freeze([from.id, to.id])
    });
  }

  function needsDenseGrounding(from, to) {
    if (!from || !to) return false;
    var fromContacts = JSON.stringify(from.contacts || []);
    var toContacts = JSON.stringify(to.contacts || []);
    if (fromContacts !== toContacts || fromContacts === "[]") return false;
    if (from.kind === "isometric" && to.kind === "isometric_hold") return false;
    return true;
  }

  function densifyMappedContract(mapped) {
    if (mapped?.status !== "ready" || !mapped.spec) return mapped;
    var sourceSpec = mapped.spec;
    var segments = Math.max(1, Number(sourceSpec.groundingPolicy?.continuousSolveSamplesPerTransition) || 1);
    if (segments <= 1) return mapped;

    var phases = [];
    var inserted = 0;
    for (var index = 0; index < sourceSpec.phases.length; index += 1) {
      var current = sourceSpec.phases[index];
      phases.push(current);
      var next = sourceSpec.phases[index + 1];
      if (!needsDenseGrounding(current, next)) continue;
      for (var segment = 1; segment < segments; segment += 1) {
        var t = segment / segments;
        var time = lerpNumber(current.normalizedTime, next.normalizedTime, t);
        phases.push(interpolatePhase(current, next, t, current.id + "__" + next.id + "__ground_" + segment, time));
        inserted += 1;
      }
    }

    phases.sort(function (a,b) { return a.normalizedTime - b.normalizedTime; });
    var expandedSpec = Object.freeze({
      ...sourceSpec,
      phases:Object.freeze(phases),
      phaseOrder:Object.freeze(phases.map(function (phase) { return phase.id; })),
      playbackGroundingExpansion:Object.freeze({
        sourceNamedPhaseCount:sourceSpec.phases.length,
        compiledPhaseCount:phases.length,
        insertedGroundingSamples:inserted,
        segmentsPerGroundedTransition:segments,
        authoringContractUnchanged:true
      })
    });
    var expandedContract = Object.freeze({
      ...mapped.contract,
      spec:expandedSpec,
      sourceSpec:mapped.contract?.sourceSpec || sourceSpec,
      validate:function (candidate) {
        if (candidate !== expandedSpec) return Object.freeze({ valid:false, errors:Object.freeze(["expanded OHSA contract validates only its generated playback spec"]) });
        return Object.freeze({ valid:true, errors:Object.freeze([]) });
      }
    });
    return Object.freeze({
      ...mapped,
      spec:expandedSpec,
      contract:expandedContract,
      diagnostics:Object.freeze({ ...(mapped.diagnostics || {}), playbackGroundingExpansion:expandedSpec.playbackGroundingExpansion })
    });
  }

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
    mapped = densifyMappedContract(mapped);
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
        playbackGroundingExpansion:mapped.spec.playbackGroundingExpansion || null,
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

  window.PocketPTMotionLabOverheadSquatAssessmentPreview = Object.freeze({
    wire,
    load:loadAssessment,
    densifyMappedContract:densifyMappedContract,
    interpolatePhase:interpolatePhase
  });
})(window, document);
