"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const compat=require("../public/motion/retarget-motion-compatibility");

function transform(values){return{values:[...values],toArray(){return[...this.values];},fromArray(next){this.values=[...next];},set(...next){this.values=[...next];}};}
function bone(name,parent,position){
  const node={isBone:true,name,parent,position:transform(position),quaternion:transform([0,0,0,1]),scale:transform([1,1,1])};
  node.getWorldPosition=function(out){const total=[...this.position.values];let current=this.parent;while(current?.isBone){for(let i=0;i<3;i++)total[i]+=current.position.values[i];current=current.parent;}out.x=total[0];out.y=total[1];out.z=total[2];out.toArray=()=>[out.x,out.y,out.z];return out;};
  return node;
}
function skeleton(count=54,proportionOffset=0){
  const nodes=[];let parent=null;
  for(let i=0;i<count;i++){const name=i===0?"Hips":`Bone${i}`;const position=i===0?[0,1,0]:[0,0.02+i*0.0002+proportionOffset,0];const node=bone(name,parent,position);nodes.push(node);parent=node;}
  return{name:"Skeleton",nodes,traverse(fn){nodes.forEach(fn);},updateMatrixWorld(){}};
}
const THREE={Vector3:class{toArray(){return[this.x||0,this.y||0,this.z||0];}}};
function track(name,times,values,size){return{name,times:[...times],values:[...values],getValueSize(){return size;},clone(){return track(this.name,this.times,this.values,size);}};}
function sourceClip(scene){
  const tracks=[];
  for(const node of scene.nodes){
    const p=node.position.toArray();tracks.push(track(`${node.name}.position`,[0,1],[...p,...p.map((v,i)=>i===1&&node.name==="Hips"?v+0.1:v)],3));
    tracks.push(track(`${node.name}.quaternion`,[0,1],[0,0,0,1,0,0.1,0,0.994987437],4));
    tracks.push(track(`${node.name}.scale`,[0,1],[1,1,1,1,1,1],3));
  }
  return{name:"Thriller_Part_1_Avaturn",duration:1,tracks,clone(){return{name:this.name,duration:this.duration,tracks:this.tracks.map(item=>item.clone()),clone:this.clone};}};
}

test("canonical retarget normalization converts 54x position/quaternion/scale channels into structurally safe target motion",()=>{
  const source=skeleton(54,0),target=skeleton(54,0.003),clip=sourceClip(source);
  assert.equal(clip.tracks.length,162);
  const out=compat.prepareClip(THREE,clip,source,target,{rootBone:"Hips"});
  assert.equal(out.status,"ready");
  assert.equal(out.diagnostics.sourceTrackCount,162);
  assert.equal(out.diagnostics.removedNonRootPositionTrackCount,53);
  assert.equal(out.diagnostics.removedScaleTrackCount,54);
  assert.equal(out.diagnostics.rootTranslationTrackCount,1);
  assert.equal(out.diagnostics.quaternionTrackCount,54);
  assert.equal(out.diagnostics.playableTrackCount,55);
  assert.equal(out.diagnostics.normalizationMode,"hierarchy-aware-world-rest-basis");
  assert.ok(out.diagnostics.rotationBasisSamples.length>0);
  for(const field of ["sourceRestLocalQuaternion","sourceRestWorldQuaternion","sourceAnimatedLocalQuaternion","sourceAnimatedWorldQuaternion","targetRestLocalQuaternion","targetRestWorldQuaternion","targetProducedLocalQuaternion","targetProducedWorldQuaternion","sourceParentWorldTransform","targetParentWorldTransform","sourceBoneDirection","targetBoneDirection","sourceSemanticRotationDelta","targetAppliedSemanticRotationDelta"])assert.ok(field in out.diagnostics.rotationBasisSamples[0],field);
  assert.ok(out.diagnostics.firstSourceRisk);
  assert.equal(out.diagnostics.firstSourceRisk.property,"position");
  assert.equal(out.clip.tracks.some(item=>item.name==="Bone1.position"),false);
  assert.equal(out.clip.tracks.some(item=>item.name.endsWith(".scale")),false);
});

test("anatomy validator fails closed on first non-root translation and reports exact offender fields",()=>{
  const target=skeleton(4),baseline=compat.capturePose(THREE,target);
  target.nodes[2].position.values[1]+=2;
  const out=compat.validatePose(THREE,baseline,target,{timestamp:0.81});
  assert.equal(out.status,"FAIL");
  assert.equal(out.code,"RETARGETED_POSE_ANATOMY_INVALID");
  assert.equal(out.offender.bone,"Bone2");
  assert.equal(out.offender.property,"position");
  assert.equal(out.offender.timestamp,0.81);
  assert.ok(Array.isArray(out.offender.baseline));
  assert.ok(Array.isArray(out.offender.sampled));
  assert.ok(out.offender.delta>0);
  assert.ok(out.offender.ratio>1);
});

test("rotation-only motion preserves limb structure and passes anatomy validation",()=>{
  const target=skeleton(4),baseline=compat.capturePose(THREE,target);
  target.nodes[2].quaternion.values=[0,0.2,0,0.979795897];
  const out=compat.validatePose(THREE,baseline,target,{timestamp:0.81});
  assert.equal(out.status,"PASS");
  assert.equal(out.boundary,"RETARGETED_POSE_ANATOMY_VALID");
});

function baseRuntime(playMutation){
  return{createMotionSession(){
    const source=skeleton(4),avatar=skeleton(4,0.003),clip=sourceClip(source);
    const action={time:0,paused:false,play(){return this;},stop(){this.time=0;return this;},setLoop(){},isRunning(){return true;}};
    const session={THREE,avatar,avatarProfile:{avatarId:"avaturn-personalized-candidate",skeletonProfile:"avaturn-native-v1"},animationFixture:null,sessionClip:null,action:null,loop:true,options:{},mixer:{clipAction(next){session.sessionClip=next;session.action=action;return action;},uncacheAction(){},stopAllAction(){}},diagnostic(){},setLoop(){},
      async loadIndependentRetargetedMotion(){session.animationFixture={scene:source};session.sessionClip=clip;session.action=action;session.thrillerDiagnostics={motionId:"thriller-part-1",boundaries:[{boundary:"TRACK_TARGETS_RESOLVE_ON_VISIBLE_AVATAR",status:"PASS"}],playbackState:"ready",firstFailingBoundary:"THRILLER_VISIBLE_PLAYBACK_NOT_CONFIRMED"};return{status:"ready",diagnostics:{...session.thrillerDiagnostics,trackCount:162,intendedTrackCount:162,boundTrackCount:162,unboundTrackCount:0}};},
      play(){action.time=1;for(const item of session.sessionClip.tracks.filter(item=>item.name.endsWith(".quaternion"))){const node=session.avatar.nodes.find(candidate=>`${candidate.name}.quaternion`===item.name);if(node)node.quaternion.values=Array.from(item.values).slice(-4);}playMutation(session);session.thrillerDiagnostics={...session.thrillerDiagnostics,boundaries:[...session.thrillerDiagnostics.boundaries,{boundary:"VISIBLE_AVATAR_BONES_CHANGED_AFTER_PLAYBACK_TICK",status:"PASS"},{boundary:"THRILLER_VISIBLE_PLAYBACK_CONFIRMED",status:"PASS"}],playbackState:"playing",firstFailingBoundary:"NONE"};return{status:"playing",diagnostics:{...session.thrillerDiagnostics}};},
      stop(){action.stop();return{status:"stopped"};},unloadMotion(){session.stop();session.thrillerDiagnostics=null;return{status:"ready"};}
    };return session;
  }};
}

test("runtime policy blocks a technically animated but structurally exploded Thriller pose before success",async()=>{
  const runtime=compat.installRuntime(baseRuntime(session=>{session.avatar.nodes[2].position.values[1]+=3;}));
  const session=runtime.createMotionSession();
  const loaded=await session.loadIndependentRetargetedMotion({sourceSkeletonProfile:"mixamo-v1",targetSkeletonProfile:"avaturn-native-v1"});
  assert.equal(loaded.status,"ready");
  assert.equal(loaded.diagnostics.playableTrackCount,5);
  const played=session.play();
  assert.equal(played.status,"failed");
  assert.equal(played.code,"RETARGETED_POSE_STRUCTURE_INVALID");
  assert.equal(played.diagnostics.firstFailingBoundary,"RETARGETED_POSE_STRUCTURE_INVALID");
  assert.equal(played.diagnostics.boundaries.some(x=>x.boundary==="THRILLER_VISIBLE_PLAYBACK_CONFIRMED"),false);
  const anatomy=played.diagnostics.boundaries.find(x=>x.boundary==="RETARGETED_POSE_STRUCTURE_VALID");
  assert.equal(anatomy.status,"FAIL");
  const info=played.diagnostics.boundaries.find(x=>x.boundary==="RETARGETED_POSE_STRUCTURE_VALID_FIRST_OFFENDER");
  assert.match(info.status,/bone=Bone2/);
  assert.match(info.status,/property=position/);
});

test("runtime policy inserts structure and semantic kinematic PASS before Thriller visible playback confirmation",async()=>{
  const runtime=compat.installRuntime(baseRuntime(()=>{}));
  const session=runtime.createMotionSession();
  await session.loadIndependentRetargetedMotion({sourceSkeletonProfile:"mixamo-v1",targetSkeletonProfile:"avaturn-native-v1"});
  const played=session.play();
  assert.equal(played.status,"playing");
  assert.equal(played.diagnostics.firstFailingBoundary,"NONE");
  const names=played.diagnostics.boundaries.map(x=>x.boundary);
  assert.ok(names.indexOf("RETARGETED_POSE_STRUCTURE_VALID")>=0);
  assert.ok(names.indexOf("RETARGETED_POSE_KINEMATIC_VALID")>names.indexOf("RETARGETED_POSE_STRUCTURE_VALID"));
  assert.ok(names.indexOf("THRILLER_VISIBLE_PLAYBACK_CONFIRMED")>names.indexOf("RETARGETED_POSE_KINEMATIC_VALID"));
});

test("semantic kinematic gate rejects connected rotation-only contortion",()=>{
  const source=skeleton(4),target=skeleton(4,0.003),prepared=compat.prepareClip(THREE,sourceClip(source),source,target);
  target.nodes.forEach((node,index)=>{const output=prepared.clip.tracks.find(item=>item.name===`${node.name}.quaternion`);node.quaternion.values=Array.from(output.values).slice(-4);if(index===2)node.quaternion.values=[0.8,0,0,0.6];});
  assert.equal(compat.validatePose(THREE,prepared.baseline,target,{timestamp:1}).status,"PASS");
  const semantic=compat.validateKinematics(THREE,prepared.diagnostics.kinematicReference,target,{timestamp:1});
  assert.equal(semantic.status,"FAIL");assert.equal(semantic.boundary,"RETARGETED_POSE_KINEMATIC_VALID");assert.equal(semantic.offender.property,"semantic_world_rotation");
});
