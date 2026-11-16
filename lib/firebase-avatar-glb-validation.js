"use strict";
const MAX_GLB_BYTES=15*1024*1024;
function validateAvatarGlb(bytes){
 if(!Buffer.isBuffer(bytes)||bytes.length<20||bytes.length>MAX_GLB_BYTES)return {valid:false,code:"INVALID_GLB_SIZE"};
 if(bytes.toString("ascii",0,4)!=="glTF")return {valid:false,code:"INVALID_GLB_MAGIC"};
 if(bytes.readUInt32LE(4)!==2)return {valid:false,code:"UNSUPPORTED_GLB_VERSION"};
 if(bytes.readUInt32LE(8)!==bytes.length)return {valid:false,code:"GLB_LENGTH_MISMATCH"};
 const jsonLength=bytes.readUInt32LE(12),jsonType=bytes.toString("ascii",16,20);
 if(jsonType!=="JSON"||jsonLength<2||jsonLength%4!==0||jsonLength>bytes.length-20)return {valid:false,code:"INVALID_GLB_JSON_CHUNK"};
 let json;
 try{json=JSON.parse(bytes.subarray(20,20+jsonLength).toString("utf8").trim());}catch{return {valid:false,code:"INVALID_GLB_JSON"};}
 if(!json||typeof json!=="object"||json.asset?.version!=="2.0")return {valid:false,code:"INVALID_GLB_ASSET"};
 const offset=20+jsonLength;
 if(offset<bytes.length){
  if(bytes.length-offset<8)return {valid:false,code:"INVALID_GLB_BIN_CHUNK"};
  const binLength=bytes.readUInt32LE(offset),binType=bytes.toString("ascii",offset+4,offset+8);
  if(binType!=="BIN\0"||binLength%4!==0||offset+8+binLength!==bytes.length)return {valid:false,code:"INVALID_GLB_BIN_CHUNK"};
 }
 return {valid:true,code:"VALID_GLB"};
}
module.exports={validateAvatarGlb,MAX_GLB_BYTES};
