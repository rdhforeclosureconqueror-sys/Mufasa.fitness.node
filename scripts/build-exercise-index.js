// scripts/build-exercise-index.js
// Builds: public/exercise-db/index.json
// Source of truth: data/exercise.json
//
// This DOES NOT expect JSON files inside each exercise folder.
// It uses exercise.images like: "3_4_Sit-Up/0.jpg" and "3_4_Sit-Up/1.jpg"

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const INPUT = path.join(ROOT, "data", "exercise.json");
const OUT_DIR = path.join(ROOT, "public", "exercise-db");
const OUT_FILE = path.join(OUT_DIR, "index.json");

function safeReadJson(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return JSON.parse(raw);
}

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function main() {
  if (!exists(INPUT)) {
    console.error(`❌ Missing input file: ${INPUT}`);
    process.exit(1);
  }

  if (!exists(OUT_DIR)) {
    console.error(`❌ Missing output directory: ${OUT_DIR}`);
    console.error(`   Expected your images to live here: public/exercise-db/<id>/*.jpg`);
    process.exit(1);
  }

  const exercises = safeReadJson(INPUT);

  if (!Array.isArray(exercises)) {
    console.error("❌ data/exercise.json must be an array of exercises.");
    process.exit(1);
  }

  let missingFolderCount = 0;
  let missingImageCount = 0;
  let missingIdCount = 0;

  const normalized = exercises.map((ex, idx) => {
    const id = ex.id || ex.name || `exercise_${idx}`;
    if (!ex.id) missingIdCount++;

    // folder name is usually the same as id (ex: "3_4_Sit-Up")
    const folderPath = path.join(OUT_DIR, id);
    const folderExists = exists(folderPath);
    if (!folderExists) missingFolderCount++;

    // validate images if present
    const images = Array.isArray(ex.images) ? ex.images : [];
    for (const rel of images) {
      const imgPath = path.join(OUT_DIR, rel);
      if (!exists(imgPath)) missingImageCount++;
    }

    // return clean record
    return {
      ...ex,
      id,
      images,
    };
  });

  // Keep it simple: write the whole normalized exercise list to index.json
  // Your API/frontend can filter/search this.
  fs.writeFileSync(OUT_FILE, JSON.stringify(normalized, null, 2), "utf8");

  console.log(`✅ Wrote ${OUT_FILE}`);
  console.log(`📦 totalExercises: ${normalized.length}`);
  console.log(`ℹ️ missingIdCount: ${missingIdCount}`);
  console.log(`⚠️ missingFolderCount: ${missingFolderCount}`);
  console.log(`⚠️ missingImageCount: ${missingImageCount}`);
}

main();
