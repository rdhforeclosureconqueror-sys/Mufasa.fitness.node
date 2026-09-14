"use strict";

const DEFAULT_RATE_LIMIT = 20;
const RATE_WINDOW_MS = 60_000;

function normalizeUpstream(env = process.env) {
  const raw = String(env.AIVOICE_URL || env.OPENVOICE_UPSTREAM_URL || "https://aivoice-wmrv.onrender.com").trim().replace(/\/+$/, "");
  return /\/speak$/i.test(raw) ? raw : `${raw}/speak`;
}

function createArenaCoachVoiceBridge(options = {}) {
  const worldBridge = options.worldBridge;
  if (!worldBridge || typeof worldBridge.readSession !== "function") throw new Error("worldBridge.readSession is required");
  const env = options.env || process.env;
  const fetchImpl = options.fetchImpl || global.fetch;
  const now = options.now || (() => Date.now());
  const maxPerMinute = Number(options.maxPerMinute || env.TTS_RATE_LIMIT || DEFAULT_RATE_LIMIT);
  const requestWindows = new Map();

  function allow(credential) {
    const at = now();
    const active = (requestWindows.get(credential) || []).filter(timestamp => at - timestamp < RATE_WINDOW_MS);
    if (active.length >= maxPerMinute) {
      requestWindows.set(credential, active);
      return false;
    }
    active.push(at);
    requestWindows.set(credential, active);
    return true;
  }

  function validate(body = {}) {
    const allowed = new Set(["text", "voice", "format", "speed", "pitch"]);
    if (!body || typeof body !== "object" || Array.isArray(body)) return {error:"VALIDATION_ERROR"};
    if (Object.keys(body).some(key => !allowed.has(key))) return {error:"VALIDATION_ERROR"};
    const text = String(body.text || "").trim();
    if (!text || text.length > 1000) return {error:"VALIDATION_ERROR"};
    const format = String(body.format || "mp3").toLowerCase();
    if (!new Set(["mp3", "wav"]).has(format)) return {error:"VALIDATION_ERROR"};
    const configuredVoice = String(env.COACH_TTS_VOICE || "").trim();
    const requestedVoice = String(body.voice || "alloy").trim() || "alloy";
    return {
      value: {
        text,
        voice: configuredVoice || requestedVoice,
        format,
        ...(Number.isFinite(Number(body.speed)) ? {speed:Number(body.speed)} : {}),
        ...(Number.isFinite(Number(body.pitch)) ? {pitch:Number(body.pitch)} : {})
      }
    };
  }

  async function speak(req, res) {
    res.set("Cache-Control", "private, no-store");
    res.vary("Cookie");
    const resolved = worldBridge.readSession(req);
    if (!resolved) return res.status(401).json({ok:false,error:{code:"ARENA_SESSION_INVALID",message:"Arena session is invalid or expired"}});
    if (!allow(resolved.credential)) return res.status(429).json({ok:false,error:{code:"TTS_RATE_LIMITED",message:"Coach voice rate limit reached"}});
    const parsed = validate(req.body || {});
    if (parsed.error) return res.status(400).json({ok:false,error:{code:parsed.error,message:"Invalid speech request"}});
    if (typeof fetchImpl !== "function") return res.status(503).json({ok:false,error:{code:"TTS_PROVIDER_UNAVAILABLE",message:"Speech provider is unavailable"}});

    const headers = {"Content-Type":"application/json"};
    const internalToken = String(env.SKILL_WORLD_TTS_TOKEN || "").trim();
    const apiKey = String(env.AIVOICE_API_KEY || "").trim();
    if (internalToken) headers["x-internal-token"] = internalToken;
    if (apiKey) headers["X-AIVOICE-KEY"] = apiKey;

    let upstream;
    try {
      upstream = await fetchImpl(normalizeUpstream(env), {
        method:"POST",
        headers,
        body:JSON.stringify(parsed.value)
      });
    } catch (_error) {
      return res.status(502).json({ok:false,error:{code:"TTS_PROVIDER_UNREACHABLE",message:"Speech provider could not be reached"}});
    }
    if (!upstream.ok) {
      return res.status(502).json({ok:false,error:{code:upstream.status === 401 ? "TTS_PROVIDER_AUTH_FAILED" : "TTS_PROVIDER_ERROR",message:"Speech provider rejected the request"}});
    }
    const contentType = upstream.headers?.get?.("content-type") || (parsed.value.format === "wav" ? "audio/wav" : "audio/mpeg");
    const buffer = Buffer.from(await upstream.arrayBuffer());
    res.set("Content-Type", contentType);
    return res.status(200).send(buffer);
  }

  function register(app) {
    app.post("/api/game/speak", speak);
  }

  return {register, speak, validate, normalizeUpstream:() => normalizeUpstream(env)};
}

module.exports = {createArenaCoachVoiceBridge, normalizeUpstream};
