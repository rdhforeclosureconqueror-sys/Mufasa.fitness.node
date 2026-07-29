export class TrailResponseError extends Error {
  constructor(message, { code = "MALFORMED_RESPONSE", httpStatus = null, parseSucceeded = true } = {}) {
    super(message); this.name = "TrailResponseError"; this.code = code; this.httpStatus = httpStatus; this.parseSucceeded = parseSucceeded;
  }
}

export function normalizeTrailSearchEnvelope(body) {
  // Current API: {ok,data:{trails,...},error,requestId}. During a rolling deploy,
  // accept the two historical successful shapes as well: {trails,...} and an
  // array of trails. Do not treat arbitrary nested objects as successful.
  const candidate = body?.ok === true && body?.data != null ? body.data : body;
  if (Array.isArray(candidate)) return { trails: candidate, cached: false, stale: false };
  if (Array.isArray(candidate?.trails)) return candidate;
  if (Array.isArray(candidate?.data?.trails)) return candidate.data;
  throw new TrailResponseError("Malformed trail response");
}

export async function parseTrailSearchResponse(response) {
  const httpStatus = response.status;
  let text;
  try { text = await response.text(); } catch { throw new TrailResponseError("Empty trail response", { httpStatus, parseSucceeded: false }); }
  if (!text.trim()) throw new TrailResponseError("Empty trail response", { httpStatus, parseSucceeded: false });
  let body;
  try { body = JSON.parse(text); } catch { throw new TrailResponseError("Invalid JSON trail response", { httpStatus, parseSucceeded: false }); }
  if (!response.ok) {
    const code = httpStatus === 401 || httpStatus === 403 ? "AUTH_REQUIRED" : body?.error?.code || body?.code || "REQUEST_FAILED";
    throw new TrailResponseError(body?.error?.message || body?.message || `Request failed (${httpStatus})`, { code, httpStatus });
  }
  try { return normalizeTrailSearchEnvelope(body); }
  catch (error) { error.httpStatus = httpStatus; throw error; }
}
