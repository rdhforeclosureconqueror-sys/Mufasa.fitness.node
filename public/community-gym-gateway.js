(function(global){
"use strict";
// Community gateway reuses the original world session launcher unchanged.
// No new ticket format, game instance, movement controller, or multiplayer room.
const $=id=>global.document.getElementById(id);
const stages=["AUTH_READY","AVATAR_PROFILE","AVATAR_ASSET","WORLD_SESSION","GYM_NAVIGATION"];
const checks=stages.map(stage=>({stage,status:"WAITING",detail:""}));
const mark=(stage,status,detail="")=>{const row=checks.find(x=>x.stage===stage);if(row){row.status=status;row.detail=String(detail).slice(0,140);}render();};
function render(){
 const failure=checks.find(x=>x.status==="FAIL");
 const first=$("communityGymFirstFailure"),trace=$("communityGymTrace");
 if(first)first.textContent="FIRST FAILURE: "+(failure?failure.stage+" — "+failure.detail:"NONE");
 if(trace)trace.textContent=checks.map(x=>x.status.padEnd(8)+" "+x.stage+" "+x.detail).join("\n");
 if(failure){$("communityGymDiagnostics").open=true;}
}
function init(){
 const button=$("communityEnterGym");if(!button)return;
 const message=$("communityGymStatus");
 render();
 button.addEventListener("click",async()=>{
   button.disabled=true;message.textContent="Connecting to the shared virtual gym…";
   try{
     mark("AUTH_READY","RUNNING","Checking current session");
     const ready=await global.AuthStateRuntime?.whenReady?.();
     const token=global.AuthStateRuntime?.getAuthToken?.();
     if(!ready?.ok||!token){mark("AUTH_READY","FAIL","Sign in through your Community ID first");message.textContent="Please sign in to enter the gym.";return;}
     mark("AUTH_READY","PASS","Signed-in member");
     mark("AVATAR_PROFILE","RUNNING","Checking saved member avatar");
     const profileResponse=await global.MaatApiClient.request("/api/me/profile",{auth:true});
     const model=profileResponse.payload?.data?.profile?.avatar?.avatarModelUrl;
     if(!profileResponse.ok||!global.MileleCommunityAvatar?.allowedAvatarPath(model)){
       mark("AVATAR_PROFILE","FAIL","No valid saved avatar found. Choose Create or Change My Avatar above.");
       message.textContent="Create or upload your avatar first, then enter the gym.";return;
     }
     mark("AVATAR_PROFILE","PASS","Canonical avatar selected");
     mark("AVATAR_ASSET","SKIP","Asset verification is performed by existing Godot bootstrap");
     mark("WORLD_SESSION","RUNNING","Reusing existing /api/game/sessions");
     const launcher=global.PocketPTWorldLaunch;
     if(typeof launcher?.createArenaSession!=="function"){mark("WORLD_SESSION","FAIL","Existing world launcher unavailable");message.textContent="Gym connection isn't available. Open diagnostics.";return;}
     const launch=await launcher.createArenaSession();
     if(!launch?.launchUrl){mark("WORLD_SESSION","FAIL","No world launch URL");message.textContent="Gym session couldn't be created.";return;}
     mark("WORLD_SESSION","PASS","Original one-time Godot session created");
     mark("GYM_NAVIGATION","PASS","Opening existing Lion's Den");
     global.location.assign(launch.launchUrl);
   }catch(error){
     const failure=checks.find(x=>x.status==="RUNNING");
     mark(failure?.stage||"WORLD_SESSION","FAIL",error?.code==="AUTH_REDIRECT"?"Sign-in redirect":error?.message||"Connection failed");
     message.textContent="Gym connection failed. Open First-Failure Diagnostics for the next step.";
   }finally{button.disabled=false;}
 });
 $("communityGymCopy")?.addEventListener("click",async()=>{
   const report="Milele Fit Community Virtual Gym\n"+$("communityGymFirstFailure").textContent+"\n"+$("communityGymTrace").textContent;
   try{await global.navigator.clipboard.writeText(report);$("communityGymCopyStatus").textContent="Diagnostics copied.";}
   catch(_){$("communityGymCopyStatus").textContent="Select and copy the diagnostic trace above.";}
 });
}
if(global.document.readyState==="loading")global.document.addEventListener("DOMContentLoaded",init,{once:true});else init();
})(window);