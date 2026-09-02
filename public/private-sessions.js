(()=>{"use strict";
const form=document.querySelector("#quoteForm"),status=document.querySelector("#status"),authGate=document.querySelector("#authGate"),submit=document.querySelector("#submitQuote");
const token=()=>window.AuthStateRuntime?.getAuthToken?.()||window.AuthStateRuntime?.getCanonicalAuthState?.()?.token||null;
const redirectToLogin=()=>location.replace("/login.html?returnTo="+encodeURIComponent("/private-sessions.html"));
const serviceState=new Set();
async function ensureSignedIn(){
  const runtime=window.AuthStateRuntime;
  const ready=runtime?.whenReady?await runtime.whenReady().catch(()=>null):null;
  const state=runtime?.getCanonicalAuthState?.();
  if(!ready?.ok||!state?.isAuthenticated||!token()){redirectToLogin();return false;}
  authGate.hidden=true;form.hidden=false;return true;
}
function queueDashboardGuide(){try{sessionStorage.setItem("pocketpt.pendingTour.v1",JSON.stringify({id:"dashboard",expiresAt:Date.now()+30000}));}catch(_){}}
const serviceInputs=()=>[...form.querySelectorAll('input[name="services"]')];
function syncServiceState(input){if(!input?.matches?.('input[name="services"]'))return;if(input.checked)serviceState.add(input.value);else serviceState.delete(input.value);}
function selectedServices(){
  const dom=serviceInputs().filter(input=>input.checked).map(input=>input.value);
  const serialized=new FormData(form).getAll("services").map(String);
  return [...new Set([...serviceState,...dom,...serialized])].filter(Boolean);
}
function formatTransportFailure(result){
  const d=result?.diagnostics||{};
  const payload=result?.payload||{};
  const server=payload?.error||{};
  const pieces=[server.message||result?.error?.message||"Unable to send request"];
  if(server.code)pieces.push(`code ${server.code}`);
  if(d.apiOrigin)pieces.push(`api ${d.apiOrigin}`);
  if(d.status)pieces.push(`HTTP ${d.status}`);
  if(d.backendReached===false)pieces.push("backend not reached");
  if(d.backendReached===true)pieces.push("backend reached");
  if(server.details?.receivedServices)pieces.push(`received services: ${server.details.receivedServices.join(", ")||"none"}`);
  return pieces.join(" · ");
}
async function submitQuote(body){
  if(!window.MaatApiClient?.request)throw Error("Canonical API client is unavailable");
  const result=await window.MaatApiClient.request("/api/me/private-coaching/quote",{method:"PUT",body});
  if(result?.response?.status===401){redirectToLogin();throw Error("Sign in required");}
  if(!result?.ok){const error=new Error(formatTransportFailure(result));error.code="PRIVATE_COACHING_TRANSPORT_FAILED";throw error;}
  return result.payload?.data||result.payload;
}
serviceInputs().forEach(syncServiceState);
form.addEventListener("change",e=>{if(!e.target.matches('input[name="services"]'))return;syncServiceState(e.target);if(selectedServices().length&&status.textContent.startsWith("Choose at least one"))status.textContent="";});
form.addEventListener("click",e=>{const input=e.target.closest?.('label.choice')?.querySelector?.('input[name="services"]')||e.target.closest?.('input[name="services"]');if(!input)return;setTimeout(()=>{syncServiceState(input);if(selectedServices().length&&status.textContent.startsWith("Choose at least one"))status.textContent="";},0);});
form.addEventListener("submit",async e=>{
  e.preventDefault();
  const f=new FormData(form),services=selectedServices();
  if(!services.length){const domChecked=serviceInputs().filter(input=>input.checked).length,serialized=f.getAll("services").length;status.textContent=`Choose at least one coaching service. Browser debug: tracked ${serviceState.size}, checked ${domChecked}, serialized ${serialized}.`;form.querySelector('input[name="services"]')?.focus();return;}
  const body={services,locationPreference:f.get("locationPreference"),sessionsPerWeek:Number(f.get("sessionsPerWeek")),paymentPreference:f.get("paymentPreference"),systemInterest:f.get("systemInterest"),budgetRange:f.get("budgetRange"),notes:f.get("notes")};
  status.textContent="Sending your request…";submit.disabled=true;
  try{await submitQuote(body);status.textContent="Request sent ✓ Opening your PocketPT dashboard…";queueDashboardGuide();location.replace("/dashboard.html?source=private-sessions");}
  catch(err){submit.disabled=false;if(err.message!=="Sign in required")status.textContent=err.message;}
});
ensureSignedIn();
})();