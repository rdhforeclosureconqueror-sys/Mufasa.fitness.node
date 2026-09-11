(function (root, factory) {
  const base = typeof module === "object" && module.exports ? require("./retarget-motion-compatibility") : root.PocketPTRetargetMotionCompatibility;
  const api = factory(root, base);
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTRetargetMotionCompatibility = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function (root, base) {
  "use strict";
  if (!base) throw new Error("retarget-motion-compatibility base policy required");

  const REVIEW_HARDENING_VERSION = "retarget-review-hardening-v1";
  const ROOT_BONE = base.ROOT_BONE || "Hips";
  const finiteArray = values => Array.isArray(values) && values.every(Number.isFinite);
  const magnitude = values => Math.sqrt((values || []).reduce((sum, value) => sum + Number(value || 0) ** 2, 0));
  const distance = (a, b) => magnitude((a || []).map((value, index) => Number(value || 0) - Number(b?.[index] || 0)));
  const normalizedQuaternion = values => {
    if (!finiteArray(values) || values.length !== 4) return null;
    const length = magnitude(values);
    return length > 1e-12 ? values.map(value => value / length) : null;
  };
  const quaternionMultiply = (a, b) => [
    a[3] * b[0] + a[0] * b[3] + a[1] * b[2] - a[2] * b[1],
    a[3] * b[1] - a[0] * b[2] + a[1] * b[3] + a[2] * b[0],
    a[3] * b[2] + a[0] * b[1] - a[1] * b[0] + a[2] * b[3],
    a[3] * b[3] - a[0] * b[0] - a[1] * b[1] - a[2] * b[2]
  ];
  const quaternionInverse = q => [-q[0], -q[1], -q[2], q[3]];
  const quaternionDot = (a, b) => Math.abs(a.reduce((sum, value, index) => sum + value * b[index], 0));
  const quaternionAngle = (a, b) => 2 * Math.acos(Math.min(1, Math.max(-1, quaternionDot(a, b))));
  const parseTrack = track => {
    const name = String(track?.name || ""), dot = name.lastIndexOf(".");
    return dot > 0 ? { nodeName: name.slice(0, dot), property: name.slice(dot + 1) } : { nodeName: name, property: "" };
  };
  const cloneTrack = track => track?.clone ? track.clone() : Object.assign(Object.create(Object.getPrototypeOf(track) || Object.prototype), track, {
    times: track?.times ? Array.from(track.times) : [], values: track?.values ? Array.from(track.values) : []
  });
  const itemSize = (track, property) => {
    const reported = track?.getValueSize?.();
    if (Number.isInteger(reported)) return reported;
    if (property === "quaternion") return 4;
    if (property === "position" || property === "scale") return 3;
    return track?.times?.length ? Number(track.values?.length || 0) / track.times.length : 0;
  };
  const quaternionAt = (values, index) => {
    const offset = index * 4;
    return [Number(values?.[offset]), Number(values?.[offset + 1]), Number(values?.[offset + 2]), Number(values?.[offset + 3])];
  };
  function lowerBound(times, timestamp) {
    let low = 0, high = Number(times?.length || 0);
    while (low < high) {
      const mid = (low + high) >> 1;
      if (Number(times[mid]) < timestamp) low = mid + 1;
      else high = mid;
    }
    return low;
  }
  function slerp(a, b, alpha) {
    let dot = a.reduce((sum, value, index) => sum + value * b[index], 0), end = b;
    if (dot < 0) { dot = -dot; end = b.map(value => -value); }
    if (dot > 0.9995) return normalizedQuaternion(a.map((value, index) => value + alpha * (end[index] - value)));
    const theta = Math.acos(Math.min(1, dot)), sin = Math.sin(theta);
    return a.map((value, index) => (Math.sin((1 - alpha) * theta) * value + Math.sin(alpha * theta) * end[index]) / sin);
  }
  function sampleQuaternionTrack(track, timestamp, fallback) {
    const times = track?.times || [], values = track?.values || [], count = Number(times.length || 0);
    if (!count) return fallback;
    const upper = lowerBound(times, timestamp);
    if (upper <= 0) return normalizedQuaternion(quaternionAt(values, 0)) || fallback;
    if (upper >= count) return normalizedQuaternion(quaternionAt(values, count - 1)) || fallback;
    const lower = upper - 1, span = Number(times[upper]) - Number(times[lower]), alpha = span > 0 ? (timestamp - Number(times[lower])) / span : 0;
    return slerp(normalizedQuaternion(quaternionAt(values, lower)) || fallback, normalizedQuaternion(quaternionAt(values, upper)) || fallback, alpha);
  }
  function externalParentWorld(rest) {
    const local = normalizedQuaternion(Array.from(rest?.quaternion || [])), world = normalizedQuaternion(Array.from(rest?.worldQuaternion || []));
    return local && world ? normalizedQuaternion(quaternionMultiply(world, quaternionInverse(local))) : [0, 0, 0, 1];
  }
  function sourceRiskForTrack(track, targetRest, rootBone) {
    const { nodeName, property } = parseTrack(track), size = itemSize(track, property), values = track?.values || [], times = track?.times || [];
    if (!size || Number(values.length || 0) % size) return null;
    if (property === "scale") {
      for (let offset = 0, key = 0; offset < values.length; offset += size, key++) {
        const sampled = Array.from({length:size}, (_,axis) => Number(values[offset + axis])), baseline = targetRest?.scale || [1,1,1];
        const delta = Math.max(...sampled.map((value, axis) => Math.abs(Number(baseline[axis] || 1)) > 1e-9 ? Math.abs(value / baseline[axis] - 1) : Math.abs(value - baseline[axis])));
        if (!finiteArray(sampled) || delta > (base.LIMITS?.scaleRatio || 0.03)) return Object.freeze({bone:nodeName,property,timestamp:Number(times[key]||0),baseline:Object.freeze(Array.from(baseline)),sampled:Object.freeze(sampled),delta,ratio:1+delta});
      }
    }
    if (property === "position" && nodeName !== rootBone && targetRest?.position) {
      const tolerance = Math.max(base.LIMITS?.nonRootPositionFloor || 1e-4, magnitude(targetRest.position) * (base.LIMITS?.nonRootPositionRatio || 0.02));
      for (let offset = 0, key = 0; offset < values.length; offset += size, key++) {
        const sampled = Array.from({length:size}, (_,axis) => Number(values[offset + axis])), delta = distance(sampled, targetRest.position);
        if (!finiteArray(sampled) || delta > tolerance) return Object.freeze({bone:nodeName,property,timestamp:Number(times[key]||0),baseline:Object.freeze(Array.from(targetRest.position)),sampled:Object.freeze(sampled),delta,ratio:tolerance>0?delta/tolerance:Infinity});
      }
    }
    return null;
  }

  function prepareClip(THREE, clip, sourceScene, targetScene, options = {}) {
    if (!clip?.tracks?.length) return Object.freeze({status:"failed",code:"retarget_clip_missing",diagnostics:Object.freeze({firstFailure:"RETARGET_CLIP_NORMALIZATION"})});
    const rootBone = options.rootBone || options.mappingProfile?.canonicalMap?.Hips || ROOT_BONE;
    const sourcePose = base.capturePose(THREE, sourceScene), targetPose = base.capturePose(THREE, targetScene);
    if (!sourcePose?.bones?.[rootBone] || !targetPose?.bones?.[rootBone]) return Object.freeze({status:"failed",code:"retarget_root_basis_missing",diagnostics:Object.freeze({firstFailure:"RETARGET_CLIP_NORMALIZATION",rootBone})});
    const measuredScale = sourcePose.span > 1e-6 && targetPose.span > 1e-6 ? targetPose.span / sourcePose.span : 1;
    const rootScaleRatio = Number.isFinite(measuredScale) && measuredScale >= 0.25 && measuredScale <= 4 ? measuredScale : 1;
    const quaternionTracks = new Map();
    for (const candidate of clip.tracks) { const parsed = parseTrack(candidate); if (parsed.property === "quaternion") quaternionTracks.set(parsed.nodeName, candidate); }
    if (!quaternionTracks.size) return Object.freeze({status:"failed",code:"retarget_quaternion_tracks_missing",diagnostics:Object.freeze({firstFailure:"RETARGET_CLIP_NORMALIZATION"})});

    const sourceWorldAt = (name, timestamp, cache) => {
      if (cache.has(name)) return cache.get(name);
      const rest = sourcePose.bones[name]; if (!rest) return null;
      const local = sampleQuaternionTrack(quaternionTracks.get(name), timestamp, normalizedQuaternion(Array.from(rest.quaternion)));
      if (!local) return null;
      const parentWorld = rest.parentName ? sourceWorldAt(rest.parentName, timestamp, cache) : externalParentWorld(rest);
      if (!parentWorld) return null;
      const world = normalizedQuaternion(quaternionMultiply(parentWorld, local)); cache.set(name, world); return world;
    };
    const targetLocalAt = (name, timestamp, sourceCache, targetCache) => {
      if (targetCache.has(name)) return targetCache.get(name).local;
      const sourceRest = sourcePose.bones[name], targetRest = targetPose.bones[name];
      if (!sourceRest || !targetRest) return null;
      const sourceAnimatedWorld = sourceWorldAt(name, timestamp, sourceCache);
      if (!sourceAnimatedWorld) return null;
      const sourceRestWorld = normalizedQuaternion(Array.from(sourceRest.worldQuaternion || [])), targetRestWorld = normalizedQuaternion(Array.from(targetRest.worldQuaternion || []));
      if (!sourceRestWorld || !targetRestWorld) return null;
      const semanticDelta = normalizedQuaternion(quaternionMultiply(sourceAnimatedWorld, quaternionInverse(sourceRestWorld)));
      const desiredWorld = semanticDelta && normalizedQuaternion(quaternionMultiply(semanticDelta, targetRestWorld));
      if (!desiredWorld) return null;
      let parentWorld = externalParentWorld(targetRest);
      if (targetRest.parentName) {
        if (!targetLocalAt(targetRest.parentName, timestamp, sourceCache, targetCache)) return null;
        parentWorld = targetCache.get(targetRest.parentName)?.world;
      }
      if (!parentWorld) return null;
      const local = normalizedQuaternion(quaternionMultiply(quaternionInverse(parentWorld), desiredWorld));
      if (!local) return null;
      targetCache.set(name,{local,world:desiredWorld,semanticWorldDelta:semanticDelta}); return local;
    };

    const output = [], outputTracks = new Map(), frameCaches = new Map();
    const cachesAt = timestamp => { const key = Number(timestamp); if (!frameCaches.has(key)) frameCaches.set(key, { source: new Map(), target: new Map() }); return frameCaches.get(key); };
    const diagnostics = {sourceTrackCount:clip.tracks.length,playableTrackCount:0,quaternionTrackCount:0,rootTranslationTrackCount:0,removedNonRootPositionTrackCount:0,removedScaleTrackCount:0,passthroughTrackCount:0,rootBone,rootScaleRatio,sourceSkeletonSpan:sourcePose.span,targetSkeletonSpan:targetPose.span,normalizationMode:"hierarchy-aware-world-rest-basis",samplingMode:"direct-binary-search+frame-cache",firstSourceRisk:null,rotationBasisSamples:[]};
    for (const sourceTrack of clip.tracks) {
      const {nodeName,property}=parseTrack(sourceTrack), size=itemSize(sourceTrack,property), raw=sourceTrack?.values||[];
      if (!size || Number(raw.length||0)%size) return Object.freeze({status:"failed",code:"retarget_track_invalid",diagnostics:Object.freeze({...diagnostics,firstFailure:"RETARGET_CLIP_NORMALIZATION"})});
      const targetRest=targetPose.bones[nodeName]||null;
      if (!diagnostics.firstSourceRisk) diagnostics.firstSourceRisk=sourceRiskForTrack(sourceTrack,targetRest,rootBone);
      if (property === "scale") { diagnostics.removedScaleTrackCount++; continue; }
      if (property === "position" && nodeName !== rootBone) { diagnostics.removedNonRootPositionTrackCount++; continue; }
      const track=cloneTrack(sourceTrack);
      if (property === "position" && nodeName === rootBone) {
        const sourceRest=sourcePose.bones[nodeName]?.position||targetRest?.position||[0,0,0], targetBaseline=targetRest?.position||sourceRest, values=Array.from(track.values||[]);
        for(let offset=0;offset<values.length;offset+=3)for(let axis=0;axis<3;axis++)values[offset+axis]=targetBaseline[axis]+(values[offset+axis]-sourceRest[axis])*rootScaleRatio;
        track.values=track.values?.constructor&&track.values.constructor!==Array?new track.values.constructor(values):values; diagnostics.rootTranslationTrackCount++; output.push(track); continue;
      }
      if (property === "quaternion") {
        if (!targetRest || !sourcePose.bones[nodeName]) return Object.freeze({status:"failed",code:"retarget_bone_basis_missing",diagnostics:Object.freeze({...diagnostics,firstFailure:"RETARGET_CLIP_NORMALIZATION",bone:nodeName})});
        const values=Array.from(track.values||[]), times=track.times||[];
        for(let offset=0;offset<values.length;offset+=4){const timestamp=Number(times[offset/4]||0), frame=cachesAt(timestamp), compensated=targetLocalAt(nodeName,timestamp,frame.source,frame.target);if(!compensated)return Object.freeze({status:"failed",code:"retarget_basis_conversion_failed",diagnostics:Object.freeze({...diagnostics,firstFailure:"RETARGET_CLIP_NORMALIZATION",bone:nodeName,timestamp})});for(let axis=0;axis<4;axis++)values[offset+axis]=compensated[axis];}
        track.values=track.values?.constructor&&track.values.constructor!==Array?new track.values.constructor(values):values; diagnostics.quaternionTrackCount++; outputTracks.set(nodeName,track); output.push(track); continue;
      }
      diagnostics.passthroughTrackCount++; output.push(track);
    }
    if(!output.length)return Object.freeze({status:"failed",code:"retarget_playable_tracks_missing",diagnostics:Object.freeze({...diagnostics,firstFailure:"RETARGET_CLIP_NORMALIZATION"})});
    const safeClip=clip.clone?clip.clone():Object.assign({},clip);safeClip.name=`${clip.name||"retargeted-motion"} [REST-SPACE SAFE]`;safeClip.tracks=output;safeClip.duration=clip.duration;diagnostics.playableTrackCount=output.length;
    diagnostics.kinematicReference=Object.freeze({sourcePose,targetPose,sourceQuaternionTracks:quaternionTracks,targetQuaternionTracks:outputTracks});
    diagnostics.firstSourceRisk=diagnostics.firstSourceRisk?Object.freeze(diagnostics.firstSourceRisk):null;
    return Object.freeze({status:"ready",clip:safeClip,baseline:targetPose,diagnostics:Object.freeze(diagnostics)});
  }

  function offender(bone, property, timestamp, baseline, sampled, delta, ratio){return Object.freeze({bone,property,timestamp:Number(timestamp||0),baseline:baseline==null?null:Object.freeze(Array.from(baseline)),sampled:sampled==null?null:Object.freeze(Array.from(sampled)),delta:Number(delta),ratio:Number(ratio)});}
  function validateKinematics(THREE, reference, targetScene, options={}) {
    const timestamp=Number(options.timestamp||0), tolerance=Number(options.angularTolerance||0.35);
    if(!reference?.sourcePose?.bones||!reference?.targetPose?.bones||!reference?.sourceQuaternionTracks?.size)return Object.freeze({status:"FAIL",boundary:"RETARGETED_POSE_KINEMATIC_VALID",code:"RETARGET_KINEMATIC_REFERENCE_MISSING",offender:null,timestamp});
    const current=base.capturePose(THREE,targetScene), cache=new Map();
    const sourceWorld=name=>{if(cache.has(name))return cache.get(name);const rest=reference.sourcePose.bones[name];if(!rest)return null;const local=sampleQuaternionTrack(reference.sourceQuaternionTracks.get(name),timestamp,normalizedQuaternion(Array.from(rest.quaternion)));if(!local)return null;const parent=rest.parentName?sourceWorld(rest.parentName):externalParentWorld(rest);if(!parent)return null;const world=normalizedQuaternion(quaternionMultiply(parent,local));cache.set(name,world);return world;};
    let compared=0;
    for(const name of reference.sourceQuaternionTracks.keys()){
      const sourceRest=reference.sourcePose.bones[name],targetRest=reference.targetPose.bones[name],targetNow=current.bones[name];
      if(!sourceRest||!targetRest||!targetNow)return Object.freeze({status:"FAIL",boundary:"RETARGETED_POSE_KINEMATIC_VALID",code:"RETARGET_KINEMATIC_BONE_MISSING",offender:offender(name,"semantic_world_rotation",timestamp,sourceRest?.worldQuaternion||null,targetNow?.worldQuaternion||null,Infinity,Infinity)});
      const sourceAnimated=sourceWorld(name),sourceRestWorld=normalizedQuaternion(Array.from(sourceRest.worldQuaternion||[])),targetRestWorld=normalizedQuaternion(Array.from(targetRest.worldQuaternion||[])),targetNowWorld=normalizedQuaternion(Array.from(targetNow.worldQuaternion||[]));
      if(!sourceAnimated||!sourceRestWorld||!targetRestWorld||!targetNowWorld)return Object.freeze({status:"FAIL",boundary:"RETARGETED_POSE_KINEMATIC_VALID",code:"RETARGET_KINEMATIC_BASIS_INVALID",offender:offender(name,"semantic_world_rotation",timestamp,sourceRest?.worldQuaternion||null,targetNow?.worldQuaternion||null,Infinity,Infinity)});
      const sourceDelta=normalizedQuaternion(quaternionMultiply(sourceAnimated,quaternionInverse(sourceRestWorld))),targetDelta=normalizedQuaternion(quaternionMultiply(targetNowWorld,quaternionInverse(targetRestWorld)));
      if(!sourceDelta||!targetDelta)return Object.freeze({status:"FAIL",boundary:"RETARGETED_POSE_KINEMATIC_VALID",code:"RETARGET_KINEMATIC_BASIS_INVALID",offender:offender(name,"semantic_world_rotation",timestamp,sourceDelta,targetDelta,Infinity,Infinity)});
      const delta=quaternionAngle(sourceDelta,targetDelta);compared++;
      if(!Number.isFinite(delta)||delta>tolerance)return Object.freeze({status:"FAIL",boundary:"RETARGETED_POSE_KINEMATIC_VALID",code:"RETARGETED_POSE_KINEMATIC_INVALID",offender:offender(name,"semantic_world_rotation",timestamp,sourceDelta,targetDelta,delta,tolerance>0?delta/tolerance:Infinity)});
    }
    if(!compared)return Object.freeze({status:"FAIL",boundary:"RETARGETED_POSE_KINEMATIC_VALID",code:"RETARGET_KINEMATIC_REFERENCE_MISSING",offender:null,timestamp});
    return Object.freeze({status:"PASS",boundary:"RETARGETED_POSE_KINEMATIC_VALID",code:null,offender:null,timestamp,angularTolerance:tolerance,comparedBones:compared});
  }

  function failureDetail(validation){const item=validation?.offender;if(!item)return validation?.code||validation?.boundary||"retargeted pose failed validation";return `bone=${item.bone}; property=${item.property}; t=${item.timestamp.toFixed(6)}; baseline=${JSON.stringify(item.baseline)}; sampled=${JSON.stringify(item.sampled)}; delta=${item.delta}; ratio=${item.ratio}`;}
  function decorateSession(session){
    if(!session||session.__thrillerRetargetSafetyInstalled)return session;Object.defineProperty(session,"__thrillerRetargetSafetyInstalled",{value:true,configurable:false});
    const originalLoad=session.loadIndependentRetargetedMotion?.bind(session),originalPlay=session.play?.bind(session),originalStop=session.stop?.bind(session),originalUnload=session.unloadMotion?.bind(session),originalOnFrame=session.options?.onFrame;if(!originalLoad||!originalPlay)return session;
    function mergeBoundary(boundaries,boundary,status,detail){const kept=(boundaries||[]).filter(item=>item?.boundary!==boundary&&item?.boundary!=="THRILLER_VISIBLE_PLAYBACK_CONFIRMED");kept.push(Object.freeze({boundary,status,detail}));return kept;}
    function failValidation(validation){const detail=failureDetail(validation),current=session.thrillerDiagnostics||{};originalStop?.();base.restorePose(session.__thrillerAnatomyBaseline,session.avatar);const failure=validation.code||"RETARGETED_POSE_STRUCTURE_INVALID",boundary=validation.boundary||"RETARGETED_POSE_STRUCTURE_VALID",failed=mergeBoundary(current.boundaries,boundary,"FAIL",detail);failed.push(Object.freeze({boundary:`${boundary}_FIRST_OFFENDER`,status:`INFO ${detail}`,detail}));session.thrillerDiagnostics={...current,boundaries:Object.freeze(failed),playbackState:"failed",firstFailingBoundary:failure,poseValidation:Object.freeze(validation),anatomyFailure:validation.offender||null,anatomyFailureDetail:detail};session.diagnostic?.("retargeted_pose_validation_invalid",{firstFailure:failure,detail});return Object.freeze({status:"failed",code:failure,diagnostics:Object.freeze({...session.thrillerDiagnostics})});}
    session.loadIndependentRetargetedMotion=async function(motion){const loaded=await originalLoad(motion);if(loaded?.status!=="ready")return loaded;const sourceClip=session.sessionClip,sourceScene=session.animationFixture?.scene;let mappingProfile=null;try{mappingProfile=root.PocketPTMotionLabGymCompatibility?.loadProfile?.()||null;}catch(_){}const prepared=prepareClip(session.THREE,sourceClip,sourceScene,session.avatar,{mappingProfile,rootBone:mappingProfile?.canonicalMap?.Hips||ROOT_BONE,sourceProfile:motion?.sourceSkeletonProfile,targetProfile:motion?.targetSkeletonProfile});if(prepared.status!=="ready"){const detail=failureDetail({code:prepared.code,offender:prepared.diagnostics?.firstSourceRisk});originalStop?.();const diagnostics={...loaded.diagnostics,...prepared.diagnostics,playbackState:"failed",firstFailingBoundary:"RETARGET_CLIP_NORMALIZATION",anatomyFailureDetail:detail};session.thrillerDiagnostics=diagnostics;return Object.freeze({status:"failed",code:prepared.code||"retarget_clip_normalization_failed",diagnostics:Object.freeze({...diagnostics})});}const oldClip=session.sessionClip;originalStop?.();session.mixer?.uncacheAction?.(oldClip,session.avatar);session.sessionClip=prepared.clip;session.action=session.mixer.clipAction(prepared.clip,session.avatar);session.setLoop?.(session.loop);session.__thrillerAnatomyBaseline=prepared.baseline;session.__thrillerRootBone=prepared.diagnostics.rootBone;session.__thrillerRetargetDiagnostics=prepared.diagnostics;const boundaries=[...(loaded.diagnostics?.boundaries||[]),Object.freeze({boundary:"RETARGET_CLIP_NORMALIZED",status:"PASS",detail:`${prepared.diagnostics.sourceTrackCount} source -> ${prepared.diagnostics.playableTrackCount} safe tracks; ${prepared.diagnostics.samplingMode}; external root-parent basis preserved`})];if(prepared.diagnostics.firstSourceRisk)boundaries.push(Object.freeze({boundary:"RETARGET_SOURCE_FIRST_RISK",status:`INFO ${failureDetail({offender:prepared.diagnostics.firstSourceRisk})}`,detail:failureDetail({offender:prepared.diagnostics.firstSourceRisk})}));session.thrillerDiagnostics={...loaded.diagnostics,boundaries:Object.freeze(boundaries),playableTrackCount:prepared.diagnostics.playableTrackCount,retargetNormalization:prepared.diagnostics,firstSourceRisk:prepared.diagnostics.firstSourceRisk,runtimeClipName:prepared.clip.name,playbackState:"ready",firstFailingBoundary:"THRILLER_VISIBLE_PLAYBACK_NOT_CONFIRMED"};return Object.freeze({status:"ready",diagnostics:Object.freeze({...session.thrillerDiagnostics})});};
    session.play=function(){const played=originalPlay();if(!session.thrillerDiagnostics||played?.status==="failed")return played;const timestamp=Number(session.action?.time||0),structure=base.validatePose(session.THREE,session.__thrillerAnatomyBaseline,session.avatar,{rootBone:session.__thrillerRootBone||ROOT_BONE,timestamp});if(structure.status!=="PASS")return failValidation({...structure,boundary:"RETARGETED_POSE_STRUCTURE_VALID",code:"RETARGETED_POSE_STRUCTURE_INVALID"});const kinematic=validateKinematics(session.THREE,session.__thrillerRetargetDiagnostics?.kinematicReference,session.avatar,{timestamp});if(kinematic.status!=="PASS")return failValidation(kinematic);const current=session.thrillerDiagnostics||played.diagnostics||{},withoutFinal=(current.boundaries||[]).filter(item=>!["RETARGETED_POSE_ANATOMY_VALID","RETARGETED_POSE_STRUCTURE_VALID","RETARGETED_POSE_KINEMATIC_VALID","THRILLER_VISIBLE_PLAYBACK_CONFIRMED"].includes(item.boundary)),boundaries=Object.freeze([...withoutFinal,Object.freeze({boundary:"RETARGETED_POSE_STRUCTURE_VALID",status:"PASS",detail:`structural invariants valid at ${timestamp.toFixed(6)}s`}),Object.freeze({boundary:"RETARGETED_POSE_KINEMATIC_VALID",status:"PASS",detail:`source/target semantic world rotations agree at ${timestamp.toFixed(6)}s`}),Object.freeze({boundary:"THRILLER_VISIBLE_PLAYBACK_CONFIRMED",status:"PASS",detail:"mounted avatar transforms changed and semantic pose remained valid"})]);session.thrillerDiagnostics={...current,boundaries,anatomyValidation:structure,kinematicValidation:kinematic,anatomyFailure:null,anatomyFailureDetail:null,playbackState:"playing",firstFailingBoundary:"NONE"};return Object.freeze({status:"playing",diagnostics:Object.freeze({...session.thrillerDiagnostics})});};
    if(session.options)session.options.onFrame=function(active){if(session.thrillerDiagnostics?.playbackState==="playing"&&session.__thrillerAnatomyBaseline){const timestamp=Number(session.action?.time||0),structure=base.validatePose(session.THREE,session.__thrillerAnatomyBaseline,session.avatar,{rootBone:session.__thrillerRootBone||ROOT_BONE,timestamp});if(structure.status!=="PASS")failValidation({...structure,boundary:"RETARGETED_POSE_STRUCTURE_VALID",code:"RETARGETED_POSE_STRUCTURE_INVALID"});else{const kinematic=validateKinematics(session.THREE,session.__thrillerRetargetDiagnostics?.kinematicReference,session.avatar,{timestamp});if(kinematic.status!=="PASS")failValidation(kinematic);}}return originalOnFrame?.(active);};
    if(originalStop)session.stop=function(){const out=originalStop();if(session.__thrillerAnatomyBaseline)base.restorePose(session.__thrillerAnatomyBaseline,session.avatar);return out;};if(originalUnload)session.unloadMotion=function(){const out=originalUnload();session.__thrillerAnatomyBaseline=null;session.__thrillerRootBone=null;session.__thrillerRetargetDiagnostics=null;return out;};return session;
  }
  function installRuntime(runtime){if(!runtime?.createMotionSession)return null;if(runtime.__thrillerRetargetCompatibilityInstalled)return runtime;const wrapped=Object.assign({},runtime,{__thrillerRetargetCompatibilityInstalled:true,createMotionSession(options){return decorateSession(runtime.createMotionSession(options));}});return Object.freeze(wrapped);}
  return Object.freeze(Object.assign({},base,{REVIEW_HARDENING_VERSION,prepareClip,validateKinematics,decorateSession,installRuntime}));
});
