// server.js
// Day 1: Minimal Mufasa server - accepts commands and routes to fitness domain.

require("dotenv").config();
const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const { handleFitnessCommand } = require("./domains/fitness");

const app = express();
const PORT = process.env.PORT || 3000;

// ── Middleware ──
app.use(cors({
  origin: process.env.FRONTEND_ORIGIN || "*"
}));
app.use(express.json());

// ── Load capabilities (for debugging / introspection) ──
const capabilitiesPath = path.join(__dirname, "capabilities.json");
let capabilities = {};

try {
  const raw = fs.readFileSync(capabilitiesPath, "utf8");
  capabilities = JSON.parse(raw);
  console.log("Capabilities loaded:", Object.keys(capabilities));
} catch (err) {
  console.error("Failed to load capabilities.json:", err);
}

// ── Health check / info route ──
app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Mufasa Fitness Brain - Day 1 Skeleton",
    capabilities
  });
});

// ── Command router ──
// Frontend will POST { command, userId, payload }
app.post("/command", async (req, res) => {
  const { command, userId, payload } = req.body || {};

  if (!command) {
    return res.status(400).json({ error: "Missing 'command' in request body" });
  }

  console.log("Incoming command:", command, "from user:", userId);

  try {
    let domain = null;

    if (command.startsWith("fitness.")) domain = "fitness";
    // Later: blackDollar, bookclub, etc.

    if (!domain) {
      return res.status(400).json({ error: "Unknown command domain" });
    }

    let result;

    switch (domain) {
      case "fitness":
        result = await handleFitnessCommand({
          command,
          userId,
          payload,
          app
        });
        break;

      default:
        return res.status(400).json({ error: "Domain not implemented" });
    }

    res.json(result);
  } catch (err) {
    console.error("Error handling command:", err);
    res.status(500).json({ error: "Internal error" });
  }
});

// ── Start server ──
app.listen(PORT, () => {
  console.log(`Mufasa Fitness Brain (Day 1) listening on port ${PORT}`);
});
