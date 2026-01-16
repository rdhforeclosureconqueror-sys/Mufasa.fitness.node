// server.js
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

// Node 18+ has global fetch; if not, uncomment:
// const fetch = (...args) => import("node-fetch").then(({default: fetch}) => fetch(...args));

const app = express();
app.use(express.json({ limit: "2mb" }));

/* -----------------------------
   CORS
   - For same-origin calls (recommended), CORS barely matters.
   - But keep it for safety / future split deployments.
------------------------------ */
const ALLOWED_ORIGINS = (process.env.ALLOWED_ORIGINS || "")
  .split(",")
  .map(s => s.trim())
  .filter(Boolean);

// If env not set, this will behave permissively (like your current setup).
app.use(cors({
  origin: (origin, cb) => {
    // allow non-browser requests or same-origin
    if (!origin) return cb(null, true);
    if (ALLOWED_ORIGINS.length === 0) return cb(null, true);
    return cb(null, ALLOWED_ORIGINS.includes(origin));
  },
  credentials: false
}));

// ---- Paths ----
const ROOT = process.cwd();
const PUBLIC_DIR = path.join(ROOT, "public");
const EX_DB_DIR = path.join(PUBLIC_DIR, "exercise-db");
const EX_INDEX_PATH = path.join(EX_DB_DIR, "index.json");
const DATA_DIR = path.join(ROOT, "data");
const USER_DIR = path.join(DATA_DIR, "users");

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(USER_DIR)) fs.mkdirSync(USER_DIR, { recursive: true });

// ---- Static hosting ----
app.use(express.static(PUBLIC_DIR));

// ---- Helpers ----
function readJSON(p) {
  return JSON.parse(fs.readFileSync(p, "utf8"));
}

function writeJSON(p, obj) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(obj, null, 2));
}

function loadExerciseIndex() {
  if (!fs.existsSync(EX_INDEX_PATH)) return null;
  try {
    return readJSON(EX_INDEX_PATH);
  } catch {
    return null;
  }
}

function findExerciseBySlug(index, slug) {
  const list = index?.exercises || [];
  return list.find(x => x.slug === slug) || null;
}

// ---- Health ----
app.get("/health", (_req, res) => {
  res.json({
    ok: true,
    service: "mufasa-fitness-node",
    hasExerciseIndex: fs.existsSync(EX_INDEX_PATH),
    time: new Date().toISOString()
  });
});

/* =========================================================
   AI VOICE PROXY (THIS is what fixes your 401 + CORS issues)
   Frontend should call: fetch("/api/speak", { ... })
========================================================= */
app.post("/api/speak", async (req, res) => {
  try {
    const { text, voice = "alloy", format = "mp3" } = req.body || {};
    if (!text || !String(text).trim()) {
      return res.status(400).json({ ok: false, error: "text required" });
    }

    const AIVOICE_URL = process.env.AIVOICE_URL || "https://aivoice-wmrv.onrender.com/speak";
    const AIVOICE_API_KEY = process.env.AIVOICE_API_KEY || "";

    const r = await fetch(AIVOICE_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(AIVOICE_API_KEY ? { "X-AIVOICE-KEY": AIVOICE_API_KEY } : {})
      },
      body: JSON.stringify({ text, voice, format })
    });

    if (!r.ok) {
      const msg = await r.text().catch(() => "");
      return res.status(r.status).send(msg || "aivoice error");
    }

    // stream audio to browser
    res.setHeader("Content-Type", r.headers.get("content-type") || "audio/mpeg");
    res.setHeader("Cache-Control", "no-store");

    // If r.body is a web stream, convert to node stream when needed:
    if (typeof r.body?.pipe === "function") {
      r.body.pipe(res);
    } else {
      const buf = Buffer.from(await r.arrayBuffer());
      res.send(buf);
    }
  } catch (e) {
    res.status(500).json({ ok: false, error: "proxy_failed", message: String(e) });
  }
});

// ---- Exercise DB endpoints ----
app.get("/api/exercises/index", (_req, res) => {
  const idx = loadExerciseIndex();
  if (!idx) {
    return res.status(404).json({
      ok: false,
      error: "Missing exercise index.json. Run: npm run build:exercise-index and commit it."
    });
  }
  res.json({ ok: true, ...idx });
});

app.get("/api/exercises/search", (req, res) => {
  const q = String(req.query.q || "").trim().toLowerCase();
  const idx = loadExerciseIndex();
  if (!idx) return res.status(404).json({ ok: false, error: "Missing exercise index.json" });

  const list = idx.exercises || [];
  if (!q) return res.json({ ok: true, q, results: list.slice(0, 50) });

  const results = list
    .filter(x =>
      x.name.toLowerCase().includes(q) ||
      (x.category || "").toLowerCase().includes(q) ||
      (x.equipment || "").toLowerCase().includes(q) ||
      (x.target || "").toLowerCase().includes(q)
    )
    .slice(0, 100);

  res.json({ ok: true, q, results });
});

app.get("/api/exercises/:slug", (req, res) => {
  const slug = req.params.slug;
  const idx = loadExerciseIndex();
  if (!idx) return res.status(404).json({ ok: false, error: "Missing exercise index.json" });

  const item = findExerciseBySlug(idx, slug);
  if (!item) return res.status(404).json({ ok: false, error: "Unknown exercise slug", slug });

  if (!item.json) {
    return res.status(404).json({ ok: false, error: "Exercise folder has no JSON file", item });
  }

  const jsonPath = path.join(PUBLIC_DIR, item.json);
  if (!fs.existsSync(jsonPath)) {
    return res.status(404).json({ ok: false, error: "JSON path missing on disk", jsonPath, item });
  }

  try {
    const data = readJSON(jsonPath);
    res.json({ ok: true, meta: item, data });
  } catch (e) {
    res.status(500).json({ ok: false, error: "Failed to parse JSON", message: e.message, meta: item });
  }
});

// ---- COMMAND endpoint ----
app.post("/command", (req, res) => {
  const { domain, command, userId, payload } = req.body || {};
  if (!domain || !command || !userId) {
    return res.status(400).json({ ok: false, error: "Missing domain/command/userId" });
  }

  if (domain !== "fitness") {
    return res.status(400).json({ ok: false, error: "Unknown domain", domain });
  }

  try {
    const userPath = path.join(USER_DIR, `${userId}.json`);
    const existing = fs.existsSync(userPath) ? readJSON(userPath) : { userId, createdAt: Date.now() };

    const now = Date.now();
    existing.updatedAt = now;

    existing.events = existing.events || [];
    existing.events.push({ command, ts: now, payload });

    if (command === "fitness.saveProfile") {
      existing.profile = payload?.profile || existing.profile || null;
    }
    if (command === "fitness.startSession") {
      existing.sessions = existing.sessions || {};
      existing.sessions[payload?.sessionId] = {
        ...payload,
        startedAt: now,
        repUpdates: []
      };
    }
    if (command === "fitness.repUpdate") {
      existing.sessions = existing.sessions || {};
      const sid = payload?.sessionId;
      if (sid && existing.sessions[sid]) {
        existing.sessions[sid].repUpdates.push({ ...payload, ts: now });
      }
    }
    if (command === "fitness.endSession") {
      existing.sessions = existing.sessions || {};
      const sid = payload?.sessionId;
      if (sid && existing.sessions[sid]) {
        existing.sessions[sid].endedAt = now;
        existing.sessions[sid].summary = payload;
      }
    }
    if (command === "fitness.ohsaResult") {
      existing.ohsa = existing.ohsa || [];
      existing.ohsa.push({ ...payload, ts: now });
    }

    writeJSON(userPath, existing);
    return res.json({ ok: true, saved: true, domain, command, userId });
  } catch (e) {
    return res.status(500).json({ ok: false, error: "Command handler failed", message: e.message });
  }
});

// ---- Start ----
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`✅ mufasa-fitness-node listening on :${PORT}`);
});
