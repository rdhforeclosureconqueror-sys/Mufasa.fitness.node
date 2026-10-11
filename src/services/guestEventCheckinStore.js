"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
function createGuestCheckinStore({dataDir,clock=()=>Date.now()}){
 const dir=path.join(dataDir,"event-checkins");
 const file=id=>path.join(dir,id+".json");
 const clean=(v,n)=>String(v??"").trim().slice(0,n);
 function read(id){if(!/^[a-f0-9-]{36}$/.test(String(id)))return null;try{return JSON.parse(fs.readFileSync(file(id),"utf8"))}catch(e){if(e.code==="ENOENT")return null;throw e}}
 function save(record){fs.mkdirSync(dir,{recursive:true});const p=file(record.id),tmp=p+"."+process.pid+"."+crypto.randomBytes(6).toString("hex")+".tmp";fs.writeFileSync(tmp,JSON.stringify(record),{flag:"wx",mode:0o600});fs.renameSync(tmp,p)}
 function checkin(body){const name=clean(body.name,100),email=clean(body.email,200).toLowerCase(),event=clean(body.event,100),feeling=clean(body.feeling,20),goal=clean(body.goal,250);
 if(name.length<2||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||!event||!["1","2","3","4","5"].includes(feeling)||!goal)throw Object.assign(new Error("Please complete all required fields."),{status:400});
 if(body.consent!==true)throw Object.assign(new Error("Consent is required to store your responses."),{status:400});
 const id=crypto.randomUUID(),token=crypto.randomBytes(32).toString("hex");const record={id,event,name,email,createdAt:new Date(clock()).toISOString(),before:{feeling,goal},after:null,tokenHash:crypto.createHash("sha256").update(token).digest("hex"),consent:true};
 save(record);return{id,token,createdAt:record.createdAt}}
 function reflect(id,token,body){const record=read(id);if(!record||!token||!crypto.timingSafeEqual(Buffer.from(record.tokenHash,"hex"),crypto.createHash("sha256").update(String(token)).digest()))throw Object.assign(new Error("Invalid reflection link."),{status:403});if(record.after)throw Object.assign(new Error("Reflection already received."),{status:409});const feeling=clean(body.feeling,20),notes=clean(body.notes,600);if(!["1","2","3","4","5"].includes(feeling))throw Object.assign(new Error("Select how you feel now."),{status:400});record.after={feeling,notes,createdAt:new Date(clock()).toISOString()};save(record);return{ok:true}}
 function list(){fs.mkdirSync(dir,{recursive:true});return fs.readdirSync(dir).filter(x=>/^[a-f0-9-]{36}\.json$/.test(x)).map(x=>read(x.slice(0,-5))).filter(Boolean).map(({tokenHash,...rest})=>rest).sort((a,b)=>b.createdAt.localeCompare(a.createdAt))}
 return{checkin,reflect,list};
}
module.exports={createGuestCheckinStore};
