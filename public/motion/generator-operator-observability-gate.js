(function(root){
  'use strict';
  const POLICY_SRC='/dev/motion-lab-assets/motion-description-lower-body-geometry-policy.js';
  let loading=null;
  function loadPolicy(){
    if(root.PocketPTMotionDescriptionLowerBodyGeometryPolicy)return Promise.resolve(root.PocketPTMotionDescriptionLowerBodyGeometryPolicy);
    if(loading)return loading;
    loading=new Promise((resolve,reject)=>{
      const script=root.document?.createElement?.('script');
      if(!script){reject(new Error('lower_body_geometry_document_unavailable'));return;}
      script.src=POLICY_SRC;script.async=true;
      script.onload=()=>resolve(root.PocketPTMotionDescriptionLowerBodyGeometryPolicy||null);
      script.onerror=()=>reject(new Error('lower_body_geometry_policy_load_failed'));
      root.document.head?.appendChild(script);
    });
    return loading;
  }
  async function install(){
    try{const policy=await loadPolicy();policy?.install?.(root);}catch(error){root.PocketPTLowerBodyGeometryPolicyFailure=Object.freeze({code:error?.message||'lower_body_geometry_policy_install_failed'});}
    return root.PocketPTMotionDescriptionGenerator?.installObservability?.(root)||null;
  }
  root.addEventListener?.('pocketpt:motion-spec-generated',install);
  root.PocketPTGeneratorOperatorObservabilityGate=Object.freeze({install,loadPolicy});
  install();
})(typeof globalThis!=='undefined'?globalThis:this);
