"use strict";
const SCHEMA_VERSION=1;
const REQUIRED=["exerciseId","schemaVersion","contentVersion","displayName","aliases","description","classification","coaching","relationships","movementCompatibility","aiCoach","searchKeywords","deprecation"];
function validateExercise(value){const errors=[];if(!value||typeof value!=="object")errors.push("exercise must be an object");else {for(const key of REQUIRED)if(value[key]===undefined||value[key]===null)errors.push(`${key} is required`);if(value.schemaVersion!==SCHEMA_VERSION)errors.push(`unsupported schemaVersion: ${value.schemaVersion}`);if(!/^[a-z0-9][a-z0-9_]*$/.test(value.exerciseId||""))errors.push("exerciseId must be a canonical slug");if(!Array.isArray(value.aliases))errors.push("aliases must be an array");if(!value.classification?.movementPattern)errors.push("classification.movementPattern is required");}return{valid:errors.length===0,errors};}
function assertExercise(value){const result=validateExercise(value);if(!result.valid)throw new TypeError(`Invalid canonical exercise: ${result.errors.join("; ")}`);return value;}
module.exports={SCHEMA_VERSION,REQUIRED,validateExercise,assertExercise};
