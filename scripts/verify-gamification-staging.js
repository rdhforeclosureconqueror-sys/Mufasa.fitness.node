"use strict";

const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawnSync } = require("child_process");
const { loadGamificationConfig } = require("../src/config/gamification");

const argument = process.argv.find((value) => value.startsWith("--data-dir="));
const dataDir = path.resolve(argument ? argument.slice("--data-dir=".length) : fs.mkdtempSync(path.join(os.tmpdir(), "gamification-staging-")));
if (process.env.NODE_ENV === "production" || process.env.RENDER_SERVICE_TYPE) throw new Error("Refusing to run a staging verifier in a production environment");
fs.mkdirSync(dataDir, { recursive: true });
const gamificationDir = path.join(dataDir, "gamification");
if (fs.existsSync(gamificationDir) && fs.readdirSync(gamificationDir).length) throw new Error("Dedicated verification data directory must be empty");

const results = [];
function run(name, command, args, env = {}) {
  const child = spawnSync(command, args, { cwd: path.join(__dirname, ".."), env: { ...process.env, ...env }, encoding: "utf8" });
  results.push({ name, passed: child.status === 0, command: [command, ...args].join(" "), output: `${child.stdout || ""}${child.stderr || ""}`.trim().slice(-2000) });
  if (child.status !== 0) throw new Error(`${name} failed`);
}

const probe = path.join(dataDir, ".gamification-write-probe");
fs.writeFileSync(probe, "verification", { flag: "wx" }); fs.rmSync(probe);
results.push({ name: "writable storage", passed: true });
const disabled = loadGamificationConfig({});
const { sources, ...topLevelFlags } = disabled;
if (Object.values({ ...topLevelFlags, ...sources }).some(Boolean)) throw new Error("Gamification does not default off");
results.push({ name: "disabled defaults and dependency validation", passed: true });

const testFiles = fs.readdirSync(path.join(__dirname, "..", "test")).filter((name) => /^gamification-.*\.test\.js$/.test(name)).sort().map((name) => `test/${name}`);
run("deterministic gamification verification", process.execPath, ["--test", ...testFiles]);
run("migration dry run", process.execPath, ["scripts/migrate-gamification-operations.js"], { POCKET_PT_DATA_DIR: dataDir });
run("migration apply and backup", process.execPath, ["scripts/migrate-gamification-operations.js", "--apply"], { POCKET_PT_DATA_DIR: dataDir });
run("migration post-apply dry run", process.execPath, ["scripts/migrate-gamification-operations.js"], { POCKET_PT_DATA_DIR: dataDir });
run("rollback rehearsal", process.execPath, ["scripts/rehearse-gamification-rollback.js", `--data-dir=${dataDir}`]);

process.stdout.write(`${JSON.stringify({ ok: true, fixtureOnly: true, dataDir, coverage: ["startup preflight", "event append", "duplicate rejection", "achievement evaluation", "XP and levels", "projections", "replay", "generation publication", "checksums", "corrections and reversals", "policy loading", "migration state", "rollback readiness"], results }, null, 2)}\n`);
