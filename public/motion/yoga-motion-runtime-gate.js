(function(window,document){
  "use strict";
  const VERSION="1.0.1-yoga-runtime-gate";
  const BUTTON_ID="emitYogaMotionGeneration";
  const INIT_ID="initializeRuntime";
  let bypass=false;
  let pending=null;

  function snapshot(){
    return window.PocketPTMotionLabBootstrapDiagnostics?.snapshot?.()||null;
  }

  function dependenciesReady(){
    return Boolean(window.MotionLabRuntime&&window.PocketPTAvatarProfiles?.profiles?.personalized);
  }

  function ready(){
    const diag=snapshot();
    return dependenciesReady()&&diag?.status==="ready";
  }

  function statusText(text){
    const el=document.getElementById("yogaMotionIntakeStatus");
    if(el)el.textContent=text;
  }

  function waitForReady(timeoutMs=15000){
    if(ready())return Promise.resolve({status:"ready"});
    if(pending)return pending;
    pending=new Promise((resolve)=>{
      const started=Date.now();
      const poll=()=>{
        const diag=snapshot();
        if(diag?.status==="failed"){
          pending=null;
          resolve({status:"failed",code:diag.code||"motion_lab_bootstrap_failed",stage:diag.stage||"bootstrap",source:diag.source||null});
          return;
        }
        if(dependenciesReady()&&diag?.status==="ready"){
          pending=null;
          resolve({status:"ready"});
          return;
        }
        if(Date.now()-started>=timeoutMs){
          pending=null;
          resolve({status:"failed",code:"motion_lab_bootstrap_timeout",stage:diag?.stage||"bootstrap_wait",source:diag?.source||null});
          return;
        }
        window.setTimeout(poll,50);
      };
      poll();
    });
    return pending;
  }

  async function ensureReady(){
    if(ready())return {status:"ready"};
    const init=document.getElementById(INIT_ID);
    if(!init)return {status:"failed",code:"motion_lab_initialize_control_missing",stage:"bootstrap_control"};
    statusText("Initializing Motion Lab runtime and Coach profile…");
    if(!init.disabled)init.click();
    return waitForReady();
  }

  async function intercept(event){
    const button=event.target?.closest?.(`#${BUTTON_ID}`);
    if(!button||bypass||ready())return;
    event.preventDefault();
    event.stopImmediatePropagation();
    button.disabled=true;
    const out=await ensureReady();
    button.disabled=false;
    if(out.status!=="ready"){
      statusText(`Runtime/bootstrap failed at ${out.stage||"unknown"}: ${out.code||"motion_lab_runtime_unavailable"}`);
      return;
    }
    statusText("Motion Lab runtime + Coach profile ready. Creating motion draft…");
    bypass=true;
    try{button.click();}finally{bypass=false;}
  }

  document.addEventListener("click",intercept,true);
  window.PocketPTYogaMotionRuntimeGate=Object.freeze({VERSION,ready,ensureReady,waitForReady});
})(window,document);
