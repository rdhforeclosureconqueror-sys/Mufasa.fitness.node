#!/usr/bin/env node
"use strict";
// Isolated repository-level lifecycle. Never connects to live production or deletes live users.
const fs=require("node:fs"),os=require("node:os"),path=require("node:path"),crypto=require("node:crypto");
const {createAuthCredentialStore}=require("../src/repositories/authCredentialStore");
const {createUserStore}=require("../src/repositories/userStore");
const {createClientCrmService}=require("../src/services/clientCrmService");
const {assessTestRecordOwnership,PREFIX}=require("../src/services/syntheticRecordOwnershipGuard");
function run(){
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-acceptance-crm-"));
 const runId=PREFIX+crypto.randomBytes(12).toString("hex");
 const checks=[];let firstFailure=null;
 function check(id,fn){if(firstFailure){checks.push({id,status:"BLOCKED"});return;}try{fn();checks.push({id,status:"PASS"});}catch(e){firstFailure={id,reason:e.message};checks.push({id,status:"FAIL",reason:e.message});}}
 let account,credentials,users;
 try{
  const credentialsPath=path.join(dir,"credentials.json"),userDir=path.join(dir,"users");
  credentials=createAuthCredentialStore({filePath:credentialsPath});
  users=createUserStore({userDir});
  check("CREATE",()=>{
   account=credentials.create({email:runId+"@example.invalid",name:"Acceptance Synthetic",password:crypto.randomBytes(24).toString("hex"),accessTier:"free"});
   if(!account)throw Error("ACCOUNT_CREATE_FAILED");
   users.updateUser(account.id,u=>Object.assign(u,{syntheticTest:true,testRunId:runId,identity:{email:account.email,name:account.name}}));
  });
  check("CRM_VISIBLE",()=>{
   const listed=credentials.listIdentities();
   if(!listed.some(x=>x.id===account.id)||!users.listUsers().some(x=>x.userId===account.id))throw Error("CRM_SOURCE_IDENTITY_MISSING");
  });
  check("CRM_SERVICE",()=>{
   const crm=createClientCrmService({userStore:users,authCredentialStore:credentials,
    membershipService:{getMembership:()=>({status:"inactive"})},
    trainerWorkspaceStore:{hasActiveAccess:()=>false},
    messagingStore:{listForUser:()=>[],listMessages:()=>[]},
    authorizationResolver:{resolveRole:()=>({role:"user"})}});
   const admin={userId:"acceptance-admin",role:"admin"};
   const directory=crm.directory(admin,{search:account.email});
   if(directory.members.length!==1||directory.members[0].userId!==account.id)throw Error("CRM_DIRECTORY_MISSING_IDENTITY");
   const overview=crm.overview(admin,account.id);
   if(overview.summary.email!==account.email||overview.summary.payment.status!=="free")throw Error("CRM_OVERVIEW_MISMATCH");
   const outsider={userId:"outsider",role:"trainer"};
   if(crm.directory(outsider).members.some(row=>row.userId===account.id))throw Error("CRM_DIRECTORY_UNAUTHORIZED_LEAK");
   try{crm.overview(outsider,account.id);throw Error("CRM_OVERVIEW_UNAUTHORIZED_LEAK")}catch(error){if(error.message==="CRM_OVERVIEW_UNAUTHORIZED_LEAK"||error.status!==403&&error.statusCode!==403)throw error;}
  });
  check("OWNERSHIP",()=>{
   const record={...users.loadUser(account.id),userId:account.id};
   if(!assessTestRecordOwnership({runId,record,kind:"crm",expectedUserId:account.id}).authorized)throw Error("UNOWNED_CRM_RECORD");
   if(!assessTestRecordOwnership({runId,record,kind:"identity",expectedUserId:account.id}).authorized)throw Error("UNOWNED_IDENTITY_RECORD");
  });
  // Cleanup operates exclusively on an OS-created temporary directory, never production stores.
  check("CLEANUP",()=>{fs.rmSync(dir,{recursive:true,force:false});if(fs.existsSync(dir))throw Error("TEMP_DATA_REMAINS");});
  check("VERIFY_ABSENT",()=>{if(fs.existsSync(dir))throw Error("TEST_DATA_STILL_EXISTS");});
  return {kind:"IsolatedCrmCleanupReport",mode:"TEMP_STORAGE_ONLY_NO_PRODUCTION_WRITES",passed:!firstFailure,firstFailure,checks,limitations:["Verifies actual CRM service directory and overview with isolated repository data, not authenticated CRM HTTP endpoint","Production deletion remains disabled","Test-owned temporary files only"]};
 }finally{if(fs.existsSync(dir))fs.rmSync(dir,{recursive:true,force:true});}
}
if(require.main===module){try{const report=run();console.log(JSON.stringify(report,null,2));process.exitCode=report.passed?0:1}catch(error){console.error(error);process.exitCode=2}}
module.exports={run};
