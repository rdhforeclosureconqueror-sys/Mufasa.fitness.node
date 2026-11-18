"use strict";
const fs=require("node:fs"),path=require("node:path");
// Single-process JSON snapshot adapter. Atomic rename protects against partial writes;
// it is NOT a multi-process transactional queue or a hosted persistent volume.
function createFileNotificationStore({filePath,fsModule=fs}={}){
 if(typeof filePath!=="string"||!path.isAbsolute(filePath))throw new Error("absolute_notification_store_path_required");
 const dir=path.dirname(filePath);
 function load(){
  try{
   const data=JSON.parse(fsModule.readFileSync(filePath,"utf8"));
   if(!data||data.schemaVersion!==1||!Array.isArray(data.records))throw new Error("notification_store_corrupt");
   const records=new Map();
   for(const record of data.records){
    if(!record||typeof record.idempotencyKey!=="string"||!record.idempotencyKey||records.has(record.idempotencyKey))throw new Error("notification_store_corrupt");
    records.set(record.idempotencyKey,Object.freeze({...record}));
   }
   return records;
  }catch(error){
   if(error.code==="ENOENT")return new Map();
   if(error.message==="notification_store_corrupt")throw error;
   throw new Error("notification_store_read_failed",{cause:error});
  }
 }
 let records=load();
 function put(key,value){
  if(typeof key!=="string"||!key||!value||value.idempotencyKey!==key)throw new Error("notification_store_key_mismatch");
  const next=new Map(records);next.set(key,Object.freeze({...value}));
  fsModule.mkdirSync(dir,{recursive:true});
  const temp=filePath+"."+process.pid+"."+require("node:crypto").randomBytes(8).toString("hex")+".tmp";
  try{
   fsModule.writeFileSync(temp,JSON.stringify({schemaVersion:1,records:[...next.values()]}),{encoding:"utf8",flag:"wx",mode:0o600});
   fsModule.renameSync(temp,filePath);
  }catch(error){try{fsModule.unlinkSync(temp)}catch{}throw error;}
  records=next;
  return value;
 }
 return Object.freeze({get:key=>records.get(key)||null,put,list:()=>[...records.values()]});
}
module.exports={createFileNotificationStore};
