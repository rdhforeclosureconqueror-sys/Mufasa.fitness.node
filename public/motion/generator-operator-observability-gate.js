(function(root){
  'use strict';
  function install(){
    return root.PocketPTMotionDescriptionGenerator?.installObservability?.(root) || null;
  }
  root.addEventListener?.('pocketpt:motion-spec-generated', install);
  root.PocketPTGeneratorOperatorObservabilityGate=Object.freeze({install});
})(typeof globalThis!=='undefined'?globalThis:this);
