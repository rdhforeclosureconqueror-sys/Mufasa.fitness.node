// src/server.js
// Mufasa Fitness Node – routes commands to domains (Fitness, etc.)

"use strict";

const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const http = require("http");

// Domains
const { handleFitnessCommand } = require("./domains/fitness");

const app = express();
const server = http.createServer(app);

// Basic middleware
app.use(cors());
app.use(bodyParser.json());

// Simple broadcast stub (can later be upgraded to WebSocket or SSE)
app.locals.broadcast = function broadcast(message) {
  try {
    console.log("[broadcast]", JSON.stringify(message));
  } catch {
    console.log("[broadcast]", message);
  }
};

// Health check
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    service: "mufasa-fitness-node",
    ts: Date.now(),
  });
});

// Generic command router
// Body shape: { domain, command, userId, payload }
app.post("/command", async (req, res) => {
  const { domain, command, userId, payload } = req.body || {};

  if (!domain) {
    return res.status(400).json({ ok: false, error: "Missing 'domain'" });
  }
  if (!command) {
    return res.status(400).json({ ok: false, error: "Missing 'command'" });
  }

  try {
    let result;

    switch (domain) {
      case "fitness":
        result = await handleFitnessCommand({ command, userId, payload, app });
        break;

      default:
        return res.status(400).json({ ok: false, error: "Unknown domain: " + domain });
    }

    res.json(result || { ok: true });
  } catch (err) {
    console.error("Error handling command:", command, err);
    res.status(500).json({
      ok: false,
      error: err && err.message ? err.message : String(err),
    });
  }
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log("🔥 Mufasa fitness node listening on", PORT);
});

module.exports = { app, server };
