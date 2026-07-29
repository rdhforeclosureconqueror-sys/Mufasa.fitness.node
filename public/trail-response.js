const RAW_BODY_LIMIT = 500;
const EXPECTED_SCHEMA = "{ ok: true, data: { trails: array, cached?: boolean, stale?: boolean }, error, requestId } (also accepts rollout shapes { trails: array }, { data: { trails: array } }, or an array)";

function objectKeys(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? Object.keys(value) : [];
}

function describeSchema(value) {
  if (Array.isArray(value)) return `array(${value.length})`;
  if (value === null) return "null";
  if (typeof value !== "object") return typeof value;
  return `{ ${Object.entries(value).map(([key, item]) => `${key}: ${Array.isArray(item) ? "array" : item === null ? "null" : typeof item === "object" ? describeSchema(item) : typeof item}`).join(", ")} }`;
}

function responseKind(text, contentType) {
  const trimmed = text.trim();
  if (!trimmed) return "empty";
  if (/text\/html|application\/xhtml\+xml/i.test(contentType) || /^\s*(?:<!doctype\s+html|<html\b)/i.test(trimmed)) return "HTML";
  if (/[/+]json\b/i.test(contentType) || /^[{[]/.test(trimmed)) return "JSON";
  return "plain text";
}

function emit(logger, stage, details) {
  if (typeof logger === "function") logger(stage, details);
  else console.info("[nearby-trails-parser]", { stage, ...details });
}

export class TrailResponseError extends Error {
  constructor(message, { code = "MALFORMED_RESPONSE", httpStatus = null, parseSucceeded = true, validationStep = null, diagnostic = null } = {}) {
    super(message); this.name = "TrailResponseError"; this.code = code; this.httpStatus = httpStatus; this.parseSucceeded = parseSucceeded; this.validationStep = validationStep; this.diagnostic = diagnostic;
  }
}

export function normalizeTrailSearchEnvelope(body) {
  const candidate = body?.ok === true && body?.data != null ? body.data : body;
  if (Array.isArray(candidate)) return { trails: candidate, cached: false, stale: false };
  if (Array.isArray(candidate?.trails)) return candidate;
  if (Array.isArray(candidate?.data?.trails)) return candidate.data;
  throw new TrailResponseError('Validation failed: missing "data.trails" array', { validationStep: "successful response envelope must contain a trails array" });
}

export async function parseTrailSearchResponse(response, { logger } = {}) {
  const httpStatus = response.status;
  const contentType = response.headers?.get?.("content-type") || "(missing)";
  const baseDiagnostic = { httpStatus, contentType, responseUrl: response.url || "(same-origin response URL unavailable)", cacheControl: response.headers?.get?.("cache-control") || "(missing)", responseAge: response.headers?.get?.("age") || "(missing)", rateLimitRemaining: response.headers?.get?.("ratelimit-remaining") || response.headers?.get?.("x-ratelimit-remaining") || "(missing)", expectedSchema: EXPECTED_SCHEMA };
  let text;
  try { text = await response.text(); }
  catch (cause) {
    const diagnostic = { ...baseDiagnostic, rawResponseBody: "(unreadable)", responseKind: "unknown", parsedObjectKeys: [], receivedSchema: "unreadable body", validationRule: "response body must be readable" };
    emit(logger, "response_received_before_validation", diagnostic);
    throw new TrailResponseError("Unable to read trail response body", { httpStatus, parseSucceeded: false, validationStep: diagnostic.validationRule, diagnostic, cause });
  }
  const diagnostic = { ...baseDiagnostic, responseLength: text.length, redirected: Boolean(response.redirected), rawResponseBody: text.slice(0, RAW_BODY_LIMIT), rawResponseTruncated: text.length > RAW_BODY_LIMIT, responseKind: responseKind(text, contentType), parsedObjectKeys: [], receivedSchema: "not parsed", parserResult: "pending", validationRule: "pending" };
  emit(logger, "response_received_before_validation", diagnostic);
  if (!text.trim()) {
    Object.assign(diagnostic, { receivedSchema: "empty body", parserResult: "failed", validationRule: "response body must not be empty" });
    emit(logger, "response_validation_failure", diagnostic);
    throw new TrailResponseError("Empty trail response", { httpStatus, parseSucceeded: false, validationStep: diagnostic.validationRule, diagnostic });
  }
  let body;
  try { body = JSON.parse(text); }
  catch (cause) {
    Object.assign(diagnostic, { receivedSchema: diagnostic.responseKind, parserResult: "failed", validationRule: diagnostic.responseKind === "HTML" ? "JSON required; HTML response received" : "response body must be valid JSON", parserErrorName: cause.name, parserErrorMessage: cause.message });
    emit(logger, "response_validation_failure", diagnostic);
    throw new TrailResponseError(`${cause.name}: ${cause.message}`, { httpStatus, parseSucceeded: false, validationStep: diagnostic.validationRule, diagnostic, cause });
  }
  Object.assign(diagnostic, { parsedObjectKeys: objectKeys(body), receivedSchema: describeSchema(body), parserResult: "JSON parsed" });
  emit(logger, "response_json_parsed", diagnostic);
  if (!response.ok) {
    const code = httpStatus === 401 || httpStatus === 403 ? "AUTH_REQUIRED" : body?.error?.code || body?.code || "REQUEST_FAILED";
    diagnostic.validationRule = `HTTP ${httpStatus} is not a successful response`;
    emit(logger, "response_http_failure", diagnostic);
    throw new TrailResponseError(body?.error?.message || body?.message || `Request failed (${httpStatus})`, { code, httpStatus, validationStep: diagnostic.validationRule, diagnostic });
  }
  try { const result = normalizeTrailSearchEnvelope(body); Object.assign(diagnostic, { parserResult: "JSON parsed and schema normalized", validationRule: "passed" }); emit(logger, "response_validation_success", diagnostic); return result; }
  catch (error) {
    Object.assign(diagnostic, { validationRule: error.validationStep || "successful response envelope validation", parserErrorName: error.name, parserErrorMessage: error.message });
    emit(logger, "response_validation_failure", diagnostic);
    error.httpStatus = httpStatus; error.diagnostic = diagnostic; throw error;
  }
}
