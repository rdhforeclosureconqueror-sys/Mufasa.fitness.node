"use strict";
const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const root = path.resolve(__dirname, "..");
const read = file => fs.readFileSync(path.join(root, file), "utf8");

function labHarness() {
  const buttons = new Map([...read("motion-lab/index.html").matchAll(/id="([^"]+)"/g)].map(match => [match[1], { disabled:true }]));
  buttons.delete("stages"); // Control tests do not need the diagnostic table renderer.
  const document = { getElementById:id => buttons.get(id), querySelectorAll:() => [], addEventListener(){}, removeEventListener(){} };
  const sessions = [];
  const env = { document, addEventListener(){}, removeEventListener(){}, performance, navigator:{},
    PocketPTPushUpMotionSpec:require("../public/motion/push-up-motion-spec"),
    PocketPTSquatMotionSpec:require("../public/motion/squat-motion-spec"),
    PocketPTAvatarProfiles:require("../public/motion/avatar-profiles"),
    PocketPTMotionSpecClip:{},
    PocketPTDisposableMotionSession:{ createMotionSession() {
      let playback = "unloaded";
      const session = { state:"created", calls:[],
        async start(){this.state="running";return {status:"ready"};},
        async loadAvatar(profile){playback="unloaded";return {status:"ready",diagnostics:{avatarProfileId:profile.avatarId,boneCount:65,skinnedMeshCount:1}};},
        loadMotionSpec(spec){this.calls.push(spec.motionId);playback="ready";return {status:"ready",diagnostics:{motionId:spec.motionId,trackCount:12,unboundTargetCount:0}};},
        playbackDiagnostics(){return {state:playback};},
        play(){if(playback==="unloaded")return {status:"failed",code:"animation_required"};playback="playing";return {status:playback};},
        pause(){playback="paused";return {status:playback};},
        unloadAvatar(){playback="unloaded";return {status:"ready"};},
        dispose(){this.state="disposed";playback="unloaded";}
      };
      sessions.push(session);return session;
    }}
  };
  vm.runInNewContext(read("motion-lab/motion-lab-runtime.js"), env);
  const lab = env.MotionLabRuntime;
  lab.mount({replaceChildren(){}});lab.initialize();
  return {env,lab,buttons,sessions};
}

test("squat dependency uses the protected Motion Lab graph before runtime", () => {
  const bootstrap = read("motion-lab/motion-lab-bootstrap.js");
  const position = bootstrap.indexOf("/dev/motion-lab-assets/squat-motion-spec.js");
  assert.ok(position >= 0 && position < bootstrap.indexOf("/dev/motion-lab-runtime.js"));
  assert.match(read("motion-lab/index.html"), /Load Synthesized Squat v1 \(Reference Only\)/);
  assert.doesNotMatch(bootstrap, /PocketPTPushUpMotionSpec\s*=/);
});

test("squat selects its own contract without autoplay or changing push-up identity", async () => {
  const {env,lab,buttons,sessions} = labHarness();
  const pushUp = env.PocketPTPushUpMotionSpec;
  assert.equal(buttons.get("loadSynthesizedSquat").disabled, true);
  await lab.loadAvatar(env.PocketPTAvatarProfiles.profiles.reference);
  assert.equal(buttons.get("loadSynthesizedSquat").disabled, false);
  assert.equal((await buttons.get("loadSynthesizedSquat").onclick()).status, "ready");
  assert.equal(lab.snapshot().motion.motionId, "squat/synthesized_engineering_v1");
  assert.equal(lab.snapshot().playback, "ready");
  assert.equal(env.PocketPTPushUpMotionSpec, pushUp);
  await lab.loadPushUp();
  assert.deepEqual(sessions[0].calls, ["squat/synthesized_engineering_v1","push_up_engineering_reference_v1"]);
});

test("squat restores the compatible reference avatar and failed loads cannot enable playback", async () => {
  const {env,lab,buttons,sessions} = labHarness();
  await lab.loadAvatar(env.PocketPTAvatarProfiles.profiles.reference);
  await lab.loadSynthesizedSquat();
  await lab.loadAvatar(env.PocketPTAvatarProfiles.profiles.personalized);
  assert.equal(buttons.get("loadSynthesizedSquat").disabled, false);
  assert.equal(buttons.get("loadPushUp").disabled, true);
  assert.equal((await lab.loadSynthesizedSquat()).status, "ready");
  assert.equal(lab.snapshot().motion.avatarProfileId, "phase-e-reference");
  assert.equal(lab.snapshot().playback, "ready");
  sessions[0].loadAvatar = async () => ({status:"failed",code:"asset_missing"});
  await lab.loadAvatar(env.PocketPTAvatarProfiles.profiles.reference);
  assert.equal((await lab.loadSynthesizedSquat()).code, "asset_missing");
  assert.equal(buttons.get("playAnimation").disabled, true);
  lab.stop();
  assert.equal(buttons.get("loadSynthesizedSquat").disabled, true);
  buttons.get("playAnimation").onclick();
  assert.equal(lab.snapshot().motion, null);
  assert.equal(lab.snapshot().playback, "stopped");
});

test("an avatar request finishing after Stop cannot revive the old selection", async () => {
  const {env,lab,buttons,sessions} = labHarness();
  await lab.start();
  let release;
  sessions[0].loadAvatar = () => new Promise(resolve => { release=resolve; });
  const loading = lab.loadSynthesizedSquat();
  lab.stop();release({status:"ready",diagnostics:{avatarProfileId:"phase-e-reference"}});
  assert.equal((await loading).code, "session_aborted");
  assert.equal(buttons.get("loadSynthesizedSquat").disabled, true);
  assert.equal(lab.snapshot().motion, null);
  assert.deepEqual(sessions[0].calls, []);
});
