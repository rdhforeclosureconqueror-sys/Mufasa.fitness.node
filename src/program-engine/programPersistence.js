"use strict";
const {ApiError}=require("../lib/apiResponse");
function createProgramPersistence({userStore,clock=()=>Date.now()}){
 function read(userId){return userStore.loadUser(userId).programAssignment||null}
 function save(userId,assignment){if(userId!==assignment.userId)throw new ApiError("PROGRAM_MEMBER_MISMATCH","Program assignment owner mismatch",403);userStore.updateUser(userId,u=>{u.programAssignment=structuredClone(assignment);return u});return assignment}
 function clear(userId){userStore.updateUser(userId,u=>{delete u.programAssignment;return u})}
 // Single-process guard only. Not a distributed transaction; legacy writers remain unchanged.
 function saveIfVersion(userId,expected,assignment){
  if(!assignment||assignment.userId!==userId||!assignment.assignmentId||!Number.isSafeInteger(assignment.version)||assignment.version<1)throw new ApiError("INVALID_ASSIGNMENT","Invalid assignment",400);
  if(expected!==null&&(!expected||!expected.assignmentId||!Number.isSafeInteger(expected.version)||expected.version<1))throw new ApiError("INVALID_ASSIGNMENT_VERSION","Expected assignment version required",400);
  userStore.updateUser(userId,u=>{
   if(u.userId!==userId)throw new ApiError("PROGRAM_MEMBER_MISMATCH","Program assignment owner mismatch",403);
   const current=u.programAssignment??null;
   if(expected===null?current!==null:(!current||current.userId!==userId||current.assignmentId!==expected.assignmentId||current.version!==expected.version))throw new ApiError("PROGRAM_VERSION_CONFLICT","Assignment changed",409);
   if(assignment.version!==(current&&current.assignmentId===assignment.assignmentId?current.version+1:1))throw new ApiError("INVALID_ASSIGNMENT_VERSION","Invalid version transition",400);
   u.programAssignment=structuredClone(assignment);return u;
  });
  return structuredClone(assignment);
 }
 return Object.freeze({read,save,clear,saveIfVersion,clock});
}
module.exports={createProgramPersistence};
