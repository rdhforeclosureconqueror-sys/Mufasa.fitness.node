"use strict";
const path=require("path");
const {createLaunchReadinessService}=require("../src/services/launchReadinessService");
const argv=process.argv.slice(2),options={};
for(let i=0;i<argv.length;i+=2)options[argv[i].replace(/^--/,"")]=argv[i+1];
if(!options.board||!options.card||!options.action){console.error("Usage: npm run readiness:update -- --board <board> --card <id> --action start|select|evidence|block|unblock|human-verify [--files a,b] [--result PASS] [--note text] [--pr 123] [--commit sha]");process.exit(2)}
const service=createLaunchReadinessService({filePath:path.join(process.env.OPS_DIR||path.join(process.cwd(),"data","ops"),"launch-readiness.json")});
const patch={action:options.action,note:options.note,automated:options.result,files:options.files?.split(",").filter(Boolean),prNumber:options.pr?Number(options.pr):undefined,commitSha:options.commit,actorType:process.env.READINESS_HUMAN_ACTOR==="1"?"human":"machine"};
const result=service.update(options.board,options.card,Object.fromEntries(Object.entries(patch).filter(([,v])=>v!==undefined)));
console.log(JSON.stringify(result.boards[options.board].find(card=>card.id===options.card),null,2));
