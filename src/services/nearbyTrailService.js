"use strict";

const { ApiError } = require("../lib/apiResponse");
const ALLOWED_RADII = Object.freeze([8046.72, 16093.44, 40233.6, 80467.2]);
const MAX_LIMIT = 25;
const QUERY_VERSION = "v2-named-trails";
const DEFAULT_ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter"];
const ERROR_MESSAGES = Object.freeze({
  TRAIL_PROVIDER_NOT_CONFIGURED: "Trail discovery is not currently configured.",
  TRAIL_PROVIDER_AUTH_FAILED: "Trail search is temporarily unavailable.",
  TRAIL_PROVIDER_QUOTA_EXCEEDED: "Trail search is temporarily unavailable due to provider limits. Please try again later.",
  TRAIL_PROVIDER_TIMEOUT: "Trail search took too long. Try again or choose a smaller radius.",
  TRAIL_PROVIDER_RATE_LIMITED: "Trail search is temporarily unavailable due to provider limits. Please try again later.",
  TRAIL_PROVIDER_UNAVAILABLE: "Trail search is temporarily unavailable. Please try again.",
  TRAIL_PROVIDER_BAD_RESPONSE: "The trail-data service returned an invalid response. Please try again.",
  TRAIL_PROVIDER_CONFIGURATION_ERROR: "Trail discovery is not configured on this server.",
  TRAIL_SEARCH_INVALID_INPUT: "The trail search location or radius is invalid.",
  TRAIL_SEARCH_NO_RESULTS: "No trails were found within this radius. Try expanding the search area."
});

function trailError(code, status = 503) { return new ApiError(code, ERROR_MESSAGES[code], status); }
function validateSearch(input) {
  const latitude = Number(input?.latitude), longitude = Number(input?.longitude), radiusMeters = Number(input?.radiusMeters), limit = Number(input?.limit ?? 15);
  if (!Number.isFinite(latitude) || latitude < -90 || latitude > 90 || !Number.isFinite(longitude) || longitude < -180 || longitude > 180 || !ALLOWED_RADII.includes(radiusMeters) || !Number.isInteger(limit) || limit < 1 || limit > MAX_LIMIT) throw trailError("TRAIL_SEARCH_INVALID_INPUT", 400);
  return { latitude, longitude, radiusMeters, limit };
}
function parseEndpoints(env = process.env, { useDefaults = true } = {}) {
  const raw = env.OVERPASS_API_URLS || env.OVERPASS_API_URL || (useDefaults ? DEFAULT_ENDPOINTS.join(",") : "");
  return raw.split(",").map(x => x.trim()).filter(Boolean).map(value => {
    let url; try { url = new URL(value); } catch { throw trailError("TRAIL_PROVIDER_CONFIGURATION_ERROR", 503); }
    if (url.protocol !== "https:" || !url.hostname || !url.pathname.endsWith("/api/interpreter") || url.username || url.password) throw trailError("TRAIL_PROVIDER_CONFIGURATION_ERROR", 503);
    return url.toString();
  });
}
function haversine(a,b){const r=Math.PI/180,q=Math.sin((b.latitude-a.latitude)*r/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin((b.longitude-a.longitude)*r/2)**2;return 6371000*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));}
function clean(value){return typeof value === "string" && value.trim() ? value.trim().slice(0,200) : undefined;}
function normalizeElement(element, origin) {
  const latitude=Number(element?.lat ?? element?.center?.lat),longitude=Number(element?.lon ?? element?.center?.lon),tags=element?.tags;
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||!tags||typeof tags!=="object") return null;
  const name=clean(tags.name); if(!name)return null;
  const length=Number(tags.distance || tags.length), elevation=Number(tags.ele_gain);
  return {id:`osm:${element.type}:${element.id}`,name,latitude,longitude,distanceFromUserMeters:haversine(origin,{latitude,longitude}),trailType:clean(tags.route||tags.highway||tags.leisure||tags.boundary),lengthMeters:Number.isFinite(length)&&length>0?length:undefined,difficulty:clean(tags.sac_scale||tags.difficulty),elevationGainMeters:Number.isFinite(elevation)&&elevation>=0?elevation:undefined,surface:clean(tags.surface),accessibility:clean(tags.wheelchair),provider:"OpenStreetMap",providerUrl:`https://www.openstreetmap.org/${encodeURIComponent(element.type)}/${encodeURIComponent(element.id)}`,attribution:"© OpenStreetMap contributors"};
}
function buildQuery(input, includeAreas = false) {
  const r=Math.round(input.radiusMeters), p=`(around:${r},${input.latitude},${input.longitude})`;
  const narrow = `nwr[highway=trailhead]${p};relation[route~"^(hiking|foot|walking)$"][name]${p};nwr[highway~"^(path|footway)$"][name]${p};`;
  const areas = `nwr[leisure=park][name]${p};nwr[boundary~"^(protected_area|national_park)$"][name]${p};nwr[leisure=nature_reserve][name]${p};`;
  return `[out:json][timeout:8];(${includeAreas ? areas : narrow});out center tags ${MAX_LIMIT};`;
}
function classify(error) { if (typeof error?.code === "string" && error.code.startsWith("TRAIL_")) return error; if (error?.name === "AbortError" || error?.name === "TimeoutError") return trailError("TRAIL_PROVIDER_TIMEOUT",504); return trailError("TRAIL_PROVIDER_UNAVAILABLE",503); }
function logDiagnostic(logger, data) { logger.info?.("[trail-provider]", { provider:"overpass", ...data }); }
async function readBody(response, { parseTimeoutMs, maxBytes, signal }) {
  const controller=new AbortController(), timer=setTimeout(()=>controller.abort(),parseTimeoutMs);
  const abort=()=>controller.abort(); signal?.addEventListener("abort",abort,{once:true});
  try {
    const reader=response.body?.getReader?.();
    if (!reader) { const text=await response.text(); if(Buffer.byteLength(text)>maxBytes) throw trailError("TRAIL_PROVIDER_BAD_RESPONSE",502); return text; }
    const chunks=[]; let size=0;
    while(true){const read=reader.read(); const result=await Promise.race([read,new Promise((_,reject)=>controller.signal.addEventListener("abort",()=>reject(trailError("TRAIL_PROVIDER_TIMEOUT",504)),{once:true}))]);if(result.done)break;size+=result.value.byteLength;if(size>maxBytes){reader.cancel();throw trailError("TRAIL_PROVIDER_BAD_RESPONSE",502);}chunks.push(Buffer.from(result.value));}
    return Buffer.concat(chunks).toString("utf8");
  } finally { clearTimeout(timer); signal?.removeEventListener("abort",abort); }
}
function createOverpassTrailProvider({fetchImpl=global.fetch,endpoints,timeoutMs=10000,connectTimeoutMs=4000,parseTimeoutMs=2000,maxResponseBytes=1_000_000,logger=console,now=Date.now}={}) {
  const urls=endpoints || parseEndpoints(); const health={provider:"overpass",configured:urls.length>0,endpoints:urls.map(url=>({hostname:new URL(url).hostname,status:"unknown",latencyMs:null,lastSuccessfulRequestTime:null}))};
  async function request(input, includeAreas, url, budgetDeadline) {
    const started=now(), controller=new AbortController(), remaining=Math.max(1,budgetDeadline-started), totalTimer=setTimeout(()=>controller.abort(),remaining), connectTimer=setTimeout(()=>controller.abort(),Math.min(connectTimeoutMs,remaining)); let response, bytes=null, contentType=null;
    try {
      response=await fetchImpl(url,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded","accept":"application/json","user-agent":"MufasaFitness-TrailSearch/2.0"},body:new URLSearchParams({data:buildQuery(input,includeAreas)}),signal:controller.signal}); clearTimeout(connectTimer);
      contentType=response.headers?.get?.("content-type") || null;
      if(response.status===429)throw trailError("TRAIL_PROVIDER_RATE_LIMITED",503);
      if(!response.ok){const upstream=trailError("TRAIL_PROVIDER_UNAVAILABLE",503);upstream.retryable=[502,503,504].includes(response.status);throw upstream;}
      if(!/json/i.test(contentType||""))throw trailError("TRAIL_PROVIDER_BAD_RESPONSE",502);
      const text=await readBody(response,{parseTimeoutMs:Math.min(parseTimeoutMs,Math.max(1,budgetDeadline-now())),maxBytes:maxResponseBytes,signal:controller.signal}); bytes=Buffer.byteLength(text);
      let body; try{body=JSON.parse(text);}catch{throw trailError("TRAIL_PROVIDER_BAD_RESPONSE",502);}
      if(!Array.isArray(body?.elements))throw trailError("TRAIL_PROVIDER_BAD_RESPONSE",502);
      const entry=health.endpoints.find(x=>x.hostname===new URL(url).hostname);entry.status="reachable";entry.latencyMs=now()-started;entry.lastSuccessfulRequestTime=new Date().toISOString();
      logDiagnostic(logger,{hostname:new URL(url).hostname,httpStatus:response.status,timeoutCategory:null,responseContentType:contentType,responseBytes:bytes,durationMs:now()-started,code:"OK"}); return body.elements;
    } catch(raw) {
      const error=classify(raw), entry=health.endpoints.find(x=>x.hostname===new URL(url).hostname);entry.status="unreachable";entry.latencyMs=now()-started;
      logDiagnostic(logger,{hostname:new URL(url).hostname,httpStatus:response?.status||null,timeoutCategory:error.code==="TRAIL_PROVIDER_TIMEOUT"?(response?"total_or_body":"connection_or_total"):null,responseContentType:contentType,responseBytes:bytes,durationMs:now()-started,code:error.code}); throw error;
    } finally {clearTimeout(connectTimer);clearTimeout(totalTimer);controller.abort();}
  }
  return { health:()=>JSON.parse(JSON.stringify(health)), async searchNearbyTrails(input){if(!urls.length)throw trailError("TRAIL_PROVIDER_CONFIGURATION_ERROR",503);const deadline=now()+timeoutMs;let last;
    for(let i=0;i<Math.min(2,urls.length);i++){try{let elements=await request(input,false,urls[i],deadline);let normalized=elements.map(x=>normalizeElement(x,input)).filter(Boolean);if(normalized.length<Math.min(3,input.limit)&&deadline-now()>1000){const extra=await request(input,true,urls[i],deadline);normalized=normalized.concat(extra.map(x=>normalizeElement(x,input)).filter(Boolean));}const unique=[...new Map(normalized.map(x=>[x.id,x])).values()].sort((a,b)=>a.distanceFromUserMeters-b.distanceFromUserMeters).slice(0,input.limit);return unique;}catch(error){last=error;const retryable=error.code==="TRAIL_PROVIDER_TIMEOUT"||error.code==="TRAIL_PROVIDER_RATE_LIMITED"||(error.code==="TRAIL_PROVIDER_UNAVAILABLE"&&error.retryable!==false);if(!retryable||deadline<=now())break;}}
    throw last||trailError("TRAIL_PROVIDER_UNAVAILABLE",503);
  }};
}

const GOOGLE_PLACES_URL = "https://places.googleapis.com/v1/places:searchNearby";
const GOOGLE_TEXT_SEARCH_URL = "https://places.googleapis.com/v1/places:searchText";
const GOOGLE_FIELD_MASK = "places.id,places.displayName,places.location,places.primaryType,places.types,places.googleMapsUri";
const DISCOVERY_TYPES = ["hiking_area", "park", "sports_complex", "tourist_attraction"];
const DISCOVERY_QUERIES = ["walking trails", "running trails", "nature trails", "greenways", "parks with walking trails", "recreation areas"];
function googleError(status, body) {
  const reason=body?.error?.details?.map(x=>x.reason).find(Boolean)||body?.error?.status;
  if(status===401 || status===403) return trailError("TRAIL_PROVIDER_AUTH_FAILED",503);
  if(status===429 && /quota/i.test(String(reason))) return trailError("TRAIL_PROVIDER_QUOTA_EXCEEDED",503);
  if(status===429) return trailError("TRAIL_PROVIDER_RATE_LIMITED",503);
  return trailError(status>=500?"TRAIL_PROVIDER_UNAVAILABLE":"TRAIL_PROVIDER_BAD_RESPONSE",status>=500?503:502);
}
function sanitizeGoogleDiagnostic(value, apiKey, input) {
  if (value === undefined) return undefined;
  const sensitiveName = /(?:api.?key|authorization|credential|token|latitude|longitude|\blat\b|\blng\b)/i;
  const secrets=[apiKey,input?.latitude,input?.longitude].filter(item=>item!==undefined&&item!==null&&String(item));
  const sanitize = (item, key) => {
    if (key && sensitiveName.test(key)) return "[REDACTED]";
    if (typeof item === "string") return secrets.reduce((text,secret)=>text.split(String(secret)).join("[REDACTED]"),item);
    if (Array.isArray(item)) return item.map(entry => sanitize(entry));
    if (item && typeof item === "object") return Object.fromEntries(Object.entries(item).map(([name,entry]) => [name,sanitize(entry,name)]));
    return item;
  };
  return sanitize(value);
}
function normalizeGooglePlace(place, origin) {
  const latitude=Number(place?.location?.latitude),longitude=Number(place?.location?.longitude),name=clean(place?.displayName?.text);
  if(!place?.id||!name||!Number.isFinite(latitude)||!Number.isFinite(longitude))return null;
  return {id:`google:${place.id}`,providerId:place.id,name,latitude,longitude,distanceFromUserMeters:origin&&Number.isFinite(origin.latitude)?haversine(origin,{latitude,longitude}):undefined,trailType:clean(place.primaryType||place.types?.[0]),provider:"Google Places",providerUrl:clean(place.googleMapsUri)||`https://www.google.com/maps/search/?api=1&query_place_id=${encodeURIComponent(place.id)}`,attribution:"Google Places",routeSource:"place_only",routeSourceLabel:"Place location only"};
}
function createGooglePlacesTrailProvider({fetchImpl=global.fetch,apiKey=process.env.GOOGLE_MAPS_API_KEY,timeoutMs=10000,logger=console,now=Date.now}={}) {
  const health={provider:"google_places",configured:Boolean(apiKey),reachable:false,lastSuccessfulRequestTime:null,lastFailureCategory:null,responseLatencyMs:null};
  logger.info?.("[trail-provider]",{provider:"google_places",event:"initialization",configured:health.configured,code:health.configured?"OK":"TRAIL_PROVIDER_NOT_CONFIGURED"});
  async function request(input, expanded) {
    const started=now(),controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);let response,payload;
    try {
      const body={includedTypes:expanded?DISCOVERY_TYPES.slice(1):[DISCOVERY_TYPES[0]],maxResultCount:Math.min(20,input.limit),rankPreference:"DISTANCE",locationRestriction:{circle:{center:{latitude:input.latitude,longitude:input.longitude},radius:Math.min(50000,input.radiusMeters)}}};
      response=await fetchImpl(GOOGLE_PLACES_URL,{method:"POST",headers:{"content-type":"application/json","x-goog-api-key":apiKey,"x-goog-fieldmask":GOOGLE_FIELD_MASK},body:JSON.stringify(body),signal:controller.signal});
      try{payload=await response.json();}catch{throw trailError("TRAIL_PROVIDER_BAD_RESPONSE",502);}
      if(!response.ok)throw googleError(response.status,payload);
      if(payload?.places!==undefined&&!Array.isArray(payload.places))throw trailError("TRAIL_PROVIDER_BAD_RESPONSE",502);
      const places=payload.places||[],normalized=places.map(x=>normalizeGooglePlace(x,input)).filter(Boolean),normalizationFailures=places.length-normalized.length;
      health.reachable=true;health.lastSuccessfulRequestTime=new Date().toISOString();health.lastFailureCategory=null;health.responseLatencyMs=now()-started;
      logger.info?.("[trail-provider]",{provider:"google_places",event:"response",httpStatus:response.status,durationMs:health.responseLatencyMs,resultCount:places.length,normalizedCount:normalized.length,normalizationFailures,code:normalizationFailures?"TRAIL_NORMALIZATION_PARTIAL":"OK"});
      if(normalizationFailures)logger.warn?.("[trail-provider]",{provider:"google_places",event:"normalization",normalizationFailures,code:"TRAIL_NORMALIZATION_PARTIAL"});
      return normalized;
    } catch(raw) {const error=classify(raw),google=payload?.error;health.reachable=false;health.lastFailureCategory=error.code;health.responseLatencyMs=now()-started;const diagnostic={provider:"google_places",event:"response",httpStatus:response?.status??null,googleErrorStatus:sanitizeGoogleDiagnostic(clean(google?.status),apiKey,input)||null,googleErrorMessage:sanitizeGoogleDiagnostic(clean(google?.message),apiKey,input)||null,durationMs:health.responseLatencyMs,code:error.code};const details=sanitizeGoogleDiagnostic(google?.details,apiKey,input);if(details!==undefined)diagnostic.googleErrorDetails=details;logger.warn?.("[trail-provider]",diagnostic);throw error;} finally{clearTimeout(timer);}
  }
  async function textRequest(query, input={}) {
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try { const body={textQuery:query,maxResultCount:Math.min(20,input.limit||15)};if(Number.isFinite(input.latitude)&&Number.isFinite(input.longitude))body.locationBias={circle:{center:{latitude:input.latitude,longitude:input.longitude},radius:Math.min(50000,input.radiusMeters||16093.44)}};
      const response=await fetchImpl(GOOGLE_TEXT_SEARCH_URL,{method:"POST",headers:{"content-type":"application/json","x-goog-api-key":apiKey,"x-goog-fieldmask":GOOGLE_FIELD_MASK},body:JSON.stringify(body),signal:controller.signal});let payload;try{payload=await response.json();}catch{throw trailError("TRAIL_PROVIDER_BAD_RESPONSE",502);}if(!response.ok)throw googleError(response.status,payload);if(payload?.places!==undefined&&!Array.isArray(payload.places))throw trailError("TRAIL_PROVIDER_BAD_RESPONSE",502);return(payload.places||[]).map(place=>normalizeGooglePlace(place,input)).filter(Boolean);
    } catch(error){throw classify(error);} finally{clearTimeout(timer);}
  }
  return {health:()=>({...health}),async searchText(query,input={}){if(!apiKey)throw trailError("TRAIL_PROVIDER_NOT_CONFIGURED",503);const value=String(query||"").trim();if(value.length<2||value.length>200)throw trailError("TRAIL_SEARCH_INVALID_INPUT",400);return deduplicateAndRank(await textRequest(value,input),input.limit||15);},async searchNearbyTrails(input){if(!apiKey)throw trailError("TRAIL_PROVIDER_NOT_CONFIGURED",503);const batches=[await request(input,false),await request(input,true)];for(const query of DISCOVERY_QUERIES){try{batches.push(await textRequest(`${query} near me`,{...input,limit:5}));}catch(error){logger.warn?.("[trail-provider]",{provider:"google_places",event:"layer_failed",queryConcept:query,code:error.code});}}return deduplicateAndRank(batches.flat(),input.limit);}};
}
function metadataScore(trail){return (trail.trailRouteId||trail.routeVerificationStatus==="admin_verified"?100:0)+(/trail|greenway/i.test(trail.name||"")?20:0)+(trail.trailType&&/trail|hiking|walking|greenway/i.test(trail.trailType)?10:/park|recreation/i.test(trail.trailType)?5:0)+["trailType","lengthMeters","difficulty","elevationGainMeters","surface","accessibility","providerUrl","attribution"].filter(k=>trail[k]!=null).length;}
/** Duplicates are the same normalized name within 150 metres. */
function deduplicateAndRank(trails,limit=MAX_LIMIT){const kept=[];for(const trail of trails.filter(Boolean).sort((a,b)=>metadataScore(b)-metadataScore(a))){const name=trail.name.toLowerCase().replace(/[^a-z0-9]+/g," ").trim();const duplicate=kept.find(x=>(trail.providerId&&x.providerId===trail.providerId)||(x._name===name&&haversine(x,trail)<=150));if(!duplicate)kept.push({...trail,_name:name});else if(duplicate.provider!==trail.provider){duplicate.attribution=[duplicate.attribution,trail.attribution].filter(Boolean).join("; ");}}return kept.sort((a,b)=>metadataScore(b)-metadataScore(a)||(Number(a.distanceFromUserMeters)||Infinity)-(Number(b.distanceFromUserMeters)||Infinity)).slice(0,limit).map(({_name,...x})=>x);}
function createMultiTrailProvider({primary,fallback}){return {health:()=>({provider:"auto",configured:Boolean(primary?.health().configured||fallback?.health().configured),providers:[primary?.health(),fallback?.health()].filter(Boolean)}),async searchText(query,input){if(typeof primary?.searchText==="function")return primary.searchText(query,input);if(typeof fallback?.searchText==="function")return fallback.searchText(query,input);throw trailError("TRAIL_PROVIDER_NOT_CONFIGURED",503);},async searchNearbyTrails(input){let firstError,results=[];try{results=await primary.searchNearbyTrails(input);}catch(e){firstError=e;}if(!results.length){try{results=await fallback.searchNearbyTrails(input);}catch(e){throw firstError||e;}}return deduplicateAndRank(results,input.limit);}};}
function createConfiguredTrailProvider({env=process.env,fetchImpl=global.fetch,logger=console}={}){const selected=(env.TRAIL_PROVIDER||"auto").toLowerCase();let endpoints=[];try{endpoints=parseEndpoints(env,{useDefaults:false});}catch{}const google=createGooglePlacesTrailProvider({fetchImpl,apiKey:env.GOOGLE_MAPS_API_KEY,timeoutMs:Number(env.TRAIL_SEARCH_TIMEOUT_MS)||10000,logger});const overpass=createOverpassTrailProvider({fetchImpl,endpoints,timeoutMs:Number(env.TRAIL_SEARCH_TIMEOUT_MS)||10000,logger});logger.info?.("[trail-provider]",{event:"selection",provider:selected,googleConfigured:google.health().configured,overpassConfigured:overpass.health().configured});if(selected==="google_places")return google;if(selected==="overpass")return overpass;if(selected==="auto")return google.health().configured?createMultiTrailProvider({primary:google,fallback:overpass}):overpass.health().configured?overpass:{health:()=>({provider:"auto",configured:false,reachable:false}),searchNearbyTrails:async()=>{throw trailError("TRAIL_PROVIDER_NOT_CONFIGURED",503);}};logger.warn?.("[trail-provider]",{event:"selection",provider:selected,code:"TRAIL_PROVIDER_NOT_CONFIGURED"});throw trailError("TRAIL_PROVIDER_NOT_CONFIGURED",503);}
function coarseKey(input){return `${QUERY_VERSION}:${input.radiusMeters}:${Math.round(input.latitude*20)/20}:${Math.round(input.longitude*20)/20}`;}
function createNearbyTrailService({provider,routeStore,ttlMs=Number(process.env.TRAIL_CACHE_TTL_MS)||1_800_000,maxEntries=Number(process.env.TRAIL_CACHE_MAX_ENTRIES)||250,now=Date.now}={}) {
  const cache=new Map(); const cleanup=()=>{for(const[k,v]of cache)if(now()-v.savedAt>ttlMs*2)cache.delete(k);while(cache.size>maxEntries)cache.delete(cache.keys().next().value);};
  const enrich=trails=>trails.map(trail=>{const placeId=String(trail.id||"").startsWith("google:")?String(trail.id).slice(7):null,route=placeId&&routeStore?.findByPlaceId(placeId);return route?{...trail,trailRouteId:route.id,routeVerificationStatus:route.verificationStatus}:trail;});
  return {health:()=>({...((provider.health?.())||{provider:"unknown",configured:false}),cacheStatus:{entries:cache.size,ttlMs,maxEntries}}),async textSearch(_userId,input){const query=String(input?.query||"").trim();if(query.length<2||query.length>200||typeof provider.searchText!=="function")throw trailError("TRAIL_SEARCH_INVALID_INPUT",400);const trails=enrich(await provider.searchText(query,{limit:Math.min(Number(input.limit)||15,MAX_LIMIT)}));if(!trails.length)throw trailError("TRAIL_SEARCH_NO_RESULTS",404);return{trails,query,searchedAt:new Date().toISOString(),locationStored:false,resultKind:"manual"};},async search(_userId,input){const validated=validateSearch(input),key=coarseKey(validated);cleanup();const cached=cache.get(key);if(cached&&now()-cached.savedAt<=ttlMs)return{trails:enrich(cached.trails),searchedAt:new Date(cached.savedAt).toISOString(),locationStored:false,cached:true,stale:false,resultKind:"nearby"};try{const trails=await provider.searchNearbyTrails(validated);cache.set(key,{trails,savedAt:now()});cleanup();if(!trails.length)throw trailError("TRAIL_SEARCH_NO_RESULTS",404);return{trails:enrich(trails),searchedAt:new Date().toISOString(),locationStored:false,cached:false,stale:false,resultKind:"nearby"};}catch(error){if(cached&&now()-cached.savedAt<=ttlMs*2)return{trails:enrich(cached.trails),searchedAt:new Date(cached.savedAt).toISOString(),locationStored:false,cached:true,stale:true,resultKind:"nearby"};throw error;}},_cache:cache};
}
module.exports={ALLOWED_RADII,MAX_LIMIT,QUERY_VERSION,ERROR_MESSAGES,DISCOVERY_QUERIES,validateSearch,parseEndpoints,buildQuery,coarseKey,normalizeElement,normalizeGooglePlace,deduplicateAndRank,createGooglePlacesTrailProvider,createMultiTrailProvider,createConfiguredTrailProvider,createOverpassTrailProvider,createNearbyTrailService};
