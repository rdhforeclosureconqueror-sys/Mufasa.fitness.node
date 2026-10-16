"use strict";
const {execFile}=require("node:child_process");
const path=require("node:path");
const {promisify}=require("node:util");
const execFileAsync=promisify(execFile);
const TEST_FILE=path.resolve(__dirname,"../test/acceptance-real-auth-http-lifecycle.test.js");
async function runIsolatedHttpJourney(){
 const started=Date.now();
 try{
  const {stdout}=await execFileAsync(process.execPath,["--test","--test-reporter=tap",TEST_FILE],{
   cwd:path.resolve(__dirname,".."),
   timeout:30000,maxBuffer:512*1024,
   env:{NODE_ENV:"test",PORT:"0",PATH:process.env.PATH||"/usr/bin:/bin",HOME:process.env.HOME||"/tmp",TMPDIR:process.env.TMPDIR||"/tmp"}
  });
  const tests=Number(stdout.match(/^# tests (\d+)/m)?.[1]||0);
  const failures=Number(stdout.match(/^# fail (\d+)/m)?.[1]||0);
  const passed=tests>0&&failures===0&&/^# pass [1-9]\d*/m.test(stdout);
  return {mode:"ISOLATED_LOCAL_HTTP_NO_PRODUCTION_RECORD_WRITES",passed,firstFailure:passed?null:"HTTP_TEST_NO_PASS_EVIDENCE",tests,failures,cleanupVerified:passed,cleanupVerified:false,durationMs:Date.now()-started,productionBrowserCertified:false};
 }catch(error){
  const output=String(error.stdout||"");
  const failure=output.match(/^\s*error:\s*(.+)$/m)?.[1]|| (error.killed?"TIMEOUT":"HTTP_TEST_FAILED");
  return {mode:"ISOLATED_LOCAL_HTTP_NO_PRODUCTION_RECORD_WRITES",passed:false,firstFailure:String(failure).slice(0,180),tests:Number(output.match(/^# tests (\d+)/m)?.[1]||0),failures:Number(output.match(/^# fail (\d+)/m)?.[1]||0),durationMs:Date.now()-started,productionBrowserCertified:false};
 }
}
module.exports={runIsolatedHttpJourney};
