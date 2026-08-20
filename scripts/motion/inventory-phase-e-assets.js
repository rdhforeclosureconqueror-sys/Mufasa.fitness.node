#!/usr/bin/env node
"use strict";
const fs = require("node:fs"), crypto = require("node:crypto"), { execFileSync } = require("node:child_process"), path = require("node:path");
const root = path.resolve(__dirname, "../..");
const sources = ["exercise-generation/3dmode/Ch18_nonPBR.fbx", "exercise-generation/3dmode/Silly Dancing.fbx"];
function inspect(relative) {
  const absolute = path.join(root, relative), data = fs.readFileSync(absolute);
  if (!data.subarray(0, 18).toString("ascii").startsWith("Kaydara FBX Binary")) throw new Error(`${relative}: unsupported FBX encoding`);
  const strings = execFileSync("strings", ["-a", absolute], { encoding: "utf8", maxBuffer: 32 * 1024 * 1024 });
  const bones = [...new Set(strings.match(/mixamorig:[A-Za-z0-9_]+/g) || [])].sort();
  return { source: relative, bytes: data.length, sha256: crypto.createHash("sha256").update(data).digest("hex"), binaryFbxVersion: data.readUInt32LE(23), boneNames: bones, boneCount: bones.length, hasDeformer: /Deformer/.test(strings), hasAnimationStack: /AnimationStack|FbxAnimStack/.test(strings), mixamoMotionSequence: /Motion Sequence; 1 motions/.test(strings) };
}
const assets = sources.map(inspect), sameBones = JSON.stringify(assets[0].boneNames) === JSON.stringify(assets[1].boneNames);
const report = { classification: sameBones && assets.every(x => x.hasDeformer && x.hasAnimationStack) ? "COMPATIBLE" : "NONCOMPATIBLE", limitation: "Binary string inventory proves shared named hierarchy markers, deformers, and animation stacks; Blender conversion/validation must verify bind transforms, axes, scale, influences, and deformation.", assets };
process.stdout.write(JSON.stringify(report, null, 2) + "\n");
if (report.classification === "NONCOMPATIBLE") process.exitCode = 1;
