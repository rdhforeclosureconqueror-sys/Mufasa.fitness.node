(function (root, factory) {
  const base = typeof module === "object" && module.exports
    ? require("./retarget-motion-compatibility-review-fix")
    : root.PocketPTRetargetMotionCompatibility;
  const api = factory(root, base);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTRetargetMotionCompatibility = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root, base) {
  "use strict";
  if (!base) throw new Error("reviewed retarget compatibility policy required");

  const OFFLINE_TARGET_NATIVE_VERSION = "thriller-offline-target-native-v2-direct-load";
  const OFFLINE_BINDING = "OFFLINE RETARGETED / REVIEW REQUIRED";
  const ROOT_BONE = "Hips";

  function parseTrackName(track) {
    const name = String(track?.name || "");
    const dot = name.lastIndexOf(".");
    return dot > 0 ? { nodeName: name.slice(0, dot), property: name.slice(dot + 1) } : { nodeName: name, property: "" };
  }

  function authoritativeBones(mappingProfile) {
    const map = mappingProfile?.canonicalMap || {};
    const bones = new Set(Object.values(map).filter(Boolean));
    bones.add(map.Hips || ROOT_BONE);
    return { map, bones, complete: Object.keys(map).length >= 20 };
  }

  function makeSafeClip(THREE, clip, mappingProfile) {
    if (!clip?.tracks?.length) return { status: "failed", code: "offline_target_clip_missing" };
    const { map, bones, complete } = authoritativeBones(mappingProfile);
    if (!complete) return { status: "failed", code: "gym_mapping_required" };
    const hips = map.Hips || ROOT_BONE;
    const retained = [];
    let quaternionTracks = 0, rootPositionTracks = 0, droppedScaleTracks = 0, droppedNonRootPositionTracks = 0, droppedAuxiliaryQuaternionTracks = 0, droppedOtherTracks = 0;

    for (const track of clip.tracks) {
      const { nodeName, property } = parseTrackName(track);
      if (property === "quaternion") {
        if (bones.has(nodeName)) { retained.push(track); quaternionTracks++; }
        else droppedAuxiliaryQuaternionTracks++;
        continue;
      }
      if (property === "position") {
        if (nodeName === hips) { retained.push(track); rootPositionTracks++; }
        else droppedNonRootPositionTracks++;
        continue;
      }
      if (property === "scale") { droppedScaleTracks++; continue; }
      droppedOtherTracks++;
    }

    if (!quaternionTracks || !retained.length) return { status: "failed", code: "offline_target_tracks_missing" };
    const safeClip = THREE?.AnimationClip
      ? new THREE.AnimationClip(`${clip.name || "Thriller"} [OFFLINE TARGET NATIVE SAFE]`, clip.duration, retained)
      : Object.assign({}, clip, { name: `${clip.name || "Thriller"} [OFFLINE TARGET NATIVE SAFE]`, tracks: retained });

    return {
      status: "ready",
      clip: safeClip,
      diagnostics: Object.freeze({
        mode: "offline-target-native-direct-load-filter-only",
        runtimeRetargetSkipped: true,
        fullIndependentLoaderSkipped: true,
        sourceTrackCount: clip.tracks.length,
        playableTrackCount: retained.length,
        canonicalJointsRetained: quaternionTracks,
        rootPositionTracks,
        droppedScaleTracks,
        droppedNonRootPositionTracks,
        droppedAuxiliaryQuaternionTracks,
        droppedOtherTracks,
        copiedKeyframeArrays: false,
        worldBasisConversion: false
      })
    };
  }

  function isOfflineTargetNative(motion, session) {
    return motion?.bindingMode === OFFLINE_BINDING
      && motion?.targetSkeletonProfile
      && motion.targetSkeletonProfile === session?.avatarProfile?.skeletonProfile
      && /_Avaturn$/i.test(String(motion?.runtimeClipName || ""));
  }

  function diagnosticsBase(motion, session) {
    return {
      motionId: motion?.id || null,
      selectedPart: motion?.displayName || null,
      sourceFbx: motion?.sourceFbxPath || null,
      runtimeAsset: motion?.runtimeAssetPath || null,
      sourceSkeletonProfile: motion?.sourceSkeletonProfile || null,
      targetAvatarProfile: session?.avatarProfile?.avatarId || null,
      targetSkeletonProfile: session?.avatarProfile?.skeletonProfile || null,
      bindingMode: motion?.bindingMode || OFFLINE_BINDING,
      retargetProfile: motion?.retargetProfile || null,
      clipName: null,
      clipDuration: null,
      trackCount: 0,
      intendedTrackCount: 0,
      boundTrackCount: 0,
      unboundTrackCount: 0,
      unboundTracks: Object.freeze([]),
      playbackState: "unloaded"
    };
  }

  function decorateSession(session) {
    if (!session || session.__thrillerOfflineTargetNativeInstalled) return session;
    Object.defineProperty(session, "__thrillerOfflineTargetNativeInstalled", { value: true, configurable: false });
    const originalLoad = session.loadIndependentRetargetedMotion?.bind(session);
    const originalStop = session.stop?.bind(session);
    const originalUnload = session.unloadMotion?.bind(session);
    if (!originalLoad) return session;

    session.loadIndependentRetargetedMotion = async function loadOfflineTargetNativeMotion(motion) {
      if (!isOfflineTargetNative(motion, session)) return originalLoad(motion);

      const meta = diagnosticsBase(motion, session);
      const fail = (code, boundary, detail = {}) => {
        const diagnostics = Object.freeze({ ...meta, ...detail, playbackState: "failed", firstFailingBoundary: boundary });
        session.thrillerDiagnostics = diagnostics;
        return Object.freeze({ status: "failed", code, diagnostics });
      };

      if (!motion?.id || !motion.runtimeAssetPath || !motion.runtimeClipName) return fail("thriller_catalog_invalid", "THRILLER_TARGET_NATIVE_CATALOG");
      if (!session.avatar || !session.mixer) return fail("avatar_required", "THRILLER_TARGET_NATIVE_AVATAR");
      if (session.avatarProfile?.avatarId !== motion.targetAvatarProfile || session.avatarProfile?.skeletonProfile !== motion.targetSkeletonProfile) return fail("RETARGET REQUIRED", "THRILLER_TARGET_NATIVE_PROFILE");

      base.markCrashBoundary?.("THRILLER_TARGET_NATIVE_REQUESTED", motion.id);

      let mappingProfile = null;
      try { mappingProfile = root.PocketPTMotionLabGymCompatibility?.loadProfile?.() || null; } catch (_) {}
      const mapping = authoritativeBones(mappingProfile);
      if (!mapping.complete) return fail("gym_mapping_required", "THRILLER_TARGET_NATIVE_MAPPING");
      base.markCrashBoundary?.("THRILLER_TARGET_NATIVE_MAPPING_READY", `${mapping.bones.size} mapped bones`);

      base.markCrashBoundary?.("THRILLER_TARGET_NATIVE_ASSET_LOAD_STARTED", motion.runtimeAssetPath);
      const asset = await session.loadAsset?.(motion.runtimeAssetPath, "fixture");
      if (!asset || asset.status === "failed") return fail(asset?.code || "asset_load_failed", "THRILLER_TARGET_NATIVE_ASSET_LOAD", { cause: asset?.cause || null });
      base.markCrashBoundary?.("THRILLER_TARGET_NATIVE_ASSET_PARSED", motion.runtimeAssetPath);

      const clip = asset.animations?.find(candidate => candidate.name === motion.runtimeClipName);
      if (!clip) {
        session.disposeObjectResources?.(asset.scene);
        return fail("animation_missing", "THRILLER_TARGET_NATIVE_CLIP", { runtimeClipNames: Object.freeze((asset.animations || []).map(candidate => candidate.name)) });
      }
      base.markCrashBoundary?.("THRILLER_TARGET_NATIVE_CLIP_FOUND", `${clip.name}; ${clip.tracks?.length || 0} tracks`);

      const safe = makeSafeClip(session.THREE, clip, mappingProfile);
      if (safe.status !== "ready") {
        session.disposeObjectResources?.(asset.scene);
        return fail(safe.code, "THRILLER_TARGET_NATIVE_FILTER", { offlineTargetNative: safe.diagnostics || null });
      }
      base.markCrashBoundary?.("THRILLER_TARGET_NATIVE_FILTERED", `${safe.diagnostics.playableTrackCount}/${safe.diagnostics.sourceTrackCount}`);

      const binding = session.inspectClipBindings?.(safe.clip);
      if (!binding) {
        session.disposeObjectResources?.(asset.scene);
        return fail("binding_inspector_unavailable", "THRILLER_TARGET_NATIVE_BINDING");
      }
      if (binding.unboundTrackCount) {
        session.disposeObjectResources?.(asset.scene);
        return fail("animation_binding_failed", "THRILLER_TARGET_NATIVE_BINDING", {
          intendedTrackCount: safe.clip.tracks.length,
          boundTrackCount: binding.boundTrackCount,
          unboundTrackCount: binding.unboundTrackCount,
          unboundTracks: binding.unboundTracks
        });
      }
      base.markCrashBoundary?.("THRILLER_TARGET_NATIVE_BINDING_CHECKED", `${binding.boundTrackCount}/${safe.clip.tracks.length}`);

      const mixerRoot = session.mixer?.getRoot?.() || null;
      if (mixerRoot && mixerRoot !== session.avatar) {
        session.disposeObjectResources?.(asset.scene);
        return fail("animation_mixer_root_mismatch", "THRILLER_TARGET_NATIVE_MIXER_ROOT");
      }

      const baseline = base.capturePose?.(session.THREE, session.avatar) || null;
      originalStop?.();
      session.disposeObjectResources?.(asset.scene);
      session.animationFixture = null;
      session.sessionClip = safe.clip;
      session.action = session.mixer.clipAction(safe.clip, session.avatar);
      session.setLoop?.(session.loop);
      base.markCrashBoundary?.("THRILLER_TARGET_NATIVE_ACTION_BOUND", safe.clip.name);

      session.__thrillerOfflineTargetNativeBaseline = baseline;
      session.__thrillerOfflineTargetNativeDiagnostics = safe.diagnostics;
      session.thrillerBoneSnapshot = session.snapshotRepresentativeBones?.() || session.thrillerBoneSnapshot;
      session.thrillerDiagnostics = {
        ...meta,
        clipName: safe.clip.name,
        clipDuration: safe.clip.duration,
        trackCount: safe.diagnostics.playableTrackCount,
        intendedTrackCount: safe.diagnostics.playableTrackCount,
        boundTrackCount: binding.boundTrackCount,
        unboundTrackCount: 0,
        unboundTracks: Object.freeze([]),
        retargetNormalization: safe.diagnostics,
        runtimeRetargetSkipped: true,
        fullIndependentLoaderSkipped: true,
        playbackState: "ready",
        firstFailingBoundary: "THRILLER_VISIBLE_PLAYBACK_NOT_CONFIRMED"
      };
      base.clearCrashBreadcrumb?.();
      return Object.freeze({ status: "ready", diagnostics: Object.freeze({ ...session.thrillerDiagnostics }) });
    };

    if (originalStop) session.stop = function stopOfflineTargetNative() {
      const out = originalStop();
      if (session.__thrillerOfflineTargetNativeBaseline) base.restorePose?.(session.__thrillerOfflineTargetNativeBaseline, session.avatar);
      return out;
    };
    if (originalUnload) session.unloadMotion = function unloadOfflineTargetNative() {
      const baseline = session.__thrillerOfflineTargetNativeBaseline;
      const out = originalUnload();
      if (baseline) base.restorePose?.(baseline, session.avatar);
      session.__thrillerOfflineTargetNativeBaseline = null;
      session.__thrillerOfflineTargetNativeDiagnostics = null;
      return out;
    };
    return session;
  }

  function installRuntime(runtime) {
    if (!runtime?.createMotionSession) return null;
    if (runtime.__thrillerOfflineTargetNativeRuntimeInstalled) return runtime;
    const wrapped = Object.assign({}, runtime, {
      __thrillerRetargetCompatibilityInstalled: true,
      __thrillerOfflineTargetNativeRuntimeInstalled: true,
      createMotionSession(options) { return decorateSession(runtime.createMotionSession(options)); }
    });
    return Object.freeze(wrapped);
  }

  return Object.freeze(Object.assign({}, base, {
    OFFLINE_TARGET_NATIVE_VERSION,
    OFFLINE_BINDING,
    makeSafeClip,
    isOfflineTargetNative,
    decorateSession,
    installRuntime
  }));
});