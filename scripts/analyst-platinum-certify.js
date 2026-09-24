#!/usr/bin/env node
"use strict";
const fs=require("node:fs");
const {buildAnalystCertificationReport}=require("../src/business-os/analyst");
async function main(){const file=process.argv[2],evidence=file?JSON.parse(fs.readFileSync(file,"utf8")):{};const report=await buildAnalystCertificationReport(evidence);process.stdout.write(`${JSON.stringify(report,null,2)}\n`);if(!report.architectureReady)process.exitCode=1}
if(require.main===module)main().catch(error=>{console.error(error);process.exitCode=1});
module.exports={main};
