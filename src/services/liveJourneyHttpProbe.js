"use strict";
// Same-origin, read-only production HTTP probes. No test customers or mutations.
const TARGETS=[
 {id:"public-campaign",path:"/wellness-quick-connect.html",expected:[200]},
 {id:"admin-preflight-unauthenticated",path:"/api/admin/business-os/acceptance/live/preflight",expected:[401,403]}
];
function evaluateProbe(id,status){
 const target=TARGETS.find(x=>x.id===id);
 if(!target)return {id,status:"FAIL",reason:"UNKNOWN_PROBE"};
 return {id,status:target.expected.includes(status)?"PASS":"FAIL",httpStatus:status,expected:target.expected};
}
module.exports={TARGETS,evaluateProbe};
