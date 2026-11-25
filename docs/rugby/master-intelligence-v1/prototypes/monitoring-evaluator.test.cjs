const {test}=require('node:test');
const assert=require('node:assert/strict');
const {reviewMonitoring}=require('./monitoring-evaluator.cjs');
const cases=[["velocity loss",{"clinicalConcern":false,"sensitiveHealthData":false,"vbt":{"athleteId":"demo","exercise":"squat","deviceId":"demo","protocol":"demo","metric":"mean","reps":[{"valid":true,"ms":1},{"valid":true,"ms":0.8}]}},r=>Math.abs(r.velocity.lossFromBestPct[1]-20)<1e-9],
["invalid rep",{"clinicalConcern":false,"sensitiveHealthData":false,"vbt":{"athleteId":"demo","exercise":"squat","deviceId":"demo","protocol":"demo","metric":"mean","reps":[{"valid":false,"ms":1}]}},r=>r.status==="REVIEW_REQUIRED"],
["metric",{"clinicalConcern":false,"sensitiveHealthData":false,"vbt":{"athleteId":"demo","exercise":"squat","deviceId":"demo","protocol":"demo","metric":"unknown","reps":[{"valid":true,"ms":1},{"valid":true,"ms":0.8}]}},r=>r.status==="REVIEW_REQUIRED"],
["device",{"clinicalConcern":false,"sensitiveHealthData":false,"vbt":{"athleteId":"demo","exercise":"squat","deviceId":"","protocol":"demo","metric":"mean","reps":[{"valid":true,"ms":1},{"valid":true,"ms":0.8}]}},r=>r.status==="REVIEW_REQUIRED"],
["load delta",{"clinicalConcern":false,"sensitiveHealthData":false,"load":{"athleteId":"demo","metric":"distance","unit":"m","protocol":"demo","kind":"external","planned":4500,"actual":5300}},r=>r.load.delta===800],
["missing actual",{"clinicalConcern":false,"sensitiveHealthData":false,"load":{"athleteId":"demo","metric":"distance","unit":"m","protocol":"demo","kind":"external","planned":4500,"actual":null}},r=>r.load.delta===null],
["zero actual",{"clinicalConcern":false,"sensitiveHealthData":false,"load":{"athleteId":"demo","metric":"distance","unit":"m","protocol":"demo","kind":"external","planned":4500,"actual":0}},r=>r.load.delta===-4500],
["negative load",{"clinicalConcern":false,"sensitiveHealthData":false,"load":{"athleteId":"demo","metric":"distance","unit":"m","protocol":"demo","kind":"external","planned":4500,"actual":-1}},r=>r.status==="REVIEW_REQUIRED"],
["privacy",{"clinicalConcern":false,"sensitiveHealthData":true,"load":{"athleteId":"demo","metric":"distance","unit":"m","protocol":"demo","kind":"external","planned":4500,"actual":5300}},r=>r.status==="HOLD_PROCESSING"],
["clinical",{"clinicalConcern":true,"sensitiveHealthData":false},r=>r.status==="REFER"],
["unknown safety",{"clinicalConcern":null,"sensitiveHealthData":false},r=>r.status==="REVIEW_REQUIRED"],
["unknown privacy",{"clinicalConcern":false,"sensitiveHealthData":null},r=>r.status==="REVIEW_REQUIRED"],
["empty",{"clinicalConcern":false,"sensitiveHealthData":false},r=>r.status==="REVIEW_REQUIRED"],
["null",null,r=>r.status==="REVIEW_REQUIRED"]];
for(const [name,input,check] of cases)test(name,()=>{const r=reviewMonitoring(input);if(!check(r)||r.automatedPrescriptionAllowed!==false||r.runtimeActivation!==false)throw Error(name);});
