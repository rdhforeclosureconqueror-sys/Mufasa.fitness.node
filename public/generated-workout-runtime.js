(function () {
  "use strict";
  const debugEnabled = new URLSearchParams(window.location.search || "").get("debugMemberHome") === "1";
  const debug = (message, detail) => { if (debugEnabled) console.info("[MEMBER_HOME]", message, detail || ""); };
  function resolveRecommendationUrl(path, configuredBase) {
    const rawBase = String(configuredBase || "").trim();
    if (!rawBase) throw new Error("Recommendation service URL is not configured.");
    let base;
    try { base = new URL(rawBase); } catch (_) { throw new Error("Recommendation service URL is invalid."); }
    if (!/^https?:$/.test(base.protocol)) throw new Error("Recommendation service URL is invalid.");
    return new URL(path, `${base.origin}/`).toString();
  }
  function parseRecommendationResponse(response, payload) {
    if (!response?.ok || payload?.ok !== true) throw new Error(payload?.error?.message || `Recommendation request failed (${response?.status || "unknown"}).`);
    if (!payload.data || typeof payload.data !== "object" || Array.isArray(payload.data)) throw new Error("Recommendation response was malformed.");
    return payload.data;
  }
  window.MemberHomeRecommendationRuntime = Object.freeze({ resolveRecommendationUrl, parseRecommendationResponse });
  const root=document.getElementById("generatedWorkoutPlanContent"), progressionRoot=document.getElementById("generatedWorkoutProgression"), status=document.getElementById("generatedWorkoutPlanStatus"), dialog=document.getElementById("generatedSessionDialog"), detail=document.getElementById("generatedSessionContent"), close=document.getElementById("generatedSessionClose");
  if(!root||!status||!dialog||!detail||!close)return;
  debug("initialized");
  let model=null, progression=null, returnFocus=null;
  const esc=value=>String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[c]));
  const token=()=>String(window.APP_AUTH?.token||window.MufasaBackendRead?.createClient?.({baseUrl:window.location.origin,storagePrefix:"maat"})?.getAuthToken?.()||"").trim();
  function backendOrigin(){return window.RuntimeState?.getBackendOrigin?.() || window.MAAT_BACKEND_ORIGIN || window.__MAAT_RUNTIME_CONFIG__?.backendOrigin || "";}
  async function request(path,method="GET",body){
    const authToken=token();
    if(!authToken)throw new Error("Sign in to load your recommendation.");
    const url=resolveRecommendationUrl(path,backendOrigin());
    debug("recommendation URL resolved", { endpoint: new URL(url).pathname });
    debug("recommendation request started");
    const res=await fetch(url,{method,headers:{authorization:`Bearer ${authToken}`,"content-type":"application/json"},body:body?JSON.stringify(body):undefined});
    debug("recommendation response status", { status: res.status });
    let payload;
    try{payload=await res.json();}catch(_){debug("recommendation parse failure");throw new Error("Recommendation response was not valid JSON.");}
    try{const data=parseRecommendationResponse(res,payload);debug("recommendation parse success");return data;}catch(error){debug("recommendation parse failure");throw error;}
  }
  function announce(message){status.textContent=message;}
  function render(){if(!model?.available){root.innerHTML="<p>No generated recommendation is available yet.</p>";announce("No generated plan available.");return;}const p=model.plan;root.innerHTML=`${model.assignedProgram?`<p><strong>Current Active Program:</strong> ${esc(model.assignedProgram.title)}.</p><h3>Available Recommendations</h3><p>This preview cannot replace or compete with your active workout.</p>`:""}<p><strong>${esc(p.recommendedProgram.title)}</strong> · Recommendation only</p><p>${p.sessions.length} session${p.sessions.length===1?"":"s"} per week · ${esc(p.sessions[0]?.durationMinutes||"—")} minutes · Week ${esc(p.week)}</p>${p.healthReviewRestriction?`<p role="alert"><strong>Restricted:</strong> ${esc(p.healthReviewRestriction)}</p>`:""}<div class="generated-plan-grid">${p.sessions.map(s=>`<article class="generated-session-card"><h3>${esc(s.title)}</h3><p>${esc(String(s.focus).replaceAll("_"," "))}</p><p>${esc(s.durationMinutes)} minutes · ${s.exercises.length} exercises</p><p><strong>Status:</strong> ${model.assignedProgram?"Preview":esc(s.status.replaceAll("_"," "))}</p><button type="button" data-open-session="${esc(s.sessionId)}">${model.assignedProgram?"Preview":s.status==="in_progress"?"Resume":"View"} session</button></article>`).join("")}</div>`;announce(`Loaded ${p.recommendedProgram.title}.`);root.querySelectorAll("[data-open-session]").forEach(b=>b.addEventListener("click",()=>openSession(b.dataset.openSession,b)));}
  function renderProgression(p){if(!progressionRoot)return;if(!p?.available){progressionRoot.innerHTML="";return;}const e=p.latestEvaluation;if(!e){progressionRoot.innerHTML=`<hr><h3>Weekly progress</h3><p>Complete your week, then evaluate the saved sessions and recovery check-in.</p><button type="button" data-evaluate>Evaluate week</button>`;}else{const i=e.inputSummary;progressionRoot.innerHTML=`<hr><h3>Weekly progress</h3><p><strong>${esc(i.completedSessionCount)} of ${esc(i.prescribedSessionCount)} sessions completed</strong> · ${esc(i.sessionAdherencePercent)}% adherence</p><p>Recovery: ${i.checkIn?`energy ${esc(i.checkIn.energy)}/10, soreness ${esc(i.checkIn.soreness)}/10, sleep ${esc(i.checkIn.sleep)} hours`:`No weekly recovery check-in available`}</p><p><strong>Recommendation:</strong> ${esc(e.outcome.replaceAll("_"," ").toLowerCase())}</p><p>${esc(e.explanation)}</p>${e.status==="recommended"?`<p>Your next-week recommendation is ready.</p><button type="button" data-accept>Accept next week</button>`:""}`;}progressionRoot.querySelector("[data-evaluate]")?.addEventListener("click",evaluateWeek);progressionRoot.querySelector("[data-accept]")?.addEventListener("click",acceptWeek);}
  async function evaluateWeek(){await request("/api/me/generated-workout-progression/evaluate","POST",{});announce("Weekly recommendation saved.");await load();}
  async function acceptWeek(){await request("/api/me/generated-workout-progression/accept","POST",{});announce("Next week accepted and activated.");await load();}
  function openSession(id,button){const s=model.plan.sessions.find(x=>x.sessionId===id);if(!s)return;if(button)returnFocus=button;detail.innerHTML=`<h2 id="generatedSessionTitle">${esc(s.title)}</h2><p><strong>Focus:</strong> ${esc(String(s.focus).replaceAll("_"," "))} · ${esc(s.durationMinutes)} minutes</p>${s.notes?`<p>${esc(s.notes)}</p>`:""}<div>${s.exercises.map((x,i)=>`<section class="generated-exercise"><h3>${i+1}. ${esc(x.name)}</h3><p>${esc(x.sets)} sets · ${esc(x.reps||x.duration||"As prescribed")} · ${esc(x.restSeconds)} seconds rest</p><p><strong>Equipment:</strong> ${esc(String(x.equipment).replaceAll("_"," "))}</p>${x.notes?`<p>${esc(x.notes)}</p>`:""}<p><strong>Progression:</strong> ${esc(x.progressionGuidance||"Follow the persisted prescription.")}</p>${!model.assignedProgram&&s.executionId?controls(s,x):""}</section>`).join("")}</div>${model.assignedProgram?"<p><strong>Preview only.</strong> Follow Today’s Workout from your Current Active Program.</p>":`<button type="button" data-start>${s.status==="in_progress"?"Resume session":"Start session"}</button>${s.executionId?` <button type="button" data-finish>Finish session</button>`:""}`}`;detail.querySelector("[data-start]")?.addEventListener("click",()=>start(s));detail.querySelector("[data-finish]")?.addEventListener("click",()=>finish(s));detail.querySelectorAll("[data-save]").forEach(b=>b.addEventListener("click",()=>save(s,b.dataset.save)));if(!dialog.open)dialog.showModal();close.focus();}
  function controls(s,x){return `<div class="generated-exercise-controls"><label>Completed sets for ${esc(x.name)} <input data-sets="${esc(x.exerciseId)}" type="number" min="0" max="${esc(x.sets)}"></label><label><input data-done="${esc(x.exerciseId)}" type="checkbox"> Exercise complete</label><button type="button" data-save="${esc(x.exerciseId)}">Save progress</button></div>`;}
  async function start(s){const out=await request("/api/me/generated-workout-executions","POST",{sessionId:s.sessionId});s.executionId=out.execution.executionId;s.status=out.execution.status;announce("Session started. Progress is saved to your account.");openSession(s.sessionId,returnFocus);}
  async function save(s,id){const sets=detail.querySelector(`[data-sets="${CSS.escape(id)}"]`),done=detail.querySelector(`[data-done="${CSS.escape(id)}"]`);await request(`/api/me/generated-workout-executions/${encodeURIComponent(s.executionId)}`,"PATCH",{exerciseId:id,completedSets:Number(sets.value||0),completed:done.checked});announce("Exercise progress saved.");}
  async function finish(s){await request(`/api/me/generated-workout-executions/${encodeURIComponent(s.executionId)}/complete`,"POST");announce("Session completed and saved. This does not imply medical clearance.");dialog.close();await load();}
  async function load(){
    if(!token()){announce("Sign in to load your recommendation.");debug("fallback used", { used: true });return;}
    try{[model,progression]=await Promise.all([request("/api/me/generated-workout-plan"),request("/api/me/generated-workout-progression")]);render();renderProgression(progression);debug("fallback used", { used: false });}
    catch(error){announce(`Unable to load recommendation: ${error.message}`);debug("fallback used", { used: true });}
  }
  close.addEventListener("click",()=>dialog.close());dialog.addEventListener("close",()=>returnFocus?.focus());window.addEventListener("auth:ready",load);load();
})();
