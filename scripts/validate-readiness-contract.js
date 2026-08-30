"use strict";
const fs=require("fs"),path=require("path"),cp=require("child_process");
const root=path.resolve(__dirname,"..");
const config=JSON.parse(fs.readFileSync(path.join(root,"data/readiness/tracked-scopes.json"),"utf8"));
const evidence=JSON.parse(fs.readFileSync(path.join(root,"data/readiness/development-evidence.json"),"utf8"));
const args=process.argv.slice(2),baseArg=args.indexOf("--base"),base=baseArg>=0?args[baseArg+1]:process.env.READINESS_BASE;
function changed(){
  if(process.env.READINESS_CHANGED_FILES)return process.env.READINESS_CHANGED_FILES.split(",").filter(Boolean);
  const command=base?["diff","--name-only",base,"--"]:["diff","--name-only","HEAD","--"];
  const tracked=cp.execFileSync("git",command,{cwd:root,encoding:"utf8"}).trim().split(/\r?\n/).filter(Boolean);
  const untracked=cp.execFileSync("git",["ls-files","--others","--exclude-standard"],{cwd:root,encoding:"utf8"}).trim().split(/\r?\n/).filter(Boolean);
  return [...new Set([...tracked,...untracked])];
}
const matches=(file,pattern)=>pattern.endsWith("/**")?file.startsWith(pattern.slice(0,-3)+"/"):file===pattern;
const files=changed(),failures=[];
for(const [board,scope] of Object.entries(config.scopes)){
  const affected=files.filter(file=>scope.paths.some(pattern=>matches(file,pattern)));
  if(!affected.length)continue;
  const evidenceChanged=files.includes(scope.evidenceFile);
  const validEntry=evidence.entries.some(entry=>entry.board===board&&entry.cardId&&entry.sourceType&&Array.isArray(entry.files)&&entry.files.length&&entry.evidence&&entry.timestamp);
  if(!evidenceChanged||!validEntry)failures.push(`${board[0].toUpperCase()+board.slice(1)} implementation files changed without a corresponding readiness evidence update: ${affected.join(", ")}`);
}
if(failures.length){console.error(failures.join("\n"));process.exit(1)}
console.log(`Readiness contract valid (${files.length} changed file(s), ${Object.keys(config.scopes).length} tracked scope(s)).`);
