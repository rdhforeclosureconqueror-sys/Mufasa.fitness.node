(function(root,factory){
  const api=factory(root);
  if(typeof module==='object'&&module.exports)module.exports=api;
  else root.PocketPTExerciseDemoEngine=api;
})(typeof globalThis!=='undefined'?globalThis:this,function(globalScope){
  'use strict';

  const normalize=value=>String(value||'').trim().toLowerCase().replace(/[\s-]+/g,'_');
  const DESCRIPTORS=Object.freeze({
    push_up:Object.freeze({
      exerciseId:'push_up',
      aliases:Object.freeze(['push_up','pushup','push-up']),
      sourceType:'product_fixture',
      registryExerciseId:'push-up',
      productEligible:true,
      status:'active',
      requiresHumanVerification:false
    }),
    bodyweight_squat:Object.freeze({
      exerciseId:'bodyweight_squat',
      aliases:Object.freeze(['bodyweight_squat','air_squat','bodyweight-squat']),
      sourceType:'motion_spec',
      scriptUrl:'/motion/squat-motion-spec.js',
      globalName:'PocketPTSquatMotionSpec',
      productEligible:false,
      status:'development-test-only',
      requiresHumanVerification:true
    }),
    stationary_lunge_left:Object.freeze({
      exerciseId:'stationary_lunge_left',
      aliases:Object.freeze(['stationary_lunge_left','stationary-lunge-left','left_lunge']),
      sourceType:'motion_spec',
      scriptUrl:'/motion/lunge-motion-spec.js',
      globalName:'PocketPTLungeMotionSpec',
      productEligible:false,
      status:'development-test-only',
      requiresHumanVerification:true
    })
  });

  const byAlias=new Map();
  Object.values(DESCRIPTORS).forEach(descriptor=>descriptor.aliases.forEach(alias=>byAlias.set(normalize(alias),descriptor.exerciseId)));

  function resolveDescriptor(exerciseId){
    const canonical=byAlias.get(normalize(exerciseId));
    return canonical?DESCRIPTORS[canonical]:null;
  }

  function availability(exerciseId){
    const descriptor=resolveDescriptor(exerciseId);
    if(!descriptor)return Object.freeze({exerciseId:normalize(exerciseId)||null,available:false,productEligible:false,status:'unavailable',sourceType:null,requiresHumanVerification:false});
    return Object.freeze({exerciseId:descriptor.exerciseId,available:true,productEligible:descriptor.productEligible,status:descriptor.status,sourceType:descriptor.sourceType,requiresHumanVerification:descriptor.requiresHumanVerification});
  }

  function loadScript(src){
    if(!globalScope.document)return Promise.reject(new Error('document_unavailable'));
    const existing=[...globalScope.document.scripts].find(node=>node.src&&node.src.endsWith(src));
    if(existing)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const node=globalScope.document.createElement('script');
      node.src=src;
      node.async=false;
      node.onload=resolve;
      node.onerror=()=>reject(new Error('demo_dependency_load_failed'));
      globalScope.document.head.appendChild(node);
    });
  }

  async function load(exerciseId){
    const descriptor=resolveDescriptor(exerciseId);
    if(!descriptor)throw Object.assign(new Error('No demo is registered for this exercise'),{code:'demo_unavailable'});
    if(descriptor.sourceType==='product_fixture'){
      const registry=globalScope.PocketPTMotionRegistry;
      if(!registry?.resolveExerciseMotion)throw Object.assign(new Error('Product motion registry is unavailable'),{code:'motion_registry_unavailable'});
      const resolved=registry.resolveExerciseMotion(descriptor.registryExerciseId);
      return Object.freeze({descriptor,resolved,productEligible:true,requiresHumanVerification:false});
    }
    if(descriptor.sourceType==='motion_spec'){
      if(!globalScope[descriptor.globalName])await loadScript(descriptor.scriptUrl);
      const module=globalScope[descriptor.globalName];
      if(!module?.spec)throw Object.assign(new Error('Motion spec failed to load'),{code:'motion_spec_unavailable'});
      const validation=module.validate?.(module.spec);
      if(validation&&!validation.valid)throw Object.assign(new Error('Motion spec failed validation'),{code:'motion_spec_invalid',validation});
      return Object.freeze({descriptor,spec:module.spec,summary:module.summary?.(module.spec)||null,productEligible:false,requiresHumanVerification:true});
    }
    throw Object.assign(new Error('Unsupported demo source'),{code:'unsupported_demo_source'});
  }

  function list(){return Object.freeze(Object.values(DESCRIPTORS).map(item=>Object.freeze({...item,aliases:Object.freeze([...item.aliases])})));}

  return Object.freeze({normalize,resolveDescriptor,availability,load,list});
});
