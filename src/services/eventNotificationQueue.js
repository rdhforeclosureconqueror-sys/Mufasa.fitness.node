"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
function createEventNotificationQueue({dataDir,env=process.env,clock=Date.now}){
 const dir=path.join(dataDir,"event-notification-outbox");
 function enqueue({eventId,kind}){
  if(!/^[a-f0-9]{32}$/.test(eventId||"")||!["checkin","reflection"].includes(kind))throw Error("Invalid event notification");
  const id=crypto.createHash("sha256").update(eventId+":"+kind).digest("hex");
  fs.mkdirSync(dir,{recursive:true});
  const file=path.join(dir,id+".json");
  if(!fs.existsSync(file)){
   const payload={id,eventId,kind,status:"pending",createdAt:clock(),attempts:0};
   const tmp=file+"."+process.pid+".tmp";fs.writeFileSync(tmp,JSON.stringify(payload));fs.renameSync(tmp,file);
  }
  return{id,status:"pending"};
 }
 function pending(){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir).filter(n=>/^[a-f0-9]{64}\.json$/.test(n)).map(n=>JSON.parse(fs.readFileSync(path.join(dir,n),"utf8"))).filter(n=>n.status==="pending")}
 return{enqueue,pending};
}
module.exports={createEventNotificationQueue};
