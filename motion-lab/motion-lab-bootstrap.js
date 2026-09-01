(function (window, document) { "use strict";
  var loaded = false, boundary = null;
  function script(src) { return new Promise(function(resolve,reject){ var node=document.createElement("script"); node.src=src; node.onload=resolve; node.onerror=function(){reject(new Error("dependency_load_failed"));}; document.head.appendChild(node); }); }
  function wireSynthesizedSquat() {
    var button=document.getElementById("loadSynthesizedSquat");
    if(!button)return;
    button.disabled=false;
    button.onclick=async function(){
      var runtime=window.MotionLabRuntime, squat=window.PocketPTSquatMotionSpec, profiles=window.PocketPTAvatarProfiles, status=document.getElementById("viewerStatus");
      if(!runtime?.loadPushUp||!runtime?.loadAvatar||!squat?.spec||!squat?.validate||!profiles?.profiles?.reference){
        if(status)status.textContent="Synthesized squat preview unavailable (dependency_load_failed).";
        return {status:"failed",code:"dependency_load_failed"};
      }

      if(status)status.textContent="Preparing synthesized squat reference avatar…";
      var avatarOut=await runtime.loadAvatar(profiles.profiles.reference);
      if(avatarOut?.status!=="ready"){
        if(status)status.textContent="Synthesized squat preview unavailable because the reference avatar failed to load.";
        return avatarOut||{status:"failed",code:"avatar_load_failed"};
      }

      var previous=window.PocketPTPushUpMotionSpec;
      window.PocketPTPushUpMotionSpec=squat;
      try {
        var out=await runtime.loadPushUp();
        if(out?.status==="ready"&&status)status.textContent="Renderer active — synthesized Squat Engineering Reference v1 loaded on the Phase E reference avatar. Press Play to inspect it.";
        return out;
      } finally {
        window.PocketPTPushUpMotionSpec=previous;
      }
    };
  }
  async function initialize() {
    if (loaded) { var existing=window.MotionLabRuntime?.initialize(); wireSynthesizedSquat(); return existing; }
    document.getElementById("initializeRuntime").disabled=true;
    try {
      await script("/dev/motion-lab-assets/motion-viewer-contract.js"); await script("/dev/motion-lab-assets/motion-viewer-boundary.js");
      await script("/dev/motion-lab-assets/shared3d-loader.js"); await script("/dev/motion-lab-assets/phase-e-assets.js"); await script("/dev/motion-lab-assets/avatar-profiles.js"); await script("/dev/motion-lab-assets/avaturn-push-up-fixture.js"); await script("/dev/motion-lab-assets/push-up-motion-spec.js"); await script("/motion/squat-motion-spec.js"); await script("/dev/motion-lab-assets/motion-spec-clip.js"); await script("/dev/motion-lab-assets/disposable-motion-session.js"); await script("/dev/motion-lab-runtime.js");
      boundary=window.MotionViewerBoundary.create({enabled:true,descriptor:{exerciseId:"motion-lab-primitive"},root:document.getElementById("viewer"),
        view:{show:function(){},viewerRoot:function(){return document.getElementById("viewer");}},
        loadViewer:async function(){return {createSession:function(){return {mount:async function(root){window.MotionLabRuntime.mount(root);return {status:"ready"};},dispose:function(){window.MotionLabRuntime.dispose();}};}};}});
      boundary.mount(); await boundary.retry(); loaded=true; window.MotionLabRuntime.initialize(); wireSynthesizedSquat();
    } catch (_) { document.getElementById("initializeRuntime").disabled=false; document.getElementById("viewer").textContent="Motion Lab runtime unavailable (dependency_load_failed)."; }
  }
  document.getElementById("initializeRuntime").addEventListener("click",initialize);
  window.addEventListener("pagehide",function(){boundary?.unmount();},{once:true});
})(window,document);
