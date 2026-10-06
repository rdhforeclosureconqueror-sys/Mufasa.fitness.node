"use strict";
const crypto=require("crypto");
const DAY_MS=24*60*60*1000;
const clean=(v,max=500)=>String(v==null?"":v).trim().slice(0,max);
const iso=v=>new Date(v).toISOString();
const DEFAULT_EVENTS=Object.freeze([
 {eventId:"addison-run-walk-2026-10-10",title:"Addison Run & Walk Club",type:"run_walk",startAt:"2026-10-10T09:00:00-05:00",location:"Addison Circle Park",status:"proposed",priceCents:0,description:"A friendly community run and walk. All fitness levels welcome."},
 {eventId:"mobility-2026-10-14",title:"Community Mobility & Stretching",type:"mobility",startAt:"2026-10-14T18:30:00-05:00",location:"Addison · location pending",status:"proposed",priceCents:0,description:"A community mobility and recovery session."},
 {eventId:"yoga-2026-10-25",title:"Community Yoga",type:"yoga",startAt:"2026-10-25T10:00:00-05:00",location:"Addison · location pending",status:"proposed",priceCents:1500,description:"An inclusive group yoga flow for all levels."},
 {eventId:"sunset-reset-2026-11-01",title:"Sunset Reset Sound Bath",type:"sound_bath",startAt:"2026-11-01T18:00:00-06:00",location:"Property venue pending approval",status:"proposed",priceCents:2000,description:"A guided poolside relaxation experience with breathwork and crystal singing bowls."}
]);
function createResidentialCommunityService({userStore,clock=()=>Date.now()}){
 if(!userStore)throw Error("Community Hub requires canonical userStore");
 const ensure=user=>{user.residentialCommunity||={schemaVersion:1,rsvps:[],messages:[]};user.residentialCommunity.rsvps||=[];user.residentialCommunity.messages||=[];user.residentialCommunity.messages=user.residentialCommunity.messages.filter(m=>Date.parse(m.expiresAt)>clock());return user.residentialCommunity};
 const member=user=>Boolean(user?.residentialWellness?.communicationConsent);
 const events=()=>DEFAULT_EVENTS.map(e=>({...e}));
 function dashboard(userId){const user=userStore.loadUser(userId);if(!member(user))throw Error("Join Community Wellness first");const d=ensure(user),now=clock(),upcoming=events().filter(e=>Date.parse(e.startAt)>=now).sort((a,b)=>Date.parse(a.startAt)-Date.parse(b.startAt));const users=userStore.listUsers().filter(member);return{profile:user.residentialWellness,events:upcoming,rsvps:[...d.rsvps],nextEvent:upcoming[0]||null,stats:{members:users.length,upcomingEvents:upcoming.length,totalRsvps:users.reduce((n,u)=>n+(u.residentialCommunity?.rsvps?.length||0),0)}}}
 function rsvp(userId,eventId,attending=true){const event=DEFAULT_EVENTS.find(e=>e.eventId===clean(eventId,100));if(!event)throw Error("Event not found");if(event.status!=="confirmed")throw Error("RSVP opens when this event is confirmed");let result;userStore.updateUser(userId,user=>{if(!member(user))throw Error("Join Community Wellness first");const d=ensure(user);d.rsvps=d.rsvps.filter(x=>x.eventId!==event.eventId);if(attending)d.rsvps.push({eventId:event.eventId,status:"going",updatedAt:iso(clock())});result={eventId:event.eventId,status:attending?"going":"not_going"};return user});return result}
 function post(userId,input={}){const body=clean(input.text,1000);if(!body)throw Error("Message cannot be empty");let result;userStore.updateUser(userId,user=>{if(!member(user))throw Error("Join Community Wellness first");const d=ensure(user);const displayName=clean(user.displayName||user.name||user.email?.split("@")[0]||"Community Member",80);result={messageId:"wellness_msg_"+crypto.randomUUID(),userId,displayName,text:body,createdAt:iso(clock()),expiresAt:iso(clock()+DAY_MS)};d.messages.push(result);return user});return result}
 function messages(userId){const reader=userStore.loadUser(userId);if(!member(reader))throw Error("Join Community Wellness first");const all=[];for(const listed of userStore.listUsers().filter(member)){const before=listed.residentialCommunity?.messages?.length||0;const d=ensure(listed);if(d.messages.length!==before)userStore.updateUser(listed.userId,user=>{ensure(user);return user});all.push(...d.messages)}return all.sort((a,b)=>Date.parse(a.createdAt)-Date.parse(b.createdAt))}
 function diagnostic(userId){const user=userStore.loadUser(userId),d=user?ensure(user):null;const checks=[{id:"membership",result:member(user)?"PASS":"FAIL"},{id:"event_catalog",result:DEFAULT_EVENTS.length?"PASS":"FAIL"},{id:"chat_retention",result:d?.messages?.every(m=>Date.parse(m.expiresAt)>clock())?"PASS":"FAIL"}];return{diagnosticVersion:"residential-community-hub-v1",firstFailure:checks.find(c=>c.result==="FAIL")?.id||null,checks}}
 return{dashboard,rsvp,post,messages,diagnostic,DAY_MS};
}
module.exports={createResidentialCommunityService,DEFAULT_EVENTS,DAY_MS};
