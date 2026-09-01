(()=>{"use strict";
const form=document.querySelector("#quoteForm"),status=document.querySelector("#status"),authGate=document.querySelector("#authGate"),submit=document.querySelector("#submitQuote");
const backend=()=>String(window.RuntimeState?.getBackendOrigin?.()||window.MAAT_BACKEND_ORIGIN||window.location.origin).replace(/\/$/,"");
const token=()=>window.AuthStateRuntime?.getAuthToken?.()||window.AuthStateRuntime?.getCanonicalAuthState?.()?.token||null;
const redirectToLogin=()=>location.replace("/login.html?returnTo="+encodeURIComponent("/private-sessions.html"));
async function ensureSignedIn(){
  const runtime=window.AuthStateRuntime;
  const ready=runtime?.whenReady?await runtime.whenReady().catch(()=>null):null;
  const state=runtime?.getCanonicalAuthState?.();
  if(!ready?.ok||!state?.isAuthenticated||!token()){redirectToLogin();return false;}
  authGate.hidden=true;form.hidden=false;return true;
}
async function api(path,options={}){
  const t=token();if(!t){redirectToLogin();throw Error("Sign in required");}
  const url=window.MaatApiClient?.resolve?window.MaatApiClient.resolve(path):backend()+path;
  const r=await fetch(url,{credentials:"omit",cache:"no-store",...options,headers:{"Content-Type":"application/json",Authorization:`Bearer ${t}`,...(options.headers||{})}});
  const b=await r.json().catch(()=>({}));
  if(r.status===401){redirectToLogin();throw Error("Sign in required");}
  if(!r.ok)throw Error(b?.error?.message||b?.message||`HTTP ${r.status}`);return b.data||b;
}
function queueDashboardGuide(){try{sessionStorage.setItem("pocketpt.pendingTour.v1",JSON.stringify({id:"dashboard",expiresAt:Date.now()+30000}));}catch(_){}}
form.addEventListener("submit",async e=>{e.preventDefault();const f=new FormData(form),services=f.getAll("services");if(!services.length){status.textContent="Choose at least one service.";return;}const body={services,locationPreference:f.get("locationPreference"),sessionsPerWeek:Number(f.get("sessionsPerWeek")),paymentPreference:f.get("paymentPreference"),systemInterest:f.get("systemInterest"),budgetRange:f.get("budgetRange"),notes:f.get("notes")};status.textContent="Sending your request…";submit.disabled=true;try{await api("/api/me/private-coaching/quote",{method:"PUT",body:JSON.stringify(body)});status.textContent="Request sent ✓ Opening your PocketPT dashboard…";queueDashboardGuide();location.replace("/dashboard.html?source=private-sessions");}catch(err){submit.disabled=false;if(err.message!=="Sign in required")status.textContent=err.message;}});
ensureSignedIn();
})();