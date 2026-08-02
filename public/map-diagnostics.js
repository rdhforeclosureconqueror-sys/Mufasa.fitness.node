import { backendUrl } from "./backend-origin.js?v=map-diagnostics-restored-20260802";

const ADMIN_ROLES = new Set(["admin", "super_admin"]);
const DIAGNOSTICS_VERSION = "map-diagnostics-restored-20260802";
const SECRET_KEY = /(?:api.?key|authorization|cookie|secret|token|password)/i;
const FAILURE_EVENT = /(?:failure|error)$/;
const STEP_EVENTS = [
  ["Browser Config Request", "browser_config_request_started"], ["Browser Config Received", "browser_config_parsed"],
  ["Browser Key Present", "browser_key_present"], ["Google Script Loaded", "maps_script_loaded"],
  ["Google Namespace Ready", "maps_namespace_ready"], ["Maps Library Loaded", "maps_library_loaded"],
  ["Marker Library Loaded", "marker_library_loaded"], ["Map Created", "map_created"],
  ["Markers Added", "markers_added"], ["Trail Route Rendered", "trail_route_rendered"]
];
const DEVICE_KINDS = ["desktop", "iphone", "android"];
const state = { enabled: false, initializing: null, events: [], facts: { authorizationStatus: "unknown", mapStatus: "not started" }, trailSnapshots: { desktop: null, iphone: null, android: null }, timings: {}, starts: {}, error: null, stopped: false, retry: null, clear: null, panel: null, launcher: null };

function safe(value, depth = 0) {
  if (depth > 4) return "[truncated]";
  if (value instanceof Error) return { code: value.code || "MAP_INITIALIZATION_ERROR", name: value.name, message: String(value.message || "").slice(0, 500), stack: String(value.stack || "").slice(0, 4000), httpStatus: value.httpStatus ?? null };
  if (Array.isArray(value)) return value.slice(0, 50).map(item => safe(item, depth + 1));
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, SECRET_KEY.test(key) && key !== "cookiesPresent" ? "[REDACTED]" : safe(item, depth + 1)]));
  const text = typeof value === "string" ? value : value;
  return typeof text === "string" ? text.replace(/Bearer\s+[\w.-]+/gi, "Bearer [REDACTED]").replace(/[?&]key=[^&\s]+/gi, "?key=[REDACTED]").replace(/(["']?(?:lat(?:itude)?|lon(?:gitude)?)["']?\s*[:=]\s*)-?\d+(?:\.\d+)?/gi, "$1[REDACTED]").replace(/([?&](?:lat(?:itude)?|lon(?:gitude)?)=)[^&\s]+/gi, "$1[REDACTED]").slice(0, 2000) : text;
}
function browserFacts() {
  const ua = navigator.userAgent || "Unavailable";
  return { userAgent: ua, iOSVersion: ua.match(/OS (\d+[_\d]*) like Mac OS X/)?.[1]?.replaceAll("_", ".") || "Unavailable", safariVersion: ua.match(/Version\/([\d.]+).*Safari/)?.[1] || "Unavailable", origin: location.origin, href: location.href };
}
function deviceKind() { const ua=navigator.userAgent||"";return /iPhone|iPad|iPod/i.test(ua)?"iphone":/Android/i.test(ua)?"android":"desktop"; }
function changedFields(a, b) {
  if (!a || !b) return [];
  const fields=["requestUrl","method","queryParameters","credentialsMode","cookiesPresent","responseStatus","finalResponseUrl","redirectOccurred","contentType","cacheControl","responseLength","responseClassification","parsedSchema","validationResult"];
  return fields.filter(key=>JSON.stringify(a[key]??null)!==JSON.stringify(b[key]??null));
}
function comparison() { const {desktop,iphone,android}=state.trailSnapshots;const compare=mobile=>{const differences=changedFields(desktop,mobile),causal=differences.some(field=>["responseStatus","finalResponseUrl","redirectOccurred","contentType","responseClassification","parsedSchema","validationResult"].includes(field));return {differences,causal};};const ios=compare(iphone),droid=compare(android);return {desktop,iphone,android,complete:Boolean(desktop&&iphone&&android),iphoneDifferences:ios.differences,androidDifferences:droid.differences,conclusion:!desktop||!iphone||!android?"Capture a successful desktop request, an iPhone request, and an Android request.":`Desktop vs iPhone differences: ${ios.differences.join(", ")||"none"}.\nDesktop vs Android differences: ${droid.differences.join(", ")||"none"}.`,sufficientToExplainFailure:ios.causal||droid.causal?"Yes — a response or validation difference can explain the failure.":"No"}; }
export function recordTrailRequestSnapshot(snapshot) { const kind=deviceKind();if(kind==="desktop"&&snapshot.validationResult!=="passed")return;const clean=safe({ ...snapshot, applicationCommit: state.facts.applicationCommit || snapshot.applicationCommit || "unknown" });state.trailSnapshots[kind]=clean;try{localStorage.setItem(`mapDiagnostics.trailSnapshot.${kind}`,JSON.stringify(clean));}catch{}render(); }
function comparisonTable(result) { const fields=[["Request ID","requestId"],["Request URL","requestUrl"],["Method","method"],["Query parameters","queryParameters"],["Credentials mode","credentialsMode"],["Cookies present","cookiesPresent"],["Response status","responseStatus"],["Final response URL","finalResponseUrl"],["Redirect occurred","redirectOccurred"],["Content-Type","contentType"],["Content-Length","contentLength"],["Content-Encoding","contentEncoding"],["Transfer-Encoding","transferEncoding"],["Cache-Control","cacheControl"],["Response length","responseLength"],["UTF-8 bytes","clientBytesReceived"],["Response classification","responseClassification"],["Parsed schema","parsedSchema"],["Validation result","validationResult"]];const cell=(device,key)=>escape(typeof result[device]?.[key]==="object"?JSON.stringify(result[device][key]):result[device]?.[key]??"—");return `<table><thead><tr><th>Field</th><th>Desktop</th><th>iPhone</th><th>Android</th></tr></thead><tbody>${fields.map(([label,key])=>`<tr><th>${label}</th>${DEVICE_KINDS.map(device=>`<td>${cell(device,key)}</td>`).join("")}</tr>`).join("")}</tbody></table><pre>${escape(result.conclusion)}\nSufficient to explain mobile failure: ${escape(result.sufficientToExplainFailure)}</pre>`; }
function duration(start, end) { return start == null || end == null ? null : `${Math.max(0, end - start).toFixed(1)} ms`; }
function updateDerived(event, details, now) {
  if (event === "browser_config_request_started") state.starts.config = now;
  if (event === "browser_config_http_status") state.facts.browserConfigHttpStatus = details.status;
  if (event === "browser_config_parsed") { state.timings.browserConfig = duration(state.starts.config, now); state.facts.jsonReceived = true; state.facts.browserKeyPresent = details.keyPresent ? "Yes" : "No"; state.facts.browserKeyNull = details.keyNull ? "Yes" : "No"; if (details.keyPresent) state.facts.browser_key_present = true; state.starts.script = now; }
  if (event === "maps_script_loaded") state.timings.scriptLoad = duration(state.starts.script, now);
  if (event === "maps_library_import_started") state.starts.library = now;
  if (event === "marker_library_loaded") state.timings.libraryImport = duration(state.starts.library, now);
  if (event === "map_created") { state.facts.mapCreated = "Yes"; state.starts.render = now; }
  if (event === "map_container_ready") { state.facts.containerWidth = details.widthBucket; state.facts.containerHeight = details.heightBucket; }
  if (event === "trail_route_rendered") state.facts.geometryAvailable = Number(details.geometryPointCountBucket || details.geometryPointCount) > 0 ? "Yes" : "No";
  if (event === "map_render_complete") { state.timings.mapRender = duration(state.starts.render, now); state.facts.mapStatus = "rendered"; state.facts.finalMapStatus = "rendered"; }
  if (event === "backend_http_status") state.facts.nearbyTrailsHttpStatus = details.status;
  if (event === "trail_count_rendered") state.facts.trailsReturned = details.count;
  if (event === "markers_created" || event === "markers_added") state.facts.markersCreated = details.markerCount;
  state.facts.scriptLoaded = Boolean(globalThis.google?.maps);
  state.facts.googleExists = Boolean(globalThis.google);
  state.facts.googleMapsExists = Boolean(globalThis.google?.maps);
  state.facts.importLibraryExists = Boolean(globalThis.google?.maps?.importLibrary);
  state.facts.markerLibraryLoaded ||= event === "marker_library_loaded";
  if (FAILURE_EVENT.test(event) || details.error || details.classification) { state.error = safe(details.error || details); state.facts.providerError = details.classification || state.error?.code || event; state.facts.finalMapStatus = "failed"; state.stopped = true; }
  if (event === "browser_config_request_started") state.facts.mapStatus = "starting";
}
export function mapDiagnostic(event, details = {}) {
  const clean = safe(details), now = performance.now();
  console.info("[map-diagnostics]", event, clean);
  if (!state.enabled || state.stopped) return;
  updateDerived(event, clean, now);
  state.events.push({ time: new Date().toLocaleTimeString([], { hour12: false }), event, details: clean, failure: Boolean(state.error) });
  render();
}
function row(label, value) { return `<dt>${label}</dt><dd>${value ?? "—"}</dd>`; }
function escape(value) { return String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" }[char])); }
function report() { return JSON.stringify(safe({ generatedAt: new Date().toISOString(), browser: browserFacts(), host: { origin: location.origin, href: location.href }, facts: state.facts, timings: state.timings, nearbyTrailsComparison: comparison(), error: state.error, timeline: state.events }), null, 2); }
function render() {
  if (!state.panel) return;
  const completed = new Set(state.events.map(item => item.event)); if (state.facts.browser_key_present) completed.add("browser_key_present");
  const steps = STEP_EVENTS.map(([label,event]) => `<div class="${completed.has(event)?"diag-ok":state.error?"diag-pending":"diag-pending"}">${completed.has(event)?"✓":"○"} ${label}</div>`).join("");
  const f=state.facts,t=state.timings,e=state.error;
  state.panel.innerHTML=`<h2>Map Diagnostics</h2><p><strong>Diagnostics loaded</strong><br>Map diagnostics build: ${DIAGNOSTICS_VERSION}</p><dl>${row("Diagnostics version",DIAGNOSTICS_VERSION)}${row("Application commit",escape(f.applicationCommit||"unknown"))}${row("Current hostname",escape(location.hostname))}${row("Current pathname",escape(location.pathname))}${row("Authorization status",escape(f.authorizationStatus||"unknown"))}${row("Map status",escape(f.mapStatus||"not started"))}</dl>${steps}<p class="diag-status ${e?"diag-fail":"diag-ok"}">Status: ${e?"FAILED":completed.has("map_render_complete")?"SUCCESS":"RUNNING"}</p>
  <h3>Browser</h3><dl>${row("User Agent",escape(browserFacts().userAgent))}${row("iOS",browserFacts().iOSVersion)}${row("Safari",browserFacts().safariVersion)}</dl>
  <h3>Host</h3><dl>${row("Origin",escape(location.origin))}${row("Href",escape(location.href))}</dl>
  <h3>Browser Config</h3><dl>${row("HTTP",f.browserConfigHttpStatus)}${row("JSON received",f.jsonReceived?"Yes":"No")}${row("Key present",f.browserKeyPresent)}${row("Key null",f.browserKeyNull)}</dl>
  <h3>Google Maps</h3><dl>${row("Script loaded",f.scriptLoaded?"Yes":"No")}${row("window.google",f.googleExists?"Yes":"No")}${row("google.maps",f.googleMapsExists?"Yes":"No")}${row("importLibrary",f.importLibraryExists?"Yes":"No")}${row("Marker library",f.markerLibraryLoaded?"Yes":"No")}${row("Geometry available",f.geometryAvailable||"Not reported")}${row("Container width",f.containerWidth)}${row("Container height",f.containerHeight)}${row("Map created",f.mapCreated||"No")}${row("Provider error",f.providerError||"None reported")}${row("Final map status",f.finalMapStatus||f.mapStatus||"not started")}</dl>
  <h3>Trail Search</h3><dl>${row("Nearby API HTTP",f.nearbyTrailsHttpStatus)}${row("Trails returned",f.trailsReturned)}${row("Markers created",f.markersCreated)}</dl>
  <h3>Desktop vs iPhone Nearby Trails</h3>${comparisonTable(comparison())}
  <h3>Timing</h3><dl>${row("Browser config",t.browserConfig)}${row("Script load",t.scriptLoad)}${row("Library import",t.libraryImport)}${row("Map render",t.mapRender)}</dl>
  ${e?`<h3 class="diag-fail">Error</h3><dl>${row("Code",escape(e.code))}${row("Name",escape(e.name))}${row("Message",escape(e.message))}${row("HTTP",escape(e.httpStatus))}${row("Host",escape(location.hostname))}</dl><details><summary>Stack trace</summary><pre>${escape(e.stack||"Unavailable")}</pre></details>`:""}
  <h3>Timeline</h3><pre>${state.events.map(x=>`[${x.time}] ${x.event}${Object.keys(x.details||{}).length?` ${JSON.stringify(x.details)}`:""}`).join("\n")||"Waiting for map initialization…"}</pre>
  <div class="diag-controls"><button data-diag="close">Close</button><button data-diag="copy">Copy Diagnostics</button><button data-diag="refresh">Refresh Diagnostics</button><button data-diag="retry">Retry Map Initialization</button><button data-diag="clear">Clear Map Cache</button></div>`;
  state.panel.querySelector('[data-diag="close"]').onclick=()=>{ state.panel.hidden=true;state.launcher.setAttribute("aria-expanded","false"); };
  state.panel.querySelector('[data-diag="copy"]').onclick=async()=>navigator.clipboard.writeText(report());
  state.panel.querySelector('[data-diag="refresh"]').onclick=()=>{ state.facts={};state.timings={};state.starts={};state.events=[];state.error=null;state.stopped=false;render(); };
  state.panel.querySelector('[data-diag="retry"]').onclick=async()=>{ state.error=null;state.stopped=false;state.events=[];state.timings={};state.starts={};render();await state.retry?.(); };
  state.panel.querySelector('[data-diag="clear"]').onclick=()=>{ state.clear?.();mapDiagnostic("client_map_cache_cleared"); };
}
export function configureMapDiagnostics({ retry, clear } = {}) { state.retry=retry;state.clear=clear; }
export async function initializeMapDiagnostics(token) {
  if (state.enabled) return true;
  if (state.initializing) return state.initializing;
  state.initializing=(async()=>{
    const configRequest=fetch(backendUrl("/api/browser-config"),{cache:"no-store",credentials:"omit",redirect:"error"}).then(async response=>response.ok?(await response.json())?.data||{}:{}).catch(()=>({}));
    const authRequest=fetch(backendUrl("/api/me"),{credentials:"omit",headers:token?{Authorization:`Bearer ${token}`}:{}}).then(async response=>response.ok?(await response.json())?.data||{}:{}).catch(()=>({}));
    const [config,account]=await Promise.all([configRequest,authRequest]);
    const role=typeof account.role==="string"?account.role.trim().toLowerCase():"";
    const rolePresent=Boolean(role);
    const authorized=ADMIN_ROLES.has(role)||config.debugMapEnabled===true;
    console.info("diagnostics_authorization_checked");
    console.info(`diagnostics_authorized: ${authorized}`);
    console.info(`role_present: ${rolePresent}`);
    if (!authorized) return false;
    state.enabled=true;
    state.facts.authorizationStatus=ADMIN_ROLES.has(role)?"authorized by role":"authorized by server debug flag";
    state.facts.applicationCommit=typeof config.applicationCommit==="string"?config.applicationCommit:"unknown";
    for(const kind of DEVICE_KINDS){try{state.trailSnapshots[kind]=JSON.parse(localStorage.getItem(`mapDiagnostics.trailSnapshot.${kind}`)||"null");}catch{state.trailSnapshots[kind]=null;}}
    state.launcher=document.createElement("button");state.launcher.type="button";state.launcher.className="map-debug-launcher";state.launcher.textContent="Map Debug";state.launcher.setAttribute("aria-expanded","true");
    state.panel=document.createElement("aside");state.panel.className="map-diagnostics";state.panel.setAttribute("aria-label","Map diagnostics");
    state.launcher.onclick=()=>{state.panel.hidden=!state.panel.hidden;state.launcher.setAttribute("aria-expanded",String(!state.panel.hidden));if(!state.panel.hidden)render();};
    document.body.append(state.launcher,state.panel);render();return true;
  })().finally(()=>{state.initializing=null;});
  return state.initializing;
}

// Loaded directly by greatness.html so diagnostics authorization is independent
// of failures elsewhere in the application module graph.
const bootstrapToken=()=>{try{return globalThis.AuthStateRuntime?.getAuthToken?.()||localStorage.getItem("maat_auth_token")||localStorage.getItem("authToken");}catch{return undefined;}};
initializeMapDiagnostics(bootstrapToken());
