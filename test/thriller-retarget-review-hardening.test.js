"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const compat=require("../public/motion/retarget-motion-compatibility-review-fix");

const qnorm=q=>{const n=Math.hypot(...q);return q.map(value=>value/n);};
const qmul=(a,b)=>[a[3]*b[0]+a[0]*b[3]+a[1]*b[2]-a[2]*b[1],a[3]*b[1]-a[0]*b[2]+a[1]*b[3]+a[2]*b[0],a[3]*b[2]+a[0]*b[1]-a[1]*b[0]+a[2]*b[3],a[3]*b[3]-a[0]*b[0]-a[1]*b[1]-a[2]*b[2]];
const qinv=q=>[-q[0],-q[1],-q[2],q[3]];
const qaxis=(axis,angle)=>{const s=Math.sin(angle/2),c=Math.cos(angle/2);return qnorm([axis[0]*s,axis[1]*s,axis[2]*s,c]);};
const qangle=(a,b)=>2*Math.acos(Math.min(1,Math.max(-1,Math.abs(a.reduce((sum,value,index)=>sum+value*b[index],0)))));
function transform(values){return{values:[...values],toArray(){return[...this.values];},fromArray(next){this.values=[...next];},set(...next){this.values=[...next];}};}
function worldQuaternion(node){const local=qnorm(node.quaternion.values);return node.parent?.quaternion?qnorm(qmul(worldQuaternion(node.parent),local)):local;}
function worldPosition(node){const local=[...node.position.values];if(!node.parent?.position)return local;const parent=worldPosition(node.parent);return local.map((value,index)=>value+parent[index]);}
function makeNode(name,isBone,parent,position,quaternion){const node={name,isBone,parent,position:transform(position),quaternion:transform(quaternion),scale:transform([1,1,1])};node.getWorldQuaternion=function(out){const q=worldQuaternion(this);out.x=q[0];out.y=q[1];out.z=q[2];out.w=q[3];return out;};node.getWorldPosition=function(out){const p=worldPosition(this);out.x=p[0];out.y=p[1];out.z=p[2];return out;};return node;}
function scene(parentQuaternion,hipsQuaternion){const root=makeNode("Root",false,null,[0,0,0],parentQuaternion),hips=makeNode("Hips",true,root,[0,1,0],hipsQuaternion),spine=makeNode("Spine",true,hips,[0,1,0],[0,0,0,1]),nodes=[root,hips,spine];return{nodes,traverse(visitor){nodes.forEach(visitor);},updateMatrixWorld(){}};}
function track(name,times,values,size){return{name,times:[...times],values:[...values],getValueSize(){return size;},clone(){return track(this.name,this.times,this.values,size);}};}
const THREE={Vector3:class{toArray(){return[this.x||0,this.y||0,this.z||0];}},Quaternion:class{constructor(){this.x=0;this.y=0;this.z=0;this.w=1;}toArray(){return[this.x,this.y,this.z,this.w];}}};

test("review hardening preserves distinct non-bone root-parent bases",()=>{
  const sourceParent=qaxis([0,1,0],0.45),targetParent=qaxis([1,0,0],-0.35),sourceRest=qaxis([0,0,1],0.2),targetRest=qaxis([0,1,0],-0.25),semanticDelta=qaxis([1,0,0],0.5);
  const sourceAnimatedWorld=qmul(semanticDelta,qmul(sourceParent,sourceRest)),sourceAnimatedLocal=qmul(qinv(sourceParent),sourceAnimatedWorld);
  const expectedTargetWorld=qmul(semanticDelta,qmul(targetParent,targetRest)),expectedTargetLocal=qmul(qinv(targetParent),expectedTargetWorld);
  const source=scene(sourceParent,sourceRest),target=scene(targetParent,targetRest),clip={name:"basis",duration:1,tracks:[track("Hips.quaternion",[0,1],[...sourceRest,...sourceAnimatedLocal],4),track("Spine.quaternion",[0,1],[0,0,0,1,0,0,0,1],4),track("Hips.position",[0,1],[0,1,0,0,1,0],3)],clone(){return{name:this.name,duration:this.duration,tracks:this.tracks.map(item=>item.clone()),clone:this.clone};}};
  const out=compat.prepareClip(THREE,clip,source,target);
  assert.equal(out.status,"ready");
  assert.equal(out.diagnostics.samplingMode,"direct-binary-search+frame-cache");
  const produced=out.clip.tracks.find(item=>item.name==="Hips.quaternion").values.slice(-4);
  assert.ok(qangle(qnorm(produced),qnorm(expectedTargetLocal))<1e-6,"root local quaternion must preserve the semantic world delta across different external parent bases");
});

test("kinematic validation fails closed when its comparison reference is absent",()=>{
  const out=compat.validateKinematics(THREE,null,scene([0,0,0,1],[0,0,0,1]),{timestamp:1});
  assert.equal(out.status,"FAIL");
  assert.equal(out.code,"RETARGET_KINEMATIC_REFERENCE_MISSING");
});

test("Motion Lab loads review hardening before installing the retarget runtime",()=>{
  const integration=fs.readFileSync(path.join(__dirname,"../public/motion/motion-lab-gym-compatibility-integration.js"),"utf8");
  const policy=integration.indexOf("/dev/motion-lab-assets/retarget-motion-compatibility.js"),hardening=integration.indexOf("/dev/motion-lab-assets/retarget-motion-compatibility-review-fix.js"),install=integration.indexOf("RETARGET_COMPATIBILITY_INSTALL");
  assert.ok(policy>=0&&hardening>policy,"review hardening must load after the base policy");
  assert.ok(install>hardening,"runtime install must happen only after review hardening is loaded");
  assert.match(integration,/REVIEW_HARDENING_VERSION/);
});
