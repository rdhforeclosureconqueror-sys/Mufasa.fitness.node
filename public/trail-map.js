let loaderPromise;
export function createMapPayload(userLocation, trails) {
  const safeTrails = (trails || []).filter(trail => Number.isFinite(trail.latitude) && Number.isFinite(trail.longitude));
  return { user: { latitude: Number(userLocation.latitude), longitude: Number(userLocation.longitude), approximate: true }, markers: safeTrails.map((trail, index) => ({ number: index + 1, id: trail.id, latitude: trail.latitude, longitude: trail.longitude, name: trail.name })) };
}
export function payloadBounds(payload) {
  const points = [payload.user, ...payload.markers];
  return { north: Math.max(...points.map(point => point.latitude)), south: Math.min(...points.map(point => point.latitude)), east: Math.max(...points.map(point => point.longitude)), west: Math.min(...points.map(point => point.longitude)) };
}
export function markerLabel(number) { return String(number); }
export async function loadGoogleMaps() {
  if (globalThis.google?.maps?.importLibrary) return globalThis.google;
  if (!loaderPromise) loaderPromise = fetch("/api/browser-config").then(response => response.json()).then(({ data }) => new Promise((resolve, reject) => {
    if (!data?.googleMapsBrowserApiKey) throw new Error("Interactive map is not configured");
    const callback = `initTrailMaps_${Date.now()}`;
    globalThis[callback] = () => { delete globalThis[callback]; resolve(globalThis.google); };
    const script = document.createElement("script"); script.src = `https://maps.googleapis.com/maps/api/js?key=${encodeURIComponent(data.googleMapsBrowserApiKey)}&loading=async&callback=${callback}`; script.async = true; script.onerror = () => reject(new Error("Google Maps failed to load")); document.head.append(script);
  }));
  return loaderPromise;
}
function numberedPin(PinElement, number, selected = false) { return new PinElement({ glyph: markerLabel(number), background: selected ? "#f1c963" : "#275d50", borderColor: "#fff", glyphColor: selected ? "#172019" : "#fff", scale: selected ? 1.25 : 1 }); }
export async function renderTrailMap(container, payload, { onSelect = () => {}, selectedId = null, geometry = null } = {}) {
  const google = await loadGoogleMaps(); const { Map } = await google.maps.importLibrary("maps"); const { AdvancedMarkerElement, PinElement } = await google.maps.importLibrary("marker");
  const map = new Map(container, { mapId: "DEMO_MAP_ID", streetViewControl: false, mapTypeControl: false }); const bounds = new google.maps.LatLngBounds();
  const userPosition = { lat: payload.user.latitude, lng: payload.user.longitude }; bounds.extend(userPosition); new AdvancedMarkerElement({ map, position: userPosition, title: "Your approximate location", content: new PinElement({ background: "#4285f4", glyph: "●", glyphColor: "white" }).element });
  payload.markers.forEach(marker => { const position = { lat: marker.latitude, lng: marker.longitude }; bounds.extend(position); const advancedMarker = new AdvancedMarkerElement({ map, position, title: `${marker.number}. ${marker.name}`, content: numberedPin(PinElement, marker.number, marker.id === selectedId).element }); advancedMarker.addListener("click", () => onSelect(marker.id)); });
  if (geometry?.length > 1) { const path = geometry.map(point => ({ lat: point.latitude, lng: point.longitude })); path.forEach(point => bounds.extend(point)); new google.maps.Polyline({ map, path, strokeColor: "#f1c963", strokeWeight: 5 }); new AdvancedMarkerElement({ map, position: path[0], title: "Trail start", content: new PinElement({ glyph: "S", background: "#188038" }).element }); new AdvancedMarkerElement({ map, position: path.at(-1), title: "Trail finish", content: new PinElement({ glyph: "F", background: "#c5221f" }).element }); }
  map.fitBounds(bounds, 48); return map;
}
