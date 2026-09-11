"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),vm=require("node:vm");
const compatibility=require("../public/motion/personal-avatar-compatibility");
const profiles=require("../public/motion/avatar-profiles");
const source=fs.readFileSync(path.join(__dirname,"../motion-lab/motion-lab-runtime.js"),"utf8");

function harness(){
  const required=compatibility.REQUIRED_CANONICAL_JOINTS, boneNames=[...required,...Array.from({length:34},(_,i)=>`AuxBone${i+1}`)];
  const elements=new Map([...fs.readFileSync(path.join(__dirname,"../motion-lab/index.html"),"utf8").matchAll(/id="([^"]+)"/g)].map(match=>[match[1],{disabled:true,value:"",replaceChildren(){},append(){},addEventListener(){}}]));elements.delete("stages");
  const session={state:"running",avatar:null,async start(){return{status:"ready"};},async loadAvatar(profile){this.avatar={name:"mounted"};return{status:"ready",diagnostics:{avatarProfileId:profile.avatarId,boneCount:54,jointCount:54,boneNames,skinnedMeshCount:10,animations:[{name:"avaturn_animation",duration:1,trackCount:54}]}};},unloadAvatar(){this.avatar=null;return{status:"ready"};},unloadMotion(){return{status:"ready"};},playbackDiagnostics(){return{state:"unloaded"};},dispose(){this.avatar=null;}};
  const document={getElementById:id=>elements.get(id),querySelectorAll:()=>[],addEventListener(){},removeEventListener(){}};
  const env={document,addEventListener(){},removeEventListener(){},performance,navigator:{},PocketPTAvatarProfiles:profiles,PocketPTDisposableMotionSession:{createMotionSession(){return session;}}};
  vm.runInNewContext(source,env);env.MotionLabRuntime.mount({replaceChildren(){}});env.MotionLabRuntime.initialize();
  return{runtime:env.MotionLabRuntime,session};
}

test("canonical personalized-avatar adapter preserves 54-bone load, unload, and reload truth",async()=>{
  global.PocketPTPersonalAvatarCompatibility=compatibility;global.PocketPTAvatarProfiles=profiles;
  delete require.cache[require.resolve("../public/motion/motion-lab-gym-compatibility")];
  const controller=require("../public/motion/motion-lab-gym-compatibility");
  const {runtime}=harness();
  await runtime.loadAvatar(profiles.profiles.personalized);
  let state=runtime.gymCompatibilityState(),report=controller.inspectRuntime(state);
  assert.equal(state.mounted,true);assert.equal(state.skeleton.bones,state.boneNames);assert.equal(state.boneNames.length,54);
  assert.equal(report.mappingCoverage,"20/20");assert.equal(report.stages.find(x=>x.stage==="PERSONAL_AVATAR_MOUNTED").status,"PASS");
  runtime.unloadAvatar();state=runtime.gymCompatibilityState();report=controller.inspectRuntime(state);
  assert.equal(state.mounted,false);assert.equal(report.firstFailure,"PERSONAL_AVATAR_MOUNTED");assert.equal(report.mappingCoverage,"0/20");
  await runtime.loadAvatar(profiles.profiles.personalized);report=controller.inspectRuntime(runtime.personalizedAvatarState());
  assert.equal(report.mappingCoverage,"20/20");assert.equal(report.stages.find(x=>x.stage==="BONES_INVENTORIED").detail,"54 bones inventoried");
  delete global.PocketPTPersonalAvatarCompatibility;delete global.PocketPTAvatarProfiles;
});
