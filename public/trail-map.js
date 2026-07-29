import { backendUrl } from "./backend-origin.js?v=mobile-map-config-route-20260729";

let loaderPromise;
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
export async function renderTrailMap(container, payload, { onSelect = () => {}, onDiagnostic = () => {}, selectedId = null, geometry = null, turnaroundPoint = null } = {}) {
  const google = await loadGoogleMaps(onDiagnostic); onDiagnostic("maps_namespace_ready");
  onDiagnostic("maps_library_import_started"); const { Map } = await google.maps.importLibrary("maps"); onDiagnostic("maps_library_loaded"); const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker"); onDiagnostic("marker_library_loaded"); onDiagnostic("maps_libraries_ready");
  const map = new Map(container, { mapId: "DEMO_MAP_ID", streetViewControl: false, mapTypeControl: false }); onDiagnostic("map_created"); const bounds = new google.maps.LatLngBounds();
  const userPosition = { lat: payload.user.latitude, lng: payload.user.longitude }; bounds.extend(userPosition); if(payload.user.approximate)new AdvancedMarkerElement({ map, position: userPosition, title: "Your approximate location", content: new PinElement({ background: "#4285f4", glyph: "●", glyphColor: "white" }).element });
  payload.markers.forEach(marker => { const position = { lat: marker.latitude, lng: marker.longitude }; bounds.extend(position); const advancedMarker = new AdvancedMarkerElement({ map, position, title: `${marker.number}. ${marker.name}`, content: numberedPin(PinElement, marker.number, marker.id === selectedId).element }); advancedMarker.addListener("click", () => onSelect(marker.id)); }); onDiagnostic("markers_created", { markerCount: payload.markers.length }); onDiagnostic("markers_added", { markerCount: payload.markers.length });
  if (geometry?.length > 1) { const path = geometry.map(point => ({ lat: point.latitude, lng: point.longitude })); path.forEach(point => bounds.extend(point)); new google.maps.Polyline({ map, path, strokeColor: "#f1c963", strokeWeight: 5 }); new AdvancedMarkerElement({ map, position: path[0], title: "Trail start", content: new PinElement({ glyph: "S", background: "#188038" }).element }); if(turnaroundPoint)new AdvancedMarkerElement({map,position:{lat:turnaroundPoint.latitude,lng:turnaroundPoint.longitude},title:"Turn around",content:new PinElement({glyph:"↩",background:"#fbbc04",glyphColor:"#172019"}).element});new AdvancedMarkerElement({ map, position: path[path.length - 1], title: "Trail finish", content: new PinElement({ glyph: "F", background: "#c5221f" }).element }); onDiagnostic("trail_route_rendered", { geometryPointCount: geometry.length }); }
  map.fitBounds(bounds, 48); onDiagnostic("map_render_complete", { markerCount: payload.markers.length, geometryPointCount: geometry?.length || 0 }); return map;
}
