'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),out=path.join(root,'public/game/rugby-hq');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
test('exported assets match recorded hashes and binary formats',()=>{
 const manifest=JSON.parse(read('public/game/rugby-hq/build-manifest.json'));
 assert.equal(manifest.threads,false);
 for(const [name,expected]of Object.entries(manifest.files)){const b=fs.readFileSync(path.join(out,name));assert.equal(b.length,expected.bytes,name);assert.equal(crypto.createHash('sha256').update(b).digest('hex'),expected.sha256,name);}
 assert.equal(fs.readFileSync(path.join(out,'index.wasm')).subarray(0,4).toString('hex'),'0061736d');
 assert.equal(fs.readFileSync(path.join(out,'index.pck')).subarray(0,4).toString(),'GDPC');
});
test('existing navigation survives and browser game has loading/focus/error controls',()=>{
 assert.match(read('public/community-hub.html'),/href="\/rugby.html"/);
 const landing=read('public/rugby.html');assert.match(landing,/href="\/game\/rugby-hq\/index.html">PLAY RUGBY HQ/);assert.match(landing,/href="\/rugby-player.html"/);
 const shell=read('public/game/rugby-hq/index.html');
 for(const marker of ['requestFullscreen','preventDefault','canvas.focus','onProgress','onPrintError','Back to Rugby HQ'])assert.ok(shell.includes(marker),marker);
 assert.ok(!shell.includes('$GODOT_CONFIG'));
});
test('production package excludes editor-only tools and native dependencies',()=>{
 const config=read('godot/rugby-hq-web/project.godot');assert.ok(!/C#|\[dotnet\]|\[editor_plugins\]/.test(config));
 const b=fs.readFileSync(path.join(out,'index.pck'));assert.equal(b.readUInt32LE(4),3);let offset=Number(b.readBigUInt64LE(32));const count=b.readUInt32LE(offset);offset+=4;const paths=[];for(let i=0;i<count;i++){const length=b.readUInt32LE(offset);offset+=4;paths.push(b.subarray(offset,offset+length).toString('utf8').replaceAll(String.fromCharCode(0),''));offset+=length+36;}const pack=paths.join('\n');
 for(const unwanted of ['addons/gut/','addons/godot_mcp','virtual_joystick_cf_plugin.gd','.csproj','.backup-'])assert.ok(!pack.includes(unwanted),unwanted);
 assert.ok(pack.includes('playbook/playbook_arena'),'Playbook dependencies exported');
 assert.ok(pack.includes('scripts/game/rugby_decision_telemetry'),'Training dependency exported');
});
test('mobile restart is visible and wired; pass rejection explains why',()=>{
 const scene=read('godot/rugby-hq-web/scenes/training_drill.tscn');
 const logic=read('godot/rugby-hq-web/scripts/game/training_drill.gd');
 assert.match(logic,/restart.name = "RestartButton"/);
 assert.match(logic,/restart.pressed.connect\(_reset_drill\)/);
 assert.match(logic,/Play ended\. Tap RESTART/);
 assert.match(logic,/Ball in flight\. Wait for the catch/);
 assert.match(logic,/event is InputEventScreenTouch/);
 assert.match(logic,/\$HUD\/PassButton.get_global_rect\(\).has_point\(event.position\)/);
 assert.match(logic,/\$HUD\/RestartButton.get_global_rect\(\).has_point\(event.position\)/);
 assert.match(logic,/event is InputEventMouseButton and event.device == -1/);
 assert.match(logic,/_release_pass_gesture\("touch"\)/);
});

test('synchronized tactical simulation has no obsolete scoring override',()=>{
 const arena=read('godot/rugby-hq-web/playbook/playbook_arena.gd');
 assert.ok(!arena.includes('reaction_solution'));
 assert.match(arena,/ball_carrier.position.z <= DRILL_TRY_LINE/);
 assert.match(arena,/opponent.position.distance_to\(ball_carrier.position\) < TOUCH_DISTANCE/);
 assert.match(arena,/attack_gap < defense_gap/);
 assert.match(read('godot/rugby-hq-web/export_presets.cfg'),/variant\/thread_support=false/);
});
