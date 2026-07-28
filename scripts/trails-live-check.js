"use strict";
const { createGooglePlacesTrailProvider } = require("../src/services/nearbyTrailService");
(async()=>{
  const started=Date.now();
  try {
    const provider=createGooglePlacesTrailProvider({apiKey:process.env.GOOGLE_MAPS_API_KEY,timeoutMs:Number(process.env.TRAIL_SEARCH_TIMEOUT_MS)||10000,logger:{info(){},warn(...args){console.error(...args);}}});
    const results=await provider.searchNearbyTrails({latitude:38.8895,longitude:-77.0353,radiusMeters:8046.72,limit:3});
    console.log("Provider: google_places");console.log("HTTP status category: success");console.log("Response duration ms:",Date.now()-started);console.log("Normalized result count:",results.length);
    if(!results.length)throw Object.assign(new Error("No results"),{code:"TRAIL_SEARCH_NO_RESULTS"});
    console.log("LIVE GOOGLE PLACES TEST PASSED");
  } catch(error) {console.error("Provider: google_places");console.error("HTTP status category: failure");console.error("Response duration ms:",Date.now()-started);console.error("Error code:",error.code||"UNKNOWN");console.error("LIVE GOOGLE PLACES TEST FAILED");process.exitCode=1;}
})();
