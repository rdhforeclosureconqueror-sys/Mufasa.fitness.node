"use strict";

const SYSTEM_CONTEXT = [
  "You are diagnosing a browser-based fitness app.",
  "Tech stack: TensorFlow MoveNet pose tracking, Three.js + GLTFLoader for GLB avatars, deterministic form engine, workout/session APIs, and diagnostics observability.",
  "Behavior rules:",
  "- Avatar runtime initialization is independent of pose tracking.",
  "- Camera is optional for avatar initialization.",
  "- Form engine requires pose input to generate movement feedback.",
  "Only use provided diagnostic data. Do not guess missing systems.",
  "Return evidence items that reference concrete report fields."
].join(" ");

const DEFAULT_FALLBACK = {
  summary: "OpenAI unavailable.",
  likelyRootCause: "OpenAI API key missing or summarizer request failed.",
  category: "UNKNOWN",
  confidence: 0,
  evidence: [],
  recommendedNextSteps: ["Review raw diagnostics and route check output."],
  codexFixMessage: "Investigate failing routes/scripts from diagnostics report before patching.",
  severity: "medium"
};
const OPENAI_DIAGNOSTIC_ENDPOINT = "https://api.openai.com/v1/responses";
const OPENAI_RESPONSE_PREVIEW_MAX = 400;

function sanitizePreview(value) {
  const text = typeof value === "string" ? value : JSON.stringify(value || {});
  return text
    .replace(/Bearer\s+[A-Za-z0-9._-]+/gi, "Bearer [redacted]")
    .replace(/sk-[A-Za-z0-9_-]{12,}/g, "sk-[redacted]")
    .slice(0, OPENAI_RESPONSE_PREVIEW_MAX);
}

function normalizeModel(options = {}) {
  const model = options.model || process.env.OPENAI_DIAGNOSTIC_MODEL || "gpt-4o-mini";
  if (typeof model !== "string" || !model.trim()) return "gpt-4o-mini";
  return model.trim();
}

function safeParseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
}

async function summarizeDiagnosticWithOpenAI(input = {}, options = {}) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  const endpoint = options.endpoint || OPENAI_DIAGNOSTIC_ENDPOINT;
  const model = normalizeModel(options);
  if (!apiKey) {
    return {
      status: "unavailable",
      summary: DEFAULT_FALLBACK,
      errorType: "api_key_missing",
      errorMessage: "OPENAI_API_KEY is missing.",
      httpStatus: null,
      model,
      endpoint,
      rawResponsePreview: null,
      apiKeyPresent: false
    };
  }

  const body = {
    model,
    input: [
      {
        role: "system",
        content: [
          { type: "input_text", text: "Return JSON only with keys: summary, likelyRootCause, category, confidence, evidence, recommendedNextSteps, codexFixMessage, severity." },
          { type: "input_text", text: SYSTEM_CONTEXT }
        ]
      },
      {
        role: "user",
        content: [
          { type: "input_text", text: JSON.stringify(input) }
        ]
      }
    ],
    text: { format: { type: "json_object" } }
  };

  try {
    console.info("[diagnostic-openai] request:start", {
      apiKeyPresent: true,
      model,
      endpoint
    });
    const res = await fetch(endpoint, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });
    const rawText = await res.text();
    const rawPreview = sanitizePreview(rawText);
    console.info("[diagnostic-openai] response", {
      status: res.status,
      model,
      endpoint,
      bodyPreview: rawPreview
    });
    if (!res.ok) {
      const parsedErr = safeParseJson(rawText);
      const apiErrorMessage = parsedErr.ok ? parsedErr.value?.error?.message : null;
      return {
        status: "error",
        summary: { ...DEFAULT_FALLBACK, summary: `OpenAI unavailable (${res.status}).` },
        errorType: res.status === 401 ? "auth_error" : res.status === 429 ? "rate_limit" : "http_error",
        errorMessage: apiErrorMessage || `OpenAI request failed with status ${res.status}.`,
        httpStatus: res.status,
        model,
        endpoint,
        rawResponsePreview: rawPreview,
        apiKeyPresent: true
      };
    }
    const parsedTopLevel = safeParseJson(rawText);
    if (!parsedTopLevel.ok) {
      return {
        status: "error",
        summary: { ...DEFAULT_FALLBACK, summary: "OpenAI returned non-JSON response." },
        errorType: "json_parse_error",
        errorMessage: "Failed to parse OpenAI response as JSON.",
        httpStatus: res.status,
        model,
        endpoint,
        rawResponsePreview: rawPreview,
        apiKeyPresent: true
      };
    }
    const json = parsedTopLevel.value;
    const text = json?.output_text || "";
    const parsed = safeParseJson(text);
    if (!parsed.ok || !parsed.value) {
      return {
        status: "ok",
        summary: {
          ...DEFAULT_FALLBACK,
          summary: text || "OpenAI returned non-JSON summary text.",
          likelyRootCause: "Diagnostics processed with plain-text AI summary."
        },
        errorType: "plain_text_response",
        errorMessage: "OpenAI output_text was plain text instead of JSON.",
        httpStatus: res.status,
        model,
        endpoint,
        rawResponsePreview: sanitizePreview(text || rawText),
        apiKeyPresent: true
      };
    }

    return {
      status: "ok",
      summary: parsed.value,
      errorType: null,
      errorMessage: null,
      httpStatus: res.status,
      model,
      endpoint,
      rawResponsePreview: rawPreview,
      apiKeyPresent: true
    };
  } catch (error) {
    console.error("[diagnostic-openai] request:failed", {
      apiKeyPresent: true,
      model,
      endpoint,
      errorName: error?.name || "Error",
      errorMessage: error?.message || "Unknown fetch error"
    });
    return {
      status: "error",
      summary: DEFAULT_FALLBACK,
      errorType: error?.name === "AbortError" ? "timeout_error" : "network_error",
      errorMessage: error?.message || "OpenAI request failed.",
      httpStatus: null,
      model,
      endpoint,
      rawResponsePreview: null,
      apiKeyPresent: true
    };
  }
}

module.exports = {
  summarizeDiagnosticWithOpenAI,
  safeParseJson,
  SYSTEM_CONTEXT,
  normalizeModel,
  sanitizePreview,
  OPENAI_DIAGNOSTIC_ENDPOINT
};
