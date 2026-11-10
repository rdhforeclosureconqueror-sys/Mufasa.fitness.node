(function(root){
"use strict";
// Summary diagnostics only. Detailed upload checks remain in existing Avatar Validation Center.
const $=id=>root.document.getElementById(id);
const clean=s=>String(s??"").replace(/Bearer\s+[A-Za-z0-9._~-]+/gi,"Bearer [REDACTED]").replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi,"[email]").slice(0,180);
const steps=["AUTH","UPLOAD_CONTRACT","CANONICAL_PROFILE","AVATAR_SOURCE","CARD_RENDERER"];
function setup(){
 const run=$("communityAvatarRunCheck");if(!run)return;
 const report=Object.fromEntries(steps.map(k=>[k,{result:"WAITING",detail:""}]));
 function mark(k,result,detail){report[k]={result,detail:clean(detail)};}
 function display(){
   const fail=steps.find(k=>report[k].result==="FAIL");
   $("communityAvatarFirstFailure").textContent=fail||"NONE";
   $("communityAvatarNextAction").textContent=fail?({
     AUTH:"Sign in to Milele Fit and return to Community ID.",
     UPLOAD_CONTRACT:"Open Avatar Studio and review its upload contract / First-Failure panel.",
     CANONICAL_PROFILE:"Check that your member profile is accessible. Open Avatar Studio for a detailed trace.",
     AVATAR_SOURCE:"Create or upload your GLB in Avatar Studio; then reload Community ID.",
     CARD_RENDERER:"Check your browser's 3D support. Avatar Studio shows full asset diagnostics."
   }[fail]):"Checks complete. If the avatar is missing on the card, open Avatar Studio diagnostics.";
   $("communityAvatarDebugTrace").textContent=steps.map(k=>k+" "+report[k].result+" — "+report[k].detail).join("\n");
 }
 async function check(){
   for(const k of steps)report[k]={result:"WAITING",detail:""};
   run.disabled=true;mark("AUTH","RUNNING","Checking canonical session");display();
   try{
     const ready=await root.AuthStateRuntime?.whenReady?.();
     const token=root.AuthStateRuntime?.getAuthToken?.();
     if(!ready?.ok||!token){mark("AUTH","FAIL","Signed-in session not available");return;}
     mark("AUTH","PASS","Authenticated session");
     const origin=root.MaatApiClient?.origin?.();
     if(!origin){mark("UPLOAD_CONTRACT","FAIL","Canonical API origin unavailable");return;}
     const contract=await root.MaatApiClient.request("/api/avatar/upload-contract",{auth:false});
     if(!contract.ok||contract.payload?.data?.enabled!==true){mark("UPLOAD_CONTRACT","FAIL","Existing upload capability not ready");return;}
     mark("UPLOAD_CONTRACT","PASS","Existing avatar upload contract enabled");
     const data=await root.MaatApiClient.request("/api/me/profile");
     if(!data.ok){mark("CANONICAL_PROFILE","FAIL","Profile read HTTP "+(data.diagnostics?.status||"unavailable"));return;}
     mark("CANONICAL_PROFILE","PASS","Member-owned profile available");
     const path=data.payload?.data?.profile?.avatar?.avatarModelUrl;
     if(!root.MileleCommunityAvatar?.allowedAvatarPath(path)){
       mark("AVATAR_SOURCE","FAIL","No supported saved GLB. Use Avatar Studio.");
       return;
     }
     mark("AVATAR_SOURCE","PASS","Owned avatar profile path present (not an asset health check)");
     const avatarStatus=$("avatarStatus")?.textContent||"";
     const supported=root.PocketPTShared3DLoader?.probeCapability?.();
     if(!supported?.supported){mark("CARD_RENDERER","FAIL","WebGL unavailable");return;}
     mark("CARD_RENDERER","PASS",clean(avatarStatus||"WebGL supported; actual avatar loading is separate"));
   }catch(error){
     const current=steps.find(k=>report[k].result==="RUNNING")||"CANONICAL_PROFILE";
     mark(current,"FAIL",error?.message||"Request failed");
   }finally{run.disabled=false;display();}
 }
 run.addEventListener("click",check);
 $("communityAvatarCopyCheck")?.addEventListener("click",async()=>{
   const text="Milele Fit Community Avatar Diagnostics\nFIRST FAILURE: "+$("communityAvatarFirstFailure").textContent+"\n"+$("communityAvatarDebugTrace").textContent;
   try{await root.navigator.clipboard.writeText(text);$("communityAvatarCopyStatus").textContent="Diagnostics copied.";}
   catch(_){$("communityAvatarCopyStatus").textContent="Copy the visible trace above.";}
 });
 display();
}
if(root.document.readyState==="loading")root.document.addEventListener("DOMContentLoaded",setup,{once:true});else setup();
})(window);