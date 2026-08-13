(function initCanonicalApiClient(global) {
  "use strict";
  global.__MAAT_ASSET_VERSIONS__ = Object.assign(global.__MAAT_ASSET_VERSIONS__ || {}, { "api-client.js": "20260813-token-mutation-checkpoints-v2" });
  var PRODUCTION_FRONTEND_ORIGIN = "https://mufasafitsite.onrender.com";
  var PRODUCTION_BACKEND_ORIGIN = "https://mufasa-fitness-node.onrender.com";
  function origin() { var configured = global.RuntimeState?.getBackendOrigin?.() || global.MAAT_BACKEND_ORIGIN || global.__MAAT_RUNTIME_CONFIG__?.backendOrigin || PRODUCTION_BACKEND_ORIGIN; return new URL(configured, global.location?.href || PRODUCTION_BACKEND_ORIGIN).origin; }
  function resolve(path) { return new URL(path, origin() + "/").href; }
  function token() { return global.AuthStateRuntime?.getAuthToken?.() || null; }
  function isAuthenticated() { var state = global.AuthStateRuntime?.getCanonicalAuthState?.(); return state?.isAuthenticated === true && Boolean(state.token); }
  function needsPreflight(method, headers, crossOrigin) { if (!crossOrigin) return false; if (!/^(GET|HEAD|POST)$/i.test(method)) return true; return Object.keys(headers).some(function (name) { return !["accept", "accept-language", "content-language", "content-type"].includes(name.toLowerCase()) || (name.toLowerCase() === "content-type" && !/^(application\/x-www-form-urlencoded|multipart\/form-data|text\/plain)(;|$)/i.test(headers[name])); }); }
  function classify(error) { if (error?.name === "AbortError") return "timeout"; if (error?.name === "TypeError") return "unknown network"; return "request construction"; }
  async function request(path, options) {
    options = options || {}; var url, request, dispatched = false, controller = new AbortController(); var timeout = setTimeout(function () { controller.abort(); }, options.timeoutMs || 15000);
    try {
      url = resolve(path); var authToken = options.auth === false ? null : token();
      if (authToken) await global.AuthStateRuntime?.traceTokenHandoff?.("token received by canonical API client", authToken, {}, { file: "public/api-client.js", function: "request" });
      if (authToken) await global.AuthStateRuntime?.traceTokenHandoff?.("token immediately before Authorization header construction", authToken, {}, { file: "public/api-client.js", function: "request" });
      var headers = Object.assign({}, options.body ? { "Content-Type": "application/json" } : {}, options.headers || {}, authToken ? { Authorization: "Bearer " + authToken } : {}); var method = (options.method || "GET").toUpperCase(); var crossOrigin = new URL(url).origin !== global.location?.origin;
      request = new Request(url, { method: method, headers: headers, body: options.body && typeof options.body !== "string" ? JSON.stringify(options.body) : options.body, cache: options.cache || "no-store", credentials: "omit", signal: options.signal || controller.signal }); dispatched = true;
      var response = await global.fetch(request); var payload = options.parseResponse === false ? null : await response.json().catch(function () { return {}; });
      return { ok: response.ok, response: response, payload: payload, diagnostics: { url: url, apiOrigin: new URL(url).origin, crossOrigin: crossOrigin, dispatched: true, preflightRequired: needsPreflight(method, headers, crossOrigin), backendReached: true, status: response.status, failureClass: response.ok ? null : (response.status === 401 || response.status === 403 ? "authentication HTTP response" : "backend HTTP response") } };
    } catch (error) { return { ok: false, error: error, diagnostics: { url: url || null, apiOrigin: url ? new URL(url).origin : origin(), crossOrigin: url ? new URL(url).origin !== global.location?.origin : true, dispatched: dispatched, preflightRequired: request ? needsPreflight(request.method, Object.fromEntries(request.headers.entries()), true) : null, backendReached: null, status: null, failureClass: classify(error) } }; }
    finally { clearTimeout(timeout); }
  }
  global.MaatApiClient = Object.freeze({ origin: origin, resolve: resolve, request: request, isAuthenticated: isAuthenticated, productionFrontendOrigin: PRODUCTION_FRONTEND_ORIGIN });
})(typeof window !== "undefined" ? window : globalThis);
