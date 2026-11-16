"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {validateAvatarGlb}=require("../lib/firebase-avatar-glb-validation");
function glb(json={asset:{version:"2.0"}}){
 const raw=Buffer.from(JSON.stringify(json)),length=Math.ceil(raw.length/4)*4;
 const b=Buffer.alloc(20+length,0x20);b.write("glTF",0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(length,12);b.write("JSON",16);raw.copy(b,20);return b;
}
test("valid minimal GLB v2 passes",()=>assert.deepEqual(validateAvatarGlb(glb()),{valid:true,code:"VALID_GLB"}));
test("reject spoofed GLB extension / wrong magic",()=>assert.equal(validateAvatarGlb(Buffer.from("not a glb")).valid,false));
test("reject bad version",()=>{const b=glb();b.writeUInt32LE(1,4);assert.equal(validateAvatarGlb(b).code,"UNSUPPORTED_GLB_VERSION");});
test("reject mismatched length",()=>{const b=glb();b.writeUInt32LE(999,8);assert.equal(validateAvatarGlb(b).code,"GLB_LENGTH_MISMATCH");});
test("reject invalid asset metadata",()=>assert.equal(validateAvatarGlb(glb({asset:{version:"1.0"}})).code,"INVALID_GLB_ASSET"));
test("reject malformed JSON",()=>{const b=glb();b.fill(0x21,20);assert.equal(validateAvatarGlb(b).code,"INVALID_GLB_JSON");});
