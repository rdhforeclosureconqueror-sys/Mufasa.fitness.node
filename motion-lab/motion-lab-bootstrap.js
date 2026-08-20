(function (window, document) { "use strict";
  var loaded = false, boundary = null;
  function script(src) { return new Promise(function(resolve,reject){ var node=document.createElement("script"); node.src=src; node.onload=resolve; node.onerror=function(){reject(new Error("dependency_load_failed"));}; document.head.appendChild(node); }); }
  async function initialize() {
    if (loaded) return window.MotionLabRuntime?.initialize();
    document.getElementById("initializeRuntime").disabled=true;
    try {
      await script("/motion/motion-viewer-contract.js"); await script("/motion/motion-viewer-boundary.js");
      await script("/motion/shared3d-loader.js"); await script("/motion/phase-e-assets.js"); await script("/motion/disposable-motion-session.js"); await script("/dev/motion-lab-runtime.js");
      boundary=window.MotionViewerBoundary.create({enabled:true,descriptor:{exerciseId:"motion-lab-primitive"},root:document.getElementById("viewer"),
        view:{show:function(){},viewerRoot:function(){return document.getElementById("viewer");}},
        loadViewer:async function(){return {createSession:function(){return {mount:async function(root){window.MotionLabRuntime.mount(root);return {status:"ready"};},dispose:function(){window.MotionLabRuntime.dispose();}};}};}});
      boundary.mount(); await boundary.retry(); loaded=true; window.MotionLabRuntime.initialize();
    } catch (_) { document.getElementById("initializeRuntime").disabled=false; document.getElementById("viewer").textContent="Motion Lab runtime unavailable (dependency_load_failed)."; }
  }
  document.getElementById("initializeRuntime").addEventListener("click",initialize);
  window.addEventListener("pagehide",function(){boundary?.unmount();},{once:true});
})(window,document);
