"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {createOverpassTrailProvider,createNearbyTrailService,parseEndpoints,coarseKey,buildQuery}=require("../src/services/nearbyTrailService");
const input={latitude:1.001,longitude:2.001,radiusMeters:8046.72,limit:3};
const response=(status=200,body={elements:[{type:"node",id:1,lat:1,lon:2,tags:{name:"A",highway:"trailhead"}}]},type="application/json")=>new Response(typeof body==="string"?body:JSON.stringify(body),{status,headers:{"content-type":type}});
test("fallback endpoint succeeds after retryable statuses and failures",async()=>{for(const first of [429,502,503,504,"connection"]){let calls=0;const fetchImpl=async()=>{calls++;if(calls===1){if(first==="connection")throw new TypeError("fetch failed");return response(first,{})}return response()};const p=createOverpassTrailProvider({fetchImpl,endpoints:["https://a.example/api/interpreter","https://b.example/api/interpreter"]});assert.equal((await p.searchNearbyTrails(input)).length,1);assert.ok(calls>=2&&calls<=3);}});
test("bad provider bodies are rejected without retry",async()=>{for(const r of [response(200,"nope"),response(200,"<html>bad</html>","text/html"),response(200,"x".repeat(2000))]){const p=createOverpassTrailProvider({fetchImpl:async()=>r,endpoints:["https://a.example/api/interpreter"],maxResponseBytes:1000});await assert.rejects(p.searchNearbyTrails(input),e=>e.code==="TRAIL_PROVIDER_BAD_RESPONSE");}});
test("timeout aborts provider request",async()=>{let aborted=false;const p=createOverpassTrailProvider({fetchImpl:(_u,o)=>new Promise((_r,reject)=>o.signal.addEventListener("abort",()=>{aborted=true;reject(Object.assign(new Error(),{name:"AbortError"}));})),endpoints:["https://a.example/api/interpreter"],timeoutMs:20,connectTimeoutMs:10});await assert.rejects(p.searchNearbyTrails(input),e=>e.code==="TRAIL_PROVIDER_TIMEOUT");assert.equal(aborted,true);});
test("configuration and query are constrained",()=>{assert.throws(()=>parseEndpoints({OVERPASS_API_URL:"http://bad/api/interpreter"},{useDefaults:false}),e=>e.code==="TRAIL_PROVIDER_CONFIGURATION_ERROR");assert.deepEqual(parseEndpoints({},{useDefaults:false}),[]);assert.match(buildQuery(input),/out center tags 25/);assert.doesNotMatch(buildQuery(input),/out geom/);});
test("cache is coarse, identity-free, and provides stale fallback",async()=>{let now=0,calls=0;const service=createNearbyTrailService({provider:{searchNearbyTrails:async()=>{calls++;if(calls>1)throw Object.assign(new Error(),{code:"TRAIL_PROVIDER_UNAVAILABLE"});return[{id:"a"}]}},ttlMs:10,maxEntries:2,now:()=>now});await service.search("user-secret",input);const hit=await service.search("other",{...input,latitude:1.002});assert.equal(hit.cached,true);assert.equal(calls,1);assert.doesNotMatch(JSON.stringify([...service._cache]),/user-secret|1\.001/);now=11;const stale=await service.search("other",input);assert.equal(stale.stale,true);assert.equal(coarseKey(input),coarseKey({...input,latitude:1.002}));});
test("invalid input never reaches provider",async()=>{let calls=0;const service=createNearbyTrailService({provider:{searchNearbyTrails:async()=>calls++}});await assert.rejects(service.search("u",{...input,latitude:100}),e=>e.code==="TRAIL_SEARCH_INVALID_INPUT");assert.equal(calls,0);});

test("500 is unavailable and is not retried",async()=>{let calls=0;const p=createOverpassTrailProvider({fetchImpl:async()=>{calls++;return response(500,{})},endpoints:["https://a.example/api/interpreter","https://b.example/api/interpreter"]});await assert.rejects(p.searchNearbyTrails(input),e=>e.code==="TRAIL_PROVIDER_UNAVAILABLE");assert.equal(calls,1);});

test("provider selection requires explicit configuration",()=>{
  const {createConfiguredTrailProvider}=require("../src/services/nearbyTrailService");
  assert.equal(createConfiguredTrailProvider({env:{TRAIL_PROVIDER:"google_places",GOOGLE_MAPS_API_KEY:"secret"}}).health().configured,true);
  assert.equal(createConfiguredTrailProvider({env:{TRAIL_PROVIDER:"google_places"}}).health().configured,false);
  assert.equal(createConfiguredTrailProvider({env:{TRAIL_PROVIDER:"overpass",OVERPASS_API_URLS:"https://overpass.example/api/interpreter"}}).health().configured,true);
  assert.equal(createConfiguredTrailProvider({env:{TRAIL_PROVIDER:"auto",GOOGLE_MAPS_API_KEY:"secret"}}).health().provider,"auto");
  assert.equal(createConfiguredTrailProvider({env:{TRAIL_PROVIDER:"auto"}}).health().configured,false);
});

test("Google Places normalizes, bounds, and omits unsupported metadata",async()=>{
  const {createGooglePlacesTrailProvider}=require("../src/services/nearbyTrailService");
  const places=Array.from({length:12},(_,i)=>({id:String(i),displayName:{text:`Trail ${i}`},location:{latitude:1+i/1000,longitude:2},primaryType:"hiking_area",googleMapsUri:`https://maps.google.com/${i}`}));
  const provider=createGooglePlacesTrailProvider({apiKey:"server-secret",fetchImpl:async(_url,options)=>{assert.equal(options.headers["x-goog-api-key"],"server-secret");return response(200,{places});},logger:{info(){},warn(){}}});
  const trails=await provider.searchNearbyTrails({...input,limit:5});assert.equal(trails.length,5);assert.equal(trails[0].provider,"Google Places");assert.equal(trails[0].lengthMeters,undefined);assert.doesNotMatch(JSON.stringify(trails),/server-secret/);
});

test("Google Places maps stable provider failures",async()=>{
  const {createGooglePlacesTrailProvider}=require("../src/services/nearbyTrailService");
  for(const [status,body,code] of [[403,{error:{}},"TRAIL_PROVIDER_AUTH_FAILED"],[429,{error:{status:"RESOURCE_EXHAUSTED",details:[{reason:"QUOTA_EXCEEDED"}]}},"TRAIL_PROVIDER_QUOTA_EXCEEDED"],[429,{error:{}},"TRAIL_PROVIDER_RATE_LIMITED"],[500,{error:{}},"TRAIL_PROVIDER_UNAVAILABLE"]]){const p=createGooglePlacesTrailProvider({apiKey:"x",fetchImpl:async()=>response(status,body),logger:{warn(){}}});await assert.rejects(p.searchNearbyTrails(input),e=>e.code===code);}
  const malformed=createGooglePlacesTrailProvider({apiKey:"x",fetchImpl:async()=>response(200,{places:{}}),logger:{warn(){}}});await assert.rejects(malformed.searchNearbyTrails(input),e=>e.code==="TRAIL_PROVIDER_BAD_RESPONSE");
});

test("multi-provider falls back, deduplicates nearby names, and sorts distance",async()=>{
 const {createMultiTrailProvider}=require("../src/services/nearbyTrailService");let fallbackCalls=0;const health=()=>({configured:true});
 const provider=createMultiTrailProvider({primary:{health,searchNearbyTrails:async()=>{throw Object.assign(new Error(),{code:"TRAIL_PROVIDER_UNAVAILABLE"});}},fallback:{health,searchNearbyTrails:async()=>{fallbackCalls++;return[{id:"far",name:"Pine Trail",latitude:1.02,longitude:2,distanceFromUserMeters:2000,provider:"OpenStreetMap",attribution:"OSM"},{id:"near",name:"Pine Trail",latitude:1.001,longitude:2,distanceFromUserMeters:100,provider:"Google Places",attribution:"Google"},{id:"duplicate",name:"pine trail",latitude:1.0011,longitude:2,distanceFromUserMeters:110,provider:"OpenStreetMap",attribution:"OSM"}]}}});
 const trails=await provider.searchNearbyTrails(input);assert.equal(fallbackCalls,1);assert.deepEqual(trails.map(x=>x.id),["near","far"]);assert.match(trails[0].attribution,/Google.*OSM/);
});
