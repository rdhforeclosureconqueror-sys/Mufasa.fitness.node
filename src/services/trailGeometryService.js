"use strict";

const { haversineMeters } = require("../trails/geometry");
const { loadRoutePlanningConfig } = require("../config/routePlanningConfig");
const CONFIG=loadRoutePlanningConfig();
const ALLOWED=new Set(["path","footway","pedestrian","track"]);
function buildPedestrianGraph(elements,{parkBoundary=null,source="openstreetmap",attribution="© OpenStreetMap contributors"}={}){
  const nodes={},edges=[];
  for(const item of elements||[])if(item.type==="node"&&Number.isFinite(item.lat)&&Number.isFinite(item.lon))nodes[item.id]={id:item.id,latitude:item.lat,longitude:item.lon};
  for(const way of elements||[]){if(way.type!=="way"||!ALLOWED.has(way.tags?.highway)||way.tags?.access==="private"||way.tags?.foot==="no")continue;for(let i=1;i<(way.nodes||[]).length;i++){const from=way.nodes[i-1],to=way.nodes[i],a=nodes[from],b=nodes[to],lengthMeters=a&&b?haversineMeters(a,b):NaN;if(!a||!b||from===to||!Number.isFinite(lengthMeters)||lengthMeters<=0)continue;edges.push({id:`${way.id}:${i}`,from,to,lengthMeters,access:way.tags?.access||"permitted",surface:way.tags?.surface||null,name:way.tags?.name||null,source,attribution,confidence:way.tags?.name?"high":"medium",parkMembership:parkBoundary?"candidate":null,placeAssociation:null});}}
  const used=new Set(edges.flatMap(edge=>[edge.from,edge.to]));return{nodes:Object.fromEntries(Object.entries(nodes).filter(([id])=>used.has(Number(id))||used.has(id))),edges,source,attribution,parkBoundary};
}
function createOverpassGeometryProvider({fetchImpl=global.fetch,endpoint=CONFIG.OVERPASS_API_URL,timeoutMs=CONFIG.TRAIL_ROUTE_TIMEOUT_MS}={}){
  if(!endpoint)return null;
  return{async fetch({latitude,longitude,radiusMeters}){const query=`[out:json][timeout:8];(way(around:${Math.round(radiusMeters)},${latitude},${longitude})[highway~"^(path|footway|pedestrian|track)$"];);out body;>;out skel qt;`,controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);try{const response=await fetchImpl(endpoint,{method:"POST",headers:{"content-type":"application/x-www-form-urlencoded"},body:`data=${encodeURIComponent(query)}`,signal:controller.signal});if(!response.ok)throw new Error("TRAIL_GEOMETRY_PROVIDER_FAILED");return response.json();}finally{clearTimeout(timer);}}};
}
function createTrailGeometryService({routeStore,provider,searchRadiusMeters=CONFIG.TRAIL_GRAPH_SEARCH_RADIUS_METERS,cacheTtlMs=CONFIG.TRAIL_GRAPH_CACHE_TTL_MS,maxNodes=CONFIG.TRAIL_ROUTE_MAX_GRAPH_NODES,now=Date.now}={}){
  const cache=new Map(),pending=new Map(),keyFor=p=>`${Math.round(p.latitude*100)/100}:${Math.round(p.longitude*100)/100}:${searchRadiusMeters}`;
  async function acquire({place,trailId}){const verified=routeStore?.get(trailId)||(place?.providerId&&routeStore?.findByPlaceId(place.providerId));if(verified?.verificationStatus==="admin_verified")return{kind:"verified",geometry:verified.geometry,boundary:verified.parkBoundary||null,confidence:"high",source:verified.sourceType,attribution:verified.attribution};if(!provider||!place)return{kind:"unavailable",confidence:"unavailable"};const key=keyFor(place),hit=cache.get(key);if(hit&&hit.expiresAt>now())return{...hit.value,cacheHit:true};if(pending.has(key))return pending.get(key);const work=(async()=>{const data=await provider.fetch({latitude:place.latitude,longitude:place.longitude,radiusMeters:searchRadiusMeters}),graph=buildPedestrianGraph(data.elements,{parkBoundary:data.parkBoundary});if(Object.keys(graph.nodes).length>maxNodes)throw new Error("TRAIL_GRAPH_NODE_LIMIT");const value={kind:graph.edges.length?"network":"unavailable",graph,boundary:data.parkBoundary||null,confidence:graph.edges.some(e=>e.name)?"high":graph.edges.length?"medium":"unavailable",source:"openstreetmap",attribution:graph.attribution,cacheHit:false};cache.set(key,{value,expiresAt:now()+cacheTtlMs});return value;})();pending.set(key,work);try{return await work;}finally{pending.delete(key);}}
  return{acquire,cache,clear:()=>cache.clear()};
}
module.exports={buildPedestrianGraph,createOverpassGeometryProvider,createTrailGeometryService};
