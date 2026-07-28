"use strict";
const { createOverpassTrailProvider, parseEndpoints } = require("../src/services/nearbyTrailService");
(async()=>{
  const endpoints=parseEndpoints(process.env); let hostname=new URL(endpoints[0]).hostname,status=null; const started=Date.now();
  try { const provider=createOverpassTrailProvider({endpoints,timeoutMs:Number(process.env.TRAIL_SEARCH_TIMEOUT_MS)||10000,logger:{info(_label,data){if(data.code==="OK"){hostname=data.hostname;status=data.httpStatus;}}}}); const results=await provider.searchNearbyTrails({latitude:38.8895,longitude:-77.0353,radiusMeters:8046.72,limit:3}); console.log("Provider hostname:",hostname);console.log("HTTP status:",status);console.log("Duration ms:",Date.now()-started);console.log("Normalized result count:",results.length);console.log("LIVE PROVIDER TEST PASSED"); }
  catch(error){console.error("Provider hostname:",hostname);console.error("Duration ms:",Date.now()-started);console.error("Error code:",error.code||"UNKNOWN");console.error("LIVE PROVIDER TEST FAILED");process.exitCode=1;}
})();
