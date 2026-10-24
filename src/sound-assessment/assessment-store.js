"use strict";
const fs=require("node:fs"),path=require("node:path"),crypto=require("node:crypto");
function createAssessmentStore(filePath=process.env.SOUND_ASSESSMENT_STORE_PATH||"/var/data/sound-assessments.ndjson"){
 function save(record){
  fs.mkdirSync(path.dirname(filePath),{recursive:true,mode:0o700});
  const id=crypto.randomUUID(),createdAt=new Date().toISOString();
  const row={id,createdAt,...record};
  const fd=fs.openSync(filePath,"a",0o600);
  try{
   const data=Buffer.from(JSON.stringify(row)+"\\n");
   let offset=0;
   while(offset<data.length){
    const written=fs.writeSync(fd,data,offset,data.length-offset);
    if(written<=0)throw new Error("ASSESSMENT_SHORT_WRITE");
    offset+=written;
   }
   fs.fsyncSync(fd);
  }finally{fs.closeSync(fd);}
  return {id,createdAt};
 }
 return {save};
}
module.exports={createAssessmentStore};
