'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const adapter = require('../public/motion/motion-lab-intelligence-adapter');
const core = require('../public/motion/avatar-motion-intelligence-core');
const clipSource = fs.readFileSync(path.join(__dirname, '../public/motion/motion-spec-clip.js'), 'utf8');
const bootstrapSource = fs.readFileSync(path.join(__dirname, '../motion-lab/motion-lab-bootstrap.js'), 'utf8');

function vector(x,y,z){
  return { x,y,z, clone(){return vector(this.x,this.y,this.z);}, add(v){this.x+=v.x;this.y+=v.y;this.z+=v.z;return this;} };
}
function threeStub(){ class Vector3 { constructor(x=0,y=0,z=0){this.x=x;this.y=y;this.z=z;} } return { Vector3 }; }

test('shared Motion Lab adapter retains Phase 2 contact/root authority while evolving',()=>{
  assert.match(adapter.VERSION,/phase(2|4)/);
  assert.equal(typeof adapter.solvePhaseContacts,'function');
  assert.equal(typeof core.solveRootAnchorCorrection,'function');
});

test('stationary split contacts resolve through one root correction',()=>{
  const THREE=threeStub();
  const rootNode={ position:vector(0,0,0), getWorldPosition(){return vector(0,0,0);}, parent:null };
  const avatar={updateMatrixWorld(){}};
  const frontNode={getWorldPosition(){return vector(.08,0,0);}};
  const rearNode={getWorldPosition(){return vector(.10,0,0);}};
  const result=adapter.solvePhaseContacts({ THREE,avatar,rootNode,bodyScale:1, contacts:[ {id:'left_front_foot',node:frontNode,current:vector(.08,0,0),anchor:vector(0,0,0)}, {id:'right_rear_forefoot',node:rearNode,current:vector(.10,0,0),anchor:vector(.02,0,0)} ] });
  assert.equal(result.status,'ready');
  assert.equal(result.diagnostics.contactCount,2);
  assert.equal(result.diagnostics.firstFailure,null);
});

test('adapter fails closed on mixed-dimensional contact evidence',()=>{
  const THREE=threeStub();
  const rootNode={position:vector(0,0,0),getWorldPosition(){return vector(0,0,0);},parent:null};
  const avatar={updateMatrixWorld(){}};
  const node={getWorldPosition(){return vector(0,0,0);}};
  const result=adapter.solvePhaseContacts({THREE,avatar,rootNode,bodyScale:1,contacts:[{id:'foot',node,current:{x:0,y:0},anchor:{x:0,y:0,z:0}}]});
  assert.equal(result.status,'failed');
  assert.equal(result.code,'motion_contact_dimension_mismatch');
});

test('Motion Spec compiler routes enforced contacts through adapter and reports kinematic diagnostics',()=>{
  assert.match(clipSource,/motion-lab-intelligence-adapter/);
  assert.match(clipSource,/solvePhaseContacts/);
  assert.match(clipSource,/motion_kinematic_validation_failed/);
  assert.match(clipSource,/phaseConstraintDiagnostics/);
  assert.doesNotMatch(clipSource,/corrections\.reduce\(\(sum, item\)/);
});

test('Motion Spec compiler fails closed when declared contact intent cannot be fully resolved',()=>{
  assert.match(clipSource,/motion_contact_mapping_missing/);
  assert.match(clipSource,/motion_contact_anchor_unresolved/);
  assert.match(clipSource,/motion_phase_contact_unresolved/);
  assert.match(clipSource,/missingPhaseContacts/);
  assert.match(clipSource,/CONTACT_UNRESOLVED/);
  assert.doesNotMatch(clipSource,/if \(!match\?\.object \|\| !anchor\) continue;/);
});

test('Motion Lab loads shared core and adapter before Motion Spec compiler',()=>{
  const coreIndex=bootstrapSource.indexOf('avatar_motion_intelligence_core');
  const adapterIndex=bootstrapSource.indexOf('motion_lab_intelligence_adapter');
  const compilerIndex=bootstrapSource.indexOf('motion_spec_clip');
  assert.ok(coreIndex>=0 && adapterIndex>coreIndex && compilerIndex>adapterIndex);
});
