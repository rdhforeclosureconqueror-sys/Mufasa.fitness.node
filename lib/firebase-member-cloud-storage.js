"use strict";
const crypto=require("node:crypto");
const MAX_BYTES=15*1024*1024;
const TYPES=Object.freeze({"image/png":"png","image/jpeg":"jpg","image/webp":"webp"});
function validMemberId(id){return typeof id==="string"&&/^[A-Za-z0-9._-]{1,128}$/.test(id)&&id!=="."&&id!=="..";}
function createMemberCloudStorage({bucket,enabled=false,authorize}={}){
 if(!bucket||typeof bucket.file!=="function")throw new TypeError("Storage bucket adapter required");
 if(typeof authorize!=="function")throw new TypeError("Server authorization callback required");
 async function guard(actorId,memberId){
  if(!enabled)throw Object.assign(new Error("Cloud storage disabled"),{code:"CLOUD_DISABLED"});
  if(!validMemberId(memberId))throw Object.assign(new Error("Invalid member ID"),{code:"INVALID_MEMBER"});
  if(!actorId||await authorize(actorId,memberId)!==true)throw Object.assign(new Error("Forbidden"),{code:"FORBIDDEN"});
 }
 function objectPath(memberId,objectId){return "member-avatars/"+memberId+"/"+objectId;}
 async function upload({actorId,memberId,bytes,contentType}){
  await guard(actorId,memberId);
  if(!Buffer.isBuffer(bytes)||!bytes.length||bytes.length>MAX_BYTES)throw Object.assign(new Error("Invalid avatar size"),{code:"INVALID_SIZE"});
  const extension=TYPES[contentType];
  if(!extension)throw Object.assign(new Error("Unsupported avatar MIME"),{code:"INVALID_MIME"});
  const objectId=crypto.randomUUID()+"."+extension,path=objectPath(memberId,objectId);
  await bucket.file(path).save(bytes,{resumable:false,metadata:{contentType,cacheControl:"private, no-store"}});
  return {objectId,contentType,size:bytes.length};
 }
 function validObjectId(objectId){return typeof objectId==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\.(png|jpg|webp)$/.test(objectId);}
 async function ownFile(actorId,memberId,objectId){
  await guard(actorId,memberId);
  if(!validObjectId(objectId))throw Object.assign(new Error("Invalid object ID"),{code:"INVALID_OBJECT"});
  return bucket.file(objectPath(memberId,objectId));
 }
 async function download({actorId,memberId,objectId}){const file=await ownFile(actorId,memberId,objectId);const [bytes]=await file.download();return bytes;}
 async function remove({actorId,memberId,objectId}){const file=await ownFile(actorId,memberId,objectId);await file.delete();return {deleted:true};}
 return Object.freeze({upload,download,remove});
}
module.exports={createMemberCloudStorage,MAX_BYTES};
