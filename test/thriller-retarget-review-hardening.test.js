"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
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

test("review hardening preserves distinct non-bone root-parent bases",async()=>{
  const sourceParent=qaxis([0,1,0],0.45),targetParent=qaxis([1,0,0],-0.35),sourceRest=qaxis([0,0,1],0.2),targetRest=qaxis([0,1,0],-0.25),semanticDelta=qaxis([1,0,0],0.5);
  const sourceAnimatedWorld=qmul(semanticDelta,qmul(sourceParent,sourceRest)),sourceAnimatedLocal=qmul(qinv(sourceParent),sourceAnimatedWorld);
  const expectedTargetWorld=qmul(semanticDelta,qmul(targetParent,targetRest)),expectedTargetLocal=qmul(qinv(targetParent),expectedTargetWorld);
  const source=scene(sourceParent,sourceRest),target=scene(targetParent,targetRest),clip={name:"basis",duration:1,tracks:[track("Hips.quaternion",[0,1],[...sourceRest,...sourceAnimatedLocal],4),track("Spine.quaternion",[0,1],[0,0,0,1,0,0,0,1],4),track("Hips.position",[0,1],[0,1,0,0,1,0],3)],clone(){return{name:this.name,duration:this.duration,tracks:this.tracks.map(item=>item.clone()),clone:this.clone};}};
  const out=await compat.prepareClip(THREE,clip,source,target);
  assert.equal(out.status,"ready");
  assert.equal(out.diagnostics.samplingMode,"streaming-frame-batches");
  const produced=out.clip.tracks.find(item=>item.name==="Hips.quaternion").values.slice(-4);
  assert.ok(qangle(qnorm(produced),qnorm(expectedTargetLocal))<1e-6,"root local quaternion must preserve the semantic world delta across different external parent bases");
});

function largeScene(offset=0){
  const external=makeNode("ExternalRoot",false,null,[0,0,0],qaxis([0,1,0],offset));
  const nodes=[external],hips=makeNode("Hips",true,external,[0,1,0],[0,0,0,1]);nodes.push(hips);
  for(let i=1;i<54;i++)nodes.push(makeNode(`Bone${i}`,true,hips,[0,0.02+i/1000,0],[0,0,0,1]));
  return{nodes,traverse(visitor){nodes.forEach(visitor);},updateMatrixWorld(){}};
}
function largeClip(source,samples=896){
  const times=Array.from({length:samples},(_,i)=>i/30),tracks=[];
  for(const node of source.nodes.filter(item=>item.isBone)){
    const quaternions=times.flatMap((_,i)=>qaxis([0,1,0],i/samples*0.25));
    tracks.push(track(`${node.name}.quaternion`,times,quaternions,4));
    tracks.push(track(`${node.name}.position`,times,times.flatMap(()=>node.position.values),3));
    tracks.push(track(`${node.name}.scale`,times,times.flatMap(()=>[1,1,1]),3));
  }
  return{name:"Thriller synthetic",duration:times.at(-1),tracks,clone(){return{name:this.name,duration:this.duration,tracks:this.tracks.map(item=>item.clone()),clone:this.clone};}};
}

test("Thriller-sized preparation is canonical, bounded, yielding, and produces valid normalized output",async()=>{
  const source=largeScene(0.35),target=largeScene(-0.2),clip=largeClip(source),canonicalMap={Hips:"Hips"};
  for(let i=1;i<20;i++)canonicalMap[`Joint${i}`]=`Bone${i}`;
  let yields=0,clock=0;
  const out=await compat.prepareClip(THREE,clip,source,target,{mappingProfile:{canonicalMap},batchSize:16,yieldControl:async()=>{yields++;await Promise.resolve();},now:()=>++clock});
  assert.equal(out.status,"ready");
  assert.equal(out.diagnostics.quaternionTrackCount,20);
  assert.equal(out.diagnostics.canonicalJointsRetargeted,20);
  assert.equal(out.diagnostics.sourceKeyframesProcessed,20*896);
  assert.equal(out.diagnostics.batchCount,56);
  assert.equal(out.diagnostics.yieldCount,55);
  assert.equal(yields,55);
  assert.equal(out.diagnostics.fullFrameCacheRetained,false);
  assert.ok(out.diagnostics.maxTransientSourceCacheEntries<=20);
  assert.ok(out.diagnostics.maxTransientTargetCacheEntries<=20);
  assert.equal(out.diagnostics.discardedAuxiliaryQuaternionTrackCount,34);
  assert.equal(out.clip.tracks.some(item=>item.name==="Bone20.quaternion"),false);
  assert.equal(out.clip.tracks.some(item=>item.name.endsWith(".scale")),false);
  assert.equal(out.clip.tracks.some(item=>item.name==="Bone1.position"),false);
  for(const output of out.clip.tracks.filter(item=>item.name.endsWith(".quaternion")))for(let i=0;i<output.values.length;i+=4)assert.ok(Math.abs(Math.hypot(...output.values.slice(i,i+4))-1)<1e-6);
});

test("kinematic validation fails closed when its comparison reference is absent",()=>{
  const out=compat.validateKinematics(THREE,null,scene([0,0,0,1],[0,0,0,1]),{timestamp:1});
  assert.equal(out.status,"FAIL");
  assert.equal(out.code,"RETARGET_KINEMATIC_REFERENCE_MISSING");
});

test("persistent crash breadcrumb survives initialization until the next successful boundary",()=>{
  const values=new Map(),previous=globalThis.sessionStorage;
  globalThis.sessionStorage={setItem:(key,value)=>values.set(key,value),getItem:key=>values.get(key)||null,removeItem:key=>values.delete(key)};
  try{
    compat.markCrashBoundary("RETARGET_PREP_RUNNING","batch 4");
    assert.equal(compat.readCrashBreadcrumb().boundary,"RETARGET_PREP_RUNNING");
    compat.markCrashBoundary("RETARGET_PREP_COMPLETE");
    assert.equal(compat.readCrashBreadcrumb().boundary,"RETARGET_PREP_COMPLETE");
    compat.clearCrashBreadcrumb();
    assert.equal(compat.readCrashBreadcrumb(),null);
  }finally{if(previous===undefined)delete globalThis.sessionStorage;else globalThis.sessionStorage=previous;}
});

test("Motion Lab loads review hardening before installing the retarget runtime",()=>{
  const integration=fs.readFileSync(path.join(__dirname,"../public/motion/motion-lab-gym-compatibility-integration.js"),"utf8");
  const policy=integration.indexOf("/dev/motion-lab-assets/retarget-motion-compatibility.js"),hardening=integration.indexOf("/dev/motion-lab-assets/retarget-motion-compatibility-review-fix.js"),install=integration.indexOf("RETARGET_COMPATIBILITY_INSTALL");
  assert.ok(policy>=0&&hardening>policy,"review hardening must load after the base policy");
  assert.ok(install>hardening,"runtime install must happen only after review hardening is loaded");
  assert.match(integration,/REVIEW_HARDENING_VERSION/);
});

test("runtime records every crash boundary and throttles render-loop validation",()=>{
  const hardening=fs.readFileSync(path.join(__dirname,"../public/motion/retarget-motion-compatibility-review-fix.js"),"utf8");
  const runtime=fs.readFileSync(path.join(__dirname,"../motion-lab/motion-lab-runtime.js"),"utf8");
  const session=fs.readFileSync(path.join(__dirname,"../public/motion/disposable-motion-session.js"),"utf8");
  for(const boundary of ["THRILLER_SELECT_REQUESTED","THRILLER_RUNTIME_ASSET_LOADED","THRILLER_CLIP_SELECTED","RETARGET_PREP_STARTED","RETARGET_PREP_RUNNING","RETARGET_PREP_COMPLETE","RETARGET_ACTION_BOUND","PLAY_REQUESTED","FIRST_MIXER_TICK","FIRST_STRUCTURE_VALIDATION","FIRST_KINEMATIC_VALIDATION"])
    assert.ok(runtime.includes(boundary)||session.includes(boundary)||hardening.includes(boundary),boundary);
  assert.match(hardening,/VALIDATION_CADENCE_MS = 100/);
  assert.match(hardening,/now-session\.__thrillerLastValidationAt>=VALIDATION_CADENCE_MS/);
});

test("protected Overhead Squat implementation remains byte-for-byte unchanged",()=>{
  const hashes={
    "public/motion/motion-lab-overhead-squat-assessment-preview.js":"3a00cc381f2958f42fbee183aa9d573b390bdd0b356e2fbf6a8e2c4f4b65533a",
    "public/motion/overhead-squat-assessment-motion-spec.js":"df543a18858270d041e09aadcfb586b805fcc07ca8d0d8a9a3cadf823d9a4bb8"
  };
  for(const [file,expected] of Object.entries(hashes))assert.equal(crypto.createHash("sha256").update(fs.readFileSync(path.join(__dirname,"..",file))).digest("hex"),expected,file);
});
