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

  const OFFLINE_TARGET_NATIVE_VERSION = "thriller-offline-target-native-v1";
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
        mode: "offline-target-native-filter-only",
        runtimeRetargetSkipped: true,
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

  function decorateSession(session) {
    if (!session || session.__thrillerOfflineTargetNativeInstalled) return session;
    Object.defineProperty(session, "__thrillerOfflineTargetNativeInstalled", { value: true, configurable: false });
    const originalLoad = session.loadIndependentRetargetedMotion?.bind(session);
    const originalStop = session.stop?.bind(session);
    const originalUnload = session.unloadMotion?.bind(session);
    if (!originalLoad) return session;

    session.loadIndependentRetargetedMotion = async function loadOfflineTargetNativeMotion(motion) {
      if (!isOfflineTargetNative(motion, session)) return originalLoad(motion);

      base.markCrashBoundary?.("THRILLER_OFFLINE_TARGET_NATIVE_LOAD", motion.id);
      const loaded = await originalLoad(motion);
      if (loaded?.status !== "ready") return loaded;

      let mappingProfile = null;
      try { mappingProfile = root.PocketPTMotionLabGymCompatibility?.loadProfile?.() || null; } catch (_) {}
      const sourceClip = session.sessionClip;
      const baseline = base.capturePose?.(session.THREE, session.avatar) || null;
      const safe = makeSafeClip(session.THREE, sourceClip, mappingProfile);
      if (safe.status !== "ready") {
        originalStop?.();
        const diagnostics = Object.freeze({ ...(loaded.diagnostics || {}), playbackState: "failed", firstFailingBoundary: safe.code, offlineTargetNative: safe.diagnostics || null });
        session.thrillerDiagnostics = diagnostics;
        return Object.freeze({ status: "failed", code: safe.code, diagnostics });
      }

      base.markCrashBoundary?.("THRILLER_OFFLINE_TARGET_NATIVE_FILTERED", `${safe.diagnostics.playableTrackCount}/${safe.diagnostics.sourceTrackCount}`);
      originalStop?.();
      session.mixer?.uncacheAction?.(sourceClip, session.avatar);
      session.sessionClip = safe.clip;
      session.action = session.mixer.clipAction(safe.clip, session.avatar);
      session.setLoop?.(session.loop);
      session.__thrillerOfflineTargetNativeBaseline = baseline;
      session.__thrillerOfflineTargetNativeDiagnostics = safe.diagnostics;
      session.thrillerBoneSnapshot = session.snapshotRepresentativeBones?.() || session.thrillerBoneSnapshot;
      session.thrillerDiagnostics = {
        ...(loaded.diagnostics || {}),
        clipName: safe.clip.name,
        clipDuration: safe.clip.duration,
        trackCount: safe.diagnostics.playableTrackCount,
        intendedTrackCount: safe.diagnostics.playableTrackCount,
        boundTrackCount: safe.diagnostics.playableTrackCount,
        unboundTrackCount: 0,
        unboundTracks: Object.freeze([]),
        retargetNormalization: safe.diagnostics,
        runtimeRetargetSkipped: true,
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