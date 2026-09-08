"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const ROOT=path.resolve(__dirname,"..");
const read=file=>fs.readFileSync(path.join(ROOT,file),"utf8");
const bootstrap=read("motion-lab/motion-lab-bootstrap.js");
const loader=read("public/motion/shared3d-loader.js");

test("Motion Lab retries protected script dependencies once with a cache-busted URL",()=>{
  assert.match(bootstrap,/motion_lab_retry=/);
  assert.match(bootstrap,/if \(attempt === 1\) \{ load\(withRetryToken\(src\)\); return; \}/);
  assert.match(bootstrap,/error\.source=src/);
  assert.match(bootstrap,/error\.attempts=attempt/);
});

test("Motion Lab exposes the exact first failing stage and source",()=>{
  assert.match(bootstrap,/PocketPTMotionLabBootstrapDiagnostics/);
  assert.match(bootstrap,/First failing stage:/);
  assert.match(bootstrap,/Source:/);
  assert.match(bootstrap,/shared_3d_loader/);
  assert.match(bootstrap,/boundary_retry/);
  assert.match(bootstrap,/runtime_initialize/);
});

test("Motion Lab cannot report recovered unless MotionViewerBoundary actually reaches ready",()=>{
  assert.match(bootstrap,/boundary\.getStatus\?\.\(\) !== "ready"/);
  assert.match(bootstrap,/motion_viewer_boundary_failed/);
  assert.match(bootstrap,/boundaryError\.stage="boundary_retry"/);
  assert.match(bootstrap,/boundaryError\.source="MotionViewerBoundary"/);
  assert.match(bootstrap,/loaded=false/);
});

test("local Three and GLTF module imports receive one browser-only cache-busted retry",()=>{
  assert.match(loader,/async function importLocalModule/);
  assert.match(loader,/motion_lab_retry=/);
  assert.match(loader,/options\.importModule \|\| options\.retryOnFailure === false/);
  assert.match(loader,/dependency: "three"/);
  assert.match(loader,/dependency: "gltf_loader"/);
  assert.match(loader,/attemptedUrls/);
});

test("custom import seams remain deterministic for existing unit tests",()=>{
  assert.match(loader,/if \(options\.importModule \|\| options\.retryOnFailure === false\) throw firstError/);
});
