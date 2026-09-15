'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const THREE=require('three');
const Semantic=require('../public/motion/motion-spec-semantic-direction-policy');

function rig(){
  const avatar=new THREE.Object3D();
  const hips=new THREE.Bone();hips.name='Hips';
  const spine=new THREE.Bone();spine.name='Spine';spine.position.set(0,1,0);
  const neck=new THREE.Bone();neck.name='Neck';neck.position.set(0,.5,0);
  const head=new THREE.Bone();head.name='Head';head.position.set(0,.25,0);
  const arm=new THREE.Bone();arm.name='LeftArm';arm.position.set(.2,.15,0);
  const fore=new THREE.Bone();fore.name='LeftForeArm';fore.position.set(.3,0,0);
  avatar.add(hips);hips.add(spine);spine.add(neck);neck.add(head);spine.add(arm);arm.add(fore);avatar.updateMatrixWorld(true);
  return {avatar};
}

test('semantic targets can be limited to named phases without changing start or finish',()=>{
  const {avatar}=rig();
  const spec={
    skeleton:{rootBone:'Hips'},durationSeconds:2,
    semanticPosePolicy:{targets:[{id:'ear',type:'bone_direction_reference',bone:'LeftArm',childBone:'LeftForeArm',referenceBone:'Neck',referenceChildBone:'Head',activePhaseIds:['descent','target','hold','ascent']}]},
    phases:[
      {id:'start',normalizedTime:0,root:{positionOffset:[0,0,0],rotationOffsetEulerDegrees:[0,0,0]},boneTargets:[{bone:'LeftArm',rotationOffsetEulerDegrees:[0,0,88]}]},
      {id:'descent',normalizedTime:.2,root:{positionOffset:[0,0,0],rotationOffsetEulerDegrees:[0,0,0]},boneTargets:[{bone:'LeftArm',rotationOffsetEulerDegrees:[0,0,88]}]},
      {id:'target',normalizedTime:.4,root:{positionOffset:[0,0,0],rotationOffsetEulerDegrees:[0,0,0]},boneTargets:[{bone:'LeftArm',rotationOffsetEulerDegrees:[0,0,88]}]},
      {id:'hold',normalizedTime:.6,root:{positionOffset:[0,0,0],rotationOffsetEulerDegrees:[0,0,0]},boneTargets:[{bone:'LeftArm',rotationOffsetEulerDegrees:[0,0,88]}]},
      {id:'ascent',normalizedTime:.8,root:{positionOffset:[0,0,0],rotationOffsetEulerDegrees:[0,0,0]},boneTargets:[{bone:'LeftArm',rotationOffsetEulerDegrees:[0,0,88]}]},
      {id:'finish',normalizedTime:1,root:{positionOffset:[0,0,0],rotationOffsetEulerDegrees:[0,0,0]},boneTargets:[{bone:'LeftArm',rotationOffsetEulerDegrees:[0,0,88]}]}
    ]
  };
  const out=Semantic.buildPhaseSpecificSpec(THREE,spec,avatar);
  assert.equal(out.status,'ready');
  const arm=phase=>out.spec.phases.find(x=>x.id===phase).boneTargets.find(x=>x.bone==='LeftArm').rotationOffsetEulerDegrees;
  assert.deepEqual(arm('start'),[0,0,88]);
  assert.deepEqual(arm('finish'),[0,0,88]);
  for(const id of ['descent','target','hold','ascent'])assert.notDeepEqual(arm(id),[0,0,88],id);
  assert.equal(out.diagnostics.solvedPhaseCount,4);
  assert.deepEqual([...new Set(out.diagnostics.phaseRecords.map(x=>x.phaseId))],['descent','target','hold','ascent']);
});
