"use strict";

const fs = require("fs");

const [marker, parentValue, intervalValue] = process.argv.slice(2);
const parentPid = Number(parentValue);
const intervalMs = Math.max(1_000, Number(intervalValue) || 10_000);
function parentAlive() { try { process.kill(parentPid, 0); return true; } catch { return false; } }
function beat() {
  if (!parentAlive()) { try { fs.rmSync(marker, { force: true }); } finally { process.exit(0); } }
  try { const now = new Date(); fs.utimesSync(marker, now, now); } catch { process.exit(0); }
}
beat(); setInterval(beat, intervalMs);
