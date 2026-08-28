const test = require("node:test");
const assert = require("node:assert/strict");
const THREE = require("three");
const { AvaturnLivePoseSolver, STATES } = require("../public/motion/avaturn-live-pose-solver");

function rig() {
  const avatar = new THREE.Group(), shoulder = new THREE.Bone(), arm = new THREE.Bone(), forearm = new THREE.Bone(), hand = new THREE.Bone();
  shoulder.name="RightShoulder";arm.name="RightArm";forearm.name="RightForeArm";hand.name="RightHand";
  shoulder.quaternion.setFromEuler(new THREE.Euler(.1,-.2,.3)); arm.quaternion.setFromEuler(new THREE.Euler(.05,-.08,.02)); arm.position.set(.01,.15,.02);arm.scale.set(1.11,1.11,1.11);forearm.position.set(0,.25,0);
  avatar.add(shoulder);shoulder.add(arm);arm.add(forearm);forearm.add(hand);avatar.updateMatrixWorld(true);
  return { avatar, shoulder, arm, forearm, hand };
}
function frame(timestamp, direction={x:1,y:0,z:0}, confidence=.9){return{timestamp,rightShoulder:{confidence},rightElbow:{confidence},rightUpperArmDirection:direction};}
function fullRig() {
  const avatar=new THREE.Group(),nodes=new Map();
  const add=(name,parent,position=[0,.2,0])=>{const bone=new THREE.Bone();bone.name=name;bone.position.set(...position);parent.add(bone);nodes.set(name,bone);return bone;};
  const hips=add("Hips",avatar,[0,0,0]),spine=add("Spine",hips),chest=add("Spine1",spine),leftShoulder=add("LeftShoulder",chest),rightShoulder=add("RightShoulder",chest);
  const leftArm=add("LeftArm",leftShoulder),leftForeArm=add("LeftForeArm",leftArm),rightArm=add("RightArm",rightShoulder),rightForeArm=add("RightForeArm",rightArm);
  add("LeftHand",leftForeArm);add("RightHand",rightForeArm);
  const leftUpLeg=add("LeftUpLeg",hips),leftLeg=add("LeftLeg",leftUpLeg),rightUpLeg=add("RightUpLeg",hips),rightLeg=add("RightLeg",rightUpLeg);
  add("LeftFoot",leftLeg);add("RightFoot",rightLeg);avatar.updateMatrixWorld(true);return{avatar,nodes};
}
function aligned(solver, targetWorld) {
  solver.avatar.updateMatrixWorld(true);const start=solver.rest.childLocalDirection.clone();
  const worldQ=new THREE.Quaternion();solver.rightArm.getWorldQuaternion(worldQ);return start.applyQuaternion(worldQ).normalize().dot(targetWorld.clone().normalize());
}

test("captures immutable rest data and derives the arm axis from RightForeArm.position",()=>{
  const r=rig(),original=r.arm.quaternion.clone(),solver=new AvaturnLivePoseSolver({THREE,avatar:r.avatar});
  assert.ok(solver.rest.childLocalDirection.distanceTo(new THREE.Vector3(0,1,0))<1e-12);
  r.arm.quaternion.identity();assert.ok(solver.rest.quaternion.angleTo(original)<1e-12);
});

test("solves a parent-space delta and premultiplies it with the original rest quaternion",()=>{
  const r=rig(),solver=new AvaturnLivePoseSolver({THREE,avatar:r.avatar,smoothingLambda:1000});solver.observe(frame(1000));solver.update(1,1000);
  assert.ok(aligned(solver,new THREE.Vector3(1,0,0))>.999999);
  assert.ok(Math.abs(r.arm.quaternion.length()-1)<1e-12);
  assert.ok(r.forearm.quaternion.equals(new THREE.Quaternion()),"RightForeArm is not driven");
});

test("confidence loss holds briefly, becomes lost, then reacquires without snapping",()=>{
  const r=rig(),solver=new AvaturnLivePoseSolver({THREE,avatar:r.avatar,holdMs:250});solver.observe(frame(1000));solver.update(.1,1000);const tracked=r.arm.quaternion.clone();
  assert.equal(solver.observe(frame(1100,{x:0,y:1,z:0},.2)),STATES.HELD);solver.update(.1,1100);assert.ok(r.arm.quaternion.angleTo(tracked)<.5);
  solver.update(.1,1300);assert.equal(solver.state,STATES.LOST);const before=r.arm.quaternion.clone();solver.observe(frame(1310,{x:0,y:1,z:0},.9));assert.equal(solver.state,STATES.TRACKING);solver.update(.001,1310);assert.ok(r.arm.quaternion.angleTo(before)<.05);
});

test("low confidence and zero directions never create a target rotation",()=>{
  const r=rig(),solver=new AvaturnLivePoseSolver({THREE,avatar:r.avatar}),rest=solver.targetQuaternion.clone();
  solver.observe(frame(1000,{x:1,y:0,z:0},.1));assert.ok(solver.targetQuaternion.equals(rest));
  solver.observe(frame(1001,{x:0,y:0,z:0},.9));assert.ok(solver.targetQuaternion.equals(rest));
});

test("time-based exponential slerp progresses and disposal restores exact local transforms",()=>{
  const r=rig(),solver=new AvaturnLivePoseSolver({THREE,avatar:r.avatar}),q=solver.rest.quaternion.clone(),p=solver.rest.position.clone(),s=solver.rest.scale.clone();solver.observe(frame(1000));
  solver.update(1/60,1000);const short=r.arm.quaternion.angleTo(q);solver.restore();solver.observe(frame(1000));solver.update(1/30,1000);const long=r.arm.quaternion.angleTo(q);assert.ok(long>short);
  solver.dispose();assert.ok(r.arm.quaternion.equals(q));assert.ok(r.arm.position.equals(p));assert.ok(r.arm.scale.equals(s));
});

test("complete loaded hierarchy reports every expected limb and torso binding",()=>{
  const loaded=fullRig(),diagnostics=new AvaturnLivePoseSolver({THREE,avatar:loaded.avatar}).diagnostics();
  assert.equal(diagnostics.expectedSegmentCount,8);assert.equal(diagnostics.mappedSegmentCount,8);
  assert.deepEqual(diagnostics.missingSegments,[]);assert.equal(diagnostics.expectedTorsoCount,3);assert.equal(diagnostics.mappedTorsoCount,3);
  assert.deepEqual(diagnostics.missingTorso,[]);assert.equal(diagnostics.fullRigMapped,"YES");
  for(const name of ["LeftArm","RightArm","LeftForeArm","RightForeArm","LeftUpLeg","RightUpLeg","LeftLeg","RightLeg"])assert.ok(loaded.avatar.getObjectByName(name)===loaded.nodes.get(name));
});

test("partial loaded hierarchy explicitly reports missing bindings and cannot claim full rig",()=>{
  const partial=rig(),diagnostics=new AvaturnLivePoseSolver({THREE,avatar:partial.avatar}).diagnostics();
  assert.equal(diagnostics.mappedSegmentCount,2);assert.deepEqual(diagnostics.mappedSegments,["rightUpperArm","rightForearm"]);
  assert.deepEqual(diagnostics.missingSegments,["leftUpperArm","leftForearm","leftThigh","rightThigh","leftLowerLeg","rightLowerLeg"]);
  assert.equal(diagnostics.mappedTorsoCount,0);assert.deepEqual(diagnostics.missingTorso,["hips","spine","chest"]);assert.equal(diagnostics.fullRigMapped,"NO");
});
