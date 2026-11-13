#!/usr/bin/env node
"use strict";
// Offline, read-only preflight. Does not connect to Firebase or inspect member records.
const fs=require("node:fs");
const path=require("node:path");
const root=path.resolve(__dirname,"..");

function read(p){return fs.readFileSync(path.join(root,p),"utf8");}
function run(){
 const checks=[];
 function check(id,ok,detail){checks.push({id,passed:!!ok,detail});}
 const storage=read("docs/architecture/storage.md");
 const auth=read("docs/auth-rebuild-audit.md");
 const avatar=read("public/avatar-upload-contract.js");
 check("PILOT_DEFAULT_OFF",storage.includes("FIREBASE_MEMBER_CLOUD_ENABLED=false"),"Pilot must be disabled by default");
 check("SERVER_AUTH_REQUIRED",auth.includes("requireAuth")&&storage.includes("validated session"),"Server must authorize member ownership");
 check("ADMIN_SDK_RULES_BYPASS",storage.includes("bypasses Storage Security Rules"),"Admin SDK authorization must be enforced by backend");
 check("AVATAR_CONTRACT_PRESERVED",avatar.includes("/api/avatar/upload")&&storage.includes("/api/avatar/upload"),"Existing upload route remains authoritative");
 check("SYNTHETIC_ISOLATION",storage.includes("member A")&&storage.includes("B's objects"),"Cross-member denial is an explicit acceptance gate");
 check("ROLLBACK_GATE",storage.includes("rollback")&&storage.includes("flag OFF"),"Rollback and flag-off deployment are required");
 check("BILLING_GATE",storage.includes("billing")&&storage.includes("budget alerts"),"Cost readiness required before enabling");
 return {suite:"firebase-member-cloud-preflight",mode:"offline-read-only",passed:checks.every(c=>c.passed),total:checks.length,checks,firstFailure:checks.find(c=>!c.passed)||null,warning:"Design contract checks only; NOT Firebase connectivity, rules, or end-to-end certification"};
}
if(require.main===module){
 try{const report=run();console.log(JSON.stringify(report,null,2));process.exitCode=report.passed?0:1;}
 catch(e){console.error(JSON.stringify({suite:"firebase-member-cloud-preflight",passed:false,firstFailure:{id:"PREFLIGHT_RUNTIME",detail:e.message}}));process.exitCode=1;}
}
module.exports={run};
