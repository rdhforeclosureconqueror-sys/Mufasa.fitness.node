(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  else root.PocketPTAvaturnLivePoseSolver = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";
  const DEFAULTS = Object.freeze({ minimumConfidence: 0.5, holdMs: 250, smoothingLambda: 12, minimumDirectionLength: 1e-4 });
  const STATES = Object.freeze({ WAITING: "WAITING", TRACKING: "TRACKING", HELD: "HELD", LOST: "LOST" });
  const SEGMENTS = Object.freeze([
    ["leftUpperArm", "LeftArm", "LeftForeArm", "left_shoulder", "left_elbow"], ["rightUpperArm", "RightArm", "RightForeArm", "right_shoulder", "right_elbow"],
    ["leftForearm", "LeftForeArm", "LeftHand", "left_elbow", "left_wrist"], ["rightForearm", "RightForeArm", "RightHand", "right_elbow", "right_wrist"],
    ["leftThigh", "LeftUpLeg", "LeftLeg", "left_hip", "left_knee"], ["rightThigh", "RightUpLeg", "RightLeg", "right_hip", "right_knee"],
    ["leftLowerLeg", "LeftLeg", "LeftFoot", "left_knee", "left_ankle"], ["rightLowerLeg", "RightLeg", "RightFoot", "right_knee", "right_ankle"]
  ]);
  class AvaturnLivePoseSolver {
    constructor({ THREE, avatar, now = () => Date.now(), ...options } = {}) {
      if (!THREE || !avatar) throw new TypeError("THREE and avatar are required");
      this.THREE=THREE; this.avatar=avatar; this.now=now; this.options={...DEFAULTS,...options}; this.state=STATES.WAITING; this.lastGoodAt=null; this.disposed=false;
      const nodes=new Map(); avatar.traverse(object=>{ if(object.name) nodes.set(object.name,object); });
      this.bindings=SEGMENTS.map(([key,boneName,childName,startJoint,endJoint])=>{const bone=nodes.get(boneName),child=nodes.get(childName);if(!bone||!child||child.parent!==bone)return null;return {key,bone,startJoint,endJoint,restQuaternion:bone.quaternion.clone(),currentQuaternion:bone.quaternion.clone(),targetQuaternion:bone.quaternion.clone(),restDirection:child.position.clone().normalize().applyQuaternion(bone.quaternion).normalize()};}).filter(Boolean);
      if (!this.bindings.length) throw new Error("avaturn_limb_chains_missing");
      const rightUpperArm = this.bindings.find(binding => binding.key === "rightUpperArm") || this.bindings[0];
      this.rightArm = rightUpperArm.bone; this.targetQuaternion = rightUpperArm.targetQuaternion;
      this.rest = Object.freeze({ position: rightUpperArm.bone.position.clone(), quaternion: rightUpperArm.restQuaternion.clone(), scale: rightUpperArm.bone.scale.clone(), childLocalDirection: rightUpperArm.bone.children[0].position.clone().normalize(), parentDirection: rightUpperArm.restDirection.clone() });
      this.torsoBindings=[["hips","Hips","hipLine"],["spine","Spine","shoulderLine"],["chest","Spine1","shoulderLine"]].map(([key,name,line])=>{const bone=nodes.get(name);return bone?{key,bone,line,restQuaternion:bone.quaternion.clone(),currentQuaternion:bone.quaternion.clone(),targetQuaternion:bone.quaternion.clone()}:null;}).filter(Boolean);
      this.changedBones=[]; avatar.updateMatrixWorld(true);
    }
    observe(frame) {
      if(this.disposed)return this.state; let valid=0;
      for(const binding of this.bindings){const a=frame?.joints?.[binding.startJoint] || (binding.key === "rightUpperArm" ? frame?.rightShoulder : null),b=frame?.joints?.[binding.endJoint] || (binding.key === "rightUpperArm" ? frame?.rightElbow : null),direction=frame?.directions?.[binding.key] || (binding.key === "rightUpperArm" ? frame?.rightUpperArmDirection : null);const confidence=Math.min(Number(a?.confidence||0),Number(b?.confidence||0));const length=direction?Math.hypot(direction.x,direction.y,direction.z||0):0;if(confidence<this.options.minimumConfidence||length<this.options.minimumDirectionLength)continue;const parentWorld=new this.THREE.Quaternion();binding.bone.parent?.getWorldQuaternion(parentWorld);const targetParent=new this.THREE.Vector3(direction.x/length,direction.y/length,0).applyQuaternion(parentWorld.invert()).normalize();binding.targetQuaternion.copy(new this.THREE.Quaternion().setFromUnitVectors(binding.restDirection,targetParent)).multiply(binding.restQuaternion).normalize();valid++;}
      for(const binding of this.torsoBindings){const line=frame?.directions?.[binding.line],joints=frame?.joints||{};const confidence=binding.line==='hipLine'?Math.min(Number(joints.left_hip?.confidence||0),Number(joints.right_hip?.confidence||0)):Math.min(Number(joints.left_shoulder?.confidence||0),Number(joints.right_shoulder?.confidence||0));if(line&&confidence>=this.options.minimumConfidence){binding.targetQuaternion.copy(binding.restQuaternion);binding.targetQuaternion.multiply(new this.THREE.Quaternion().setFromAxisAngle(new this.THREE.Vector3(0,0,1),Math.atan2(line.y,line.x)));valid++;}}
      if(valid){this.lastGoodAt=Number(frame?.timestamp||this.now());this.state=STATES.TRACKING;}else this.updateTrackingState(frame?.timestamp);return this.state;
    }
    updateTrackingState(at=this.now()){const now=Number(at||this.now());if(this.lastGoodAt==null)this.state=STATES.WAITING;else if(now-this.lastGoodAt<=this.options.holdMs)this.state=STATES.HELD;else{this.state=STATES.LOST;for(const b of [...this.bindings,...this.torsoBindings])b.targetQuaternion.copy(b.restQuaternion);}return this.state;}
    update(deltaSeconds,at=this.now()){if(this.disposed)return this.state;if((this.state===STATES.TRACKING||this.state===STATES.HELD)&&this.lastGoodAt!=null&&Number(at)-this.lastGoodAt>this.options.holdMs)this.updateTrackingState(at);const alpha=1-Math.exp(-this.options.smoothingLambda*Math.max(0,Math.min(.1,Number(deltaSeconds)||0)));this.changedBones=[];for(const b of [...this.bindings,...this.torsoBindings]){const before=b.bone.quaternion.clone();b.currentQuaternion.slerp(b.targetQuaternion,alpha).normalize();b.bone.quaternion.copy(b.currentQuaternion);b.bone.updateMatrix?.();if(!before.equals(b.bone.quaternion))this.changedBones.push(b.bone.name);}this.avatar.updateMatrixWorld(true);return this.state;}
    restore(){for(const b of [...this.bindings,...this.torsoBindings]){b.bone.quaternion.copy(b.restQuaternion);if(b===this.bindings.find(binding=>binding.key==="rightUpperArm")){b.bone.position.copy(this.rest.position);b.bone.scale.copy(this.rest.scale);}b.currentQuaternion.copy(b.restQuaternion);b.targetQuaternion.copy(b.restQuaternion);b.bone.updateMatrix?.();}this.avatar.updateMatrixWorld(true);this.state=STATES.WAITING;this.lastGoodAt=null;this.changedBones=[];}
    dispose(){if(this.disposed)return;this.restore();this.disposed=true;}
    diagnostics(){return Object.freeze({state:this.state,minimumConfidence:this.options.minimumConfidence,holdMs:this.options.holdMs,smoothingLambda:this.options.smoothingLambda,mappedSegments:Object.freeze(this.bindings.map(b=>b.key)),mappedTorso:Object.freeze(this.torsoBindings.map(b=>b.key)),changedBones:Object.freeze([...this.changedBones]),lastGoodAt:this.lastGoodAt});}
  }
  return Object.freeze({ AvaturnLivePoseSolver, DEFAULTS, STATES, SEGMENTS });
});
