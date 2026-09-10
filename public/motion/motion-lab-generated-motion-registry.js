(function(window,document){
  "use strict";
  const VERSION="1.0.1-generated-motion-registry";
  const STORAGE_KEY="pocketpt.motionLab.generatedMotions.v1";
  const MAX_ITEMS=24;
  let pendingGenerated=null;

  function read(){
    try{
      const parsed=JSON.parse(localStorage.getItem(STORAGE_KEY)||"[]");
      return Array.isArray(parsed)?parsed:[];
    }catch(_){return [];}
  }

  function write(items){
    localStorage.setItem(STORAGE_KEY,JSON.stringify(items.slice(0,MAX_ITEMS)));
  }

  function canonicalSpec(contract){return contract?.spec||contract||null;}

  function motionId(contract){
    const spec=canonicalSpec(contract);
    return String(spec?.motionId||spec?.id||"").trim();
  }

  function displayName(contract){
    const spec=canonicalSpec(contract);
    return String(spec?.displayName||motionId(contract)||"Generated Motion").trim();
  }

  function upsert(contract){
    const id=motionId(contract);
    if(!id)return {status:"failed",code:"generated_motion_id_missing"};
    const now=new Date().toISOString();
    const current=read().filter(item=>item?.motionId!==id);
    const item={schemaVersion:1,motionId:id,displayName:displayName(contract),savedAt:now,contract};
    write([item,...current]);
    render();
    return {status:"ready",item};
  }

  function remove(id){
    write(read().filter(item=>item?.motionId!==id));
    render();
  }

  function find(id){return read().find(item=>item?.motionId===id)||null;}

  function ensurePanel(){
    let panel=document.getElementById("generatedMotionRegistryPanel");
    if(panel)return panel;
    panel=document.createElement("section");
    panel.id="generatedMotionRegistryPanel";
    const loaded=document.getElementById("avatarDiagnostics")?.closest("section");
    if(loaded?.parentNode)loaded.parentNode.insertBefore(panel,loaded);
    else document.querySelector("main")?.appendChild(panel);
    return panel;
  }

  function esc(value){return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));}

  function selectedMotionMatches(id){
    const diagnostics=document.getElementById("motionDiagnostics")?.textContent||"";
    return Boolean(id&&diagnostics.includes(id));
  }

  async function load(id){
    const item=find(id);
    const status=document.getElementById("generatedMotionRegistryStatus");
    if(!item){if(status)status.textContent="Generated motion not found in this browser.";return {status:"failed",code:"generated_motion_not_found"};}
    const runtime=window.MotionLabRuntime;
    const profile=window.PocketPTAvatarProfiles?.profiles?.personalized;
    if(!runtime||!profile){if(status)status.textContent="Initialize Motion Lab runtime first.";return {status:"failed",code:"motion_lab_runtime_unavailable"};}
    if(status)status.textContent=`Loading ${item.displayName}…`;
    let avatar;
    try{avatar=await runtime.loadAvatar(profile);}catch(error){avatar={status:"failed",code:error?.message||"coach_load_throw"};}
    if(avatar?.status!=="ready"){if(status)status.textContent=`Coach Avatar load failed: ${avatar?.code||"unknown"}`;return avatar;}
    let compiled;
    try{compiled=await runtime.loadMotionSpec(item.contract);}catch(error){compiled={status:"failed",code:error?.message||"compile_throw"};}
    if(compiled?.status!=="ready"){if(status)status.textContent=`Generated motion compile failed: ${compiled?.code||"unknown"}`;return compiled;}
    const play=document.getElementById("playAnimation");
    if(play?.disabled||!selectedMotionMatches(item.motionId)){if(status)status.textContent="Generated motion compiled but did not become the active playable selection.";return {status:"failed",code:"generated_motion_not_selected"};}
    if(status)status.textContent=`${item.displayName} loaded. Press Play to inspect.`;
    window.dispatchEvent(new CustomEvent("pocketpt:generated-motion-loaded",{detail:{motionId:item.motionId,contract:item.contract}}));
    return {status:"ready",item};
  }

  function render(){
    const panel=ensurePanel();
    if(!panel)return;
    const items=read();
    panel.innerHTML=`<h2>Generated Motions</h2><p class="measurement">Description-generated motions saved in this browser. Select one to bind it to the personalized Coach Avatar; playback never autostarts.</p><div class="controls" id="generatedMotionRegistryControls">${items.length?items.map(item=>`<button type="button" data-generated-motion="${esc(item.motionId)}">${esc(item.displayName)}</button>`).join(""):"<span class=\"measurement\">No generated motions saved yet.</span>"}</div><p id="generatedMotionRegistryStatus" class="measurement" role="status">${items.length?`${items.length} generated motion${items.length===1?"":"s"} available.`:"Generate a Yoga motion draft to add one."}</p>${items.length?`<div class="controls"><button type="button" id="clearGeneratedMotions">Clear Generated Motions</button></div>`:""}`;
    panel.querySelectorAll("[data-generated-motion]").forEach(button=>button.addEventListener("click",()=>load(button.dataset.generatedMotion)));
    panel.querySelector("#clearGeneratedMotions")?.addEventListener("click",()=>{write([]);render();});
  }

  function waitForPlayableAndPersist(generated,timeoutMs=12000){
    pendingGenerated=generated;
    const contract=generated.contract||generated.spec;
    const id=motionId(contract);
    const started=Date.now();
    const poll=()=>{
      if(pendingGenerated!==generated)return;
      const play=document.getElementById("playAnimation");
      if(id&&play&&!play.disabled&&selectedMotionMatches(id)){
        pendingGenerated=null;
        const result=upsert(contract);
        const status=document.getElementById("generatedMotionRegistryStatus");
        if(status)status.textContent=result.status==="ready"?`${result.item.displayName} saved and selectable.`:`Generated motion was playable but could not be saved: ${result.code}`;
        return;
      }
      if(Date.now()-started>=timeoutMs){
        pendingGenerated=null;
        const status=document.getElementById("generatedMotionRegistryStatus");
        if(status)status.textContent="FIRST FAILURE: generated Motion Spec did not become the active motion with an enabled Play control, so it was not registered as usable.";
        return;
      }
      window.setTimeout(poll,75);
    };
    poll();
  }

  window.addEventListener("pocketpt:motion-spec-generated",event=>{
    const generated=event.detail;
    if(!generated?.contract&&!generated?.spec)return;
    waitForPlayableAndPersist(generated);
  });

  window.PocketPTGeneratedMotionRegistry=Object.freeze({VERSION,STORAGE_KEY,read,find,upsert,remove,load,render,motionId,selectedMotionMatches});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render();
})(window,document);
