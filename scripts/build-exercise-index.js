// scripts/build-exercise-index.js
// Builds public/exercise-db/index.json from data/exercise.json (master DB)
// Also checks which exercise folders exist and notes missing assets.

const fs = require("fs");
const path = require("path");

const REPO_ROOT = path.resolve(__dirname, "..");
const DATA_JSON = path.join(REPO_ROOT, "data", "exercise.json");
const EXERCISE_DB_DIR = path.join(REPO_ROOT, "public", "exercise-db");
const OUT_INDEX = path.join(EXERCISE_DB_DIR, "index.json");

function exists(p) {
  try {
    fs.accessSync(p, fs.constants.F_OK);
    return true;
  } catch {
    return false;
  }
}

function safeReadJson(p) {
  const raw = fs.readFileSync(p, "utf8");
  return JSON.parse(raw);
}

function listFolders(dir) {
  if (!exists(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name);
}

function main() {
  if (!exists(DATA_JSON)) {
    console.error(`❌ Missing master DB: ${DATA_JSON}`);
    process.exit(1);
  }

  if (!exists(EXERCISE_DB_DIR)) {
    console.error(`❌ Missing folder: ${EXERCISE_DB_DIR}`);
    console.error(`Create it: public/exercise-db`);
    process.exit(1);
  }

  const master = safeReadJson(DATA_JSON);

  if (!Array.isArray(master)) {
    console.error("❌ data/exercise.json must be an array of exercises");
    process.exit(1);
  }

  const folderNames = new Set(listFolders(EXERCISE_DB_DIR));

  let missingFolderCount = 0;

  // Build a clean index (keep full metadata if you want, but this is a good practical set)
  const index = master.map((ex) => {
    const id = ex.id || "";
    const folder = id; // your folders appear to be named by id (ex: "3_4_Sit-Up")

    const hasFolder = folderNames.has(folder);
    if (!hasFolder) missingFolderCount++;

    // Normalize images to be web paths under /exercise-db/
    // Your master JSON already stores like: "3_4_Sit-Up/0.jpg"
    const images = Array.isArray(ex.images)
      ? ex.images.map((img) => `/exercise-db/${img}`)
      : [];

    return {
      id,
      name: ex.name || id,
      category: ex.category || null,
      force: ex.force || null,
      level: ex.level || null,
      mechanic: ex.mechanic || null,
      equipment: ex.equipment || null,
      primaryMuscles: ex.primaryMuscles || [],
      secondaryMuscles: ex.secondaryMuscles || [],
      instructions: ex.instructions || [],
      images,
      // Useful for debugging
      folder,
      hasFolder,
    };
  });

  fs.writeFileSync(OUT_INDEX, JSON.stringify(index, null, 2), "utf8");

  console.log(`✅ Wrote ${OUT_INDEX}`);
  console.log(`✅ totalExercises: ${index.length}`);
  console.log(`⚠️ missingFolderCount: ${missingFolderCount}`);
  console.log(
    `ℹ️ Tip: GitHub "truncated list" is just UI — files can still exist even if not listed.`
  );
}

main();
