"use strict";
(function(){
 const host=document.getElementById("wellness-catalog");if(!host)return;
 const groups=[["P0","Entry and first visit",["NFC opens Quick Connect","QR opens Quick Connect","Explore community route","Check-in route","Assessment route","Private session route","Guest access without login","Broken or missing links"]],["P0","Events and attendance",["Find upcoming event","RSVP as guest","RSVP as member","Check in before event","Check in without account","Submit post-session reflection","Duplicate check-in prevented","Wrong event check-in prevented","Admin views attendee","Attendance persists after refresh"]],["P0","Identity and security",["Register account","Sign in","Sign out","Password recovery","Expired session recovery","Member cannot view admin records","Admin can view check-ins","Superadmin can view check-ins","Cross-user data isolation"]],["P1","Community engagement",["Run Club discovery","Join community","Member dashboard","Return via NFC","Community message access","Community unsubscribe","Notification preference","Member reactivation"]],["P1","Wellness services",["Start assessment","Complete assessment","Assessment result saved","Private session inquiry","Booking request confirmation","Cancel request","Service follow-up","Return to original service after signup"]],["P1","CRM and data integrity",["New member appears in CRM","Guest attendance record","Duplicate member detection","Consent stored correctly","Campaign attribution optional","Attribution opt-out","CRM search filters","Report reconciles source records"]],["P2","Resilience and edge cases",["No network on NFC entry","Slow mobile connection","Form double submit","Browser back and forward","Refresh during check-in","Invalid email validation","API 500 safe error","Mobile Safari layout","Screen-reader keyboard navigation"]]];

 const runnable=new Set(["WJ-001","WJ-003","WJ-004","WJ-005","WJ-006","WJ-028"]);
 const style=document.createElement("style");style.textContent=`
 #wellness-catalog .wj-toolbar{display:flex;gap:10px;flex-wrap:wrap;margin:12px 0}
 #wellness-catalog select{max-width:100%;padding:10px;background:#0c1422;color:#fff;border:1px solid #53617a;border-radius:8px}
 #wellness-catalog .wj-item{border:1px solid #35425b;border-radius:10px;padding:12px;margin:8px 0}
 #wellness-catalog .wj-item strong{display:block;margin-bottom:5px}
 #wellness-catalog .wj-meta{font-size:.85rem;color:#b5c4dd}
 #wellness-catalog .wj-run{color:#75e4a6}
 #wellness-catalog .wj-plan{color:#b5c4dd}
 `;host.append(style);
 const toolbar=document.createElement("div");toolbar.className="wj-toolbar";
 const prioritySelect=document.createElement("select");for(const v of ["ALL","P0","P1","P2"]){const o=document.createElement("option");o.value=v;o.textContent=v==="ALL"?"All priorities":v;prioritySelect.append(o)}
 const stateSelect=document.createElement("select");for(const [v,label] of [["ALL","All scenarios"],["RUNNABLE","Runnable route checks"],["PLANNED","Not yet executable"]]){const o=document.createElement("option");o.value=v;o.textContent=label;stateSelect.append(o)}
 toolbar.append(prioritySelect,stateSelect);host.append(toolbar);
 const list=document.createElement("div");host.append(list);
 const entries=[];let index=0;
 for(const [priority,group,scenarios] of groups){for(const name of scenarios){index++;const id="WJ-"+String(index).padStart(3,"0");entries.push({id,name,priority,group,runnable:runnable.has(id)})}}
 function render(){list.replaceChildren();let visible=0;
 for(const entry of entries){if(prioritySelect.value!=="ALL"&&entry.priority!==prioritySelect.value)continue;
 if(stateSelect.value==="RUNNABLE"&&!entry.runnable)continue;
 if(stateSelect.value==="PLANNED"&&entry.runnable)continue;
 visible++;const card=document.createElement("div");card.className="wj-item";
 const title=document.createElement("strong");title.textContent=entry.id+" · "+entry.name;
 const meta=document.createElement("div");meta.className="wj-meta";meta.textContent=entry.group+" · "+entry.priority;
 const state=document.createElement("div");state.className=entry.runnable?"wj-run":"wj-plan";state.textContent=entry.runnable?"RUNNABLE: route check only":"PLANNED: no executable test";
 card.append(title,meta,state);list.append(card)}summary.textContent=visible+" of "+entries.length+" scenarios shown. Route checks verify HTTP/link reachability only; no customer-action tests are certified."}
 const summary=document.createElement("p");summary.className="muted";host.insertBefore(summary,toolbar);
 prioritySelect.addEventListener("change",render);stateSelect.addEventListener("change",render);render();
})();
