"use strict";

const { ApiError } = require("../lib/apiResponse");
const ALLOWED_RADII = Object.freeze([8046.72, 16093.44, 40233.6, 80467.2]);
const MAX_LIMIT = 25;
const OVERPASS_QUERY = `[out:json][timeout:15];(nwr[highway=trailhead](around:RADIUS,LAT,LON);relation[route~"hiking|foot|walking"](around:RADIUS,LAT,LON);nwr[highway~"path|footway"][name](around:RADIUS,LAT,LON);nwr[leisure~"park|nature_reserve"][name](around:RADIUS,LAT,LON););out center tags;`;

function validateSearch(input) {
  const latitude=Number(input?.latitude), longitude=Number(input?.longitude), radiusMeters=Number(input?.radiusMeters), limit=Number(input?.limit ?? 15);
  if(!Number.isFinite(latitude)||latitude < -90||latitude > 90) throw new ApiError("INVALID_LATITUDE","Latitude is invalid",400);
  if(!Number.isFinite(longitude)||longitude < -180||longitude > 180) throw new ApiError("INVALID_LONGITUDE","Longitude is invalid",400);
  if(!ALLOWED_RADII.includes(radiusMeters)) throw new ApiError("INVALID_RADIUS","Choose a supported search radius",400);
  if(!Number.isInteger(limit)||limit<1||limit>MAX_LIMIT) throw new ApiError("INVALID_RESULT_LIMIT",`Result limit must be between 1 and ${MAX_LIMIT}`,400);
  return {latitude,longitude,radiusMeters,limit};
}
function haversine(a,b){const r=Math.PI/180,q=Math.sin((b.latitude-a.latitude)*r/2)**2+Math.cos(a.latitude*r)*Math.cos(b.latitude*r)*Math.sin((b.longitude-a.longitude)*r/2)**2;return 6371000*2*Math.atan2(Math.sqrt(q),Math.sqrt(1-q));}
function clean(value){return typeof value === "string" && value.trim() ? value.trim().slice(0,200) : undefined;}
function normalizeElement(element, origin){
  const latitude=Number(element?.lat ?? element?.center?.lat),longitude=Number(element?.lon ?? element?.center?.lon),tags=element?.tags;
  if(!Number.isFinite(latitude)||!Number.isFinite(longitude)||!tags||typeof tags!=="object") return null;
  const name=clean(tags.name); if(!name)return null;
  const length=Number(tags.distance || tags.length), elevation=Number(tags.ele_gain);
  return {id:`osm:${element.type}:${element.id}`,name,latitude,longitude,distanceFromUserMeters:haversine(origin,{latitude,longitude}),trailType:clean(tags.route||tags.highway||tags.leisure),lengthMeters:Number.isFinite(length)&&length>0?length:undefined,difficulty:clean(tags.sac_scale||tags.difficulty),elevationGainMeters:Number.isFinite(elevation)&&elevation>=0?elevation:undefined,surface:clean(tags.surface),accessibility:clean(tags.wheelchair),provider:"OpenStreetMap",providerUrl:`https://www.openstreetmap.org/${encodeURIComponent(element.type)}/${encodeURIComponent(element.id)}`,attribution:"© OpenStreetMap contributors"};
}
function createOverpassTrailProvider({fetchImpl=global.fetch,endpoint="https://overpass-api.de/api/interpreter"}={}){
  if(!/^https:\/\//.test(endpoint)) throw new Error("Overpass endpoint must use HTTPS");
  return {async searchNearbyTrails(input){const query=OVERPASS_QUERY.replaceAll("RADIUS",String(Math.round(input.radiusMeters))).replaceAll("LAT",String(input.latitude)).replaceAll("LON",String(input.longitude));let response;try{response=await fetchImpl(endpoint,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded","user-agent":"MufasaFitness-TrailSearch/1.0"},body:new URLSearchParams({data:query}),signal:AbortSignal.timeout(18000)});}catch(_){throw new ApiError("TRAIL_PROVIDER_UNAVAILABLE","Trail search is temporarily unavailable",503);}if(response.status===429)throw new ApiError("TRAIL_PROVIDER_RATE_LIMIT","Trail provider is busy; try again shortly",503);if(!response.ok)throw new ApiError("TRAIL_PROVIDER_UNAVAILABLE","Trail search is temporarily unavailable",503);const body=await response.json().catch(()=>null);if(!body||!Array.isArray(body.elements))throw new ApiError("MALFORMED_TRAIL_RESPONSE","Trail provider returned an invalid response",502);return body.elements.map(x=>normalizeElement(x,input)).filter(Boolean).sort((a,b)=>a.distanceFromUserMeters-b.distanceFromUserMeters).slice(0,input.limit);}};
}
function createNearbyTrailService({provider}){return {async search(_userId,input){const validated=validateSearch(input);return {trails:await provider.searchNearbyTrails(validated),searchedAt:new Date().toISOString(),locationStored:false};}};}
module.exports={ALLOWED_RADII,MAX_LIMIT,validateSearch,normalizeElement,createOverpassTrailProvider,createNearbyTrailService};
