"use strict";

const { ApiError } = require("../lib/apiResponse");
const { planVerifiedRoute, unavailableRoute } = require("./goalRoutePlanner");

const ROUTES_URL = "https://routes.googleapis.com/directions/v2:computeRoutes";
const WALKING_WARNING = "Walking directions may be incomplete. Follow posted signs, closures, property boundaries, and local conditions.";
const PLANNER_VERSION = "walking-v1";
const ROUTE_TYPES = new Set(["out_and_back", "loop", "point_to_point"]);

function finitePoint(value) {
  const latitude=Number(value?.latitude),longitude=Number(value?.longitude);
  return Number.isFinite(latitude)&&latitude>=-90&&latitude<=90&&Number.isFinite(longitude)&&longitude>=-180&&longitude<=180?{latitude,longitude}:null;
}
function offset(point, meters, heading) {
  const radians=heading*Math.PI/180,latRadians=point.latitude*Math.PI/180;
  return {latitude:point.latitude+(meters*Math.cos(radians))/111320,longitude:point.longitude+(meters*Math.sin(radians))/(111320*Math.max(.2,Math.cos(latRadians)))};
}
function decodePolyline(encoded) {
  const points=[];let index=0,latitude=0,longitude=0;
  while(index<encoded.length){for(const field of ["latitude","longitude"]){let result=0,shift=0,byte;do{byte=encoded.charCodeAt(index++)-63;result|=(byte&31)<<shift;shift+=5;}while(byte>=32&&index<=encoded.length);const delta=(result&1)?~(result>>1):(result>>1);if(field==="latitude")latitude+=delta;else longitude+=delta;}points.push({latitude:latitude/1e5,longitude:longitude/1e5});}
  return points;
}
function providerError(status,body) {
  if(status===429)return new ApiError("WALKING_ROUTE_QUOTA_EXCEEDED","Walking-route capacity is temporarily unavailable. Try again later.",503);
  if(status===401||status===403)return new ApiError("WALKING_ROUTE_PROVIDER_AUTH_FAILED","Walking-route service is temporarily unavailable.",503);
  return new ApiError(status>=500?"WALKING_ROUTE_PROVIDER_UNAVAILABLE":"WALKING_ROUTE_PROVIDER_BAD_RESPONSE","A walking route could not be generated. Try another starting point.",status>=500?503:502);
}
function createGoogleWalkingRouteProvider({fetchImpl=global.fetch,apiKey=process.env.GOOGLE_MAPS_API_KEY,timeoutMs=Number(process.env.GOOGLE_WALKING_ROUTE_TIMEOUT_MS)||8000}={}) {
  return {name:"google_routes",configured:Boolean(apiKey),async route({startPoint,endPoint,waypoints=[]}){
    if(!apiKey)throw new ApiError("WALKING_ROUTE_PROVIDER_NOT_CONFIGURED","Walking-route generation is not configured.",503);
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try {const location=point=>({location:{latLng:{latitude:point.latitude,longitude:point.longitude}}});const body={origin:location(startPoint),destination:location(endPoint),intermediates:waypoints.map(location),travelMode:"WALK",routingPreference:"ROUTING_PREFERENCE_UNSPECIFIED",computeAlternativeRoutes:false,polylineQuality:"HIGH_QUALITY",polylineEncoding:"ENCODED_POLYLINE"};const response=await fetchImpl(ROUTES_URL,{method:"POST",headers:{"content-type":"application/json","x-goog-api-key":apiKey,"x-goog-fieldmask":"routes.distanceMeters,routes.duration,routes.polyline.encodedPolyline,routes.routeLabels"},body:JSON.stringify(body),signal:controller.signal});let payload;try{payload=await response.json();}catch{throw providerError(response.status,{});}if(!response.ok)throw providerError(response.status,payload);const route=payload?.routes?.[0],distance=Number(route?.distanceMeters),encoded=route?.polyline?.encodedPolyline;if(!Number.isFinite(distance)||distance<=0||typeof encoded!=="string")throw providerError(502,payload);return{distanceMeters:distance,polyline:decodePolyline(encoded),providerRouteId:null};}
    catch(error){if(error?.name==="AbortError")throw new ApiError("WALKING_ROUTE_TIMEOUT","Walking-route generation timed out. Try again.",504);throw error;}finally{clearTimeout(timer);}
  }};
}
function candidate({place,start,target,routeType,attempt,maxRadius}) {
  const headings=[0,90,180,270],heading=headings[attempt%headings.length],radius=Math.min(maxRadius,Math.max(120,target*(routeType==="loop"?.18:.45)*(1+Math.floor(attempt/4)*.2))),anchor=offset(place,radius,heading);
  if(routeType==="loop"){const second=offset(place,radius,(heading+120)%360),finish=offset(start,8,(heading+240)%360);return{startPoint:start,endPoint:finish,waypoints:[anchor,second],turnaroundPoint:null};}
  if(routeType==="point_to_point")return{startPoint:start,endPoint:anchor,waypoints:[],turnaroundPoint:null};
  return{startPoint:start,endPoint:offset(start,8,(heading+180)%360),waypoints:[anchor],turnaroundPoint:anchor};
}
function normalizeWalkingRoute({raw,target,routeType,turnaroundPoint,tolerancePercent,now,attempt}) {const error=raw.distanceMeters-target,errorPercent=Math.abs(error)/target*100;return{routeSource:"google_walking_route",routeSourceLabel:"Google walking route",routeType,targetDistanceMeters:target,estimatedDistanceMeters:raw.distanceMeters,distanceErrorMeters:error,distanceErrorPercent:errorPercent,withinTolerance:errorPercent<=tolerancePercent,polyline:raw.polyline,startPoint:raw.polyline[0]||null,turnaroundPoint,endPoint:raw.polyline.at(-1)||null,loopCount:routeType==="loop"?1:null,waypointCount:routeType==="loop"?2:1,warnings:[WALKING_WARNING,"This route is not verified trail geometry and may leave the selected park or trail."],confidence:errorPercent<=tolerancePercent?"medium":"low",provider:"google_routes",providerRouteId:raw.providerRouteId||null,generatedAt:new Date(now).toISOString(),expiresAt:new Date(now+15*60_000).toISOString(),candidateAttempt:attempt+1,instructions:routeType==="out_and_back"?"Follow the displayed walking route to the turnaround marker, then return to the finish.":"Follow the displayed walking route and posted local guidance."};}
function rankRoutes(options){const source={verified_geometry:0,google_walking_route:1,place_only:2};return options.sort((a,b)=>(source[a.routeSource]??9)-(source[b.routeSource]??9)||(a.withinTolerance===b.withinTolerance?0:a.withinTolerance?-1:1)||(a.distanceErrorPercent??Infinity)-(b.distanceErrorPercent??Infinity)||(a.loopCount??0)-(b.loopCount??0));}
function createWalkingRouteService({provider,routeStore,logger=console,now=Date.now,maxAttempts=Number(process.env.GOOGLE_WALKING_ROUTE_MAX_ATTEMPTS)||4,tolerancePercent=Number(process.env.ROUTE_DISTANCE_TOLERANCE_PERCENT)||5,maxWaypointRadius=Number(process.env.GOOGLE_WALKING_ROUTE_MAX_WAYPOINT_RADIUS_METERS)||10000,cacheTtlMs=Number(process.env.GOOGLE_WALKING_ROUTE_CACHE_TTL_MS)||900000}={}) {
  const cache=new Map(),pending=new Map();
  const cacheKey=input=>{const start=finitePoint(input.startPoint)||finitePoint(input.place);return[PLANNER_VERSION,input.place?.providerId||input.place?.id||input.trailId,Math.round(start.latitude*1000)/1000,Math.round(start.longitude*1000)/1000,Math.round(Number(input.targetDistanceMeters)/25)*25,input.routeType||"out_and_back",provider?.name].join(":");};
  async function generate(input){const started=now(),target=Number(input.targetDistanceMeters),place=finitePoint(input.place),start=finitePoint(input.startPoint)||place,routeType=ROUTE_TYPES.has(input.routeType)?input.routeType:"out_and_back";if(!Number.isFinite(target)||target<100||target>100000)throw new ApiError("INVALID_ROUTE_GOAL","Choose a distance between 100 metres and 100 kilometres",400);const verified=routeStore?.get(input.trailId)||(input.place?.providerId&&routeStore?.findByPlaceId(input.place.providerId));if(verified?.verificationStatus==="admin_verified"&&verified.geometry?.length>1)return{options:rankRoutes(planVerifiedRoute({targetDistanceMeters:target,geometry:verified.geometry,routeType:verified.routeType,tolerancePercent})),attemptCount:0,cacheHit:false,fallbackReason:null};if(!place)return{options:[unavailableRoute(input.place,target)],attemptCount:0,cacheHit:false,fallbackReason:"place_coordinate_missing"};const key=cacheKey(input),cached=cache.get(key);if(cached&&now()<cached.expiresAt)return{...cached.value,cacheHit:true};if(pending.has(key))return{...(await pending.get(key)),coalesced:true};const work=(async()=>{const options=[];let fallbackReason="attempt_limit";for(let attempt=0;attempt<Math.max(1,Math.min(8,maxAttempts));attempt++){const spec=candidate({place,start,target,routeType,attempt,maxRadius:maxWaypointRadius});try{const raw=await provider.route(spec),option=normalizeWalkingRoute({raw,target,routeType,turnaroundPoint:spec.turnaroundPoint,tolerancePercent,now:now(),attempt});options.push(option);logger.info?.("[walking-route]",{event:"candidate",provider:provider.name,status:"ok",attempt:attempt+1,targetDistanceMeters:Math.round(target),routeDistanceMeters:Math.round(raw.distanceMeters),withinTolerance:option.withinTolerance,durationMs:now()-started});if(option.withinTolerance){fallbackReason=null;break;}}catch(error){fallbackReason=error.code||"provider_error";logger.warn?.("[walking-route]",{event:"candidate",provider:provider.name,status:error.code||"error",attempt:attempt+1,durationMs:now()-started});if(["WALKING_ROUTE_QUOTA_EXCEEDED","WALKING_ROUTE_PROVIDER_AUTH_FAILED","WALKING_ROUTE_PROVIDER_NOT_CONFIGURED"].includes(error.code))break;}}
      const value={options:options.length?rankRoutes(options):[unavailableRoute(input.place,target)],attemptCount:options.length,cacheHit:false,fallbackReason};cache.set(key,{value,expiresAt:now()+cacheTtlMs});return value;})();pending.set(key,work);try{return await work;}finally{pending.delete(key);}}
  return{generate,rankRoutes,cache,clear:()=>cache.clear()};
}
module.exports={ROUTES_URL,WALKING_WARNING,PLANNER_VERSION,decodePolyline,offset,candidate,rankRoutes,createGoogleWalkingRouteProvider,createWalkingRouteService};
