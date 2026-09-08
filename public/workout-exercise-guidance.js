(function workoutExerciseGuidance(global){
  'use strict';

  const PANEL_ID='workoutExerciseGuidancePanel';
  const STYLE_ID='workoutExerciseGuidanceStyles';
  const state={label:null,exerciseId:null,status:'idle',requestGeneration:0,lastError:null};

  function installStyles(){
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #${PANEL_ID}{margin-top:10px;padding:14px;border:1px solid rgba(250,204,21,.7);border-radius:14px;background:rgba(15,23,42,.92);display:grid;gap:12px}
      #${PANEL_ID}[data-state="loading"]{opacity:.78}
      #${PANEL_ID} h3,#${PANEL_ID} h4,#${PANEL_ID} p{margin:0}
      #${PANEL_ID} .weg-head{display:flex;align-items:flex-start;justify-content:space-between;gap:12px;flex-wrap:wrap}
      #${PANEL_ID} .weg-badge{font-size:.72rem;padding:4px 8px;border:1px solid rgba(34,197,94,.55);border-radius:999px;color:#bbf7d0}
      #${PANEL_ID} .weg-media{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #${PANEL_ID} figure{margin:0;display:grid;gap:6px}
      #${PANEL_ID} img{display:block;width:100%;aspect-ratio:4/3;object-fit:contain;border-radius:10px;background:#020617;border:1px solid rgba(148,163,184,.25)}
      #${PANEL_ID} figcaption{font-size:.76rem;color:#94a3b8}
      #${PANEL_ID} .weg-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
      #${PANEL_ID} .weg-card{padding:10px;border-radius:10px;background:rgba(2,6,23,.72);border:1px solid rgba(148,163,184,.2);display:grid;gap:6px}
      #${PANEL_ID} ul,#${PANEL_ID} ol{margin:0;padding-left:20px;display:grid;gap:5px}
      #${PANEL_ID} a{color:#fde68a}
      @media(max-width:640px){#${PANEL_ID} .weg-media,#${PANEL_ID} .weg-grid{grid-template-columns:1fr}}
    `;
    document.head.appendChild(style);
  }

  function ensurePanel(){
    let panel=document.getElementById(PANEL_ID);
    if(panel)return panel;
    panel=document.createElement('section');
    panel.id=PANEL_ID;
    panel.dataset.state='idle';
    panel.setAttribute('aria-live','polite');
    panel.setAttribute('aria-label','Exercise technique guidance');
    const label=document.getElementById('exerciseLabel');
    const anchor=label?.closest?.('.status-line')||label?.parentElement;
    if(anchor?.parentElement)anchor.insertAdjacentElement('afterend',panel);
    else document.querySelector('.workout-stage-pane,.pane')?.appendChild(panel);
    return panel;
  }

  function clear(panel){while(panel.firstChild)panel.removeChild(panel.firstChild);}
  function text(tag,value,className){const el=document.createElement(tag);if(className)el.className=className;el.textContent=String(value||'');return el;}
  function list(items,ordered=false){const root=document.createElement(ordered?'ol':'ul');(Array.isArray(items)?items:[items]).filter(Boolean).forEach(item=>root.appendChild(text('li',item)));return root;}
  function normalizeName(value){return String(value||'').trim().toLowerCase().replace(/[\s_-]+/g,' ');}
  function isPlaceholderLabel(value){const normalized=normalizeName(value);return !normalized||/^(exercise|current exercise|no exercise selected|select exercise|loading|ready|unknown)$/.test(normalized);}

  function setLoading(label){
    const panel=ensurePanel();
    if(!panel)return;
    panel.dataset.state='loading';
    clear(panel);
    const head=document.createElement('div');head.className='weg-head';head.append(text('h3',`How to perform ${label||'this exercise'}`),text('span','Loading technique…','weg-badge'));panel.append(head);
  }

  function setFallback(label,reason){
    const panel=ensurePanel();
    if(!panel)return;
    panel.dataset.state='fallback';
    panel.removeAttribute('data-exercise-id');
    clear(panel);
    const head=document.createElement('div');head.className='weg-head';head.append(text('h3',`How to perform ${label||'this exercise'}`),text('span','Guidance fallback','weg-badge'));panel.append(head);
    panel.append(text('p','Technique details could not be loaded here. Do not guess at an unfamiliar movement; review the Exercise Hub before continuing.'));
    const link=document.createElement('a');link.href=`/exercise-library.html${label?`?query=${encodeURIComponent(label)}`:''}`;link.textContent='Open Exercise Hub technique';panel.append(link);
    panel.dataset.reason=String(reason||'unavailable');
  }

  function addMedia(panel,exercise){
    const images=[...(exercise?.media?.illustrations||[])];
    if(!images.length&&exercise?.media?.thumbnail)images.push(exercise.media.thumbnail);
    if(!images.length)return;
    const media=document.createElement('div');media.className='weg-media';
    images.slice(0,2).forEach((src,index)=>{
      const figure=document.createElement('figure');
      const img=document.createElement('img');img.src=src;img.alt=`${exercise.name||exercise.displayName||'Exercise'} ${index===0?'start':'finish'} position`;img.loading='eager';img.addEventListener('error',()=>figure.remove(),{once:true});
      figure.append(img,text('figcaption',index===0?'Start / setup position':'Finish / return position'));
      media.append(figure);
    });
    panel.append(media);
  }

  function addSection(grid,title,content,ordered=false){
    const items=(Array.isArray(content)?content:[content]).filter(Boolean);
    if(!items.length)return;
    const card=document.createElement('section');card.className='weg-card';card.append(text('h4',title));
    if(items.length===1&&!ordered)card.append(text('p',items[0]));else card.append(list(items,ordered));
    grid.append(card);
  }

  function renderExercise(exercise,label){
    const panel=ensurePanel();
    if(!panel)return;
    panel.dataset.state='ready';
    panel.dataset.exerciseId=exercise.exerciseId||'';
    clear(panel);
    const name=exercise.name||exercise.displayName||label||'Exercise';
    const head=document.createElement('div');head.className='weg-head';head.append(text('h3',`How to perform ${name}`),text('span','Technique ready','weg-badge'));panel.append(head);
    addMedia(panel,exercise);
    const grid=document.createElement('div');grid.className='weg-grid';
    addSection(grid,'Setup / start position',exercise.coaching?.setup);
    addSection(grid,'Execution',exercise.coaching?.execution,true);
    addSection(grid,'Finish / return',exercise.coaching?.finish);
    addSection(grid,'Key coaching cues',(exercise.coaching?.primaryCues||[]).slice(0,3));
    addSection(grid,'Breathing',exercise.coaching?.breathing);
    addSection(grid,'Tempo',exercise.coaching?.tempo);
    addSection(grid,'Safety',exercise.safetyNotes||exercise.coaching?.safetyReminders);
    if(grid.childElementCount)panel.append(grid);
    const hub=document.createElement('a');hub.href=`/exercise-library.html?exercise=${encodeURIComponent(exercise.exerciseId||'')}`;hub.textContent='View full technique in Exercise Hub';panel.append(hub);
  }

  async function api(path){
    const client=global.MaatApiClient;
    if(!client?.request)throw new Error('api_client_unavailable');
    const result=await client.request(path);
    if(!result.ok)throw new Error(result.payload?.error?.message||result.error?.message||'exercise_guidance_unavailable');
    return result.payload?.data??result.payload;
  }

  function deterministicCatalogMatch(rows,label){
    const target=normalizeName(label);
    return rows.find(item=>{
      const names=[item?.name,item?.displayName,item?.exerciseId].map(normalizeName).filter(Boolean);
      return names.includes(target);
    })||null;
  }

  async function resolve(label){
    const clean=String(label||'').trim();
    if(isPlaceholderLabel(clean)){
      const generation=++state.requestGeneration;
      state.label=clean||null;state.exerciseId=null;state.status='fallback';state.lastError='exercise_label_not_resolvable';
      setFallback(clean,state.lastError);
      return generation;
    }
    const generation=++state.requestGeneration;
    state.label=clean;state.exerciseId=null;state.status='loading';state.lastError=null;setLoading(clean);
    try{
      const catalog=await api(`/api/me/exercises?query=${encodeURIComponent(clean)}&limit=12&offset=0`);
      if(generation!==state.requestGeneration)return;
      const rows=Array.isArray(catalog?.exercises)?catalog.exercises:[];
      const exact=deterministicCatalogMatch(rows,clean);
      if(!exact?.exerciseId)throw new Error('exercise_exact_match_not_found');
      const exercise=await api(`/api/me/exercises/${encodeURIComponent(exact.exerciseId)}`);
      if(generation!==state.requestGeneration)return;
      const canonicalNames=[exercise?.name,exercise?.displayName,exercise?.exerciseId].map(normalizeName).filter(Boolean);
      if(!canonicalNames.includes(normalizeName(clean)))throw new Error('exercise_identity_mismatch');
      state.exerciseId=exercise.exerciseId;state.status='ready';renderExercise(exercise,clean);
    }catch(error){
      if(generation!==state.requestGeneration)return;
      state.exerciseId=null;state.status='fallback';state.lastError=error?.message||String(error);setFallback(clean,state.lastError);
      console.warn('[WORKOUT_EXERCISE_GUIDANCE]',{label:clean,reason:state.lastError});
    }
  }

  function currentLabel(){return document.getElementById('exerciseLabel')?.textContent?.trim()||'';}
  function sync(){const label=currentLabel();if(label!==state.label)resolve(label);}

  function boot(){
    installStyles();ensurePanel();sync();
    const label=document.getElementById('exerciseLabel');
    if(label&&global.MutationObserver)new MutationObserver(sync).observe(label,{subtree:true,childList:true,characterData:true});
    global.addEventListener('pocketpt:exercise-changed',event=>resolve(event.detail?.name||event.detail?.exerciseName||currentLabel()));
    global.__WORKOUT_EXERCISE_GUIDANCE__=Object.freeze({getState:()=>({...state}),refresh:sync,resolve});
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});else boot();
})(typeof window!=='undefined'?window:globalThis);
