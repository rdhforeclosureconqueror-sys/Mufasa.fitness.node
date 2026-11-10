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
 css.textContent=".community-avatar-mode{background:radial-gradient(circle at 50% 0,#1a4a35,#07130d 65%)}.community-avatar-mode .hero,.community-avatar-mode #howItWorks,.community-avatar-mode .release-gate,.community-avatar-mode .footer{display:none!important}.community-avatar-mode .topbar{margin-bottom:8px}.community-avatar-mode #yourAvatar{margin-top:22px}.community-avatar-mode .panel{border-color:#a8874d}.community-avatar-mode .community-studio-intro{padding:18px 0 0}.community-avatar-mode .community-studio-intro h1{font-size:clamp(2rem,7vw,3.7rem);line-height:1.1;letter-spacing:-.02em;color:#e8ca83}.community-avatar-mode .community-studio-intro p{color:#d2e4d7}.community-avatar-mode .community-studio-intro a{color:#e8ca83}.community-avatar-mode #releaseAvatarValidationPanel{display:block}.community-avatar-mode #releaseAvatarDiagnostics{white-space:pre-wrap}";
 doc.head.appendChild(css);
 const intro=doc.createElement("section");
 intro.className="community-studio-intro";
 const heading=doc.createElement("h1");heading.textContent="Community Avatar Studio";
 const description=doc.createElement("p");description.textContent="Create your Avaturn avatar or upload its .glb file. Your existing Milele Fit avatar setup, upload validation, profile save and First-Failure diagnostic tools are reused here. No challenge or workout is required.";
 const back=doc.createElement("a");back.href="/community-entrance.html";back.textContent="← Return to My Community ID";
 intro.append(heading,description,back);
 const main=doc.querySelector("main");main?.insertBefore(intro,main.firstChild);
 const title=doc.getElementById("avatarTitle");if(title)title.textContent="Create, upload or change your avatar";
 const name=doc.querySelector("#releaseSignedOutActions > strong");if(name)name.textContent="Sign in to Milele Fit";
 const validation=doc.querySelector("#releaseAvatarValidationPanel .temporary-badge");if(validation)validation.textContent="Community avatar setup · detailed diagnostics";
 const hint=doc.querySelector("#releaseAvatarValidationPanel > p.tiny");if(hint)hint.textContent="The existing avatar validation and First-Failure panels remain available on this page. Never share passwords, tokens, or private files.";
 const panel=doc.getElementById("releaseAvatarValidationPanel");panel?.setAttribute("data-community-reused-validation","true");
 if(global.location.hash!=="#yourAvatar")global.location.hash="#yourAvatar";
}
if(global.document.readyState==="loading")global.document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})(window);