import { backendUrl } from "./backend-origin.js?v=mobile-map-config-route-20260729";

let loaderPromise;
const mapStates=new WeakMap();
const LOAD_TIMEOUT_MS=12000;
const routeStrokeStyle=source=>({verified_geometry:{color:"#55aaff",dashed:false},trail_network:{color:"#46d9ff",dashed:false},park_constrained_walking_route:{color:"#3bd5bd",dashed:false},google_walking_route:{color:"#58a6ff",dashed:true},place_only:{color:"#8aa6a0",dashed:false}})[source]||{color:"#55aaff",dashed:false};
const finiteGeometry=geometry=>Array.isArray(geometry)&&geometry.length>1&&geometry.every(point=>Number.isFinite(Number(point?.latitude))&&Number.isFinite(Number(point?.longitude)));
const visibleSize=container=>container.getBoundingClientRect?.()||{width:container.clientWidth,height:container.clientHeight};
async function waitUntilVisible(container){if(!container?.isConnected)throw mapError("MAP_CONTAINER_NOT_VISIBLE","The route map is not attached");for(let i=0;i<60;i++){const size=visibleSize(container),style=globalThis.getComputedStyle?.(container);if(size.width>0&&size.height>0&&style?.display!=="none"&&style?.visibility!=="hidden")return size;await new Promise(resolve=>(globalThis.requestAnimationFrame||setTimeout)(resolve));}const size=visibleSize(container);throw mapError(size.width<=0||size.height<=0?"MAP_CONTAINER_ZERO_SIZE":"MAP_CONTAINER_NOT_VISIBLE","The route map is not visible yet");}
function mapError(code, message, cause) {
  const error = new Error(message);
  error.code = code;
  if (cause) error.cause = cause;
  return error;
}
export function createMapPayload(userLocation, trails) {
  const safeTrails = (trails || []).filter(trail => Number.isFinite(trail.latitude) && Number.isFinite(trail.longitude));
  return { user: { latitude: Number(userLocation.latitude), longitude: Number(userLocation.longitude), approximate: userLocation.approximate !== false }, markers: safeTrails.map((trail, index) => ({ number: index + 1, id: trail.id, latitude: trail.latitude, longitude: trail.longitude, name: trail.name })) };
}
export function payloadBounds(payload) {
  const points = [payload.user, ...payload.markers];
  return { north: Math.max(...points.map(point => point.latitude)), south: Math.min(...points.map(point => point.latitude)), east: Math.max(...points.map(point => point.longitude)), west: Math.min(...points.map(point => point.longitude)) };
}
export function markerLabel(number) { return String(number); }
export function classifyMapError(error) {
  const code=String(error?.code||""),message=String(error?.message||"").toLowerCase();
  if(["BROWSER_MAP_KEY_MISSING","BROWSER_CONFIG_UNAVAILABLE","MAPS_SCRIPT_BLOCKED","MAPS_AUTHENTICATION_FAILED","MAPS_REFERRER_NOT_ALLOWED","MAPS_API_NOT_ACTIVATED","MAP_CONTAINER_ZERO_SIZE","MAP_CONTAINER_NOT_VISIBLE","MAP_INITIALIZATION_FAILED","ROUTE_COORDINATES_INVALID","MAPS_LIBRARY_UNAVAILABLE"].includes(code))return code;
  if(code.startsWith("BROWSER_CONFIG_"))return "BROWSER_CONFIG_UNAVAILABLE";
  if(code==="BROWSER_KEY_MISSING")return "BROWSER_MAP_KEY_MISSING";
  if(code==="GOOGLE_MAPS_SCRIPT_ERROR"||code==="GOOGLE_MAPS_SCRIPT_TIMEOUT")return "MAPS_SCRIPT_BLOCKED";
  if(code==="INVALID_ROUTE_GEOMETRY")return "ROUTE_COORDINATES_INVALID";
  if(code==="GOOGLE_MAPS_NAMESPACE_MISSING")return "MAPS_LIBRARY_UNAVAILABLE";
  if(message.includes("referernotallowed")||message.includes("referrer"))return "MAPS_REFERRER_NOT_ALLOWED";
  if(message.includes("apinotactivated")||message.includes("not activated"))return "MAPS_API_NOT_ACTIVATED";
  if(message.includes("invalidkey")||message.includes("authentication")||message.includes("billing"))return "MAPS_AUTHENTICATION_FAILED";
  return "UNKNOWN_MAP_RENDER_FAILURE";
}
export function googleMapsScriptUrl(key, callback) { const params=new URLSearchParams({key,loading:"async",callback,libraries:"geometry"});return `https://maps.googleapis.com/maps/api/js?${params.toString()}`; }
async function requestBrowserMapKey(onDiagnostic) {
  const url=backendUrl("/api/browser-config");
  onDiagnostic("browser_config_request_started",{url,credentialsMode:"omit",source:"backend_runtime"});
  let response;try{response=await fetch(url,{cache:"no-store",credentials:"omit",redirect:"error"});}catch(cause){throw mapError("BROWSER_CONFIG_NETWORK_ERROR","Browser map configuration request failed",cause);}
  onDiagnostic("browser_config_http_status",{status:response.status,contentType:response.headers.get("content-type")||"",source:"backend_runtime"});
  if(!response.ok)throw mapError("BROWSER_CONFIG_HTTP_ERROR",`Browser map configuration failed (${response.status})`);
  let body;try{body=await response.json();}catch(cause){throw mapError("BROWSER_CONFIG_INVALID_JSON","Browser map configuration returned invalid JSON",cause);}
  const key=typeof body?.data?.googleMapsBrowserApiKey==="string"?body.data.googleMapsBrowserApiKey.trim():"";
  onDiagnostic("browser_config_parsed",{keyPresent:Boolean(key),keyNull:body?.data?.googleMapsBrowserApiKey===null,source:"backend_runtime"});
  if(!key)throw mapError("BROWSER_MAP_KEY_MISSING","Interactive map is not configured");
  onDiagnostic("browser_key_present",{source:"backend_runtime"});return key;
}
export async function loadGoogleMaps(onDiagnostic = () => {}) {
  if (globalThis.google?.maps?.importLibrary) { onDiagnostic("maps_namespace_ready", { cached: true }); return globalThis.google; }
  if (!loaderPromise) loaderPromise = (async () => {
    const browserKey=await requestBrowserMapKey(onDiagnostic);
    return new Promise((resolve, reject) => {
      let settled=false;
      const callback = `initTrailMaps_${Date.now()}_${Math.random().toString(36).slice(2)}`;
      const priorAuthFailure=globalThis.gm_authFailure;
      let script;
      const cleanup=()=>{clearTimeout(timeout);delete globalThis[callback];if(priorAuthFailure)globalThis.gm_authFailure=priorAuthFailure;else delete globalThis.gm_authFailure;};
      const fail=error=>{if(settled)return;settled=true;script?.remove();cleanup();reject(error);};
      const timeout=setTimeout(()=>fail(mapError("MAPS_SCRIPT_BLOCKED","Google Maps loader timed out")),LOAD_TIMEOUT_MS);
      globalThis.gm_authFailure=()=>fail(mapError("MAPS_AUTHENTICATION_FAILED","Google Maps authentication failed"));
      globalThis[callback] = () => {
        if(settled)return;settled=true;cleanup();
        const available = Boolean(globalThis.google?.maps?.importLibrary);
        onDiagnostic("maps_loader_callback", { googleMapsAvailable: available });
        if (available) { onDiagnostic("maps_script_loaded"); resolve(globalThis.google); } else { const error = mapError("GOOGLE_MAPS_NAMESPACE_MISSING", "Google Maps loaded without the expected namespace"); onDiagnostic("maps_namespace_failure", { classification:classifyMapError(error) }); reject(error); }
      };
      script = document.createElement("script");
      script.src = googleMapsScriptUrl(browserKey,callback);
      script.async = true;
      script.defer = true;
      script.referrerPolicy = "strict-origin-when-cross-origin";
      script.dataset.trailMapsLoader = "true";
      script.onerror = () => { const error = mapError("MAPS_SCRIPT_BLOCKED", "Google Maps failed to load"); onDiagnostic("maps_script_failure", { classification:classifyMapError(error) }); fail(error); };
      onDiagnostic("maps_script_appended", { host: "maps.googleapis.com" });
      document.head.append(script);
    });
  })().catch(error => { loaderPromise = undefined; throw error; });
  return loaderPromise;
}
export function clearGoogleMapsCache() {
  loaderPromise = undefined;
  document.querySelectorAll('script[data-trail-maps-loader="true"]').forEach(script => script.remove());
}
function numberedPin(PinElement, number, selected = false) { return new PinElement({ glyph: markerLabel(number), background: selected ? "#f1c963" : "#275d50", borderColor: "#fff", glyphColor: selected ? "#172019" : "#fff", scale: selected ? 1.25 : 1 }); }
export async function renderTrailMap(container, payload, { onSelect = () => {}, onDiagnostic = () => {}, selectedId = null, geometry = null, turnaroundPoint = null, routeSource = "verified_geometry", routeType = null, loopCount = null } = {}) {
  if(!container)throw mapError("MAP_CONTAINER_NOT_VISIBLE","The route map container is missing");
  if(!Number.isFinite(Number(payload?.user?.latitude))||!Number.isFinite(Number(payload?.user?.longitude)))throw mapError("ROUTE_COORDINATES_INVALID","The route start is invalid");
  if(geometry&&!finiteGeometry(geometry))throw mapError("ROUTE_COORDINATES_INVALID","The route has no usable map geometry");
  const size=await waitUntilVisible(container);onDiagnostic("map_container_ready",{widthBucket:Math.round(size.width/100)*100,heightBucket:Math.round(size.height/100)*100});
  const google = await loadGoogleMaps(onDiagnostic); onDiagnostic("maps_namespace_ready");
  let Map,AdvancedMarkerElement,PinElement;try{onDiagnostic("maps_library_import_started");({Map}=await google.maps.importLibrary("maps"));onDiagnostic("maps_library_loaded");({AdvancedMarkerElement,PinElement}=await google.maps.importLibrary("marker"));}catch(cause){throw mapError("MAPS_LIBRARY_UNAVAILABLE","Google Maps libraries are unavailable",cause);}onDiagnostic("marker_library_loaded");onDiagnostic("maps_libraries_ready");
  let state=mapStates.get(container);if(!state){try{state={map:new Map(container,{mapId:"DEMO_MAP_ID",streetViewControl:false,mapTypeControl:false}),overlays:[]};}catch(cause){throw mapError("MAP_INITIALIZATION_FAILED","The route map could not initialize",cause);}mapStates.set(container,state);onDiagnostic("map_created");}else{state.overlays.forEach(overlay=>{overlay.map=null;overlay.setMap?.(null);});state.overlays=[];onDiagnostic("map_reused");}const map=state.map,bounds=new google.maps.LatLngBounds(),keep=overlay=>(state.overlays.push(overlay),overlay);
  const userPosition = { lat: payload.user.latitude, lng: payload.user.longitude }; bounds.extend(userPosition); if(payload.user.approximate)keep(new AdvancedMarkerElement({ map, position: userPosition, title: "Your approximate location", content: new PinElement({ background: "#4285f4", glyph: "●", glyphColor: "white" }).element }));
  payload.markers.forEach(marker => { const position = { lat: marker.latitude, lng: marker.longitude }; bounds.extend(position); const advancedMarker = new AdvancedMarkerElement({ map, position, title: `${marker.number}. ${marker.name}`, content: numberedPin(PinElement, marker.number, marker.id === selectedId).element }); advancedMarker.addListener("click", () => onSelect(marker.id)); }); onDiagnostic("markers_created", { markerCount: payload.markers.length }); onDiagnostic("markers_added", { markerCount: payload.markers.length });
  if (geometry?.length > 1) {
    const path=geometry.map(point=>({lat:Number(point.latitude),lng:Number(point.longitude)}));path.forEach(point=>bounds.extend(point));
    const reduced=matchMedia("(prefers-reduced-motion: reduce)").matches,arrow={path:google.maps.SymbolPath.FORWARD_CLOSED_ARROW,scale:2.3,strokeColor:"#fff",fillColor:"#fff",fillOpacity:1};
    const line=(points,color,{dashed=false,offset=0}={})=>keep(new google.maps.Polyline({map,path:points,strokeColor:color,strokeOpacity:.96,strokeWeight:6,icons:[...(dashed?[{icon:{path:"M 0,-1 0,1",strokeOpacity:1,scale:3},offset:"0",repeat:"18px"}]:[]),{icon:arrow,offset:`${offset||8}%`,repeat:"18%"}]}));
    const isOutBack=routeType==="out_and_back"||Boolean(turnaroundPoint),half=Math.max(1,Math.floor(path.length/2));let mode="progress_chunks",segmentCount=0;
    if(isOutBack){mode="offset_dashed_return";line(path.slice(0,half+1),"#46d9ff");line(path.slice(half),"#a97cff",{dashed:true,offset:10});segmentCount=2;}
    else{const colors=["#46d9ff","#4c8dff","#a97cff"],chunk=Math.ceil((path.length-1)/3);for(let i=0;i<3;i++){const points=path.slice(i*chunk,Math.min(path.length,i===2?path.length:(i+1)*chunk+1));if(points.length>1){line(points,colors[i],{dashed:routeSource==="google_walking_route"});segmentCount++;}}}
    const marker=(position,glyph,title,background)=>keep(new AdvancedMarkerElement({map,position,title,content:new PinElement({glyph,background,glyphColor:"#071a16",borderColor:"#fff"}).element}));
    marker(path[0],"S","Route start","#46d9ff");const midpoint=turnaroundPoint?{lat:Number(turnaroundPoint.latitude),lng:Number(turnaroundPoint.longitude)}:path[half];marker(midpoint,isOutBack?"↩":"½",isOutBack?"Turnaround":"Route halfway","#f1c963");marker(path[path.length - 1],"F","Route finish","#c49aff");
    if(Number(loopCount)>=2){for(let lap=1;lap<Math.min(4,Math.floor(loopCount));lap++)marker(path[Math.min(path.length-1,Math.round(path.length*lap/loopCount))],String(lap),`Lap ${lap} complete`,"#f1c963");}
    onDiagnostic("trail_route_rendered",{geometryPointCountBucket:Math.ceil(geometry.length/25)*25,routeSegmentCount:segmentCount,overlappingSegmentBucket:isOutBack?"outbound_return":"none_or_self_touching",directionalRenderingMode:mode,routeSource,mapRenderStatus:"rendered",reducedMotion:reduced});
  }
  const refresh=()=>{google.maps.event?.trigger?.(map,"resize");map.fitBounds(bounds,48);};refresh();await new Promise(resolve=>(globalThis.requestAnimationFrame||setTimeout)(resolve));refresh();if(!state.resizeBound){state.resizeBound=true;const handler=()=>requestAnimationFrame(()=>refresh());globalThis.addEventListener?.("resize",handler,{passive:true});globalThis.addEventListener?.("orientationchange",handler,{passive:true});}if(geometry?.length>1&&geometry.every(point=>Math.abs(point.latitude-geometry[0].latitude)<1e-7&&Math.abs(point.longitude-geometry[0].longitude)<1e-7))map.setZoom(17);onDiagnostic("fit_bounds_complete",{fitBoundsCompletion:true});onDiagnostic("map_render_complete",{markerCount:payload.markers.length,geometryPointCount:geometry?.length||0});return map;
}
