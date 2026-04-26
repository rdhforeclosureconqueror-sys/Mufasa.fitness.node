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

function safeParseJson(text) {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false, value: null };
  }
}

async function summarizeDiagnosticWithOpenAI(input = {}, options = {}) {
  const apiKey = options.apiKey || process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return { status: "unavailable", summary: DEFAULT_FALLBACK };
  }

  const body = {
    model: options.model || process.env.OPENAI_DIAGNOSTIC_MODEL || "gpt-4o-mini",
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
    const res = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify(body)
    });

    if (!res.ok) {
      return { status: "error", summary: { ...DEFAULT_FALLBACK, summary: `OpenAI unavailable (${res.status}).` } };
    }

    const json = await res.json();
    const text = json?.output_text || "";
    const parsed = safeParseJson(text);
    if (!parsed.ok || !parsed.value) {
      return { status: "error", summary: { ...DEFAULT_FALLBACK, summary: "OpenAI returned invalid JSON." } };
    }

    return { status: "ok", summary: parsed.value };
  } catch {
    return { status: "error", summary: DEFAULT_FALLBACK };
  }
}

module.exports = {
  summarizeDiagnosticWithOpenAI,
  safeParseJson,
  SYSTEM_CONTEXT
};
