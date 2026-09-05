'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
function fresh(){const p=require.resolve('../public/mirror-motion-phase17');delete require.cache[p];return require(p);}
function kp(name,x,y,confidence=.95){return{name,x,y,confidence};}
function packet({shoulderY=100,hipY=200,wristY=180,ankleY=420,shoulderX=200,hipX=200,wristX=200,ankleX=200,pattern='pushup',confidence=.95}={}){return{exerciseContext:{pattern},keypoints:[kp('left_shoulder',shoulderX-30,shoulderY,confidence),kp('right_shoulder',shoulderX+30,shoulderY,confidence),kp('left_hip',hipX-25,hipY,confidence),kp('right_hip',hipX+25,hipY,confidence),kp('left_wrist',wristX-25,wristY,confidence),kp('right_wrist',wristX+25,wristY,confidence),kp('left_ankle',ankleX-20,ankleY,confidence),kp('right_ankle',ankleX+20,ankleY,confidence)]};}
function learnStanding(p){for(let i=0;i<8;i++)p.process(packet());}
function plankPacket(){return packet({shoulderX:310,hipX:200,hipY:250,wristY:390,ankleY:260,ankleX:430});}
function advanceToPlank(p){for(const expected of ['HINGE','CROUCH','HANDS_DOWN','PLANK_STABLE']){for(let i=0;i<3;i++)p.process(plankPacket());assert.equal(p.diagnostics().phase,expected);}}

test('Phase 17 requires a learned standing baseline before activating transition intent',()=>{const p=fresh();const out=p.process(packet({hipY:245,shoulderX:250,hipX:200,wristY:330}));assert.equal(out.floorTransitionIntent.active,false);assert.equal(out.floorTransitionIntent.standingBaselineReady,false);});

test('Phase 17 publishes trustworthy nonzero confidence from original core landmarks',()=>{const p=fresh();learnStanding(p);const out=p.process(packet({shoulderX:260,hipX:200,wristY:220,hipY:205,confidence:.82}));assert.ok(out.floorTransitionIntent.confidence>.8);assert.ok(out.floorTransitionIntent.confidence<=.82);});

test('Phase 17 does not mistake a forward hinge for hands-down floor acquisition',()=>{const p=fresh();learnStanding(p);for(let i=0;i<3;i++)p.process(packet({shoulderX:260,hipX:200,wristY:220,hipY:205}));const d=p.diagnostics();assert.equal(d.phase,'HINGE');assert.notEqual(d.phase,'HANDS_DOWN');});

test('Phase 17 requires consecutive evidence and traverses transition states sequentially',()=>{const p=fresh();learnStanding(p);const deep=plankPacket();for(let i=0;i<2;i++)p.process(deep);assert.equal(p.diagnostics().phase,'STANDING');p.process(deep);assert.equal(p.diagnostics().phase,'HINGE');for(let i=0;i<3;i++)p.process(deep);assert.equal(p.diagnostics().phase,'CROUCH');for(let i=0;i<3;i++)p.process(deep);assert.equal(p.diagnostics().phase,'HANDS_DOWN');for(let i=0;i<3;i++)p.process(deep);assert.equal(p.diagnostics().phase,'PLANK_STABLE');});

test('Phase 17 freezes standing baseline after required calibration samples',()=>{const p=fresh();learnStanding(p);const before=p.diagnostics().standingHipY;for(let i=0;i<20;i++)p.process(packet({hipY:206}));const after=p.diagnostics().standingHipY;assert.equal(after,before);assert.equal(p.diagnostics().standingSamples,8);});

test('Phase 17 reverses direction one state at a time on return toward standing',()=>{const p=fresh();learnStanding(p);advanceToPlank(p);for(const expected of ['HANDS_DOWN','CROUCH','HINGE','STANDING']){for(let i=0;i<3;i++)p.process(packet());const d=p.diagnostics();assert.equal(d.phase,expected);assert.equal(d.direction,'UP');}});

test('Phase 17 stays inactive outside explicit push-up context, including UNKNOWN',()=>{const p=fresh();for(const pattern of ['jumping_jack','UNKNOWN']){const out=p.process(packet({pattern}));assert.equal(out.floorTransitionIntent.active,false);assert.equal(out.floorTransitionIntent.phase,'INACTIVE');}const d=p.diagnostics();assert.equal(d.avatarRootAuthority,false);assert.equal(d.measuredDepthAuthority,false);assert.equal(d.livePoseAuthority,true);});
