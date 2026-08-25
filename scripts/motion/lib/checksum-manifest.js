"use strict";
const crypto = require("node:crypto");
const fs = require("node:fs");
function sha256(data) { return crypto.createHash("sha256").update(data).digest("hex"); }
function checksumFile(file) { const data = fs.readFileSync(file); return { sha256: sha256(data), bytes: data.length, data }; }
module.exports = { sha256, checksumFile };
