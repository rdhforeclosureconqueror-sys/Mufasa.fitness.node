(function(root){
  'use strict';
  const POLICY_SRC='/dev/motion-lab-assets/motion-description-lower-body-geometry-policy.js';
  let loading=null;
  function recordFailure(error){
    root.PocketPTLowerBodyGeometryPolicyFailure=Object.freeze({code:error?.message||'lower_body_geometry_policy_install_failed'});
  }
  function loadPolicy(){
    if(root.PocketPTMotionDescriptionLowerBodyGeometryPolicy)return Promise.resolve(root.PocketPTMotionDescriptionLowerBodyGeometryPolicy);
    if(loading)return loading;
    loading=new Promise((resolve,reject)=>{
      const script=root.document?.createElement?.('script');
      if(!script){reject(new Error('lower_body_geometry_document_unavailable'));return;}
      script.src=POLICY_SRC;script.async=true;
      script.onload=()=>{
        const policy=root.PocketPTMotionDescriptionLowerBodyGeometryPolicy;
        if(!policy){reject(new Error('lower_body_geometry_policy_install_unavailable'));return;}
        resolve(policy);
      };
      script.onerror=()=>reject(new Error('lower_body_geometry_policy_load_failed'));
      root.document.head?.appendChild(script);
    });
    return loading;
  }
  async function prepareGenerator(){
    const policy=await loadPolicy();
    if(!policy?.install)throw new Error('lower_body_geometry_policy_install_unavailable');
    if(!root.PocketPTMotionDescriptionGenerator?.generate)throw new Error('motion_description_generator_unavailable');
    const wrapped=policy.install(root);
    if(!wrapped?.generate||root.PocketPTMotionDescriptionGenerator?.__lowerBodyGeometryPolicyInstalled!==true){
      throw new Error('lower_body_geometry_policy_not_installed');
    }
    root.PocketPTMotionDescriptionGenerator?.installObservability?.(root);
    return root.PocketPTMotionDescriptionGenerator;
  }
  async function install(){
    try{
      await loadPolicy();
      if(!root.PocketPTMotionDescriptionGenerator?.generate)return null;
      return await prepareGenerator();
    }catch(error){recordFailure(error);return null;}
  }
  root.addEventListener?.('pocketpt:motion-spec-generated',install);
  root.PocketPTGeneratorOperatorObservabilityGate=Object.freeze({install,loadPolicy,prepareGenerator});
  loadPolicy().catch(recordFailure);
})(typeof globalThis!=='undefined'?globalThis:this);
