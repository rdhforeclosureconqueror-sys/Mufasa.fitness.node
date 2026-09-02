(function (window, document) { "use strict";
  var loaded = false, boundary = null;
  function script(src) { return new Promise(function(resolve,reject){ var node=document.createElement("script"); node.src=src; node.onload=resolve; node.onerror=function(){reject(new Error("dependency_load_failed"));}; document.head.appendChild(node); }); }
  async function initialize() {
    if (loaded) { var existing=window.MotionLabRuntime?.initialize(); window.PocketPTMotionLabInspection?.wireButtons?.(); window.PocketPTMotionLabLungePreview?.wire?.(); return existing; }
    document.getElementById("initializeRuntime").disabled=true;
    try {
      await script("/dev/motion-lab-assets/motion-viewer-contract.js"); await script("/dev/motion-lab-assets/motion-viewer-boundary.js");
      await script("/dev/motion-lab-assets/shared3d-loader.js"); await script("/dev/motion-lab-assets/phase-e-assets.js"); await script("/dev/motion-lab-assets/avatar-profiles.js"); await script("/dev/motion-lab-assets/avaturn-push-up-fixture.js"); await script("/dev/motion-lab-assets/push-up-motion-spec.js"); await script("/dev/motion-lab-assets/squat-motion-spec.js"); await script("/dev/motion-lab-assets/lunge-motion-spec.js"); await script("/dev/motion-lab-assets/motion-spec-clip.js"); await script("/dev/motion-lab-assets/disposable-motion-session.js"); await script("/dev/motion-lab-assets/motion-lab-inspection-controls.js"); await script("/dev/motion-lab-runtime.js"); await script("/dev/motion-lab-assets/motion-lab-lunge-preview.js");
      boundary=window.MotionViewerBoundary.create({enabled:true,descriptor:{exerciseId:"motion-lab-primitive"},root:document.getElementById("viewer"),
        view:{show:function(){},viewerRoot:function(){return document.getElementById("viewer");}},
        loadViewer:async function(){return {createSession:function(){return {mount:async function(root){window.MotionLabRuntime.mount(root);return {status:"ready"};},dispose:function(){window.MotionLabRuntime.dispose();}};}};}});
      boundary.mount(); await boundary.retry(); loaded=true; window.MotionLabRuntime.initialize(); window.PocketPTMotionLabInspection?.wireButtons?.(); window.PocketPTMotionLabLungePreview?.wire?.();
    } catch (_) { document.getElementById("initializeRuntime").disabled=false; document.getElementById("viewer").textContent="Motion Lab runtime unavailable (dependency_load_failed)."; }
  }
  document.getElementById("initializeRuntime").addEventListener("click",initialize);
  window.addEventListener("pagehide",function(){boundary?.unmount();},{once:true});
})(window,document);
