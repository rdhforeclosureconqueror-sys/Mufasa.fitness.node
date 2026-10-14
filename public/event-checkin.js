const API_BASE=location.hostname==="mufasafitsite.onrender.com"?"https://mufasa-fitness-node.onrender.com":"";
const api=path=>API_BASE+path;
const statusEl=document.getElementById("status");
const beforeEl=document.getElementById("before");
const afterEl=document.getElementById("after");
const eventId=new URLSearchParams(location.search).get("eventId");
let saved=JSON.parse(sessionStorage.getItem("event-pass")||"null");
if(saved){afterEl.hidden=false;statusEl.textContent="Complete your reflection after the session."}
else if(eventId){fetch(api("/api/community/events")).then(r=>r.json()).then(d=>{const event=(d.data?.events||[]).find(e=>e.eventId===eventId&&Date.parse(e.startAt)<=Date.now());beforeEl.hidden=!event;statusEl.textContent=event?"Welcome to "+event.title+". Check in below.":"Event check-in is not currently available.";}).catch(()=>{statusEl.textContent="Could not load event availability."});}
else fetch(api("/api/event-checkin/status")).then(r=>r.json()).then(d=>{beforeEl.hidden=!d.active;statusEl.textContent=d.active?"Welcome! Check in below.":"No active event check-in."});
beforeEl.onsubmit=async e=>{e.preventDefault();const r=await fetch(api(eventId?"/api/community/events/"+encodeURIComponent(eventId)+"/guest-check-in":"/api/event-checkin"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(Object.fromEntries(new FormData(beforeEl)))});const d=await r.json();if(d.ok){saved=d.data;sessionStorage.setItem("event-pass",JSON.stringify(saved));beforeEl.hidden=true;afterEl.hidden=false;statusEl.textContent="Checked in. Return after your session."}else statusEl.textContent=d.error?.message||d.error||"Check-in failed"};
afterEl.onsubmit=async e=>{e.preventDefault();const r=await fetch(api("/api/event-checkin/reflection"),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...saved,after:new FormData(afterEl).get("after")})});const d=await r.json();if(d.ok){afterEl.hidden=true;sessionStorage.removeItem("event-pass");statusEl.textContent="Thank you for your reflection!"}else statusEl.textContent=d.error||"Could not save reflection"};
