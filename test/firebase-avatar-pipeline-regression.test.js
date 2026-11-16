"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path");
const {validateAvatarGlb}=require("../src/validation/avatarGlbValidator");
const {validateAvatarGlb:validateFormat}=require("../lib/firebase-avatar-glb-validation");
const server=fs.readFileSync(path.join(__dirname,"../server.js"),"utf8");
function fixture(){
 const nodes=[{name:"RightShoulder",children:[1]},{name:"RightArm",children:[2]},{name:"RightForeArm",children:[3]},{name:"RightHand"}];
 const raw=Buffer.from(JSON.stringify({asset:{version:"2.0"},nodes}));const len=Math.ceil(raw.length/4)*4;
 const b=Buffer.alloc(20+len,0x20);b.write("glTF",0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(len,12);b.write("JSON",16);raw.copy(b,20);return b;
}
test("realistic synthetic GLB passes format and existing animation skeleton validators",()=>{
 const bytes=fixture();assert.equal(validateFormat(bytes).valid,true);
 assert.equal(validateAvatarGlb(bytes).profileId,"avaturn-native-v1");
});
test("valid GLB with missing bones fails existing compatibility validator",()=>{
 const bytes=fixture();const raw=Buffer.from(JSON.stringify({asset:{version:"2.0"},nodes:[]}));const len=Math.ceil(raw.length/4)*4;const b=Buffer.alloc(20+len,0x20);b.write("glTF",0);b.writeUInt32LE(2,4);b.writeUInt32LE(b.length,8);b.writeUInt32LE(len,12);b.write("JSON",16);raw.copy(b,20);
 assert.equal(validateFormat(b).valid,true);
 assert.throws(()=>validateAvatarGlb(b),{code:"AVATAR_INCOMPATIBLE"});
});
test("production upload still authenticates and checks compatibility before file write",()=>{
 const start=server.indexOf('app.post("/api/avatar/upload", requireAuth,');
 const end=server.indexOf('// ---- COMMAND endpoint',start);
 assert.ok(start>=0&&end>start);
 const route=server.slice(start,end);
 assert.ok(route.indexOf("validateAvatarGlb(fileBuffer)")>=0);
 assert.ok(route.indexOf("validateAvatarGlb(fileBuffer)")<route.indexOf("fs.writeFileSync(destinationPath, fileBuffer)"));
 assert.ok(route.includes("requireOwnedAvatarAsset")===false);
 assert.ok(route.includes("userStore.updateUser(req.auth.userId"));
 assert.ok(route.includes("fs.unlinkSync(candidate)"));
});
