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

  function remapChain(chain) {
    return Object.freeze({
      ...chain,
      rootBone: canonicalBoneToCoachBone(chain.rootBone),
      jointBone: canonicalBoneToCoachBone(chain.jointBone),
      endBone: canonicalBoneToCoachBone(chain.endBone),
      contactBone: canonicalBoneToCoachBone(chain.contactBone)
    });
  }

  function buildCoachSpec(contract) {
    if (!contract?.spec) return Object.freeze({ status: "failed", code: "motion_spec_missing" });
    const source = contract.spec;
    const sourceTargets = new Set([source.skeleton?.rootBone]);
    source.phases?.forEach(phase => phase.boneTargets?.forEach(target => sourceTargets.add(target.bone)));
    Object.values(source.groundingPolicy?.contactBones || {}).forEach(name => sourceTargets.add(name));
    (source.groundingPolicy?.kinematicChains || []).forEach(chain => {
      [chain.rootBone, chain.jointBone, chain.endBone, chain.contactBone].forEach(name => sourceTargets.add(name));
    });

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

    const spec = Object.freeze({
      ...source,
      skeleton: Object.freeze({
        ...source.skeleton,
        id: "coach_avaturn_native_v1",
        rootBone: canonicalBoneToCoachBone(source.skeleton?.rootBone),
        sourceSkeletonId: source.skeleton?.id || null,
        targetSkeletonProfile: COACH_SKELETON_ID,
        retargetMode: "rest_relative_local_canonical_to_coach"
      }),
      phases: Object.freeze((source.phases || []).map(phase => Object.freeze({
        ...phase,
        boneTargets: Object.freeze((phase.boneTargets || []).map(remapBoneRecord))
      }))),
      groundingPolicy,
      acceptedAuthoringAdjustment: source.acceptedAuthoringAdjustment ? Object.freeze({
        ...source.acceptedAuthoringAdjustment,
        bone: canonicalBoneToCoachBone(source.acceptedAuthoringAdjustment.bone)
      }) : source.acceptedAuthoringAdjustment,
      coachRetarget: Object.freeze({
        sourceSkeletonId: source.skeleton?.id || null,
        targetAvatarProfileId: COACH_PROFILE_ID,
        targetSkeletonProfile: COACH_SKELETON_ID,
        aliasCount: aliases.length,
        aliases: Object.freeze(aliases),
        degradedContactAliases: Object.freeze(aliases.filter(item => /ToeBase$/.test(item.requestedName) && /Foot$/.test(item.coachBone)))
      })
    });

    return Object.freeze({ status: "ready", spec, diagnostics: spec.coachRetarget });
  }

  async function loadLunge() {
    var runtime = window.MotionLabRuntime;
    var contract = window.PocketPTLungeMotionSpec;
    var coach = window.PocketPTAvatarProfiles?.profiles?.personalized;
    if (!runtime || !contract || !coach) return { status: "failed", code: "dependency_load_failed" };

    var snap = runtime.snapshot?.();
    if (snap?.motion?.avatarProfileId !== COACH_PROFILE_ID) {
      var avatar = await runtime.loadAvatar(coach);
      if (avatar?.status !== "ready") return avatar;
    }

    var retargeted = buildCoachSpec(contract);
    if (retargeted.status !== "ready") return retargeted;
    var loaded = await runtime.loadMotionSpec(retargeted.spec);
    if (loaded?.status !== "ready") return loaded;
    return Object.freeze({
      ...loaded,
      diagnostics: Object.freeze({
        ...(loaded.diagnostics || {}),
        coachAvatarProfileId: COACH_PROFILE_ID,
        coachSkeletonProfile: COACH_SKELETON_ID,
        retarget: retargeted.diagnostics
      })
    });
  }

  function wire() {
    var button = document.getElementById("loadSynthesizedLunge");
    if (!button || button.dataset.lungeWired === "1") return;
    button.dataset.lungeWired = "1";
    button.disabled = false;
    button.addEventListener("click", loadLunge);
  }

  window.PocketPTMotionLabLungePreview = Object.freeze({
    wire: wire,
    load: loadLunge,
    buildCoachSpec: buildCoachSpec,
    canonicalBoneToCoachBone: canonicalBoneToCoachBone,
    coachProfileId: COACH_PROFILE_ID,
    coachSkeletonId: COACH_SKELETON_ID
  });
})(window, document);
