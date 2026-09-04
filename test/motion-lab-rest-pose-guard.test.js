'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const guard = require('../public/motion/motion-lab-rest-pose-guard');

function vector(x=0,y=0,z=0){ return {x,y,z,clone(){return vector(this.x,this.y,this.z);},copy(v){this.x=v.x;this.y=v.y;this.z=v.z;return this;}}; }
function quat(x=0,y=0,z=0,w=1){ return {x,y,z,w,clone(){return quat(this.x,this.y,this.z,this.w);},copy(v){this.x=v.x;this.y=v.y;this.z=v.z;this.w=v.w;return this;}}; }
function node(name,isBone=true){ return {name,uuid:name,isBone,position:vector(),quaternion:quat(),scale:vector(1,1,1)}; }
function avatar(){ const root=node('root',false),bone=node('hip',true); root.children=[bone]; root.traverse=fn=>{fn(root);fn(bone);}; root.updateMatrixWorld=()=>{}; return {root,bone}; }

test('captures and restores authored local transforms',()=>{
  const {root,bone}=avatar(); bone.position.x=2; bone.quaternion.y=.25;
  const snap=guard.capture(root);
  bone.position.x=9; bone.quaternion.y=.9;
  assert.equal(guard.restore(snap),true);
  assert.equal(bone.position.x,2); assert.equal(bone.quaternion.y,.25); assert.equal(snap.boneCount,1);
});

test('session wrapper restores protected rest pose before Motion Spec compilation',async()=>{
  const {root,bone}=avatar();
  const runtime={ createMotionSession(){ return {
    avatar:null,mixer:{stopAllAction(){}},stop(){},diagnostic(){},failure(code){return {status:'failed',code};},
    async loadAvatar(){this.avatar=root;return {status:'ready'};},
    loadMotionSpec(){ return {status:'ready',observedX:bone.position.x}; },
    unloadAvatar(){this.avatar=null;return {status:'ready'};}
  }; } };
  guard.install(runtime);
  const session=runtime.createMotionSession();
  bone.position.x=3; await session.loadAvatar({});
  bone.position.x=99;
  const out=session.loadMotionSpec({},{});
  assert.equal(out.observedX,3);
  assert.equal(bone.position.x,3);
  assert.equal(session.getRestPoseDiagnostics().status,'REST_POSE_RESTORED_FOR_COMPILE');
});

test('Motion Spec compilation fails closed when no rest pose exists',()=>{
  const runtime={ createMotionSession(){ return { avatar:{},mixer:{},loadMotionSpec(){return {status:'ready'};},failure(code){return {status:'failed',code};} }; } };
  guard.install(runtime);
  const session=runtime.createMotionSession();
  const out=session.loadMotionSpec({},{});
  assert.equal(out.status,'failed'); assert.equal(out.code,'rest_pose_missing');
});
