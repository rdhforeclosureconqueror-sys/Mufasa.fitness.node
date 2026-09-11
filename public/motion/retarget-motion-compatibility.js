(function (root, factory) {
  const api = factory(root);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTRetargetMotionCompatibility = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root) {
  "use strict";

  const VERSION = "retarget-motion-compatibility-v1";
  const ROOT_BONE = "Hips";
  const LIMITS = Object.freeze({
    nonRootPositionRatio: 0.02,
    nonRootPositionFloor: 1e-4,
    scaleRatio: 0.03,
    parentChildRatio: 0.05,
    rootDisplacementRatio: 2.5
  });

  const finiteArray = values => Array.isArray(values) && values.every(Number.isFinite);
  const copy = (value, fallback) => {
    const out = value?.toArray?.() || (Array.isArray(value) ? value : null);
    return out && out.length ? Array.from(out, Number) : Array.from(fallback || []);
  };
  const magnitude = values => Math.sqrt((values || []).reduce((sum, value) => sum + Number(value || 0) ** 2, 0));
  const distance = (a, b) => magnitude((a || []).map((value, index) => Number(value || 0) - Number(b?.[index] || 0)));

  function findNodes(scene) {
    const out = new Map();
    scene?.traverse?.(node => {
      if (node?.isBone && node?.name && node.position && node.quaternion && node.scale) out.set(node.name, node);
    });
    return out;
  }

  function worldPosition(THREE, node) {
    if (node?.getWorldPosition && THREE?.Vector3) {
      const vector = new THREE.Vector3();
      node.getWorldPosition(vector);
      return copy(vector, [0, 0, 0]);
    }
    if (node?.worldPosition) return copy(node.worldPosition, [0, 0, 0]);
    return copy(node?.position, [0, 0, 0]);
  }

  function skeletonSpan(snapshot) {
    const positions = (snapshot?.order || []).map(name => snapshot.bones?.[name]?.worldPosition).filter(finiteArray);
    if (positions.length < 2) return 0;
    const ys = positions.map(value => value[1]);
    const vertical = Math.max(...ys) - Math.min(...ys);
    if (vertical > 1e-6) return vertical;
    let maximum = 0;
    for (let i = 0; i < positions.length; i++) for (let j = i + 1; j < positions.length; j++) maximum = Math.max(maximum, distance(positions[i], positions[j]));
    return maximum;
  }

  function capturePose(THREE, scene) {
    scene?.updateMatrixWorld?.(true);
    const nodes = findNodes(scene), bones = {}, order = [];
    nodes.forEach((node, name) => {
      const parentName = node.parent?.name && nodes.has(node.parent.name) ? node.parent.name : null;
      const position = copy(node.position, [0, 0, 0]);
      const quaternion = copy(node.quaternion, [0, 0, 0, 1]);
      const scale = copy(node.scale, [1, 1, 1]);
      const world = worldPosition(THREE, node);
      bones[name] = Object.freeze({ name, parentName, position: Object.freeze(position), quaternion: Object.freeze(quaternion), scale: Object.freeze(scale), worldPosition: Object.freeze(world) });
      order.push(name);
    });
    const snapshot = { bones: Object.freeze(bones), order: Object.freeze(order) };
    return Object.freeze({ ...snapshot, span: skeletonSpan(snapshot) });
  }

  function normalizedQuaternion(values) {
    if (!finiteArray(values) || values.length !== 4) return null;
    const length = magnitude(values);
    if (!(length > 1e-12)) return null;
    return values.map(value => value / length);
  }
  function quaternionMultiply(a, b) {
    return [
      a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
      a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
      a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
      a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
    ];
  }
  const quaternionInverse = q => [-q[0], -q[1], -q[2], q[3]];

  function parseTrack(track) {
    const name = String(track?.name || "");
    const dot = name.lastIndexOf(".");
    return dot > 0 ? { nodeName: name.slice(0, dot), property: name.slice(dot + 1) } : { nodeName: name, property: "" };
  }

  function cloneTrack(track) {
    if (track?.clone) return track.clone();
    return Object.assign(Object.create(Object.getPrototypeOf(track) || Object.prototype), track, {
      times: track?.times ? Array.from(track.times) : [],
      values: track?.values ? Array.from(track.values) : []
    });
  }

  function trackItemSize(track, property) {
    const reported = track?.getValueSize?.();
    if (Number.isInteger(reported)) return reported;
    if (property === "quaternion") return 4;
    if (property === "position" || property === "scale") return 3;
    const keys = Number(track?.times?.length || 0);
    return keys > 0 ? Number(track?.values?.length || 0) / keys : 0;
  }

  function sourceRiskForTrack(track, targetRest, rootBone) {
    const { nodeName, property } = parseTrack(track), size = trackItemSize(track, property), values = Array.from(track?.values || []), times = Array.from(track?.times || []);
    if (!size || values.length % size) return null;
    if (property === "scale") {
      for (let offset = 0, key = 0; offset < values.length; offset += size, key++) {
        const sampled = values.slice(offset, offset + size), baseline = targetRest?.scale || [1, 1, 1];
        const ratios = sampled.map((value, index) => Math.abs(Number(baseline[index] || 1)) > 1e-9 ? Math.abs(value / baseline[index] - 1) : Math.abs(value - baseline[index]));
        const delta = Math.max(...ratios);
        if (!finiteArray(sampled) || delta > LIMITS.scaleRatio) return Object.freeze({ bone: nodeName, property, timestamp: Number(times[key] || 0), baseline: Object.freeze(Array.from(baseline)), sampled: Object.freeze(sampled), delta, ratio: 1 + delta });
      }
    }
    if (property === "position" && nodeName !== rootBone && targetRest?.position) {
      const tolerance = Math.max(LIMITS.nonRootPositionFloor, magnitude(targetRest.position) * LIMITS.nonRootPositionRatio);
      for (let offset = 0, key = 0; offset < values.length; offset += size, key++) {
        const sampled = values.slice(offset, offset + size), delta = distance(sampled, targetRest.position);
        if (!finiteArray(sampled) || delta > tolerance) return Object.freeze({ bone: nodeName, property, timestamp: Number(times[key] || 0), baseline: Object.freeze(Array.from(targetRest.position)), sampled: Object.freeze(sampled), delta, ratio: tolerance > 0 ? delta / tolerance : Infinity });
      }
    }
    return null;
  }

  function prepareClip(THREE, clip, sourceScene, targetScene, options = {}) {
    if (!clip?.tracks?.length) return Object.freeze({ status: "failed", code: "retarget_clip_missing", diagnostics: Object.freeze({ firstFailure: "RETARGET_CLIP_NORMALIZATION" }) });
    const rootBone = options.rootBone || options.mappingProfile?.canonicalMap?.Hips || ROOT_BONE;
    const sourcePose = capturePose(THREE, sourceScene), targetPose = capturePose(THREE, targetScene);
    const sourceSpan = sourcePose.span, targetSpan = targetPose.span;
    const measuredScale = sourceSpan > 1e-6 && targetSpan > 1e-6 ? targetSpan / sourceSpan : 1;
    const rootScaleRatio = Number.isFinite(measuredScale) && measuredScale >= 0.25 && measuredScale <= 4 ? measuredScale : 1;
    const output = [], diagnostics = { sourceTrackCount: clip.tracks.length, playableTrackCount: 0, quaternionTrackCount: 0, rootTranslationTrackCount: 0, removedNonRootPositionTrackCount: 0, removedScaleTrackCount: 0, passthroughTrackCount: 0, rootBone, rootScaleRatio, sourceSkeletonSpan: sourceSpan, targetSkeletonSpan: targetSpan, normalizationMode: "target-rest + source-motion-delta", firstSourceRisk: null };

    for (const sourceTrack of clip.tracks) {
      const { nodeName, property } = parseTrack(sourceTrack), size = trackItemSize(sourceTrack, property), rawValues = Array.from(sourceTrack?.values || []);
      if (!size || rawValues.length % size || !finiteArray(rawValues)) {
        return Object.freeze({ status: "failed", code: "retarget_track_non_finite", diagnostics: Object.freeze({ ...diagnostics, firstFailure: "RETARGET_CLIP_NORMALIZATION", firstSourceRisk: Object.freeze({ bone: nodeName, property, timestamp: 0, baseline: null, sampled: Object.freeze(rawValues.slice(0, Math.max(size, 1))), delta: Infinity, ratio: Infinity }) }) });
      }
      const targetRest = targetPose.bones[nodeName] || null;
      if (!diagnostics.firstSourceRisk) diagnostics.firstSourceRisk = sourceRiskForTrack(sourceTrack, targetRest, rootBone);
      if (property === "scale") { diagnostics.removedScaleTrackCount++; continue; }
      if (property === "position" && nodeName !== rootBone) { diagnostics.removedNonRootPositionTrackCount++; continue; }

      const track = cloneTrack(sourceTrack);
      if (property === "position" && nodeName === rootBone) {
        const sourceRest = sourcePose.bones[nodeName]?.position || targetRest?.position || [0, 0, 0];
        const targetBaseline = targetRest?.position || sourceRest;
        const values = Array.from(track.values || []);
        for (let offset = 0; offset < values.length; offset += 3) for (let axis = 0; axis < 3; axis++) values[offset + axis] = targetBaseline[axis] + (values[offset + axis] - sourceRest[axis]) * rootScaleRatio;
        track.values = track.values?.constructor && track.values.constructor !== Array ? new track.values.constructor(values) : values;
        diagnostics.rootTranslationTrackCount++; output.push(track); continue;
      }
      if (property === "quaternion") {
        const sourceRest = normalizedQuaternion(sourcePose.bones[nodeName]?.quaternion || targetRest?.quaternion || [0, 0, 0, 1]);
        const targetRestQuat = normalizedQuaternion(targetRest?.quaternion || sourceRest || [0, 0, 0, 1]);
        if (!sourceRest || !targetRestQuat) return Object.freeze({ status: "failed", code: "retarget_rest_quaternion_invalid", diagnostics: Object.freeze({ ...diagnostics, firstFailure: "RETARGET_CLIP_NORMALIZATION", firstSourceRisk: Object.freeze({ bone: nodeName, property, timestamp: 0, baseline: sourcePose.bones[nodeName]?.quaternion || null, sampled: targetRest?.quaternion || null, delta: Infinity, ratio: Infinity }) }) });
        const values = Array.from(track.values || []);
        for (let offset = 0; offset < values.length; offset += 4) {
          const sampled = normalizedQuaternion(values.slice(offset, offset + 4));
          if (!sampled) return Object.freeze({ status: "failed", code: "retarget_quaternion_non_finite", diagnostics: Object.freeze({ ...diagnostics, firstFailure: "RETARGET_CLIP_NORMALIZATION", firstSourceRisk: Object.freeze({ bone: nodeName, property, timestamp: Number(track.times?.[offset / 4] || 0), baseline: Object.freeze(Array.from(sourceRest)), sampled: Object.freeze(values.slice(offset, offset + 4)), delta: Infinity, ratio: Infinity }) }) });
          const delta = quaternionMultiply(quaternionInverse(sourceRest), sampled);
          const compensated = normalizedQuaternion(quaternionMultiply(targetRestQuat, delta));
          for (let axis = 0; axis < 4; axis++) values[offset + axis] = compensated[axis];
        }
        track.values = track.values?.constructor && track.values.constructor !== Array ? new track.values.constructor(values) : values;
        diagnostics.quaternionTrackCount++; output.push(track); continue;
      }
      diagnostics.passthroughTrackCount++; output.push(track);
    }

    if (!output.length) return Object.freeze({ status: "failed", code: "retarget_playable_tracks_missing", diagnostics: Object.freeze({ ...diagnostics, firstFailure: "RETARGET_CLIP_NORMALIZATION" }) });
    const safeClip = clip.clone ? clip.clone() : Object.assign({}, clip);
    safeClip.name = `${clip.name || "retargeted-motion"} [REST-SPACE SAFE]`;
    safeClip.tracks = output;
    safeClip.duration = clip.duration;
    diagnostics.playableTrackCount = output.length;
    diagnostics.firstSourceRisk = diagnostics.firstSourceRisk ? Object.freeze(diagnostics.firstSourceRisk) : null;
    return Object.freeze({ status: "ready", clip: safeClip, baseline: targetPose, diagnostics: Object.freeze(diagnostics) });
  }

  function offender(bone, property, timestamp, baseline, sampled, delta, ratio) {
    return Object.freeze({ bone, property, timestamp: Number(timestamp || 0), baseline: baseline == null ? null : Object.freeze(Array.from(baseline)), sampled: sampled == null ? null : Object.freeze(Array.from(sampled)), delta: Number(delta), ratio: Number(ratio) });
  }

  function validatePose(THREE, baseline, targetScene, options = {}) {
    const rootBone = options.rootBone || ROOT_BONE, limits = Object.assign({}, LIMITS, options.limits || {}), timestamp = Number(options.timestamp || 0);
    const current = capturePose(THREE, targetScene), span = baseline?.span || current.span || 1;
    for (const name of baseline?.order || []) {
      const before = baseline.bones[name], after = current.bones[name];
      if (!after) return Object.freeze({ status: "FAIL", boundary: "RETARGETED_POSE_ANATOMY_VALID", code: "RETARGETED_POSE_ANATOMY_INVALID", offender: offender(name, "node_missing", timestamp, [], [], Infinity, Infinity) });
      for (const property of ["position", "quaternion", "scale", "worldPosition"]) {
        if (!finiteArray(after[property])) return Object.freeze({ status: "FAIL", boundary: "RETARGETED_POSE_ANATOMY_VALID", code: "RETARGETED_POSE_ANATOMY_INVALID", offender: offender(name, property, timestamp, before[property], after[property], Infinity, Infinity) });
      }
      const scaleDeltas = after.scale.map((value, index) => Math.abs(Number(before.scale[index] || 1)) > 1e-9 ? Math.abs(value / before.scale[index] - 1) : Math.abs(value - before.scale[index]));
      const scaleDelta = Math.max(...scaleDeltas);
      if (scaleDelta > limits.scaleRatio) return Object.freeze({ status: "FAIL", boundary: "RETARGETED_POSE_ANATOMY_VALID", code: "RETARGETED_POSE_ANATOMY_INVALID", offender: offender(name, "scale", timestamp, before.scale, after.scale, scaleDelta, 1 + scaleDelta) });
      if (name !== rootBone) {
        const delta = distance(before.position, after.position), tolerance = Math.max(limits.nonRootPositionFloor, magnitude(before.position) * limits.nonRootPositionRatio);
        if (delta > tolerance) return Object.freeze({ status: "FAIL", boundary: "RETARGETED_POSE_ANATOMY_VALID", code: "RETARGETED_POSE_ANATOMY_INVALID", offender: offender(name, "position", timestamp, before.position, after.position, delta, tolerance > 0 ? delta / tolerance : Infinity) });
      }
      if (before.parentName && baseline.bones[before.parentName] && current.bones[before.parentName]) {
        const baseDistance = distance(before.worldPosition, baseline.bones[before.parentName].worldPosition), sampledDistance = distance(after.worldPosition, current.bones[before.parentName].worldPosition);
        if (baseDistance > 1e-6) {
          const ratio = sampledDistance / baseDistance;
          if (!Number.isFinite(ratio) || Math.abs(ratio - 1) > limits.parentChildRatio) return Object.freeze({ status: "FAIL", boundary: "RETARGETED_POSE_ANATOMY_VALID", code: "RETARGETED_POSE_ANATOMY_INVALID", offender: offender(name, "parent_child_distance", timestamp, [baseDistance], [sampledDistance], Math.abs(sampledDistance - baseDistance), ratio) });
        }
      }
    }
    const rootBefore = baseline?.bones?.[rootBone], rootAfter = current?.bones?.[rootBone];
    if (rootBefore && rootAfter) {
      const delta = distance(rootBefore.position, rootAfter.position), ratio = delta / Math.max(span, 1e-6);
      if (!Number.isFinite(ratio) || ratio > limits.rootDisplacementRatio) return Object.freeze({ status: "FAIL", boundary: "RETARGETED_POSE_ANATOMY_VALID", code: "RETARGETED_POSE_ANATOMY_INVALID", offender: offender(rootBone, "root_displacement", timestamp, rootBefore.position, rootAfter.position, delta, ratio) });
    }
    return Object.freeze({ status: "PASS", boundary: "RETARGETED_POSE_ANATOMY_VALID", code: null, offender: null, timestamp, span });
  }

  function assignTransform(target, values) {
    if (!target || !values) return;
    if (target.fromArray) { target.fromArray(values); return; }
    if (target.set) { target.set(...values); return; }
    if (Array.isArray(target.values)) { target.values = Array.from(values); return; }
    ["x", "y", "z", "w"].slice(0, values.length).forEach((key, index) => { target[key] = values[index]; });
  }

  function restorePose(baseline, targetScene) {
    if (!baseline || !targetScene) return false;
    const nodes = findNodes(targetScene);
    for (const name of baseline.order || []) {
      const node = nodes.get(name), value = baseline.bones[name];
      if (!node || !value) continue;
      assignTransform(node.position, value.position); assignTransform(node.quaternion, value.quaternion); assignTransform(node.scale, value.scale);
    }
    targetScene.updateMatrixWorld?.(true);
    return true;
  }

  function failureDetail(validation) {
    const item = validation?.offender;
    if (!item) return "retargeted pose failed structural validation";
    return `bone=${item.bone}; property=${item.property}; t=${item.timestamp.toFixed(6)}; baseline=${JSON.stringify(item.baseline)}; sampled=${JSON.stringify(item.sampled)}; delta=${item.delta}; ratio=${item.ratio}`;
  }

  function decorateSession(session) {
    if (!session || session.__thrillerRetargetSafetyInstalled) return session;
    Object.defineProperty(session, "__thrillerRetargetSafetyInstalled", { value: true, configurable: false });
    const originalLoad = session.loadIndependentRetargetedMotion?.bind(session), originalPlay = session.play?.bind(session), originalStop = session.stop?.bind(session), originalUnload = session.unloadMotion?.bind(session), originalOnFrame = session.options?.onFrame;
    if (!originalLoad || !originalPlay) return session;

    function mergeBoundary(boundaries, boundary, status, detail) {
      const kept = (boundaries || []).filter(item => item?.boundary !== boundary && item?.boundary !== "THRILLER_VISIBLE_PLAYBACK_CONFIRMED");
      kept.push(Object.freeze({ boundary, status, detail }));
      return kept;
    }
    function failAnatomy(validation) {
      const detail = failureDetail(validation), current = session.thrillerDiagnostics || {};
      originalStop?.(); restorePose(session.__thrillerAnatomyBaseline, session.avatar);
      const anatomyBoundaries = mergeBoundary(current.boundaries, "RETARGETED_POSE_ANATOMY_VALID", "FAIL", detail);
      anatomyBoundaries.push(Object.freeze({ boundary: "RETARGETED_POSE_ANATOMY_FIRST_OFFENDER", status: `INFO ${detail}`, detail }));
      const boundaries = Object.freeze(anatomyBoundaries);
      session.thrillerDiagnostics = { ...current, boundaries, playbackState: "failed", firstFailingBoundary: "RETARGETED_POSE_ANATOMY_INVALID", anatomyValidation: Object.freeze(validation), anatomyFailure: validation.offender || null, anatomyFailureDetail: detail };
      session.diagnostic?.("retargeted_pose_anatomy_invalid", { firstFailure: "RETARGETED_POSE_ANATOMY_INVALID", detail });
      return Object.freeze({ status: "failed", code: "RETARGETED_POSE_ANATOMY_INVALID", diagnostics: Object.freeze({ ...session.thrillerDiagnostics }) });
    }

    session.loadIndependentRetargetedMotion = async function loadIndependentRetargetedMotionWithSafety(motion) {
      const loaded = await originalLoad(motion);
      if (loaded?.status !== "ready") return loaded;
      const sourceClip = session.sessionClip, sourceScene = session.animationFixture?.scene;
      let mappingProfile = null;
      try { mappingProfile = root.PocketPTMotionLabGymCompatibility?.loadProfile?.() || null; } catch (_) {}
      const prepared = prepareClip(session.THREE, sourceClip, sourceScene, session.avatar, { mappingProfile, rootBone: mappingProfile?.canonicalMap?.Hips || ROOT_BONE, sourceProfile: motion?.sourceSkeletonProfile, targetProfile: motion?.targetSkeletonProfile });
      if (prepared.status !== "ready") {
        const detail = failureDetail({ offender: prepared.diagnostics?.firstSourceRisk });
        originalStop?.();
        const diagnostics = { ...loaded.diagnostics, ...prepared.diagnostics, playbackState: "failed", firstFailingBoundary: "RETARGET_CLIP_NORMALIZATION", anatomyFailureDetail: detail };
        session.thrillerDiagnostics = diagnostics;
        return Object.freeze({ status: "failed", code: prepared.code || "retarget_clip_normalization_failed", diagnostics: Object.freeze({ ...diagnostics }) });
      }
      const oldClip = session.sessionClip;
      originalStop?.(); session.mixer?.uncacheAction?.(oldClip, session.avatar);
      session.sessionClip = prepared.clip; session.action = session.mixer.clipAction(prepared.clip, session.avatar); session.setLoop?.(session.loop);
      session.__thrillerAnatomyBaseline = prepared.baseline; session.__thrillerRootBone = prepared.diagnostics.rootBone; session.__thrillerRetargetDiagnostics = prepared.diagnostics;
      const boundaries = [...(loaded.diagnostics?.boundaries || []), Object.freeze({ boundary: "RETARGET_CLIP_NORMALIZED", status: "PASS", detail: `${prepared.diagnostics.sourceTrackCount} source -> ${prepared.diagnostics.playableTrackCount} structurally safe tracks; ${prepared.diagnostics.removedNonRootPositionTrackCount} non-root position + ${prepared.diagnostics.removedScaleTrackCount} scale tracks removed; root translation rebased; quaternions rest-compensated` })];
      if (prepared.diagnostics.firstSourceRisk) boundaries.push(Object.freeze({ boundary: "RETARGET_SOURCE_FIRST_RISK", status: `INFO ${failureDetail({ offender: prepared.diagnostics.firstSourceRisk })}`, detail: failureDetail({ offender: prepared.diagnostics.firstSourceRisk }) }));
      session.thrillerDiagnostics = { ...loaded.diagnostics, boundaries: Object.freeze(boundaries), playableTrackCount: prepared.diagnostics.playableTrackCount, retargetNormalization: prepared.diagnostics, firstSourceRisk: prepared.diagnostics.firstSourceRisk, runtimeClipName: prepared.clip.name, playbackState: "ready", firstFailingBoundary: "THRILLER_VISIBLE_PLAYBACK_NOT_CONFIRMED" };
      return Object.freeze({ status: "ready", diagnostics: Object.freeze({ ...session.thrillerDiagnostics }) });
    };

    session.play = function playWithAnatomyValidation() {
      const played = originalPlay();
      if (!session.thrillerDiagnostics || played?.status === "failed") return played;
      const validation = validatePose(session.THREE, session.__thrillerAnatomyBaseline, session.avatar, { rootBone: session.__thrillerRootBone || ROOT_BONE, timestamp: Number(session.action?.time || 0) });
      if (validation.status !== "PASS") return failAnatomy(validation);
      const current = session.thrillerDiagnostics || played.diagnostics || {}, withoutFinal = (current.boundaries || []).filter(item => item.boundary !== "RETARGETED_POSE_ANATOMY_VALID" && item.boundary !== "THRILLER_VISIBLE_PLAYBACK_CONFIRMED");
      const boundaries = Object.freeze([...withoutFinal, Object.freeze({ boundary: "RETARGETED_POSE_ANATOMY_VALID", status: "PASS", detail: `structural invariants valid at ${validation.timestamp.toFixed(6)}s` }), Object.freeze({ boundary: "THRILLER_VISIBLE_PLAYBACK_CONFIRMED", status: "PASS", detail: "mounted avatar transforms changed and anatomy remained structurally valid" })]);
      session.thrillerDiagnostics = { ...current, boundaries, anatomyValidation: validation, anatomyFailure: null, anatomyFailureDetail: null, playbackState: "playing", firstFailingBoundary: "NONE" };
      return Object.freeze({ status: "playing", diagnostics: Object.freeze({ ...session.thrillerDiagnostics }) });
    };

    if (session.options) session.options.onFrame = function thrillerSafetyFrame(active) {
      if (session.thrillerDiagnostics?.playbackState === "playing" && session.__thrillerAnatomyBaseline) {
        const validation = validatePose(session.THREE, session.__thrillerAnatomyBaseline, session.avatar, { rootBone: session.__thrillerRootBone || ROOT_BONE, timestamp: Number(session.action?.time || 0) });
        if (validation.status !== "PASS") failAnatomy(validation);
      }
      return originalOnFrame?.(active);
    };

    if (originalStop) session.stop = function stopWithRestoration() { const out = originalStop(); if (session.__thrillerAnatomyBaseline) restorePose(session.__thrillerAnatomyBaseline, session.avatar); return out; };
    if (originalUnload) session.unloadMotion = function unloadMotionWithSafetyCleanup() { const out = originalUnload(); session.__thrillerAnatomyBaseline = null; session.__thrillerRootBone = null; session.__thrillerRetargetDiagnostics = null; return out; };
    return session;
  }

  function installRuntime(runtime) {
    if (!runtime?.createMotionSession) return null;
    if (runtime.__thrillerRetargetCompatibilityInstalled) return runtime;
    const wrapped = Object.assign({}, runtime, {
      __thrillerRetargetCompatibilityInstalled: true,
      createMotionSession(options) { return decorateSession(runtime.createMotionSession(options)); }
    });
    return Object.freeze(wrapped);
  }

  return Object.freeze({ VERSION, ROOT_BONE, LIMITS, capturePose, prepareClip, validatePose, restorePose, failureDetail, decorateSession, installRuntime });
});
