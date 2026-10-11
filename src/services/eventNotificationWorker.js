"use strict";
const fs=require("node:fs"),path=require("node:path");
function createEventNotificationWorker({dataDir,fetchImpl=globalThis.fetch,env=process.env,now=Date.now}){
 const dir=path.join(dataDir,"event-notification-outbox");
 const attendeeDir=path.join(dataDir,"event-checkins");
 const configured=()=>Boolean(env.RESEND_API_KEY&&env.EVENT_EMAIL_FROM&&env.EVENT_EMAIL_TO);
 async function runOnce(){
  if(!configured()||!fs.existsSync(dir))return{configured:configured(),processed:0};
  let processed=0;
  for(const name of fs.readdirSync(dir).filter(n=>/^[a-f0-9]{64}\.json$/.test(n))){
   const file=path.join(dir,name),job=JSON.parse(fs.readFileSync(file,"utf8"));
   if(job.status==="sent"||job.nextAttemptAt>now()||job.attempts>=8)continue;
   if(!/^[a-f0-9]{32}$/.test(job.eventId)||!["checkin","reflection"].includes(job.kind))continue;
   const attendeeFile=path.join(attendeeDir,job.eventId+".json");
   if(!fs.existsSync(attendeeFile))continue;
   const guest=JSON.parse(fs.readFileSync(attendeeFile,"utf8"));
   const subject="Milele Fit event "+(job.kind==="checkin"?"check-in":"reflection");
   const text="Event: "+guest.event+"\nGuest: "+guest.name+"\nEmail: "+guest.email+"\nStatus: "+job.kind+"\nView details in the private admin dashboard.";
   try{
    const response=await fetchImpl("https://api.resend.com/emails",{method:"POST",headers:{"Authorization":"Bearer "+env.RESEND_API_KEY,"Content-Type":"application/json","Idempotency-Key":job.id},body:JSON.stringify({from:env.EVENT_EMAIL_FROM,to:[env.EVENT_EMAIL_TO],subject,text})});
    if(!response.ok)throw Error("Email provider returned "+response.status);
    job.status="sent";job.sentAt=now();delete job.lastError;processed++;
   }catch(error){
    job.attempts++;job.lastError=String(error.message).slice(0,160);job.nextAttemptAt=now()+Math.min(3600000,30000*2**job.attempts);
    if(job.attempts>=8)job.status="failed";
   }
   const tmp=file+"."+process.pid+".tmp";fs.writeFileSync(tmp,JSON.stringify(job));fs.renameSync(tmp,file);
  }
  return{configured:true,processed};
 }
 return{runOnce,configured};
}
module.exports={createEventNotificationWorker};
