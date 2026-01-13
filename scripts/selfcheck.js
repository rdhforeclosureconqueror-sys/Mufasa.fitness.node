// scripts/selfcheck.js
const fs = require("fs");
const path = require("path");

const mustExist = [
  "server.js",
  "public",
  "public/exercise-db",
  "public/exercise-db/index.json"
];

let ok = true;

for (const p of mustExist) {
  const full = path.join(process.cwd(), p);
  if (!fs.existsSync(full)) {
    console.error("❌ Missing:", p);
    ok = false;
  }
}

if (!ok) process.exit(1);
console.log("✅ selfcheck ok");
