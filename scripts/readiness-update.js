"use strict";
const fs=require("fs"),path=require("path"),crypto=require("crypto");
const {createLaunchReadinessService}=require("../src/services/launchReadinessService");
const root=path.resolve(__dirname,"..");
function parse(argv){const out={};for(let i=0;i<argv.length;i+=2){if(!argv[i].startsWith("--")||argv[i+1]===undefined)throw new Error(`invalid_argument:${argv[i]}`);out[argv[i].slice(2)]=argv[i+1]}return out}
const safeFiles=value=>value?value.split(",").filter(Boolean):[];
function atomicJson(file,value){fs.mkdirSync(path.dirname(file),{recursive:true});const temp=`${file}.${process.pid}.tmp`;fs.writeFileSync(temp,JSON.stringify(value,null,2)+"\n");fs.renameSync(temp,file)}
function restore(file,backup){if(backup===null)fs.rmSync(file,{force:true});else{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,backup)}}
function run(argv=process.argv.slice(2),env=process.env){
 const o=parse(argv);if(!o.board||!o.action)throw new Error("Usage: readiness:update --board <board> --action create|start|select|evidence|block|unblock [--card id]");
 const allowed=new Set(["create","start","select","evidence","block","unblock","request-human"]);if(!allowed.has(o.action)){if(/^human[-_]verify$/.test(o.action))throw new Error("Human verification must be recorded through an authenticated authorized admin interaction.");throw new Error(`unsupported_action:${o.action}`)}
 if(o.actorType||o["actor-type"]||o.actor||o.humanVerified||o["human-verified"])throw new Error("Readiness CLI is machine-authority only; actor and human verification inputs are forbidden.");
 if(o.action!=="create"&&!o.card)throw new Error("--card is required");
 const opsFile=env.READINESS_OPS_FILE||path.join(env.OPS_DIR||path.join(root,"data","ops"),"launch-readiness.json"),auditFile=env.READINESS_EVIDENCE_FILE||path.join(root,"data/readiness/development-evidence.json"),definitionsFile=env.READINESS_DEVELOPMENT_CARDS_FILE||path.join(root,"data/readiness/development-cards.json");
 const opsBackup=fs.existsSync(opsFile)?fs.readFileSync(opsFile):null,auditBackup=fs.existsSync(auditFile)?fs.readFileSync(auditFile):null,definitionsBackup=fs.existsSync(definitionsFile)?fs.readFileSync(definitionsFile):null;
 const service=createLaunchReadinessService({filePath:opsFile,canonicalMatrixPath:env.READINESS_MATRIX_FILE||path.join(root,"data/launch/feature-readiness-matrix.v1.json"),developmentCardsPath:definitionsFile});
 const files=safeFiles(o.files),dependsOn=safeFiles(o.dependsOn),timestamp=new Date().toISOString(),taskId=o.task||o.taskId||null;
 try{
  let result,cardId=o.card;
  if(o.action==="create"){
   result=service.create(o.board,{id:o.card,title:o.title,category:o.category,description:o.description,priority:o.priority,dependsOn,humanRequired:o.humanRequired==="true",workStarted:o.started==="true",current:o.current==="true",createdAt:timestamp,source:o.source||"readiness:update",taskId});
   cardId=result.boards[o.board].at(-1).id;
  }else{
   const patch={action:o.action==="request-human"?"evidence":o.action,note:o.note||(o.action==="request-human"?"Human verification requested":undefined),automated:o.result,files,prNumber:o.pr?Number(o.pr):undefined,commitSha:o.commit,sourceType:o.action==="request-human"?"human_verification_request":o.sourceType,codeComplete:o.codeComplete==="true"?true:undefined,actorType:"machine"};
   result=service.update(o.board,cardId,Object.fromEntries(Object.entries(patch).filter(([,v])=>v!==undefined)));
  }
  const card=result.boards[o.board].find(c=>c.id===cardId),audit=fs.existsSync(auditFile)?JSON.parse(fs.readFileSync(auditFile,"utf8")):{version:1,entries:[]};
  audit.entries=Array.isArray(audit.entries)?audit.entries:[];audit.entries.push({operationId:crypto.randomUUID(),board:o.board,cardId,sourceType:o.action==="create"?"card_creation":(o.sourceType||"implementation"),taskId,files,automated:o.result||null,evidence:o.note||o.description||`${o.action} recorded`,prNumber:o.pr?Number(o.pr):null,commitSha:o.commit||null,timestamp});
  atomicJson(auditFile,audit);
  return{card,auditEntry:audit.entries.at(-1)};
 }catch(error){restore(opsFile,opsBackup);restore(auditFile,auditBackup);restore(definitionsFile,definitionsBackup);throw error}
}
if(require.main===module){try{console.log(JSON.stringify(run(),null,2))}catch(error){console.error(error.message);process.exitCode=1}}
module.exports={run,parse};
