"use strict";

const fs=require("node:fs");
const path=require("node:path");
const {buildScoutCertificationReport}=require("../src/business-os/scout");

function parse(argv){
 const out={};
 for(let i=0;i<argv.length;i+=2){if(argv[i]!=="--evidence"||!argv[i+1])throw new Error("Usage: node scripts/scout-platinum-certify.js --evidence <json-file>");out.evidence=argv[i+1]}
 return out;
}
async function run(argv=process.argv.slice(2)){
 const options=parse(argv),file=path.resolve(options.evidence),evidence=JSON.parse(fs.readFileSync(file,"utf8"));
 return buildScoutCertificationReport(evidence);
}
if(require.main===module)run().then(report=>{console.log(JSON.stringify(report,null,2));if(!report.certified)process.exitCode=2}).catch(error=>{console.error(error.message);process.exitCode=1});
module.exports={parse,run};
