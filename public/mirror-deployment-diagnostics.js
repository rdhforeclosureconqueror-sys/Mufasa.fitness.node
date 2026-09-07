(function initMirrorDeploymentDiagnostics(global){
  'use strict';
  if(!global||global.PocketPTMirrorDeploymentDiagnostics)return;
  const PANEL_ID='mirrorMotionDeploymentDebug';
  const state={frontend:null,backend:null,lastRefresh:null,lastError:null,refreshes:0};
  const safe=value=>String(value??'').trim();
  const knownCommit=value=>/^[a-f0-9]{7,40}$/i.test(safe(value))?safe(value):null;
  async function readJson(url){
    const response=await global.fetch(url,{cache:'no-store',credentials:'omit'});
    if(!response.ok)throw new Error(`${url} -> HTTP ${response.status}`);
    return response.json();
  }
  function parity(){
    const front=knownCommit(state.frontend?.commit);
    const back=knownCommit(state.backend?.commit);
    if(!front||!back)return 'UNKNOWN';
    return front===back?'ALIGNED':'MISMATCH';
  }
  function text(){
    return [
      'DEPLOYMENT ALIGNMENT',
      `Frontend commit: ${safe(state.frontend?.commit)||'UNKNOWN'}`,
      `Frontend build: ${safe(state.frontend?.build)||'UNKNOWN'}`,
      `Backend commit: ${safe(state.backend?.commit)||'UNKNOWN'}`,
      `Backend service: ${safe(state.backend?.service)||'UNKNOWN'}`,
      `Frontend/backend parity: ${parity()}`,
      `Last refresh: ${state.lastRefresh||'NEVER'}`,
      `Last error: ${state.lastError||'NONE'}`
    ].join('\n');
  }
  function ensurePanel(){
    const doc=global.document;
    if(!doc?.body)return null;
    let panel=doc.getElementById(PANEL_ID);
    if(!panel){
      panel=doc.createElement('section');
      panel.id=PANEL_ID;
      panel.setAttribute('data-mirror-deployment-diagnostics','true');
      panel.style.setProperty('display','none','important');
      const pre=doc.createElement('pre');
      panel.appendChild(pre);
      doc.body.appendChild(panel);
    }
    panel.querySelector('pre').textContent=text();
    return panel;
  }
  async function refresh(){
    state.refreshes+=1;
    state.lastError=null;
    const cacheBust=`t=${Date.now()}`;
    const backendOrigin=safe(global.__MAAT_RUNTIME_CONFIG__?.backendOrigin||global.MAAT_BACKEND_ORIGIN).replace(/\/$/,'');
    const tasks=[
      readJson(`/__frontend-version.json?${cacheBust}`).then(data=>{state.frontend=data?.data||data||null;}).catch(error=>{state.lastError=`frontend:${safe(error?.message||error)}`;}),
      backendOrigin?readJson(`${backendOrigin}/api/deployment/identity?${cacheBust}`).then(data=>{state.backend=data?.data||data||null;}).catch(error=>{state.lastError=[state.lastError,`backend:${safe(error?.message||error)}`].filter(Boolean).join(' | ');}):Promise.resolve()
    ];
    await Promise.all(tasks);
    state.lastRefresh=new Date().toISOString();
    ensurePanel();
    return diagnostics();
  }
  function diagnostics(){return Object.freeze({frontend:state.frontend,backend:state.backend,parity:parity(),lastRefresh:state.lastRefresh,lastError:state.lastError,refreshes:state.refreshes});}
  global.PocketPTMirrorDeploymentDiagnostics=Object.freeze({refresh,diagnostics,diagnosticsText:text});
  ensurePanel();
  refresh().catch(()=>ensurePanel());
  if(typeof global.setInterval==='function'){
    const timer=global.setInterval(()=>refresh().catch(()=>ensurePanel()),15000);
    timer?.unref?.();
  }
})(typeof window!=='undefined'?window:globalThis);
