// scripts/ensure-exercise-index.js
const fs = require("fs");
const path = require("path");

const EX_INDEX_PATH = path.join(process.cwd(), "public", "exercise-db", "index.json");

if (!fs.existsSync(EX_INDEX_PATH)) {
  console.error("❌ Missing public/exercise-db/index.json");
  console.error("Run: npm run build:exercise-index  (then commit the generated file)");
  process.exit(1);
}

console.log("✅ exercise-db/index.json present");
