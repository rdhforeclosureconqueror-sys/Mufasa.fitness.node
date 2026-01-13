// scripts/build-exercise-index.js
const fs = require("fs");
const path = require("path");

function safeReadJSON(p) {
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function toSlug(name) {
  return String(name || "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/[^\w\-]/g, "");
}

function main() {
  const repoRoot = process.cwd();
  const dbDir = path.join(repoRoot, "public", "exercise-db");

  if (!fs.existsSync(dbDir)) {
    console.error("❌ Missing folder:", dbDir);
    process.exit(1);
  }

  const entries = fs.readdirSync(dbDir, { withFileTypes: true })
    .filter(d => d.isDirectory())
    .map(d => d.name);

  const index = [];
  for (const folderName of entries) {
    const slug = toSlug(folderName);

    // Common patterns: folder contains JSON with same name, or "exercise.json", or "index.json"
    const candidates = [
      path.join(dbDir, folderName, `${folderName}.json`),
      path.join(dbDir, folderName, `${slug}.json`),
      path.join(dbDir, folderName, "exercise.json"),
      path.join(dbDir, folderName, "index.json"),
    ];

    let jsonPath = null;
    let data = null;

    for (const c of candidates) {
      if (fs.existsSync(c)) {
        data = safeReadJSON(c);
        if (data) {
          jsonPath = c;
          break;
        }
      }
    }

    // If no JSON found, still include folder so you can audit
    const relJson = jsonPath ? path.relative(path.join(repoRoot, "public"), jsonPath).replaceAll("\\", "/") : null;

    index.push({
      name: folderName,
      slug,
      json: relJson,  // e.g. "exercise-db/Ab_Roller/Ab_Roller.json"
      hasJson: Boolean(relJson),
      // optional metadata if present:
      category: data?.category || data?.bodyPart || data?.body_part || null,
      equipment: data?.equipment || null,
      target: data?.target || data?.muscle || null,
    });
  }

  index.sort((a, b) => a.name.localeCompare(b.name));

  const outPath = path.join(dbDir, "index.json");
  fs.writeFileSync(outPath, JSON.stringify({
    generatedAt: new Date().toISOString(),
    totalFolders: index.length,
    missingJsonCount: index.filter(x => !x.hasJson).length,
    exercises: index
  }, null, 2));

  console.log(`✅ Wrote ${outPath}`);
  console.log(`✅ totalFolders: ${index.length}`);
  console.log(`⚠️ missingJsonCount: ${index.filter(x => !x.hasJson).length}`);
}

main();
