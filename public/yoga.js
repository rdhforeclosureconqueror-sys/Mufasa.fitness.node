(function(){
"use strict";
const root=document.getElementById("sessions"),detail=document.getElementById("session-detail"),status=document.getElementById("status");
let active=null,index=0,startedAt=null,history=[];
const ACTIVE_YOGA_WORKOUT_KEY="mufasa.activeWorkout.v1";
const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
async function request(route,options={}){const result=await window.MaatApiClient.request(route,options);if(!result.ok)throw new Error(result.payload?.error?.message||result.payload?.message||result.error?.message||"Yoga is temporarily unavailable.");return result.payload.data;}
function completedIds(){return new Set(history.map(item=>item.sessionId));}
function renderLibrary(data){
 const sessions=data.sessions||data||[],completed=completedIds();
 root.innerHTML=sessions.length?sessions.map(session=>`<article class="card"><h2>${esc(session.name)}</h2><p>${esc(session.purpose)}</p><p class="session-meta"><span>${esc(session.difficulty)}</span><span>${Number(session.durationMinutes)} min</span><span>${session.equipment?.length?esc(session.equipment.join(", ")):"No equipment"}</span><span>Camera optional</span></p>${completed.has(session.id)?'<p class="completed-label">Completed</p>':""}<button class="button primary" data-start="${esc(session.id)}">View session</button></article>`).join(""):'<article class="card"><h2>No sessions available</h2></article>';
 root.querySelectorAll("[data-start]").forEach(button=>button.addEventListener("click",()=>openSession(button.dataset.start)));
}
function renderStep(){
 const step=active.steps[index],last=index===active.steps.length-1,media=step.media;
 detail.innerHTML=`<button class="text-button" data-library>← Yoga library</button><article class="session-shell"><header class="session-heading"><p class="eyebrow">Session preview</p><h1>${esc(active.name)}</h1><p>${esc(active.purpose)}</p><p class="session-meta"><span>${esc(active.difficulty)}</span><span>${Number(active.durationMinutes)} min</span><span>${active.equipment?.length?esc(active.equipment.join(", ")):"No equipment"}</span><span>Camera optional</span></p><button class="button primary" data-launch>Start Session in Train</button></header><section class="overview"><h2>Session goal</h2><p>${esc(active.purpose)}</p>${active.safetyNotes?.length?`<ul>${active.safetyNotes.map(note=>`<li>${esc(note)}</li>`).join("")}</ul>`:""}</section><section class="pose" aria-labelledby="pose-title"><div class="progress-copy">Pose ${index+1} of ${active.steps.length}</div><progress value="${index+1}" max="${active.steps.length}">${index+1} of ${active.steps.length}</progress>${media?.url?`<img class="pose-media" src="${esc(media.url)}" alt="${esc(media.alt||step.name)}">`:""}<p class="eyebrow">${esc(step.category)}</p><h2 id="pose-title">${esc(step.name)}</h2><p>${esc(step.description)}</p><dl><div><dt>Hold</dt><dd>${Number(step.holdSeconds)} seconds</dd></div>${step.restSeconds?`<div><dt>Rest</dt><dd>${Number(step.restSeconds)} seconds</dd></div>`:""}</dl>${step.transition?`<div class="instruction"><h3>Transition</h3><p>${esc(step.transition)}</p></div>`:""}${step.safetyNotes?.length?`<div class="instruction"><h3>Practice safely</h3><ul>${step.safetyNotes.map(note=>`<li>${esc(note)}</li>`).join("")}</ul></div>`:""}</section><div class="step-actions"><button class="button" data-prev ${index===0?"disabled":""}>Previous</button>${last?'<span>Start the session in Train to record completion.</span>':'<button class="button" data-next>Preview next pose</button>'}</div></article>`;
 detail.hidden=false;root.hidden=true;document.querySelector(".hero").hidden=true;
 detail.querySelector("[data-library]").addEventListener("click",showLibrary);
 detail.querySelector("[data-launch]").addEventListener("click",launchInTrain);
 detail.querySelector("[data-prev]").addEventListener("click",()=>{index--;renderStep();scrollTo(0,0)});
 detail.querySelector("[data-next]")?.addEventListener("click",()=>{index++;renderStep();scrollTo(0,0)});
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
