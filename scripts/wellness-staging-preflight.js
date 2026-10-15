"use strict";
// Read-only safety gate. Never sends registration, RSVP, payment or check-in requests.
const DEFAULT_PRODUCTION_HOSTS=["mufasafitsite.onrender.com","mufasa-fitness-node.onrender.com"];
function validateStagingTarget({target,approvedHost,productionHosts=DEFAULT_PRODUCTION_HOSTS}={}){
 if(!target||!approvedHost)throw Error("STAGING_TARGET_AND_APPROVED_HOST_REQUIRED");
 let parsed;
 try{parsed=new URL(target)}catch{throw Error("INVALID_STAGING_URL")}
 if(parsed.protocol!=="https:"||parsed.username||parsed.password||parsed.search||parsed.hash||parsed.pathname!=="/")throw Error("STAGING_HTTPS_ORIGIN_REQUIRED");
 if(parsed.hostname.toLowerCase()!==String(approvedHost).toLowerCase())throw Error("STAGING_HOST_NOT_APPROVED");
 if(productionHosts.map(h=>h.toLowerCase()).includes(parsed.hostname.toLowerCase()))throw Error("PRODUCTION_TARGET_FORBIDDEN");
 if(!parsed.hostname.endsWith(".onrender.com"))throw Error("STAGING_RENDER_HOST_REQUIRED");
 return {origin:parsed.origin,host:parsed.hostname,mode:"STAGING_READ_ONLY_PREFLIGHT",productionWrites:false};
}
if(require.main===module){
 try{console.log(JSON.stringify({kind:"WellnessStagingPreflight",passed:true,...validateStagingTarget({target:process.env.WELLNESS_STAGING_ORIGIN,approvedHost:process.env.WELLNESS_STAGING_APPROVED_HOST})},null,2))}
 catch(error){console.error(JSON.stringify({kind:"WellnessStagingPreflight",passed:false,firstFailure:error.message}));process.exitCode=1}
}
module.exports={validateStagingTarget,DEFAULT_PRODUCTION_HOSTS};
