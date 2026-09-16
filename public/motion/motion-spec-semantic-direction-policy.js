(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTMotionSpecSemanticDirectionPolicy = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  const VERSION = "1.4.0-body-relative-gaze";

  function normalizedBoneKey(name) {
    return String(name || "").toLowerCase().replace(/^mixamorig[:_]?/, "").replace(/[^a-z0-9]/g, "");
  }

  function resolveNode(avatar, requestedName) {
    let exact = null; const normalized = [];
    avatar?.traverse?.(object => { if (!object?.name) return; if (object.name === requestedName) exact = object; if (normalizedBoneKey(object.name) === normalizedBoneKey(requestedName)) normalized.push(object); });
    if (exact) return Object.freeze({ status:"ready", object:exact, mode:"exact", requestedName, actualName:exact.name });
    if (normalized.length === 1) return Object.freeze({ status:"ready", object:normalized[0], mode:"normalized-alias", requestedName, actualName:normalized[0].name });
    return Object.freeze({ status:"failed", code:normalized.length > 1 ? "semantic_target_ambiguous" : "semantic_target_unbound", requestedName });
  }

  function worldDirectionFromReference(THREE, avatar, target) {
    const a = resolveNode(avatar, target?.referenceBone), b = resolveNode(avatar, target?.referenceChildBone);
    if (a.status !== "ready" || b.status !== "ready") return Object.freeze({ status:"failed", code:"semantic_reference_unbound" });
    avatar.updateMatrixWorld?.(true);
    const direction = b.object.getWorldPosition(new THREE.Vector3()).sub(a.object.getWorldPosition(new THREE.Vector3()));
    if (!(direction.lengthSq() > 0)) return Object.freeze({ status:"failed", code:"semantic_reference_zero_length" });
    return Object.freeze({ status:"ready", direction:direction.normalize() });
  }

  function desiredDirection(THREE, avatar, target) {
    if (target?.type === "bone_direction_world") {
      const v = Array.isArray(target.worldDirection) ? target.worldDirection : null;
      if (!v || v.length !== 3) return Object.freeze({ status:"failed", code:"semantic_direction_invalid" });
      const direction = new THREE.Vector3(Number(v[0]), Number(v[1]), Number(v[2]));
      if (!(direction.lengthSq() > 0)) return Object.freeze({ status:"failed", code:"semantic_direction_zero" });
      return Object.freeze({ status:"ready", direction:direction.normalize() });
    }
    if (target?.type === "bone_direction_reference") return worldDirectionFromReference(THREE, avatar, target);
    return Object.freeze({ status:"failed", code:"semantic_target_type_unsupported" });
  }

  function orientBoneToDirection(THREE, avatar, target) {
    const boneMatch = resolveNode(avatar, target?.bone), childMatch = resolveNode(avatar, target?.childBone);
    if (boneMatch.status !== "ready" || childMatch.status !== "ready") return Object.freeze({ status:"failed", code:"semantic_target_unbound" });
    const wanted = desiredDirection(THREE, avatar, target); if (wanted.status !== "ready") return wanted;
    const bone = boneMatch.object, child = childMatch.object; avatar.updateMatrixWorld?.(true);
    const current = child.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3()));
    if (!(current.lengthSq() > 0)) return Object.freeze({ status:"failed", code:"semantic_bone_zero_length" });
    current.normalize(); const beforeAngleDegrees = THREE.MathUtils.radToDeg(current.angleTo(wanted.direction));
    const delta = new THREE.Quaternion().setFromUnitVectors(current, wanted.direction);
    const desiredWorld = delta.multiply(bone.getWorldQuaternion(new THREE.Quaternion()));
    const parentWorld = bone.parent?.getWorldQuaternion ? bone.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
    bone.quaternion.copy(parentWorld.clone().invert().multiply(desiredWorld)); avatar.updateMatrixWorld?.(true);
    const solved = child.getWorldPosition(new THREE.Vector3()).sub(bone.getWorldPosition(new THREE.Vector3())).normalize();
    return Object.freeze({ status:"ready", diagnostics:Object.freeze({ id:target.id || null, type:target.type, bone:bone.name, residualDegrees:THREE.MathUtils.radToDeg(solved.angleTo(wanted.direction)), beforeAngleDegrees }) });
  }

  function orientPalmTowardReference(THREE, avatar, target) {
    const handMatch = resolveNode(avatar, target?.bone), axisMatch = resolveNode(avatar, target?.childBone), aMatch = resolveNode(avatar, target?.planePointA), bMatch = resolveNode(avatar, target?.planePointB), refMatch = resolveNode(avatar, target?.referenceBone);
    if ([handMatch, axisMatch, aMatch, bMatch, refMatch].some(match => match.status !== "ready")) return Object.freeze({ status:"failed", code:"semantic_palm_target_unbound" });
    const hand = handMatch.object; avatar.updateMatrixWorld?.(true);
    const origin = hand.getWorldPosition(new THREE.Vector3()), axis = axisMatch.object.getWorldPosition(new THREE.Vector3()).sub(origin).normalize(), va = aMatch.object.getWorldPosition(new THREE.Vector3()).sub(origin), vb = bMatch.object.getWorldPosition(new THREE.Vector3()).sub(origin);
    let normal = va.clone().cross(vb).multiplyScalar(-1); if (Number(target?.normalSign) < 0) normal.multiplyScalar(-1); normal.addScaledVector(axis, -normal.dot(axis));
    if (!(normal.lengthSq() > 0)) return Object.freeze({ status:"failed", code:"semantic_palm_plane_degenerate" }); normal.normalize();
    let inward = refMatch.object.getWorldPosition(new THREE.Vector3()).sub(origin); inward.addScaledVector(axis, -inward.dot(axis));
    if (!(inward.lengthSq() > 0)) return Object.freeze({ status:"failed", code:"semantic_palm_reference_degenerate" }); inward.normalize();
    const beforeAngleDegrees = THREE.MathUtils.radToDeg(normal.angleTo(inward)), signed = Math.atan2(axis.dot(normal.clone().cross(inward)), normal.dot(inward));
    const delta = new THREE.Quaternion().setFromAxisAngle(axis, signed), desiredWorld = delta.multiply(hand.getWorldQuaternion(new THREE.Quaternion())), parentWorld = hand.parent?.getWorldQuaternion ? hand.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
    hand.quaternion.copy(parentWorld.clone().invert().multiply(desiredWorld)); avatar.updateMatrixWorld?.(true);
    const solvedOrigin = hand.getWorldPosition(new THREE.Vector3()), solvedAxis = axisMatch.object.getWorldPosition(new THREE.Vector3()).sub(solvedOrigin).normalize(), solvedA = aMatch.object.getWorldPosition(new THREE.Vector3()).sub(solvedOrigin), solvedB = bMatch.object.getWorldPosition(new THREE.Vector3()).sub(solvedOrigin);
    let solvedPalmNormal = solvedA.clone().cross(solvedB).multiplyScalar(-1); if (Number(target?.normalSign) < 0) solvedPalmNormal.multiplyScalar(-1); solvedPalmNormal.addScaledVector(solvedAxis, -solvedPalmNormal.dot(solvedAxis)).normalize();
    let solvedInward = refMatch.object.getWorldPosition(new THREE.Vector3()).sub(solvedOrigin); solvedInward.addScaledVector(solvedAxis, -solvedInward.dot(solvedAxis)).normalize();
    return Object.freeze({ status:"ready", diagnostics:Object.freeze({ id:target.id || null, type:target.type, bone:hand.name, twistDegrees:THREE.MathUtils.radToDeg(signed), beforeAngleDegrees, residualDegrees:THREE.MathUtils.radToDeg(solvedPalmNormal.angleTo(solvedInward)), palmReference:refMatch.object.name, palmNormalConvention:"negative-mirrored-index-pinky-cross" }) });
  }

  function orientBoneYawTowardReference(THREE, avatar, target) {
    const boneMatch = resolveNode(avatar, target?.bone), aMatch = resolveNode(avatar, target?.forwardPointA), bMatch = resolveNode(avatar, target?.forwardPointB), targetMatch = resolveNode(avatar, target?.targetReferenceBone), upAMatch = resolveNode(avatar, target?.upReferenceBone), upBMatch = resolveNode(avatar, target?.upReferenceChildBone);
    if ([boneMatch,aMatch,bMatch,targetMatch,upAMatch,upBMatch].some(match => match.status !== "ready")) return Object.freeze({ status:"failed", code:"semantic_gaze_target_unbound" });
    const bone = boneMatch.object; avatar.updateMatrixWorld?.(true);
    const origin = bone.getWorldPosition(new THREE.Vector3()), up = upBMatch.object.getWorldPosition(new THREE.Vector3()).sub(upAMatch.object.getWorldPosition(new THREE.Vector3())).normalize();
    let current = aMatch.object.getWorldPosition(new THREE.Vector3()).add(bMatch.object.getWorldPosition(new THREE.Vector3())).multiplyScalar(.5).sub(origin);
    let wanted = targetMatch.object.getWorldPosition(new THREE.Vector3()).sub(origin);
    current.addScaledVector(up,-current.dot(up)); wanted.addScaledVector(up,-wanted.dot(up));
    if (!(current.lengthSq()>0&&wanted.lengthSq()>0)) return Object.freeze({ status:"failed", code:"semantic_gaze_direction_degenerate" });
    current.normalize(); wanted.normalize();
    const signed = Math.atan2(up.dot(current.clone().cross(wanted)),current.dot(wanted)), beforeAngleDegrees = THREE.MathUtils.radToDeg(Math.abs(signed));
    const delta = new THREE.Quaternion().setFromAxisAngle(up,signed), desiredWorld = delta.multiply(bone.getWorldQuaternion(new THREE.Quaternion())), parentWorld = bone.parent?.getWorldQuaternion ? bone.parent.getWorldQuaternion(new THREE.Quaternion()) : new THREE.Quaternion();
    bone.quaternion.copy(parentWorld.clone().invert().multiply(desiredWorld)); avatar.updateMatrixWorld?.(true);
    const solvedOrigin = bone.getWorldPosition(new THREE.Vector3()), solvedUp = upBMatch.object.getWorldPosition(new THREE.Vector3()).sub(upAMatch.object.getWorldPosition(new THREE.Vector3())).normalize();
    let solved = aMatch.object.getWorldPosition(new THREE.Vector3()).add(bMatch.object.getWorldPosition(new THREE.Vector3())).multiplyScalar(.5).sub(solvedOrigin), solvedWanted = targetMatch.object.getWorldPosition(new THREE.Vector3()).sub(solvedOrigin);
    solved.addScaledVector(solvedUp,-solved.dot(solvedUp)).normalize(); solvedWanted.addScaledVector(solvedUp,-solvedWanted.dot(solvedUp)).normalize();
    return Object.freeze({ status:"ready", diagnostics:Object.freeze({ id:target.id||null, type:target.type, bone:bone.name, targetReference:targetMatch.object.name, yawDegrees:THREE.MathUtils.radToDeg(signed), beforeAngleDegrees, residualDegrees:THREE.MathUtils.radToDeg(solved.angleTo(solvedWanted)) }) });
  }

  function buildPhaseSpecificSpec(THREE, spec, avatar) {
    const semanticTargets = Array.isArray(spec?.semanticPosePolicy?.targets) ? spec.semanticPosePolicy.targets : [];
    if (!semanticTargets.length) return Object.freeze({ status:"ready", spec, diagnostics:Object.freeze({ phaseSpecific:false, targetCount:0, solvedPhaseCount:0, phaseRecords:Object.freeze([]) }) });
    if (!Array.isArray(spec?.phases) || !spec?.skeleton?.rootBone) return Object.freeze({ status:"failed", code:"semantic_phase_contract_invalid" });
    const referencedNames = new Set([spec.skeleton.rootBone]);
    for (const phase of spec.phases) for (const target of phase.boneTargets || []) referencedNames.add(target.bone);
    for (const target of semanticTargets) for (const key of ["bone","childBone","referenceBone","referenceChildBone","planePointA","planePointB","forwardPointA","forwardPointB","targetReferenceBone","upReferenceBone","upReferenceChildBone"]) if (target?.[key]) referencedNames.add(target[key]);
    const nodes = new Map(); for (const name of referencedNames) { const match = resolveNode(avatar, name); if (match.status !== "ready") return Object.freeze({ status:"failed", code:match.code, diagnostics:Object.freeze({ requestedBone:name }) }); nodes.set(name, match.object); }
    avatar.updateMatrixWorld?.(true); const bounds = new THREE.Box3().setFromObject(avatar), size = bounds.getSize(new THREE.Vector3()), scale = Number.isFinite(size.y) && size.y > 0 ? size.y : 1;
    const rootNode = nodes.get(spec.skeleton.rootBone), restRootPosition = rootNode.position.clone(), restRootWorld = rootNode.getWorldPosition(new THREE.Vector3()), restQuaternions = new Map(); for (const [name,node] of nodes.entries()) restQuaternions.set(name,node.quaternion.clone());
    function restoreRestPose(){rootNode.position.copy(restRootPosition);for(const [name,node] of nodes.entries())node.quaternion.copy(restQuaternions.get(name));avatar.updateMatrixWorld?.(true);}
    function offsetQuaternion(name,offset){const values=Array.isArray(offset)?offset:[0,0,0],e=values.map(value=>THREE.MathUtils.degToRad(Number(value)||0));return restQuaternions.get(name).clone().multiply(new THREE.Quaternion().setFromEuler(new THREE.Euler(e[0],e[1],e[2],"XYZ")));}
    function worldOffsetToRootLocal(offset){const v=Array.isArray(offset)?offset:[0,0,0];if(rootNode.parent?.worldToLocal)return rootNode.parent.worldToLocal(restRootWorld.clone().add(new THREE.Vector3((+v[0]||0)*scale,(+v[1]||0)*scale,(+v[2]||0)*scale)));return restRootPosition.clone().add(new THREE.Vector3((+v[0]||0)*scale,(+v[1]||0)*scale,(+v[2]||0)*scale));}
    function applyPhasePose(phase){restoreRestPose();rootNode.position.copy(worldOffsetToRootLocal(phase.root?.positionOffset));rootNode.quaternion.copy(offsetQuaternion(spec.skeleton.rootBone,phase.root?.rotationOffsetEulerDegrees));for(const target of phase.boneTargets||[]){const node=nodes.get(target.bone);if(node)node.quaternion.copy(offsetQuaternion(target.bone,target.rotationOffsetEulerDegrees));}avatar.updateMatrixWorld?.(true);}
    function solvedOffsetDegrees(name,localQuaternion){const relative=restQuaternions.get(name).clone().invert().multiply(localQuaternion).normalize(),e=new THREE.Euler().setFromQuaternion(relative,"XYZ");return Object.freeze([THREE.MathUtils.radToDeg(e.x),THREE.MathUtils.radToDeg(e.y),THREE.MathUtils.radToDeg(e.z)]);}
    const phases=[],phaseRecords=[],solvedPhaseIds=new Set();
    try {
      for (const phase of spec.phases) {
        applyPhasePose(phase); const replacements=new Map();
        for (const target of semanticTargets) {
          const activePhaseIds=Array.isArray(target.activePhaseIds)?target.activePhaseIds:null;
          if(activePhaseIds && !activePhaseIds.includes(phase.id)) continue;
          let solved;
          if(target.type==="bone_direction_world"||target.type==="bone_direction_reference")solved=orientBoneToDirection(THREE,avatar,target);else if(target.type==="hand_plane_faces_reference")solved=orientPalmTowardReference(THREE,avatar,target);else if(target.type==="bone_yaw_toward_reference")solved=orientBoneYawTowardReference(THREE,avatar,target);else return Object.freeze({status:"failed",code:"semantic_target_type_unsupported",diagnostics:Object.freeze({targetType:target.type||null})});
          if(solved.status!=="ready")return solved;const bone=nodes.get(target.bone);replacements.set(target.bone,solvedOffsetDegrees(target.bone,bone.quaternion));phaseRecords.push(Object.freeze({...solved.diagnostics,phaseId:phase.id}));solvedPhaseIds.add(phase.id);
        }
        const originalTargets=Array.isArray(phase.boneTargets)?phase.boneTargets:[],replaced=new Set(),boneTargets=originalTargets.map(item=>{if(!replacements.has(item.bone))return item;replaced.add(item.bone);return Object.freeze({...item,rotationOffsetEulerDegrees:replacements.get(item.bone)});});
        for(const [bone,rotationOffsetEulerDegrees]of replacements.entries())if(!replaced.has(bone))boneTargets.push(Object.freeze({bone,rotationOffsetEulerDegrees}));phases.push(Object.freeze({...phase,boneTargets:Object.freeze(boneTargets)}));
      }
    } finally { restoreRestPose(); }
    const solvedPhaseCount=solvedPhaseIds.size,derivedSpec=Object.freeze({...spec,phases:Object.freeze(phases),semanticPoseCompilation:Object.freeze({mode:"phase-specific-body-relative",sourcePolicyVersion:VERSION,solvedPhaseCount,targetCount:semanticTargets.length})});
    return Object.freeze({status:"ready",spec:derivedSpec,diagnostics:Object.freeze({phaseSpecific:true,targetCount:semanticTargets.length,solvedPhaseCount,phaseRecords:Object.freeze(phaseRecords)})});
  }

  function install(baseCompiler) {
    if (!baseCompiler?.compile) return null;
    if (baseCompiler.__semanticDirectionPolicyInstalled === true && baseCompiler.semanticDirectionPolicyVersion === VERSION) return baseCompiler;
    const originalCompile = baseCompiler.compile.bind(baseCompiler);
    return Object.freeze({ ...baseCompiler, __semanticDirectionPolicyInstalled:true, semanticDirectionPolicyVersion:VERSION, compile:function(THREE,spec,avatar){const targets=Array.isArray(spec?.semanticPosePolicy?.targets)?spec.semanticPosePolicy.targets:[];if(!targets.length)return originalCompile(THREE,spec,avatar);const prepared=buildPhaseSpecificSpec(THREE,spec,avatar);if(prepared.status!=="ready")return prepared;const compiled=originalCompile(THREE,prepared.spec,avatar);if(compiled?.status!=="ready")return compiled;return Object.freeze({...compiled,diagnostics:Object.freeze({...(compiled.diagnostics||{}),semanticDirectionPolicyApplied:true,semanticDirectionPolicyVersion:VERSION,semanticDirectionTargetCount:prepared.diagnostics.targetCount,semanticDirectionSolvedPhaseCount:prepared.diagnostics.solvedPhaseCount,semanticDirectionSolveMode:"phase-specific-body-relative",semanticDirectionTargets:prepared.diagnostics.phaseRecords})});} });
  }

  return Object.freeze({ VERSION, normalizedBoneKey, resolveNode, orientBoneToDirection, orientPalmTowardReference, orientBoneYawTowardReference, buildPhaseSpecificSpec, install });
});
