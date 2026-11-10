(function(global){
"use strict";
// Presentation-only community entry mode. All existing Avaturn, upload,
// profile persistence, diagnostics and world/gym code remains untouched.
if(new URLSearchParams(global.location.search).get("avatarSetup")!=="community")return;
function boot(){
 const doc=global.document;
 doc.title="Avatar Studio | Milele Fit Community";
 doc.body.classList.add("community-avatar-mode");
 const css=doc.createElement("style");
 css.textContent=".community-avatar-mode{background:radial-gradient(circle at 50% 0,#1a4a35,#07130d 65%)}.community-avatar-mode .hero,.community-avatar-mode #howItWorks,.community-avatar-mode .footer{display:none!important}.community-avatar-mode .topbar{margin-bottom:8px}.community-avatar-mode #yourAvatar{margin-top:22px}.community-avatar-mode .panel{border-color:#a8874d}.community-avatar-mode .community-studio-intro{padding:18px 0 0}.community-avatar-mode .community-studio-intro h1{font-size:clamp(2rem,7vw,3.7rem);line-height:1.1;letter-spacing:-.02em;color:#e8ca83}.community-avatar-mode .community-studio-intro p{color:#d2e4d7}.community-avatar-mode .community-studio-intro a{color:#e8ca83}.community-avatar-mode #releaseAvatarValidationPanel{display:block}.community-avatar-mode #releaseAvatarDiagnostics{white-space:pre-wrap}";
 doc.head.appendChild(css);
 const intro=doc.createElement("section");
 intro.className="community-studio-intro";
 const heading=doc.createElement("h1");heading.textContent="Community Avatar Studio";
 const description=doc.createElement("p");description.textContent="Create your Avaturn avatar or upload its .glb file. Your existing Milele Fit avatar setup, upload validation, profile save and First-Failure diagnostic tools are reused here. No challenge or workout is required.";
 const back=doc.createElement("a");back.href="/community-entrance.html";back.textContent="← Return to My Community ID";
 const instructions=doc.createElement("p");instructions.textContent="After avatar verification, tap View My Community Card to see your saved model. You can also enter the shared Virtual Gym here.";
 intro.append(heading,description,back,instructions);
 const main=doc.querySelector("main");main?.insertBefore(intro,main.firstChild);
 const title=doc.getElementById("avatarTitle");if(title)title.textContent="Create, upload or change your avatar";
 const gate=doc.querySelector(".release-gate");
 if(gate){
   gate.classList.add("community-gym-gate");
   const title=gate.querySelector("strong");if(title)title.textContent="Your next move: Community ID or Virtual Gym";
   const button=doc.getElementById("releaseEnterArenaBtn");
   if(button)button.textContent="Enter Virtual Gym";
   const card=doc.createElement("a");card.href="/community-entrance.html#avatarSpace";card.id="communityViewMyCard";
   card.textContent="View My Community Card & Avatar";card.className="btn primary";
   gate.append(card);
 }
 const ready=doc.getElementById("releaseAvatarReadyActions");
 if(ready){
   const card=doc.createElement("a");card.href="/community-entrance.html#avatarSpace";card.id="communityAvatarReadyCardLink";
   card.textContent="View My Community Card & Avatar";card.className="btn primary";
   ready.append(card);
 }

 const name=doc.querySelector("#releaseSignedOutActions > strong");if(name)name.textContent="Sign in or create an account only if you are not already signed in";
 const validation=doc.querySelector("#releaseAvatarValidationPanel .temporary-badge");if(validation)validation.textContent="Community avatar setup · detailed diagnostics";
 const hint=doc.querySelector("#releaseAvatarValidationPanel > p.tiny");if(hint)hint.textContent="The existing avatar validation and First-Failure panels remain available on this page. Never share passwords, tokens, or private files.";
 const chooser=doc.getElementById("releaseAvatarFileInput");
 const pickerHelp=doc.createElement("p");
 pickerHelp.id="communityAvatarPickerHelp";pickerHelp.className="tiny";
 pickerHelp.textContent="On iPhone, choose Browse in Files, and first try the .glb file under On My iPhone or Downloads. If a .glb is greyed out (with a minus icon), open the Files app separately, long-press the file, choose Copy, paste it into On My iPhone, then retry. Files may display 3D GLB models as documents. The uploader still validates .glb after selection.";
 const pickerLabel=doc.querySelector('label[for="releaseAvatarFileInput"]');
 pickerLabel?.after(pickerHelp);
 const selected=doc.createElement("p");selected.id="communityAvatarSelectedFile";selected.className="tiny";
 selected.textContent="No file selected. Find the .glb export in Files, then upload it.";
 chooser?.after(selected);
 const pickerStatus=doc.createElement("p");pickerStatus.id="communityAvatarPickerBoundary";pickerStatus.className="tiny";pickerStatus.setAttribute("role","status");
 pickerStatus.textContent="Picker check: READY · native Files selection not attempted";
 selected.after(pickerStatus);
 const report=()=>{
   const accept=chooser?.getAttribute("accept");
   const file=chooser?.files?.[0];
   return "Picker input="+(chooser?.type||"MISSING")+" · accept="+(accept==null?"NONE (unrestricted)":accept||"EMPTY")+" · disabled="+Boolean(chooser?.disabled)+" · selected="+(file?file.name+" ("+file.size+" bytes)":"NONE");
 };
 const update=(state)=>{
   pickerStatus.textContent="Picker check: "+state+" · "+report()+".";
   const trace=doc.getElementById("avatarDiagFile");
   if(trace && !chooser?.files?.length)trace.textContent="NONE · PICKER: "+state;
 };
 chooser?.addEventListener("click",()=>update("OPENED; waiting for iOS Files"));
 chooser?.addEventListener("cancel",()=>update("NO FILE SELECTED; iOS picker cancelled or file unavailable"));
 const copy=doc.createElement("button");copy.type="button";copy.id="communityAvatarPickerCopy";
 copy.textContent="Copy Picker Diagnosis";copy.className="secondary";
 pickerStatus.after(copy);
 copy.addEventListener("click",async()=>{
   const message="Community Avatar iPhone Picker\nFIRST FAILURE: "+(chooser?.files?.length?"NONE":"FILE_PICKER_SELECTION")+"\n"+pickerStatus.textContent;
   try{await global.navigator?.clipboard?.writeText(message);copy.textContent="Picker Diagnosis Copied";}
   catch(_){copy.textContent="Select and copy the picker status above";}
 });
 chooser?.addEventListener("change",()=>{
   const file=chooser.files?.[0];
   update(file?"FILE SELECTED":"NO FILE SELECTED");
   selected.textContent=!file?"No file selected. Browse Files for the .glb export."
      : /\.glb$/i.test(file.name)?"Selected 3D avatar: "+file.name+" ("+Math.ceil(file.size/1024)+" KB). Tap Upload Avatar.":"Selected "+file.name+". This is not a .glb avatar export; select your .glb file instead.";
 });
  const panel=doc.getElementById("releaseAvatarValidationPanel");panel?.setAttribute("data-community-reused-validation","true");
 if(global.location.hash!=="#yourAvatar")global.location.hash="#yourAvatar";
}
if(global.document.readyState==="loading")global.document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})(window);