"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createMemberCloudStorage,MAX_BYTES}=require("../lib/firebase-member-cloud-storage");
function fixture(enabled=true){
 const files=new Map(),calls=[];
 const bucket={file(path){calls.push(path);return {async save(bytes){files.set(path,Buffer.from(bytes));},async download(){if(!files.has(path))throw new Error("Not found");return [files.get(path)];},async delete(){files.delete(path);}}}};
 const authorize=(actor,member)=>actor===member;
 return {store:createMemberCloudStorage({bucket,authorize,enabled}),files,calls};
}
test("cloud storage remains disabled by default",async()=>{
 const f=fixture(false);
 await assert.rejects(f.store.upload({actorId:"a",memberId:"a",bytes:Buffer.from("x"),contentType:"image/png"}),{code:"CLOUD_DISABLED"});
 assert.equal(f.calls.length,0);
});
test("synthetic member upload download delete with randomized private path",async()=>{
 const f=fixture();
 const input=Buffer.from("synthetic-only");
 const item=await f.store.upload({actorId:"a",memberId:"a",bytes:input,contentType:"image/png"});
 assert.match(item.objectId,/\.png$/);
 assert.equal(f.calls[0],"member-avatars/a/"+item.objectId);
 assert.deepEqual(await f.store.download({actorId:"a",memberId:"a",objectId:item.objectId}),input);
 assert.deepEqual(await f.store.remove({actorId:"a",memberId:"a",objectId:item.objectId}),{deleted:true});
 assert.equal(f.files.size,0);
});
test("member B cannot access member A objects even with object ID",async()=>{
 const f=fixture(),item=await f.store.upload({actorId:"a",memberId:"a",bytes:Buffer.from("x"),contentType:"image/png"});
 const n=f.calls.length;
 await assert.rejects(f.store.download({actorId:"b",memberId:"a",objectId:item.objectId}),{code:"FORBIDDEN"});
 await assert.rejects(f.store.remove({actorId:"b",memberId:"a",objectId:item.objectId}),{code:"FORBIDDEN"});
 assert.equal(f.calls.length,n);
});
test("reject invalid member, MIME, oversized files and malicious object IDs before bucket access",async()=>{
 const f=fixture();
 await assert.rejects(f.store.upload({actorId:"../x",memberId:"../x",bytes:Buffer.from("x"),contentType:"image/png"}),{code:"INVALID_MEMBER"});
 await assert.rejects(f.store.upload({actorId:"a",memberId:"a",bytes:Buffer.from("x"),contentType:"text/html"}),{code:"INVALID_MIME"});
 await assert.rejects(f.store.upload({actorId:"a",memberId:"a",bytes:Buffer.alloc(MAX_BYTES+1),contentType:"image/png"}),{code:"INVALID_SIZE"});
 await assert.rejects(f.store.download({actorId:"a",memberId:"a",objectId:"../other"}),{code:"INVALID_OBJECT"});
 assert.equal(f.calls.length,0);
});
