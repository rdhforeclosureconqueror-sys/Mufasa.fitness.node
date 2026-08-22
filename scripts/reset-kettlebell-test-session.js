#!/usr/bin/env node
"use strict";

const fs=require("fs");
const path=require("path");

function resetKettlebellTestSession({challengeFile,userFile,userId,enrollmentId,commitmentSessionId}){
  if(!challengeFile||!userFile||!userId||!enrollmentId||!commitmentSessionId)throw new Error("challengeFile, userFile, userId, enrollmentId and commitmentSessionId are required");
  const challenge=JSON.parse(fs.readFileSync(challengeFile,"utf8")),user=JSON.parse(fs.readFileSync(userFile,"utf8"));
  const enrollment=challenge.userChallenges?.find(item=>item.id===enrollmentId&&item.userId===userId&&item.challengeId==="challenge_kettlebell_8_week");
  if(!enrollment)throw new Error("Exact owned kettlebell enrollment was not found");
  const scheduled=enrollment.commitmentSchedule?.find(item=>item.scheduleSessionId===commitmentSessionId&&item.type==="workout");
  if(!scheduled)throw new Error("Exact commitment workout was not found on the owned enrollment");
  const runtimeId=scheduled.workoutSessionId||`kb_${enrollmentId}_${commitmentSessionId}`,runtime=user.sessions?.[runtimeId];
  if(runtime?.endedAt||["completed","comeback_completed"].includes(scheduled.state))throw new Error("Refusing to reset a completed workout; this command is only for an unfinished test start");
  if(runtime&&runtime.sourceMetadata?.enrollmentId!==enrollmentId)throw new Error("Runtime session enrollment correlation does not match");
  if(runtime&&runtime.sourceMetadata?.commitmentSessionId!==commitmentSessionId)throw new Error("Runtime session commitment correlation does not match");
  delete scheduled.workoutSessionId;delete scheduled.startedAt;scheduled.state="scheduled";
  if(user.sessions)delete user.sessions[runtimeId];
  user.events=(user.events||[]).filter(event=>!(event.command==="fitness.startSession"&&event.payload?.sourceMetadata?.enrollmentId===enrollmentId&&event.payload?.sourceMetadata?.commitmentSessionId===commitmentSessionId));
  const write=(file,value)=>{const temp=`${file}.${process.pid}.tmp`;fs.writeFileSync(temp,JSON.stringify(value,null,2));fs.renameSync(temp,file);};
  write(userFile,user);write(challengeFile,challenge);
  return{userId,enrollmentId,commitmentSessionId,runtimeSessionId:runtimeId,state:scheduled.state,runtimeRemoved:Boolean(runtime)};
}

function arg(name){const index=process.argv.indexOf(`--${name}`);return index<0?null:process.argv[index+1];}
if(require.main===module){
  const dataDir=process.env.DATA_DIR||path.join(__dirname,"..","data");
  const result=resetKettlebellTestSession({challengeFile:arg("challenge-file")||path.join(dataDir,"challenges","runtime-v1.json"),userFile:arg("user-file")||(arg("user-id")?path.join(dataDir,"users",`${arg("user-id")}.json`):null),userId:arg("user-id"),enrollmentId:arg("enrollment-id"),commitmentSessionId:arg("commitment-session-id")});
  process.stdout.write(`${JSON.stringify(result,null,2)}\n`);
}
module.exports={resetKettlebellTestSession};
