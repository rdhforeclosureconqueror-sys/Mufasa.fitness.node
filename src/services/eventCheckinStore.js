"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
function createEventCheckinStore({dataDir,clock=Date.now}){
 const dir=path.join(dataDir,"event-checkins");
 // Event responses are stored on the configured persistent volume; never log reflection tokens.
 const validId=id=>/^[a-f0-9]{32}$/.test(id||"");
 const file=id=>path.join(dir,id+".json");
 function read(id){return validId(id)&&fs.existsSync(file(id))?JSON.parse(fs.readFileSync(file(id),"utf8")):null}
 function write(record){fs.mkdirSync(dir,{recursive:true});const target=file(record.id),tmp=target+"."+process.pid+".tmp";fs.writeFileSync(tmp,JSON.stringify(record));fs.renameSync(tmp,target)}
 function checkin({event,name,email,before}){
  if(!/^[a-z0-9-]{3,64}$/.test(event||""))throw Error("Invalid event");
  if(typeof name!=="string"||name.trim().length<2||name.length>100)throw Error("Invalid name");
  if(typeof email!=="string"||email.length>254||!/^\S+@\S+\.\S+$/.test(email))throw Error("Invalid email");
  if(typeof before!=="string"||before.length>500)throw Error("Invalid response");
  const id=crypto.randomBytes(16).toString("hex"),token=crypto.randomBytes(24).toString("hex");
  write({id,event,name:name.trim(),email:email.trim().toLowerCase(),before,createdAt:clock(),tokenHash:crypto.createHash("sha256").update(token).digest("hex"),after:null});
  return{id,token};
 }
 function reflect({id,token,after}){
  const record=read(id);
  if(!record||typeof token!=="string"||token.length!==48||!crypto.timingSafeEqual(Buffer.from(record.tokenHash,"hex"),crypto.createHash("sha256").update(token).digest()))throw Error("Invalid check-in token");
  if(record.after)throw Error("Reflection already recorded");
  if(typeof after!=="string"||!after.trim()||after.length>1000)throw Error("Invalid reflection");
  record.after={response:after.trim(),createdAt:clock()};write(record);return{complete:true};
 }
 function verifyCompletion({id,token,email}){
  const record=read(id);
  if(!record||!record.after||typeof token!=="string"||token.length!==48||typeof email!=="string")return false;
  const hash=crypto.createHash("sha256").update(token).digest("hex");
  return crypto.timingSafeEqual(Buffer.from(record.tokenHash,"hex"),Buffer.from(hash,"hex"))&&record.email===email.trim().toLowerCase();
 }
 function roster(){if(!fs.existsSync(dir))return[];return fs.readdirSync(dir).filter(f=>/^[a-f0-9]{32}\.json$/.test(f)).map(f=>{const {tokenHash,...entry}=JSON.parse(fs.readFileSync(path.join(dir,f),"utf8"));return entry})}
 return{checkin,reflect,verifyCompletion,roster};
}
module.exports={createEventCheckinStore};
