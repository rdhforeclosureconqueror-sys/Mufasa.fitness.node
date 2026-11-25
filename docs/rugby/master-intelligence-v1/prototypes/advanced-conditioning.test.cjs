const {test}=require('node:test');
const assert=require('node:assert/strict');
const {advancedConditioning}=require('./advanced-conditioning.cjs');
const cases=[["RSA",{"clinicalConcern":false,"rsa":{"protocol":"demo","distanceM":30,"timesS":[4,5,6],"recoveryS":[20,20]}},r=>Math.abs(r.rsa.decrementPct-25)<1e-9],
["reserve",{"clinicalConcern":false,"speed":{"athleteId":"demo","masMS":4,"maxSprintMS":9,"masProtocol":"field","sprintProtocol":"flying","sprintMethod":"measured_peak"}},r=>r.reserve.ms===5],
["rolling peak",{"clinicalConcern":false,"match":{"athleteId":"demo","protocol":"1s demo","samples":[{"second":0,"distanceM":1,"contacts":2},{"second":1,"distanceM":4,"contacts":0},{"second":2,"distanceM":5,"contacts":0},{"second":3,"distanceM":1,"contacts":0}],"windowsS":[2,5]}},r=>r.peaks[0].runningMPerMin===270&&r.peaks[0].runningStartS===1&&r.peaks[0].contactStartS===0],
["oversized window",{"clinicalConcern":false,"match":{"athleteId":"demo","protocol":"1s demo","samples":[{"second":0,"distanceM":1,"contacts":2},{"second":1,"distanceM":4,"contacts":0},{"second":2,"distanceM":5,"contacts":0},{"second":3,"distanceM":1,"contacts":0}],"windowsS":[2,5]}},r=>r.peaks[1].runningMPerMin===null],
["unknown contact",{"clinicalConcern":false,"match":{"athleteId":"demo","protocol":"1s demo","samples":[{"second":0,"distanceM":1,"contacts":2},{"second":1,"distanceM":4,"contacts":null},{"second":2,"distanceM":5,"contacts":0},{"second":3,"distanceM":1,"contacts":0}],"windowsS":[2,5]}},r=>r.peaks[0].contactCount===null],
["gap",{"clinicalConcern":false,"match":{"athleteId":"demo","protocol":"1s demo","samples":[{"second":0,"distanceM":1,"contacts":2},{"second":2,"distanceM":5,"contacts":0},{"second":3,"distanceM":1,"contacts":0}],"windowsS":[2,5]}},r=>r.status==="REVIEW_REQUIRED"],
["invalid sprint",{"clinicalConcern":false,"speed":{"athleteId":"demo","masMS":4,"maxSprintMS":3,"masProtocol":"field","sprintProtocol":"flying","sprintMethod":"measured_peak"}},r=>r.status==="REVIEW_REQUIRED"],
["average sprint rejected",{"clinicalConcern":false,"speed":{"athleteId":"demo","masMS":4,"maxSprintMS":9,"masProtocol":"field","sprintProtocol":"flying","sprintMethod":"average"}},r=>r.status==="REVIEW_REQUIRED"],
["missing recovery",{"clinicalConcern":false,"rsa":{"protocol":"demo","distanceM":30,"timesS":[4,5,6],"recoveryS":[]}},r=>r.status==="REVIEW_REQUIRED"],
["zero sprint",{"clinicalConcern":false,"rsa":{"protocol":"demo","distanceM":30,"timesS":[0,5,6],"recoveryS":[20,20]}},r=>r.status==="REVIEW_REQUIRED"],
["clinical",{"clinicalConcern":true,"rsa":{"protocol":"demo","distanceM":30,"timesS":[4,5,6],"recoveryS":[20,20]}},r=>r.status==="REFER"],
["unknown safety",{"rsa":{"protocol":"demo","distanceM":30,"timesS":[4,5,6],"recoveryS":[20,20]}},r=>r.status==="REVIEW_REQUIRED"],
["empty",{"clinicalConcern":false},r=>r.status==="REVIEW_REQUIRED"],
["null",null,r=>r.status==="REVIEW_REQUIRED"]];
for(const [name,input,check] of cases)test(name,()=>{const r=advancedConditioning(input);if(!check(r)||r.automatedPrescriptionAllowed!==false||r.runtimeActivation!==false)throw Error(name);});
