"use strict";
const esc=s=>String(s??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
const status=document.getElementById("status"),rows=document.getElementById("rows");
async function load(){
 try{
  const result=await window.MaatApiClient.request("/api/admin/event-checkins");
  if(!result.ok)throw Error(result.payload?.error?.message||result.error?.message||"Access denied or unavailable");
  const data=result.payload?.data||[];
  status.textContent=data.length+" event check-in(s)";
  rows.innerHTML=data.map(x=>"<tr><td>"+esc(x.event)+"</td><td>"+esc(x.name)+"<p>"+esc(x.email)+"</p></td><td>"+esc(new Date(x.createdAt).toLocaleString())+"</td><td>"+esc(x.before)+"</td><td>"+esc(x.after?.response||"—")+"</td><td>"+(x.after?"Complete":"Awaiting reflection")+"</td></tr>").join("");
 }catch(e){status.textContent=e.message;rows.replaceChildren()}
}
load();
