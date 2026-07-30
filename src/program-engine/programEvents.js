"use strict";
const TYPES=Object.freeze(["program.started","program.completed","week.completed","mesocycle.completed","deload.completed","program.milestone"]);
function event(type,assignment,occurredAt){if(!TYPES.includes(type))throw new Error(`Unknown program event ${type}`);return{eventType:type,schemaVersion:1,source:"program-engine",subjectUserId:assignment.userId,sourceEntity:{type:"program_assignment",id:assignment.assignmentId,version:assignment.version},occurredAt,idempotencyKey:`${type}:${assignment.assignmentId}:${assignment.currentWeek}`};}
module.exports={PROGRAM_EVENT_TYPES:TYPES,event};
