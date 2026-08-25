"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {validateAvatarGlb}=require("../src/validation/avatarGlbValidator");
function glb(nodes){let json=Buffer.from(JSON.stringify({asset:{version:"2.0"},nodes}));json=Buffer.concat([json,Buffer.alloc((4-json.length%4)%4,0x20)]);const out=Buffer.alloc(20+json.length);out.write("glTF");out.writeUInt32LE(2,4);out.writeUInt32LE(out.length,8);out.writeUInt32LE(json.length,12);out.write("JSON",16);json.copy(out,20);return out;}
const nodes=[{name:"Hips",children:[1]},{name:"RightShoulder",children:[2]},{name:"RightArm",children:[3]},{name:"RightForeArm",children:[4]},{name:"RightHand"}];
test("accepts registered Avaturn Phase 1B right-arm hierarchy",()=>assert.equal(validateAvatarGlb(glb(nodes)).profileId,"avaturn-native-v1"));
test("rejects malformed, missing, and disconnected right-arm GLBs",()=>{assert.throws(()=>validateAvatarGlb(Buffer.from("bad")),{code:"AVATAR_INCOMPATIBLE"});assert.throws(()=>validateAvatarGlb(glb(nodes.filter(x=>x.name!=="RightArm"))),/missing required/);const bad=structuredClone(nodes);bad[2].children=[];assert.throws(()=>validateAvatarGlb(glb(bad)),/hierarchy/);});
module.exports={glb,nodes};
