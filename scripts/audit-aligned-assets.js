#!/usr/bin/env node
'use strict';

const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const root = path.resolve(process.argv[2] || '_reference/aligned-yoga/imported');
const files = [];
function walk(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.isFile()) files.push({ full, relative: path.relative(root, full), size: fs.statSync(full).size });
  }
}
walk(root);
// Three pre-existing Greatness images remain web-served pending a dedicated
// replacement review; include them so this remains a complete import audit.
for (const name of ['stepintograteness1.jpg', 'stepintograteness2.jpg', 'stepintograteness3.jpg']) {
  const full = path.resolve('public/new', name);
  if (fs.existsSync(full)) files.push({ full, relative: name, size: fs.statSync(full).size });
}

const extensionCategory = (name) => {
  if (/_keypoints.*\.json$/i.test(name)) return 'KEYPOINT_DATA';
  if (/(environment|requirements|env\.yml)/i.test(name)) return 'ENVIRONMENTS';
  if (/\.(avi|mp4|mov|m4a)$/i.test(name)) return 'VIDEOS';
  if (/\.(png|jpe?g|svg|gif)$/i.test(name)) return 'IMAGES';
  if (/\.(ipynb)$/i.test(name)) return 'NOTEBOOKS';
  if (/\.(py|js|html|css)$/i.test(name)) return 'SOURCE_CODE';
  if (/\.(csv|pickle|db)$/i.test(name)) return 'TRAINING_DATA';
  if (/\.(md|rst|txt|pdf)$/i.test(name)) return 'REFERENCE_DOCUMENTATION';
  if (/\.(pyc|doctree)$/i.test(name)) return 'GENERATED_OUTPUT';
  return 'UNKNOWN';
};

const categories = {};
const hashes = new Map();
for (const file of files) {
  const category = extensionCategory(file.relative);
  categories[category] ||= { fileCount: 0, bytes: 0 };
  categories[category].fileCount += 1;
  categories[category].bytes += file.size;
  const hash = crypto.createHash('sha256').update(fs.readFileSync(file.full)).digest('hex');
  if (!hashes.has(hash)) hashes.set(hash, []);
  hashes.get(hash).push(file.relative);
}

const sequences = {};
let keypointBytes = 0;
let invalidJson = 0;
for (const file of files.filter((item) => /_keypoints.*\.json$/i.test(item.relative))) {
  keypointBytes += file.size;
  const base = path.basename(file.relative).replace(/_\d{12}_keypoints.*\.json$/i, '');
  const pose = base.split('_')[0].toLowerCase();
  const label = /incorrect/i.test(base) ? 'incorrect' : /back/i.test(base) ? 'back_view' : 'unqualified';
  const sequence = sequences[pose] ||= { files: 0, validPersonFrames: 0, emptyFrames: 0, people: {}, confidences: [], labels: {} };
  sequence.files += 1;
  sequence.labels[label] = (sequence.labels[label] || 0) + 1;
  try {
    const json = JSON.parse(fs.readFileSync(file.full, 'utf8'));
    const people = Array.isArray(json.people) ? json.people : [];
    sequence.people[people.length] = (sequence.people[people.length] || 0) + 1;
    if (!people.length) sequence.emptyFrames += 1;
    else sequence.validPersonFrames += 1;
    for (const person of people) {
      const values = person.pose_keypoints_2d || person.pose_keypoints || [];
      for (let i = 2; i < values.length; i += 3) if (Number.isFinite(values[i])) sequence.confidences.push(values[i]);
    }
  } catch { invalidJson += 1; }
}
for (const sequence of Object.values(sequences)) {
  sequence.avgKeypointConfidence = sequence.confidences.length
    ? Number((sequence.confidences.reduce((sum, value) => sum + value, 0) / sequence.confidences.length).toFixed(4)) : null;
  delete sequence.confidences;
}

const report = {
  generatedAt: new Date().toISOString(), root: path.relative(process.cwd(), root),
  total: { fileCount: files.length, bytes: files.reduce((sum, file) => sum + file.size, 0) },
  categories, keypoints: { schema: 'OpenPose 1.2 BODY_25 (version field 1.2; 25 x/y/confidence triples)', fileCount: Object.values(sequences).reduce((n, item) => n + item.files, 0), bytes: keypointBytes, invalidJson, sequences },
  duplicates: [...hashes.values()].filter((paths) => paths.length > 1),
  largestFiles: files.sort((a, b) => b.size - a.size).slice(0, 20).map(({ relative, size }) => ({ path: relative, bytes: size })),
  files: files.sort((a, b) => a.relative.localeCompare(b.relative)).map((file) => {
    const category = extensionCategory(file.relative);
    const action = ['GENERATED_OUTPUT', 'IMAGES', 'VIDEOS', 'ENVIRONMENTS'].includes(category) ? 'DELETE_CANDIDATE'
      : ['KEYPOINT_DATA', 'SOURCE_CODE'].includes(category) ? 'EXTRACT_THEN_ARCHIVE'
        : ['REFERENCE_DOCUMENTATION', 'NOTEBOOKS'].includes(category) ? 'KEEP_REFERENCE' : 'NEEDS_REVIEW';
    return { path: file.relative, bytes: file.size, category, productionValue: 'reference only', licenseStatus: 'reference_only', recommendedAction: action };
  }),
};
process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
