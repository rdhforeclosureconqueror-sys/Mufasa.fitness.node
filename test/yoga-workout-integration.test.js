"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");

const ROOT = path.join(__dirname, "..");
const source = (file) => fs.readFileSync(path.join(ROOT, file), "utf8");

require("../public/yoga-workout-runtime.js");
const runtime = global.YogaWorkoutRuntime;
const session = {
  id: "beginner-flow", name: "Beginner Full-Body Flow",
  steps: [
    { poseId: "mountain", name: "Mountain", holdSeconds: 30, restSeconds: 15, transition: "Stand tall." },
    { poseId: "warrior-ii", name: "Warrior II", holdSeconds: 30, restSeconds: 15, transition: "Turn the feet." }
  ]
};

test("Yoga Start Session persists canonical active workout state and launches Train", () => {
  const yoga = source("public/yoga.js");
  assert.match(yoga, /mufasa\.activeWorkout\.v1/);
  assert.match(yoga, /workoutType:"yoga"/);
  assert.match(yoga, /location\.assign\(`\/workout\.html\?yogaSession=/);
  assert.match(yoga, /Start Session in Train/);
});

test("Yoga execution state restores pose and movement definition after refresh", () => {
  const storage = { value: null, getItem() { return this.value; }, setItem(_key, value) { this.value = value; } };
  const initial = runtime.stateFromSession(session);
  runtime.writeState(initial, storage);
  assert.equal(runtime.readState(storage).sessionId, "beginner-flow");
  assert.equal(runtime.readState(storage).workoutType, "yoga");
  const advanced = runtime.stateFromSession(session, { ...initial, currentPoseIndex: 1 });
  assert.equal(advanced.poseId, "warrior-ii");
  assert.equal(advanced.movementDefinitionId, "warrior-ii");
  assert.equal(advanced.holdSeconds, 30);
});

test("Train selector and execution UI expose canonical Yoga sessions without a second camera stack", () => {
  const html = source("public/workout.html");
  const js = source("public/yoga-workout-runtime.js");
  assert.match(js, /\/api\/yoga\/catalogue/);
  assert.match(js, /option\.value = `yoga:\$\{item\.id\}`/);
  assert.match(html, /id="yogaExecutionPanel"/);
  assert.match(html, /Connect Camera/);
  assert.match(js, /pose-runtime:frame/);
  assert.doesNotMatch(js, /getUserMedia|createDetector|estimatePoses/);
});

test("Warrior II uses shared BodyFrame rules, avatar target, visible coaching, and hold tracking", () => {
  const js = source("public/yoga-workout-runtime.js");
  assert.match(js, /PocketPTBodyIntelligence\.adaptMoveNet/);
  assert.match(js, /PocketPTBodyIntelligence\.evaluateMovement/);
  assert.match(js, /avatarPose\(definition\)/);
  assert.match(js, /targetBodyFrame\(definition\)/);
  assert.match(js, /createHoldTracker/);
  assert.match(js, /yogaWarningJoints/);
  assert.match(js, /yogaPrimaryCue/);
  assert.match(source("data/movements/warrior-ii.v1.json"), /Bend your front knee a little more/);
  assert.match(source("data/movements/warrior-ii.v1.json"), /Keep your arms level with your shoulders/);
});

test("Yoga supports camera-disabled progression and persists completion through Yoga contract", () => {
  const js = source("public/yoga-workout-runtime.js");
  assert.match(js, /cameraActive/);
  assert.match(js, /Camera off · guided hold/);
  assert.match(js, /\/api\/yoga\/sessions\/complete/);
  assert.match(js, /mufasa:gamification-refresh/);
  assert.match(js, /localStorage\.removeItem\(STORAGE_KEY\)/);
});

test("fitness workout selection and rep engine remain in place", () => {
  const html = source("public/workout.html");
  assert.match(html, /pilot_bodyweight_squat/);
  assert.match(html, /pilot_push_up/);
  assert.match(html, /pilot_lunge/);
  assert.match(html, /function buildCanonicalWorkoutSelection/);
  assert.match(html, /rep-runtime\.js/);
});
