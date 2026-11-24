const {conditioningMath}=require('./conditioning-math.cjs');
const cases=[["MAS",{"clinicalConcern":false,"test":{"type":"field_time_trial","distanceM":1500,"timeS":360,"athleteId":"demo","protocol":"example","surface":"grass","environment":"recorded"}},r=>Math.abs(r.mas.ms-1500/360)<1e-9&&Math.abs(r.mas.kmh-15)<1e-9],
["interval",{"clinicalConcern":false,"test":{"type":"field_time_trial","distanceM":1500,"timeS":360,"athleteId":"demo","protocol":"example","surface":"grass","environment":"recorded"},"scenario":{"percentMAS":120,"seconds":15}},r=>Math.abs(r.scenario.distanceM-75)<1e-9],
["zero time",{"clinicalConcern":false,"test":{"type":"field_time_trial","distanceM":1500,"timeS":0,"athleteId":"demo","protocol":"example","surface":"grass","environment":"recorded"}},r=>r.status==="REVIEW_REQUIRED"],
["negative distance",{"clinicalConcern":false,"test":{"type":"field_time_trial","distanceM":-1,"timeS":360,"athleteId":"demo","protocol":"example","surface":"grass","environment":"recorded"}},r=>r.status==="REVIEW_REQUIRED"],
["missing protocol",{"clinicalConcern":false,"test":{"type":"field_time_trial","distanceM":1500,"timeS":360,"athleteId":"demo","protocol":"","surface":"grass","environment":"recorded"}},r=>r.status==="REVIEW_REQUIRED"],
["lab distinction",{"clinicalConcern":false,"test":{"type":"lab","distanceM":1500,"timeS":360,"athleteId":"demo","protocol":"example","surface":"grass","environment":"recorded"}},r=>r.status==="REVIEW_REQUIRED"],
["invalid interval",{"clinicalConcern":false,"test":{"type":"field_time_trial","distanceM":1500,"timeS":360,"athleteId":"demo","protocol":"example","surface":"grass","environment":"recorded"},"scenario":{"percentMAS":120,"seconds":-1}},r=>r.status==="REVIEW_REQUIRED"],
["clinical",{"clinicalConcern":true,"test":{"type":"field_time_trial","distanceM":1500,"timeS":360,"athleteId":"demo","protocol":"example","surface":"grass","environment":"recorded"}},r=>r.status==="REFER"],
["unknown safety",{"clinicalConcern":null,"test":{"type":"field_time_trial","distanceM":1500,"timeS":360,"athleteId":"demo","protocol":"example","surface":"grass","environment":"recorded"}},r=>r.status==="REVIEW_REQUIRED"],
["null",null,r=>r.status==="REVIEW_REQUIRED"]];
for(const [name,input,check] of cases){const r=conditioningMath(input);if(!check(r)||r.automatedPrescriptionAllowed!==false||r.runtimeActivation!==false)throw Error(name);}
console.log('10 cases passed');
