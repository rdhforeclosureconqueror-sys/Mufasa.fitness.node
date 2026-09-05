'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
function fresh(){const p=require.resolve('../public/mirror-motion-phase17');delete require.cache[p];return require(p);}
function kp(name,x,y,confidence=.95){return{name,x,y,confidence};}
function packet({shoulderY=100,hipY=200,wristY=180,ankleY=420,shoulderX=200,hipX=200,wristX=200,ankleX=200,pattern='pushup'}={}){return{exerciseContext:{pattern},keypoints:[kp('left_shoulder',shoulderX-30,shoulderY),kp('right_shoulder',shoulderX+30,shoulderY),kp('left_hip',hipX-25,hipY),kp('right_hip',hipX+25,hipY),kp('left_wrist',wristX-25,wristY),kp('right_wrist',wristX+25,wristY),kp('left_ankle',ankleX-20,ankleY),kp('right_ankle',ankleX+20,ankleY)]};}
function learnStanding(p){for(let i=0;i<8;i++)p.process(packet());}

test('Phase 17 requires a learned standing baseline before activating transition intent',()=>{const p=fresh();const out=p.process(packet({hipY:245,shoulderX:250,hipX:200,wristY:330}));assert.equal(out.floorTransitionIntent.active,false);assert.equal(out.floorTransitionIntent.standingBaselineReady,false);});

test('Phase 17 does not mistake a forward hinge for hands-down floor acquisition',()=>{const p=fresh();learnStanding(p);for(let i=0;i<3;i++)p.process(packet({shoulderX:260,hipX:200,wristY:220,hipY:205}));const d=p.diagnostics();assert.equal(d.phase,'HINGE');assert.notEqual(d.phase,'HANDS_DOWN');});

test('Phase 17 requires consecutive evidence to advance into crouch and hands-down',()=>{const p=fresh();learnStanding(p);for(let i=0;i<2;i++)p.process(packet({shoulderX:260,hipX:200,hipY:240,wristY:340}));assert.equal(p.diagnostics().phase,'STANDING');p.process(packet({shoulderX:260,hipX:200,hipY:240,wristY:340}));assert.equal(p.diagnostics().phase,'CROUCH');for(let i=0;i<3;i++)p.process(packet({shoulderX:270,hipX:200,hipY:250,wristY:390,ankleY:420}));assert.equal(p.diagnostics().phase,'HANDS_DOWN');});

test('Phase 17 recognizes a stable horizontal plank only after hysteresis',()=>{const p=fresh();learnStanding(p);for(let i=0;i<3;i++)p.process(packet({shoulderX:310,hipX:200,hipY:250,wristY:390,ankleY:260,ankleX:430}));assert.equal(p.diagnostics().phase,'PLANK_STABLE');});

test('Phase 17 reverses direction cleanly on return toward standing',()=>{const p=fresh();learnStanding(p);for(let i=0;i<3;i++)p.process(packet({shoulderX:310,hipX:200,hipY:250,wristY:390,ankleY:260,ankleX:430}));assert.equal(p.diagnostics().phase,'PLANK_STABLE');for(let i=0;i<3;i++)p.process(packet());const d=p.diagnostics();assert.equal(d.phase,'STANDING');assert.equal(d.direction,'UP');});

test('Phase 17 stays inactive outside push-up context and preserves review-first authority',()=>{const p=fresh();const out=p.process(packet({pattern:'jumping_jack'}));assert.equal(out.floorTransitionIntent.active,false);const d=p.diagnostics();assert.equal(d.avatarRootAuthority,false);assert.equal(d.measuredDepthAuthority,false);assert.equal(d.livePoseAuthority,true);});
