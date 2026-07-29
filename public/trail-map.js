import { backendUrl } from "./backend-origin.js?v=mobile-map-config-route-20260729";

let loaderPromise;
const mapStates=new WeakMap();
const routeStrokeStyle=source=>({verified_geometry:{color:"#55aaff",dashed:false},trail_network:{color:"#46d9ff",dashed:false},park_constrained_walking_route:{color:"#3bd5bd",dashed:false},google_walking_route:{color:"#58a6ff",dashed:true},place_only:{color:"#8aa6a0",dashed:false}})[source]||{color:"#55aaff",dashed:false};
const finiteGeometry=geometry=>Array.isArray(geometry)&&geometry.length>1&&geometry.every(point=>Number.isFinite(Number(point?.latitude))&&Number.isFinite(Number(point?.longitude)));
const visibleSize=container=>container.getBoundingClientRect?.()||{width:container.clientWidth,height:container.clientHeight};
async function waitUntilVisible(container){for(let i=0;i<12;i++){const size=visibleSize(container);if(size.width>0&&size.height>0)return size;await new Promise(resolve=>requestAnimationFrame(resolve));}throw mapError("MAP_CONTAINER_HIDDEN","The route map is not visible yet");}
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
export async function loadGoogleMaps(onDiagnostic = () => {}) {
  if (globalThis.google?.maps?.importLibrary) { onDiagnostic("maps_namespace_ready", { cached: true }); return globalThis.google; }
  if (!loaderPromise) loaderPromise = (async () => {
    const browserConfigUrl = backendUrl("/api/browser-config");
    onDiagnostic("browser_config_request_started", { url: browserConfigUrl, credentialsMode: "omit" });
    let response;
    try { response = await fetch(browserConfigUrl, { cache: "no-store", credentials: "omit", redirect: "error" }); }
    catch (cause) { throw mapError("BROWSER_CONFIG_NETWORK_ERROR", "Browser map configuration request failed", cause); }
    onDiagnostic("browser_config_http_status", { status: response.status, contentType: response.headers.get("content-type") || "" });
    if (!response.ok) throw mapError("BROWSER_CONFIG_HTTP_ERROR", `Browser map configuration failed (${response.status})`);
    let body;
    try { body = await response.json(); }
    catch (cause) { throw mapError("BROWSER_CONFIG_INVALID_JSON", "Browser map configuration returned invalid JSON", cause); }
    const keyPresent = typeof body?.data?.googleMapsBrowserApiKey === "string" && body.data.googleMapsBrowserApiKey.length > 0;
    onDiagnostic("browser_config_parsed", { keyPresent, keyNull: body?.data?.googleMapsBrowserApiKey === null });
    if (!keyPresent) throw mapError("BROWSER_KEY_MISSING", "Interactive map is not configured");
    onDiagnostic("browser_key_present");
    return new Promise((resolve, reject) => {
    const callback = `initTrailMaps_${Date.now()}`;
      globalThis[callback] = () => {
        delete globalThis[callback];
        const available = Boolean(globalThis.google?.maps?.importLibrary);
        onDiagnostic("maps_loader_callback", { googleMapsAvailable: available });
        if (available) { onDiagnostic("maps_script_loaded"); resolve(globalThis.google); } else { const error = mapError("GOOGLE_MAPS_NAMESPACE_MISSING", "Google Maps loaded without the expected namespace"); onDiagnostic("maps_namespace_failure", { error }); reject(error); }
      };
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(body.data.googleMapsBrowserApiKey)}&loading=async&callback=${callback}`;
      script.async = true;
      script.dataset.trailMapsLoader = "true";
      script.onerror = () => { const error = mapError("GOOGLE_MAPS_SCRIPT_ERROR", "Google Maps failed to load"); onDiagnostic("maps_script_failure", { error }); reject(error); };
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
  const google = await loadGoogleMaps(onDiagnostic); onDiagnostic("maps_namespace_ready");
  onDiagnostic("maps_library_import_started"); const { Map } = await google.maps.importLibrary("maps"); onDiagnostic("maps_library_loaded"); const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker"); onDiagnostic("marker_library_loaded"); onDiagnostic("maps_libraries_ready");
  if(geometry&&!finiteGeometry(geometry))throw mapError("INVALID_ROUTE_GEOMETRY","The route has no usable map geometry");
  let state=mapStates.get(container);if(!state){state={map:new Map(container,{mapId:"DEMO_MAP_ID",streetViewControl:false,mapTypeControl:false}),overlays:[]};mapStates.set(container,state);onDiagnostic("map_created");}else{state.overlays.forEach(overlay=>{overlay.map=null;overlay.setMap?.(null);});state.overlays=[];onDiagnostic("map_reused");}const map=state.map,bounds=new google.maps.LatLngBounds(),keep=overlay=>(state.overlays.push(overlay),overlay);
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
  const size=await waitUntilVisible(container);onDiagnostic("map_container_ready",{widthBucket:Math.round(size.width/100)*100,heightBucket:Math.round(size.height/100)*100});google.maps.event?.trigger?.(map,"resize");await new Promise(resolve=>requestAnimationFrame(resolve));map.fitBounds(bounds,48);if(geometry?.length>1&&geometry.every(point=>Math.abs(point.latitude-geometry[0].latitude)<1e-7&&Math.abs(point.longitude-geometry[0].longitude)<1e-7))map.setZoom(17);onDiagnostic("fit_bounds_complete",{fitBoundsCompletion:true});onDiagnostic("map_render_complete",{markerCount:payload.markers.length,geometryPointCount:geometry?.length||0});return map;
}
