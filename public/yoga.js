(function(){
"use strict";
const root=document.getElementById("sessions"),detail=document.getElementById("session-detail"),status=document.getElementById("status");
let active=null,index=0,startedAt=null,history=[];
const ACTIVE_YOGA_WORKOUT_KEY="mufasa.activeWorkout.v1";
const MOTION_REQUEST_KEY="pocketpt.motionGenerationRequest.v1";
const BEGINNER_FLOW_ID="beginner-flow";
const BEGINNER_MOTION_REGISTRY="/motion/yoga/beginner-flow-motion-descriptions.v1.json";
const MOTION_LAB_BACKEND_BASE=(window.RuntimeState?.getBackendOrigin?.()||window.MAAT_BACKEND_ORIGIN||window.MAAT_NODE_BASE_URL||window.location.origin).replace(/\/$/,"");
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
async function request(route,options={}){const result=await window.MaatApiClient.request(route,options);if(!result.ok)throw new Error(result.payload?.error?.message||result.payload?.message||result.error?.message||"Yoga is temporarily unavailable.");return result.payload.data;}
async function fetchJson(route){const response=await fetch(route,{cache:"no-store"});if(!response.ok)throw new Error(`Motion description unavailable (${response.status}).`);return response.json();}
function motionLabBackendUrl(pathname){return `${MOTION_LAB_BACKEND_BASE}${pathname}`;}
function getMotionLabAuthToken(){return window.AuthStateRuntime?.getAuthToken?.()||null;}
function completedIds(){return new Set(history.map(item=>item.sessionId));}
function renderLibrary(data){
 const sessions=data.sessions||data||[],completed=completedIds();
 root.innerHTML=sessions.length?sessions.map(session=>`<article class="card"><h2>${esc(session.name)}</h2><p>${esc(session.purpose)}</p><p class="session-meta"><span>${esc(session.difficulty)}</span><span>${Number(session.durationMinutes)} min</span><span>${session.equipment?.length?esc(session.equipment.join(", ")):"No equipment"}</span><span>Camera optional</span></p>${completed.has(session.id)?'<p class="completed-label">Completed</p>':""}<button class="button primary" data-start="${esc(session.id)}">View session</button></article>`).join(""):'<article class="card"><h2>No sessions available</h2></article>';
 root.querySelectorAll("[data-start]").forEach(button=>button.addEventListener("click",()=>openSession(button.dataset.start)));
}
function renderStep(){
 const step=active.steps[index],last=index===active.steps.length-1,media=step.media;
 const motionButton=active.id===BEGINNER_FLOW_ID?'<button class="button" data-motion-animation>Motion Animation</button>':"";
 detail.innerHTML=`<button class="text-button" data-library>← Yoga library</button><article class="session-shell"><header class="session-heading"><p class="eyebrow">Session preview</p><h1>${esc(active.name)}</h1><p>${esc(active.purpose)}</p><p class="session-meta"><span>${esc(active.difficulty)}</span><span>${Number(active.durationMinutes)} min</span><span>${active.equipment?.length?esc(active.equipment.join(", ")):"No equipment"}</span><span>Camera optional</span></p><button class="button primary" data-launch>Start Session in Train</button></header><section class="overview"><h2>Session goal</h2><p>${esc(active.purpose)}</p>${active.safetyNotes?.length?`<ul>${active.safetyNotes.map(note=>`<li>${esc(note)}</li>`).join("")}</ul>`:""}</section><section class="pose" aria-labelledby="pose-title"><div class="progress-copy">Pose ${index+1} of ${active.steps.length}</div><progress value="${index+1}" max="${active.steps.length}">${index+1} of ${active.steps.length}</progress>${media?.url?`<img class="pose-media" src="${esc(media.url)}" alt="${esc(media.alt||step.name)}">`:""}<p class="eyebrow">${esc(step.category)}</p><h2 id="pose-title">${esc(step.name)}</h2><p>${esc(step.description)}</p><dl><div><dt>Hold</dt><dd>${Number(step.holdSeconds)} seconds</dd></div>${step.restSeconds?`<div><dt>Rest</dt><dd>${Number(step.restSeconds)} seconds</dd></div>`:""}</dl>${step.transition?`<div class="instruction"><h3>Transition</h3><p>${esc(step.transition)}</p></div>`:""}${step.safetyNotes?.length?`<div class="instruction"><h3>Practice safely</h3><ul>${step.safetyNotes.map(note=>`<li>${esc(note)}</li>`).join("")}</ul></div>`:""}<div class="step-actions">${motionButton}</div></section><div class="step-actions"><button class="button" data-prev ${index===0?"disabled":""}>Previous</button>${last?'<span>Start the session in Train to record completion.</span>':'<button class="button" data-next>Preview next pose</button>'}</div></article>`;
 detail.hidden=false;root.hidden=true;document.querySelector(".hero").hidden=true;
 detail.querySelector("[data-library]").addEventListener("click",showLibrary);
 detail.querySelector("[data-launch]").addEventListener("click",launchInTrain);
 detail.querySelector("[data-motion-animation]")?.addEventListener("click",()=>launchMotionAnimation(step));
 detail.querySelector("[data-prev]").addEventListener("click",()=>{index--;renderStep();scrollTo(0,0)});
 detail.querySelector("[data-next]")?.addEventListener("click",()=>{index++;renderStep();scrollTo(0,0)});
}
async function launchMotionAnimation(step){
 status.textContent=`Preparing ${step.name} motion description…`;
 const query=`?motionSource=yoga&session=${encodeURIComponent(active.id)}&pose=${encodeURIComponent(step.poseId)}`;
 const backendOrigin=new URL(MOTION_LAB_BACKEND_BASE).origin;
 const launchWindow=window.open(motionLabBackendUrl(`/dev/motion-lab-launch${query}`),"_blank");
 if(!launchWindow){status.textContent="Motion Lab launch window was blocked. Allow pop-ups and try again.";return;}
 try{
   const registry=await fetchJson(BEGINNER_MOTION_REGISTRY);
   const description=(registry.descriptions||[]).find(item=>item.exerciseId===step.poseId);
   if(!description)throw new Error(`No Motion Description Template entry exists for ${step.name}.`);
   const payload={schemaVersion:1,createdAt:new Date().toISOString(),sourcePage:"/yoga.html",sessionId:active.id,poseId:step.poseId,description};
   localStorage.setItem(MOTION_REQUEST_KEY,JSON.stringify(payload));
   const token=getMotionLabAuthToken();
   if(!token)throw new Error("Motion Lab authorization token is unavailable. Sign in again and retry.");
   await new Promise((resolve,reject)=>{
     const cleanup=()=>{window.clearTimeout(timeout);window.removeEventListener("message",onMessage);};
     const timeout=window.setTimeout(()=>{cleanup();reject(new Error("Motion Lab launch timed out."));},10000);
     function onMessage(message){
       if(message.origin!==backendOrigin||message.source!==launchWindow)return;
       if(message.data?.type==="pocketpt:motion-lab-ready"){
         launchWindow.postMessage({type:"pocketpt:motion-lab-auth",token},backendOrigin);
         status.textContent=`Opening ${step.name} in Motion Lab…`;
         return;
       }
       if(message.data?.type==="pocketpt:motion-lab-launched"){cleanup();resolve();return;}
       if(message.data?.type==="pocketpt:motion-lab-error"){cleanup();reject(new Error(`Motion Lab launch failed: ${message.data.code||"unknown"}.`));}
     }
     window.addEventListener("message",onMessage);
   });
   status.textContent="";
 }catch(error){try{launchWindow.close();}catch(_){}status.textContent=error.message;}
}
function launchInTrain(){
 const first=active.steps[0];
 const state={schemaVersion:1,workoutType:"yoga",sessionId:active.id,sessionName:active.name,currentPoseIndex:0,poseId:first.poseId,poseName:first.name,holdSeconds:first.holdSeconds,restSeconds:first.restSeconds||0,transition:first.transition||"",movementDefinitionId:first.movementDefinitionId||first.poseId,startedAt:Date.now(),poseResults:[]};
 localStorage.setItem(ACTIVE_YOGA_WORKOUT_KEY,JSON.stringify(state));
 location.assign(`/workout.html?yogaSession=${encodeURIComponent(active.id)}`);
}
async function openSession(sessionId){status.textContent="Opening session…";try{active=await request(`/api/yoga/sessions/${encodeURIComponent(sessionId)}`);index=0;startedAt=Date.now();renderStep();status.textContent=""}catch(error){status.textContent=error.message}}
function showLibrary(){active=null;detail.hidden=true;root.hidden=false;document.querySelector(".hero").hidden=false;status.textContent="Choose a session. Opening it never marks it complete.";scrollTo(0,0)}
async function load(){root.setAttribute("aria-busy","true");try{const [catalogue,historyData]=await Promise.all([request("/api/yoga/catalogue"),request("/api/yoga/history")]);history=historyData.sessions||[];renderLibrary(catalogue);status.textContent="Choose a session. Opening it never marks it complete."}catch(error){status.textContent=error.message;root.innerHTML='<article class="card error"><h2>Yoga could not load</h2><p>Check your connection and membership, then retry.</p><button class="button" data-retry>Try again</button></article>';root.querySelector("[data-retry]")?.addEventListener("click",load)}finally{root.removeAttribute("aria-busy")}}
window.AuthStateRuntime.whenReady().then(result=>{if(!result.ok)throw new Error(result.reason==="auth_unavailable"?"Session verification failed. Please retry.":"Sign in to view Yoga sessions.");return load()}).catch(error=>{status.textContent=error.message;root.innerHTML='<article class="card error"><h2>Yoga could not load</h2><p>Sign in with an active membership and retry.</p></article>'});
})();
