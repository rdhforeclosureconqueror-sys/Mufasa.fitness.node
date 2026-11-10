(function(root){
"use strict";
// Community-only presentation; canonical member profile/asset and existing upload pipeline.
if(new URLSearchParams(root.location.search).get("avatarSetup")!=="community")return;
const $=id=>root.document.getElementById(id);
let viewer=null,lastUrl=null,version=0;
function init(){
 const preview=$("releaseAvatarPreview");
 if(!preview)return;
 const surface=root.document.createElement("div");
 surface.id="communityStudio3dSurface";
 surface.style.cssText="position:absolute;inset:0;z-index:1;min-width:0;min-height:0";
 const info=root.document.createElement("p");
 info.id="communityStudio3dStatus";info.setAttribute("role","status");
 info.className="tiny";info.textContent="Checking for the saved 3D avatar on this account…";
 preview.append(surface);
 preview.after(info);
 const badge=$("releaseAvatarReadyBadge");if(badge)badge.style.zIndex="3";
 async function refresh(force=false){
   const id=++version;
   try{
     const ready=await root.AuthStateRuntime?.whenReady?.();
     const token=root.AuthStateRuntime?.getAuthToken?.();
     if(!ready?.ok||!token){info.textContent="Sign in to see your saved avatar.";return;}
     const reply=await root.MaatApiClient?.request?.("/api/me/profile",{auth:true});
     if(!reply?.ok){info.textContent="AVATAR_PROFILE_READ_FAILED — use Avatar Validation Center.";return;}
     const url=reply.payload?.data?.profile?.avatar?.avatarModelUrl;
     if(!root.MileleCommunityAvatar?.allowedAvatarPath(url)){
       info.textContent=url?"AVATAR_SOURCE_UNSUPPORTED — check Avatar Validation Center.":"No saved GLB on this account yet. Create or upload one above.";
       return;
     }
     if(!force&&lastUrl===url&&viewer)return;
     lastUrl=url;viewer?.dispose();viewer=null;surface.replaceChildren();
     info.textContent="Loading your saved 3D avatar…";
     const instance=root.MileleCommunityAvatar.create({
       container:surface,token,backend:root.MaatApiClient.origin(),
       reducedMotion:root.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true,
       onStatus:code=>{if(id!==version)return;info.textContent=code==="playing"?"Your saved avatar is displayed with its native animation.":code==="static-avatar"?"Your saved 3D avatar is displayed.":code==="reduced-motion"?"Your saved 3D avatar is displayed without motion.":"3D preview: "+code+" — open Avatar Validation Center."; }
     });
     viewer=instance;
     const result=await instance.start(url);
     if(id!==version){instance.dispose();return;}
     if(["playing","static-avatar","reduced-motion"].includes(result.status)){
       const pawn=$("releaseAvatarPlaceholder");if(pawn)pawn.hidden=true;
       const thumb=$("releaseAvatarThumb");if(thumb)thumb.hidden=true;
     }else{
       info.textContent="AVATAR_RENDER_"+String(result.status||"FAILED").toUpperCase()+" — canonical asset may be ready while 3D preview failed. Open diagnostics.";
     }
   }catch(e){if(id===version)info.textContent="AVATAR_RENDER_FAILED — "+String(e?.message||"3D unavailable").slice(0,120);}
 }
 root.addEventListener("app:canonical-profile",()=>void refresh(true));
 root.addEventListener("profile-write:profile-synced",()=>void refresh(true));
 root.addEventListener("auth:changed",()=>void refresh(true));
 root.addEventListener("pagehide",()=>{version++;viewer?.dispose();viewer=null;lastUrl=null;});
 root.addEventListener("pageshow",event=>{if(event.persisted)void refresh(true);});
 void refresh();
}
if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window);