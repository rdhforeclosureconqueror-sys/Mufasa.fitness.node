// src/server.js
// Mufasa Fitness Node – command router for the fitness domain

"use strict";

const express = require("express");
const cors = require("cors");

const { handleFitnessCommand } = require("./domains/fitness");

const PORT = process.env.PORT || 3000;

const app = express();

// Basic JSON API + CORS
app.use(cors());
app.use(express.json());

// Simple broadcast hook – right now just logs to console,
// but you can later wire this into WebSockets or SSE.
app.locals.broadcast = function broadcast(msg) {
  console.log("[broadcast]", JSON.stringify(msg));
};

// Health check (Render will hit this sometimes)
app.get("/health", (req, res) => {
  res.json({
    ok: true,
    label: "Mufasa Fitness Node",
    version: "2.0.0",
  });
});

// Main command endpoint called from your front-end:
// POST /command { domain, command, userId, payload }
app.post("/command", async (req, res) => {
  try {
    const { domain, command, userId, payload } = req.body || {};

    if (!domain || !command) {
      return res.status(400).json({
        ok: false,
        error: "domain and command are required",
      });
    }

    if (domain !== "fitness") {
      return res.status(400).json({
        ok: false,
        error: `Unknown domain: ${domain}`,
      });
    }

    const result = await handleFitnessCommand({
      domain,
      command,
      userId: userId || "anonymous",
      payload: payload || {},
      app,
    });

    // result already has { ok: true, ... } shape
    res.json(result);
  } catch (err) {
    console.error("Error in /command:", err);
    res.status(500).json({
      ok: false,
      error: err.message || "Internal server error",
    });
  }
});

app.listen(PORT, () => {
  console.log(`Mufasa fitness node listening on port ${PORT}`);
});

module.exports = app;
