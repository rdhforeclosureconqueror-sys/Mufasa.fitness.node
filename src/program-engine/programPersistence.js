"use strict";
const {ApiError}=require("../lib/apiResponse");
function createProgramPersistence({userStore,clock=()=>Date.now()}){function read(userId){return userStore.loadUser(userId).programAssignment||null}function save(userId,assignment){if(userId!==assignment.userId)throw new ApiError("PROGRAM_MEMBER_MISMATCH","Program assignment owner mismatch",403);userStore.updateUser(userId,u=>{u.programAssignment=structuredClone(assignment);return u});return assignment}function clear(userId){userStore.updateUser(userId,u=>{delete u.programAssignment;return u})}return Object.freeze({read,save,clear,clock});}
module.exports={createProgramPersistence};
