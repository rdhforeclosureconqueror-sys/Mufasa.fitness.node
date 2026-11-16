"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createMemberCloudStorage}=require("../lib/firebase-member-cloud-storage");
function glb(){
 const raw=Buffer.from(JSON.stringify({asset:{version:"2.0"}})),n=Math.ceil(raw.length/4)*4;
 const b=Buffer.alloc(20+n,0x20);b.write("glTF",0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(n,12);b.write("JSON",16);raw.copy(b,20);return b;
}
function setup(){
 const data=new Map(),bucket={file(key){return {async save(b){data.set(key,Buffer.from(b));},async download(){return [data.get(key)];},async delete(){data.delete(key);}}}};
 return {store:createMemberCloudStorage({bucket,enabled:true,authorize:(actor,member)=>actor===member}),data};
}
test("synthetic GLB cloud upload, retrieval and deletion",async()=>{
 const {store,data}=setup(),bytes=glb(),item=await store.upload({actorId:"a",memberId:"a",bytes,contentType:"model/gltf-binary"});
 assert.match(item.objectId,/\.glb$/);
 assert.deepEqual(await store.download({actorId:"a",memberId:"a",objectId:item.objectId}),bytes);
 await assert.rejects(store.download({actorId:"b",memberId:"a",objectId:item.objectId}),{code:"FORBIDDEN"});
 await store.remove({actorId:"a",memberId:"a",objectId:item.objectId});
 assert.equal(data.size,0);
});
test("spoofed GLB rejected before cloud write",async()=>{
 const {store,data}=setup();
 await assert.rejects(store.upload({actorId:"a",memberId:"a",bytes:Buffer.from("fake glb"),contentType:"model/gltf-binary"}),{code:"INVALID_GLB"});
 assert.equal(data.size,0);
});

test("reject inherited MIME keys without bucket access",async()=>{
 const {store,data}=setup();
 await assert.rejects(store.upload({actorId:"a",memberId:"a",bytes:glb(),contentType:"constructor"}),{code:"INVALID_MIME"});
 assert.equal(data.size,0);
});
