(function installExtractionOS(global){
  "use strict";

  const STORAGE_KEY="pocketpt.extractionOS.v1";
  const defaults={deadline:"2026-09-06",checks:{},fields:{},version:1};
  const shipItems=[
    ["ship.landing","Public landing + product story","A visitor can understand what Pocket PT does and reach the workout experience."],
    ["ship.auth","Authentication + member profile","A member can sign in and keep their account-scoped fitness information connected."],
    ["ship.onboarding","Intake + goals + onboarding persistence","The system can collect and persist the evidence required to start the member journey."],
    ["ship.workouts","Starter workouts + exercise library","A member has something useful to do without waiting for a custom avatar experience."],
    ["ship.camera","Supported camera tracking + rep/form guidance","Supported movements can use current camera/rep/form capability without claiming universal movement intelligence."],
    ["ship.history","Workout completion + history + progress dashboard","Work leaves evidence: completions, history, progress, consistency, and check-ins."],
    ["ship.coach","Pocket PT text coaching","Members can ask practical workout, substitution, recovery, and mobility questions."],
    ["ship.challenge","Push-Up Challenge + leaderboard","A concrete public challenge gives the product an immediately understandable experience."],
    ["ship.billing","Membership/access path","Finish live payment configuration and verify entitlement; do not redesign billing during Launch 1."]
  ];
  const deferItems=[
    ["defer.avatar","Avatar / full live mirror","Continue in the Avatar Development Board; it is not allowed to block Pocket PT V1."],
    ["defer.godot","Godot gym / Push-Up Arena world","Game-world expansion follows proof that the core product can acquire and retain users."],
    ["defer.motion","Motion Lab perfection / animation bank","Preserve the research and roadmap, but separate it from the first customer delivery gate."],
    ["defer.voice","Always-on / advanced voice experience","Browser/provider-dependent voice remains post-launch until consistently verified."],
    ["defer.nutrition","Meal planning / calorie logging / nutrition system","Do not advertise as active until the actual user flow exists end to end."],
    ["defer.adaptation","Advanced automatic program adaptation","Do not let an unverified future intelligence layer hold a useful current product hostage."]
  ];
  const productGate=[
    ["product.promise","V1 promise is frozen","No new feature may enter Launch 1 unless it is required to deliver the frozen promise."],
    ["product.readiness","Current launch-readiness board reviewed","Existing machine + human evidence has been reviewed; unresolved essentials are blockers, not surprises."],
    ["product.customerJourney","End-to-end customer journey tested","Landing → login → onboarding → workout → completion → dashboard works as a whole."],
    ["product.mobile","Primary phone/browser path verified","A real mobile user can complete the V1 journey without hidden desktop-only assumptions."],
    ["product.safety","Claims and safety boundaries verified","Only supported movement, coaching, recovery, and product claims appear publicly."]
  ];
  const deliveryGate=[
    ["delivery.signup","A new person can enter","Public CTA reaches the correct account/onboarding path."],
    ["delivery.firstValue","First value arrives quickly","A new member can get to a useful workout or challenge without waiting for future features."],
    ["delivery.persistence","Their work persists","Refresh/login/device changes do not erase authoritative onboarding and workout evidence."],
    ["delivery.access","Membership/access works","Trial/payment/entitlement path is configured and verified before paid acquisition."],
    ["delivery.support","Failure path is understandable","If something fails, the user gets a clear next action and the admin can find the first failing boundary."]
  ];
  const marketGate=[
    ["market.whoCheck","First audience is named","Not everyone. One first group with a concrete problem."],
    ["market.messageCheck","One launch message is chosen","The message describes the immediate problem/value, not the entire future ecosystem."],
    ["market.channelCheck","Initial channels are chosen","Know exactly where the first 25–100 real prospects will come from."],
    ["market.offerCheck","Offer + CTA are defined","Trial, pilot, membership, challenge, or another explicit entry point."],
    ["market.measureCheck","Funnel metrics are defined","Reach → visit → register → onboard → first workout → return → pay → refer."]
  ];
  let workspace=loadWorkspace(); let readiness=null;
  function loadWorkspace(){try{return Object.assign({},defaults,JSON.parse(global.localStorage?.getItem(STORAGE_KEY)||"{}"));}catch(_){return {...defaults,checks:{},fields:{}};}}
  function saveWorkspace(){global.localStorage?.setItem(STORAGE_KEY,JSON.stringify(workspace));}
  function esc(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);}
  function renderChecks(targetId,items,options={}){const target=document.getElementById(targetId);if(!target)return;target.innerHTML=items.map(([id,title,note])=>`<label class="check-row"><input type="checkbox" data-check="${esc(id)}" ${workspace.checks[id]?"checked":""}><span class="${options.defer?"post-launch-label":""}">${esc(title)}<small>${esc(note)}</small></span></label>`).join("");}
  function bindChecks(){document.querySelectorAll("[data-check]").forEach(input=>input.addEventListener("change",()=>{workspace.checks[input.dataset.check]=input.checked;saveWorkspace();evaluate();}));}
  function bindFields(){document.querySelectorAll("[data-field]").forEach(input=>{input.value=workspace.fields[input.dataset.field]??"";input.addEventListener("input",()=>{workspace.fields[input.dataset.field]=input.value;saveWorkspace();});});const deadline=document.getElementById("delivery-deadline");deadline.value=workspace.deadline||defaults.deadline;deadline.addEventListener("change",()=>{workspace.deadline=deadline.value;saveWorkspace();evaluate();});}
  function effective(card){return card?.status==="DONE"&&card?.humanRequired&&!card?.humanVerified?"HUMAN_TEST_REQUIRED":card?.status||"UNKNOWN";}
  function renderReadiness(){const target=document.getElementById("readiness-summary"),boundary=document.getElementById("first-boundary"),updated=document.getElementById("evidence-updated");if(!target||!boundary)return;const cards=readiness?.boards?.launch||[];const statuses=["DONE","HUMAN_TEST_REQUIRED","IN_PROGRESS","BLOCKED","BACKLOG","POST_LAUNCH"];const counts=Object.fromEntries(statuses.map(status=>[status,cards.filter(card=>effective(card)===status).length]));target.innerHTML=statuses.map(status=>`<div class="metric"><strong>${counts[status]}</strong><span>${esc(status.replaceAll("_"," "))}</span></div>`).join("");updated.textContent=readiness?.updatedAt?`Updated ${new Date(readiness.updatedAt).toLocaleString()}`:"Live privileged snapshot";const priority={CRITICAL:0,HIGH:1,NORMAL:2,LOW:3};const unresolved=cards.filter(card=>!["DONE","POST_LAUNCH"].includes(effective(card))).sort((a,b)=>(priority[a.priority]??9)-(priority[b.priority]??9)||(a.order??999)-(b.order??999));if(!unresolved.length){boundary.className="first-boundary clear";boundary.innerHTML="<strong>No unresolved Launch Readiness card.</strong> The Extraction gates still require a real customer journey and market plan before declaring launch proof.";return;}const first=unresolved[0];boundary.className="first-boundary";boundary.innerHTML=`<strong>First unresolved launch boundary: ${esc(first.title||first.id)}</strong><br><span>${esc(effective(first).replaceAll("_"," "))}${first.blocker?` · ${esc(first.blocker)}`:""}</span>`;}
  function allChecked(items){return items.every(([id])=>Boolean(workspace.checks[id]));}
  function evaluate(){const card=document.querySelector(".launch-decision"),title=document.getElementById("launch-decision-title"),copy=document.getElementById("launch-decision-copy");if(!card||!title||!copy)return;card.classList.remove("go","hold","blocked");const product=allChecked(productGate),delivery=allChecked(deliveryGate),market=allChecked(marketGate);const cards=readiness?.boards?.launch||[];const hardBlockers=cards.filter(c=>effective(c)==="BLOCKED");if(hardBlockers.length){card.classList.add("blocked");title.textContent="BLOCKED — resolve the first essential boundary";copy.textContent=`${hardBlockers.length} Launch Readiness card(s) are blocked. Cut nonessential scope first; only fix blockers that prevent the frozen V1 promise.`;return;}if(product&&delivery&&market){card.classList.add("go");title.textContent="GO — release the bounded V1";copy.textContent=`The operator gates are complete for the ${workspace.deadline||"selected"} delivery date. Release, circulate, measure, and let Voice-of-the-People evidence govern V1.1.`;return;}card.classList.add("hold");const missing=[];if(!product)missing.push("Product");if(!delivery)missing.push("Delivery");if(!market)missing.push("Market");title.textContent="HOLD — complete the missing launch gates";copy.textContent=`Missing operator gates: ${missing.join(", ")}. Do not reopen deferred avatar/Godot scope to avoid this work.`;}
  async function loadReadiness(){const status=document.getElementById("access-status");try{if(global.AuthStateRuntime?.whenReady)await global.AuthStateRuntime.whenReady();if(!global.MaatApiClient?.request)throw new Error("Canonical admin API client unavailable.");const result=await global.MaatApiClient.request("/api/admin/launch-readiness");if(!result.ok){const code=result.diagnostics?.status;status.className=`status-card ${code===401||code===403?"denied":"error"}`;status.innerHTML=`<strong>${code===403?"Admin access required":"Launch Readiness evidence unavailable"}</strong><br><span>${code===401?"Sign in with the authorized operator account.":code===403?"This page intentionally exposes no protected readiness data without admin/ops authorization.":"The operator workspace stays locked until privileged launch evidence can be verified."}</span>`;return;}readiness=result.payload?.data;document.body.classList.add("extraction-authorized");status.className="status-card ok";status.innerHTML="<strong>Admin evidence connected ✓</strong><br><span>Extraction OS is reading the existing privileged Launch Readiness board. Human-required acceptance remains human authority.</span>";renderReadiness();evaluate();}catch(error){status.className="status-card error";status.innerHTML=`<strong>Extraction evidence failed to load</strong><br><span>${esc(error.message||"Unknown error")}</span>`;}}
  function boot(){renderChecks("ship-list",shipItems);renderChecks("defer-list",deferItems,{defer:true});renderChecks("product-gate",productGate);renderChecks("delivery-gate",deliveryGate);renderChecks("market-gate",marketGate);bindChecks();bindFields();document.getElementById("evaluate-launch")?.addEventListener("click",evaluate);document.getElementById("reset-workspace")?.addEventListener("click",()=>{if(!global.confirm||global.confirm("Reset only the local Extraction OS operator notes/checks on this device?")){workspace={...defaults,checks:{},fields:{}};saveWorkspace();global.location.reload();}});evaluate();loadReadiness();}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",boot,{once:true});else boot();
})(window);
