(function (window, document) {
  "use strict";

  const COACH_PROFILE_ID = "avaturn-personalized-candidate";
  const COACH_SKELETON_ID = "avaturn-native-v1";

  function canonicalBoneToCoachBone(name) {
    const raw = String(name || "");
    const stripped = raw.replace(/^mixamorig[:_]?/i, "");
    if (stripped === "LeftToeBase") return "LeftFoot";
    if (stripped === "RightToeBase") return "RightFoot";
    return stripped || raw;
  }

  function remapBoneRecord(record) {
    if (!record || typeof record !== "object") return record;
    return Object.freeze({ ...record, bone: canonicalBoneToCoachBone(record.bone) });
  }

  function remapSemanticTarget(target) {
    if (!target || typeof target !== "object") return target;
    return Object.freeze({
      ...target,
      bone:canonicalBoneToCoachBone(target.bone),
      childBone:canonicalBoneToCoachBone(target.childBone)
    });
  }

  function remapChain(chain) {
    return Object.freeze({
      ...chain,
      rootBone: canonicalBoneToCoachBone(chain.rootBone),
      jointBone: canonicalBoneToCoachBone(chain.jointBone),
      endBone: canonicalBoneToCoachBone(chain.endBone),
      contactBone: canonicalBoneToCoachBone(chain.contactBone)
    });
  }

  function remapAuthoringAdjustment(adjustment) {
    if (!adjustment || typeof adjustment !== "object") return adjustment;
    const mapped = { ...adjustment };
    if (Object.prototype.hasOwnProperty.call(mapped, "bone")) mapped.bone = canonicalBoneToCoachBone(mapped.bone);
    if (Array.isArray(mapped.deltas)) mapped.deltas = Object.freeze(mapped.deltas.map(remapBoneRecord));
    return Object.freeze(mapped);
  }

  function currentAvatarProfileId(runtime) {
    const snap = runtime?.snapshot?.();
    if (snap?.avatar?.avatarProfileId) return snap.avatar.avatarProfileId;
    if (snap?.motion?.avatarProfileId) return snap.motion.avatarProfileId;
    const diagnostics = document.getElementById?.("avatarDiagnostics");
    if (diagnostics?.children) {
      for (let i = 0; i < diagnostics.children.length - 1; i += 2) {
        const term = diagnostics.children[i];
        const value = diagnostics.children[i + 1];
        if (String(term?.textContent || "").trim() === "Profile") return String(value?.textContent || "").trim() || null;
      }
    }
    return null;
  }

  function buildCoachSpec(contract) {
    if (!contract?.spec) return Object.freeze({ status: "failed", code: "motion_spec_missing" });
    var sourceValidation;
    try { sourceValidation = contract.validate?.(contract.spec); } catch (_) { sourceValidation = null; }
    if (!sourceValidation?.valid) {
      return Object.freeze({ status: "failed", code: "motion_spec_invalid", diagnostics: Object.freeze({ sourceValidation: sourceValidation || null }) });
    }

    const source = contract.spec;
    const sourceTargets = new Set([source.skeleton?.rootBone]);
    source.phases?.forEach(phase => phase.boneTargets?.forEach(target => sourceTargets.add(target.bone)));
    (source.semanticPosePolicy?.targets || []).forEach(target => {
      if (target?.bone) sourceTargets.add(target.bone);
      if (target?.childBone) sourceTargets.add(target.childBone);
    });
    Object.values(source.groundingPolicy?.contactBones || {}).forEach(name => sourceTargets.add(name));
    (source.groundingPolicy?.kinematicChains || []).forEach(chain => {
      [chain.rootBone, chain.jointBone, chain.endBone, chain.contactBone].forEach(name => sourceTargets.add(name));
    });
    if (source.acceptedAuthoringAdjustment?.bone) sourceTargets.add(source.acceptedAuthoringAdjustment.bone);
    (source.acceptedAuthoringAdjustment?.deltas || []).forEach(delta => sourceTargets.add(delta?.bone));

    const aliases = [...sourceTargets].filter(Boolean).map(requestedName => Object.freeze({
      requestedName,
      coachBone: canonicalBoneToCoachBone(requestedName),
      mode: /^mixamorig[:_]?/i.test(requestedName) ? "canonical-to-coach" : "identity"
    }));

    const groundingPolicy = source.groundingPolicy ? Object.freeze({
      ...source.groundingPolicy,
      contactBones: Object.freeze(Object.fromEntries(Object.entries(source.groundingPolicy.contactBones || {}).map(([contact, bone]) => [contact, canonicalBoneToCoachBone(bone)]))),
      kinematicChains: Object.freeze((source.groundingPolicy.kinematicChains || []).map(remapChain))
    }) : source.groundingPolicy;

    const semanticPosePolicy = source.semanticPosePolicy ? Object.freeze({
      ...source.semanticPosePolicy,
      targets:Object.freeze((source.semanticPosePolicy.targets || []).map(remapSemanticTarget))
    }) : source.semanticPosePolicy;

    const coachRetarget = Object.freeze({
      sourceMotionId: source.motionId || null,
      sourceMotionVersion: source.version ?? null,
      sourceSkeletonId: source.skeleton?.id || null,
      targetAvatarProfileId: COACH_PROFILE_ID,
      targetSkeletonProfile: COACH_SKELETON_ID,
      aliasCount: aliases.length,
      aliases: Object.freeze(aliases),
      semanticTargetCount:semanticPosePolicy?.targets?.length || 0,
      degradedContactAliases: Object.freeze(aliases.filter(item => /ToeBase$/.test(item.requestedName) && /Foot$/.test(item.coachBone)))
    });

    const spec = Object.freeze({
      ...source,
      skeleton: Object.freeze({
        ...source.skeleton,
        id: "coach_avaturn_native_v1",
        rootBone: canonicalBoneToCoachBone(source.skeleton?.rootBone),
        sourceSkeletonId: source.skeleton?.id || null,
        targetAvatarProfileId: COACH_PROFILE_ID,
        targetSkeletonProfile: COACH_SKELETON_ID,
        retargetMode: semanticPosePolicy?.targets?.length ? "semantic_world_direction_plus_rest_relative_local" : "rest_relative_local_canonical_to_coach"
      }),
      phases: Object.freeze((source.phases || []).map(phase => Object.freeze({
        ...phase,
        boneTargets: Object.freeze((phase.boneTargets || []).map(remapBoneRecord))
      }))),
      semanticPosePolicy,
      groundingPolicy,
      acceptedAuthoringAdjustment: remapAuthoringAdjustment(source.acceptedAuthoringAdjustment),
      coachRetarget
    });

    const retargetedContract = Object.freeze({
      ...contract,
      spec,
      sourceSpec: source,
      sourceValidation,
      validate: function (candidate) {
        if (candidate !== spec) return Object.freeze({ valid: false, errors: Object.freeze(["retargeted coach contract validates only its generated coach spec"]) });
        return sourceValidation;
      }
    });

    return Object.freeze({ status: "ready", spec, contract: retargetedContract, diagnostics: coachRetarget });
  }

  async function loadLunge() {
    var runtime = window.MotionLabRuntime;
    var contract = window.PocketPTLungeMotionSpec;
    var coach = window.PocketPTAvatarProfiles?.profiles?.personalized;
    if (!runtime || !contract || !coach) return { status: "failed", code: "dependency_load_failed" };
    var activeAvatarId = currentAvatarProfileId(runtime);
    if (activeAvatarId !== COACH_PROFILE_ID) {
      var avatar = await runtime.loadAvatar(coach);
      if (avatar?.status !== "ready") return avatar;
    }
    var retargeted = buildCoachSpec(contract);
    if (retargeted.status !== "ready") return retargeted;
    var loaded = await runtime.loadMotionSpec(retargeted.contract);
    if (loaded?.status !== "ready") return loaded;
    return Object.freeze({
      ...loaded,
      diagnostics: Object.freeze({
        ...(loaded.diagnostics || {}),
        coachAvatarProfileId: COACH_PROFILE_ID,
        coachSkeletonProfile: COACH_SKELETON_ID,
        sourceMotionId: retargeted.spec.motionId || null,
        sourceMotionVersion: retargeted.spec.version ?? null,
        retarget: retargeted.diagnostics
      })
    });
  }

  function loadScriptOnce(src, globalName) {
    if (window[globalName]) return Promise.resolve(window[globalName]);
    return new Promise(function (resolve, reject) {
      var node = document.createElement("script");
      node.src = src;
      node.async = false;
      node.onload = function () { window[globalName] ? resolve(window[globalName]) : reject(new Error(globalName + " did not install")); };
      node.onerror = function () { reject(new Error("Failed to load " + src)); };
      document.head.appendChild(node);
    });
  }

  async function installOverheadSquatAssessmentTest(anchorButton) {
    try {
      await loadScriptOnce("/dev/motion-lab-assets/motion-spec-semantic-direction-policy.js", "PocketPTMotionSpecSemanticDirectionPolicy");
      var semanticCompiler = window.PocketPTMotionSpecSemanticDirectionPolicy?.install?.(window.PocketPTMotionSpecClip);
      if (!semanticCompiler?.compile || semanticCompiler.__semanticDirectionPolicyInstalled !== true) throw new Error("Semantic direction policy failed to install");
      window.PocketPTMotionSpecClip = semanticCompiler;
      await loadScriptOnce("/dev/motion-lab-assets/overhead-squat-assessment-motion-spec.js", "PocketPTOverheadSquatAssessmentMotionSpec");
      await loadScriptOnce("/dev/motion-lab-assets/motion-lab-overhead-squat-assessment-preview.js", "PocketPTMotionLabOverheadSquatAssessmentPreview");
      var button = document.getElementById("loadOverheadSquatAssessment");
      if (!button && anchorButton?.parentNode) {
        button = document.createElement("button");
        button.id = "loadOverheadSquatAssessment";
        button.disabled = true;
        anchorButton.parentNode.insertBefore(button, anchorButton.nextSibling);
      }
      window.PocketPTMotionLabOverheadSquatAssessmentPreview?.wire?.();
    } catch (error) {
      console.error("[MOTION_LAB_OHSA_INSTALL]", error);
    }
  }

  function wire() {
    var button = document.getElementById("loadSynthesizedLunge");
    if (!button) return;
    if (button.dataset.lungeWired !== "1") {
      button.dataset.lungeWired = "1";
      var spec = window.PocketPTLungeMotionSpec?.spec;
      var version = spec?.version == null ? "current" : "v" + spec.version;
      button.textContent = "Load Stationary Lunge Left " + version + " (Coach Avatar)";
      button.title = "Retarget the current canonical Stationary Left Lunge onto the personalized Avaturn coach skeleton";
      button.disabled = false;
      button.addEventListener("click", loadLunge);
    }
    installOverheadSquatAssessmentTest(button);
  }

  window.PocketPTMotionLabLungePreview = Object.freeze({
    wire: wire,
    load: loadLunge,
    buildCoachSpec: buildCoachSpec,
    canonicalBoneToCoachBone: canonicalBoneToCoachBone,
    currentAvatarProfileId: currentAvatarProfileId,
    coachProfileId: COACH_PROFILE_ID,
    coachSkeletonId: COACH_SKELETON_ID,
    installOverheadSquatAssessmentTest: installOverheadSquatAssessmentTest
  });
})(window, document);
