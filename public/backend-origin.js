const PRODUCTION_BACKEND_ORIGIN = "https://mufasa-fitness-node.onrender.com";

export function backendOrigin(scope = globalThis) {
  const configured = scope.RuntimeState?.getBackendOrigin?.()
    || scope.MAAT_BACKEND_ORIGIN
    || scope.__MAAT_RUNTIME_CONFIG__?.backendOrigin
    || PRODUCTION_BACKEND_ORIGIN;
  return new URL(configured, scope.location?.href || PRODUCTION_BACKEND_ORIGIN).origin;
}

export function backendUrl(path, scope = globalThis) {
  return new URL(path, `${backendOrigin(scope)}/`).href;
}
