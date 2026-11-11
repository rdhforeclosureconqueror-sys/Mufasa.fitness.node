(function(root,factory){
  const shared=typeof module==="object"&&module.exports?require("./motion/shared3d-loader"):root.PocketPTShared3DLoader;
  const runtime=typeof module==="object"&&module.exports?require("./motion/disposable-motion-session"):root.PocketPTDisposableMotionSession;
  const api=factory(shared,runtime);
  if(typeof module==="object"&&module.exports)module.exports=api;
  else root.MileleCommunityAvatar=api;
})(typeof globalThis!=="undefined"?globalThis:this,function(shared,runtime){
"use strict";
function allowedAvatarPath(value){
  if(typeof value!=="string")return null;
  const path=value.split("?")[0];
  return /^\/api\/me\/avatar\/assets\/[a-f0-9-]{16,64}$/i.test(path) || /^\/api\/community\/members\/[a-z0-9_-]{1,160}\/avatar$/i.test(path) || /^\/uploads\/avatars\/[a-f0-9-]{16,64}\.glb$/i.test(path) ? path : null;
}
function nativeClips(asset){
  return (asset?.animations||[]).filter(clip=>clip && typeof clip.name==="string" && clip.tracks?.length>0 && Number.isFinite(clip.duration) && clip.duration>0);
}
function chooseClip(clips,preferred){
  if(preferred && clips.some(c=>c.name===preferred))return preferred;
  return clips[0]?.name||null;
}
function create({container,token,backend,preferredClip="",onClips=()=>{},onStatus=()=>{},reducedMotion=false}){
  let session=null,disposed=false;
  function status(value){if(!disposed)onStatus(value);}
  const dispose=()=>{disposed=true;session?.dispose();session=null;};
  async function start(modelPath){
    const path=allowedAvatarPath(modelPath);
    if(!path){status("no-avatar");return {status:"no-avatar"};}
    const url=new URL(path,backend).href;
    if(new URL(url).origin!==new URL(backend).origin){status("invalid-origin");return {status:"invalid-origin"};}
    const loader={
      probeCapability:shared.probeCapability,
      loadThree:shared.loadThree,
      loadGLTFLoader:async options=>{
        const Base=await shared.loadGLTFLoader(options);
        return class AuthenticatedAvatarLoader extends Base {
          async loadAsync(src,onProgress){
            if(src!==url)return super.loadAsync(src,onProgress);
            const response=await fetch(src,{headers:{Authorization:"Bearer "+token},credentials:"omit",cache:"no-store"});
            if(!response.ok)throw Object.assign(new Error("avatar_http_"+response.status),{status:response.status});
            const buffer=await response.arrayBuffer();
            return this.parseAsync ? this.parseAsync(buffer,"") : new Promise((resolve,reject)=>this.parse(buffer,"",resolve,reject));
          }
        };
      }
    };
    session=runtime.createMotionSession({loader,showProbe:false});
    const init=await session.start(container);
    if(init.status!=="ready"||disposed){status("renderer-unavailable");return {status:"renderer-unavailable"};}
    const profile={avatarId:"community-member",source:"member-profile",assetUrl:url};
    const loaded=await session.loadAvatar(profile);
    if(loaded.status!=="ready"||disposed){status("avatar-load-failed");return {status:"avatar-load-failed"};}
    const clips=nativeClips(session.avatarAsset).filter(clip=>session.inspectClipBindings(clip).unboundTrackCount===0);
    const choices=clips.map(c=>({name:c.name,duration:c.duration}));
    onClips(choices);
    if(reducedMotion){session.renderer?.render?.(session.scene,session.camera);session.stopRenderLoop();status("reduced-motion");return {status:"reduced-motion",clips:choices};}
    if(!clips.length){status("static-avatar");return {status:"static-avatar",clips:choices};}
    const selected=chooseClip(clips,preferredClip);
    const played=selectClip(selected);
    status(played.status==="playing"?"playing":"static-avatar");
    return {status:played.status,clip:selected,clips:choices};
  }
  function selectClip(name){
    if(!session?.avatar||disposed)return {status:"unavailable"};
    const clip=nativeClips(session.avatarAsset).find(c=>c.name===name);
    if(!clip)return {status:"missing-clip"};
    // Binding against the avatar's own embedded clip: no cross-rig retargeting.
    const validation=session.inspectClipBindings(clip);
    if(validation.unboundTrackCount){status("clip-incompatible");return {status:"clip-incompatible"};}
    session.unloadMotion();session.sessionClip=clip;
    session.action=session.mixer.clipAction(clip,session.avatar);
    session.setLoop(true);const playing=session.play();status(playing.status);
    return playing;
  }
  return {start,selectClip,dispose};
}
return Object.freeze({create,allowedAvatarPath,nativeClips,chooseClip});
});
