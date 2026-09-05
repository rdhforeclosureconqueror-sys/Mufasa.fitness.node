'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
function fresh(){const p=require.resolve('../public/mirror-motion-phase18');delete require.cache[p];return require(p);}

test('Phase 18 does not assist stable endpoints',()=>{const p=fresh();const solver={rootRestPosition:{y:0},rootTargetPosition:{y:-.2}};assert.equal(p.applyToSolver(solver,{active:true,phase:'PLANK_STABLE',progress01:1,confidence:.95,livePoseAuthority:true,measuredDepth:false}),true);assert.equal(solver.rootTargetPosition.y,-.2);});

test('Phase 18 rejects low-confidence and measured-depth claims',()=>{const p=fresh();const a={rootRestPosition:{y:0},rootTargetPosition:{y:-.05}};p.applyToSolver(a,{active:true,phase:'CROUCH',progress01:.6,confidence:.2,livePoseAuthority:true,measuredDepth:false});assert.equal(a.rootTargetPosition.y,-.05);const b={rootRestPosition:{y:0},rootTargetPosition:{y:-.05}};p.applyToSolver(b,{active:true,phase:'CROUCH',progress01:.6,confidence:.95,livePoseAuthority:true,measuredDepth:true});assert.equal(b.rootTargetPosition.y,-.05);});

test('Phase 18 applies bounded partial root-Y assistance during transition',()=>{const p=fresh();const solver={rootRestPosition:{y:0},rootTargetPosition:{y:-.05}};p.applyToSolver(solver,{active:true,phase:'CROUCH',progress01:.7,confidence:.95,livePoseAuthority:true,measuredDepth:false});assert.ok(solver.rootTargetPosition.y<-.05);assert.ok(Math.abs(solver.floorTransitionAssistAppliedY)<=p.DEFAULTS.maxAssistY+1e-12);});

test('Phase 18 never exceeds max assist even when guide is far away',()=>{const p=fresh();const solver={rootRestPosition:{y:0},rootTargetPosition:{y:.3}};p.applyToSolver(solver,{active:true,phase:'HANDS_DOWN',progress01:1,confidence:.99,livePoseAuthority:true,measuredDepth:false});assert.equal(Math.abs(solver.floorTransitionAssistAppliedY),p.DEFAULTS.maxAssistY);});

test('Phase 18 diagnostics preserve live pose authority and no measured depth',()=>{const p=fresh();const d=p.diagnostics();assert.equal(d.livePoseAuthority,true);assert.equal(d.measuredDepthAuthority,false);assert.equal(d.avatarRootAuthority,true);assert.match(p.diagnosticsText(),/bounded transition assist only/);});