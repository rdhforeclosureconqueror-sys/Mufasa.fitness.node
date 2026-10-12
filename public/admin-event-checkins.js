"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const status=document.getElementById("status"),rows=document.getElementById("rows");
async function load(){
 try{
  const readiness=await window.AuthStateRuntime?.whenReady?.();
  if(!readiness?.ok){status.textContent="Sign in required: "+(readiness?.reason||"no verified session");return;}
  const auth=window.AuthStateRuntime?.getCanonicalAuthState?.();
  const roles=auth?.user?.roles||(auth?.user?.role?[auth.user.role]:[]);
  if(!window.AuthStateRuntime?.getAuthToken?.()){status.textContent="Authentication token missing after login. Reopen from your dashboard.";return;}
  if(!roles.includes("super_admin")){status.textContent="Your session is authenticated, but its role is "+(roles.join(", ")||"not available")+". Event attendance requires super_admin.";return;}
  const result=await window.MaatApiClient.request("/api/admin/event-checkins");
  if(!result.ok){const reason=(typeof result.payload?.error==="string"?result.payload.error:result.payload?.error?.message)||result.error?.message||result.error?.code||"Access denied or unavailable";throw Error(reason==="missing_token"?"Please sign in to Milele Fit and reopen this page from your dashboard.":reason)}
  const data=result.payload?.data||[];
  status.textContent=data.length+" event check-in(s)";
  rows.innerHTML=data.map(x=>"<tr><td>"+esc(x.event)+"</td><td>"+esc(x.name)+"<p>"+esc(x.email)+"</p></td><td>"+esc(new Date(x.createdAt).toLocaleString())+"</td><td>"+esc(x.before)+"</td><td>"+esc(x.after?.response||"—")+"</td><td>"+(x.after?"Complete":"Awaiting reflection")+"</td></tr>").join("");
 }catch(e){status.textContent=e.message;rows.replaceChildren()}
}
load();
