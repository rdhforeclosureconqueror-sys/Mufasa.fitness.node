(function(window,document){
  "use strict";
  if(window.__POCKETPT_GYM_COMPATIBILITY_ENTRY__)return;
  window.__POCKETPT_GYM_COMPATIBILITY_ENTRY__=true;
  var script=document.createElement("script");
  script.src="/dev/motion-lab-gym-compatibility-integration.js";
  script.defer=true;
  script.dataset.motionLabGymCompatibilityEntry="true";
  script.onerror=function(){
    window.PocketPTMotionLabGymCompatibilityEntryFailure=Object.freeze({
      firstFailure:"GYM_COMPATIBILITY_INTEGRATION_SCRIPT",
      source:script.src,
      detail:"integration entrypoint failed to load"
    });
  };
  document.head.appendChild(script);
})(window,document);
