(function (root, factory) {
  const contract = typeof module === 'object' && module.exports ? require('./pose-observation-v2') : root.PocketPTPoseObservationV2;
  const api = factory(contract);
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PocketPTPoseEngineComparison = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function (contract) {
  'use strict';

  const CHECK_ORDER = Object.freeze([
    'contract','camera','movenet_model','mediapipe_model','movenet_frame','mediapipe_frame',
    'movenet_contract','mediapipe_contract','legacy_projection','authority_boundary'
  ]);

  function blankEngine(id) {
    return { id, ready:false, frames:0, failures:0, lastInferenceMs:null, inferenceSamples:[], lastObservation:null, lastError:null };
  }
  function average(values) { return values.length ? values.reduce((sum,value)=>sum+value,0)/values.length : null; }
  function percentile(values, fraction) {
    if (!values.length) return null;
    const sorted=[...values].sort((a,b)=>a-b);
    return sorted[Math.min(sorted.length-1,Math.floor((sorted.length-1)*fraction))];
  }
  function observedCount(observation) { return Object.values(observation?.landmarks||{}).filter(point=>point?.provenance===contract.PROVENANCE.OBSERVED_MODEL).length; }
  function legacyObservedCount(observation) { return contract.LEGACY_17.filter(name=>observation?.landmarks?.[name]?.provenance===contract.PROVENANCE.OBSERVED_MODEL).length; }
  function evidenceSummary(observation) {
    const landmarkNames=Object.keys(observation?.landmarks||{}),worldNames=Object.keys(observation?.worldLandmarks||{});
    return Object.freeze({
      detector:observation?.model?.detector||null, model:observation?.model?.id||null,
      landmarkCount:landmarkNames.length, observedCount:observedCount(observation), legacy17Observed:legacyObservedCount(observation),
      detailedHandsFeetObserved:['left_pinky','right_pinky','left_index','right_index','left_thumb','right_thumb','left_heel','right_heel','left_foot_index','right_foot_index'].filter(name=>observation?.landmarks?.[name]?.provenance===contract.PROVENANCE.OBSERVED_MODEL).length,
      worldLandmarkCount:worldNames.length, worldDepthMeasured:observation?.worldCoordinates?.measuredDepth===true,
      detectorConfidence:Number(observation?.confidence?.detector||0)
    });
  }

  function createComparisonState() {
    const state={cameraReady:false,running:false,contractReady:Boolean(contract?.SCHEMA_VERSION===2),moveNet:blankEngine('MoveNet'),mediaPipe:blankEngine('MediaPipe'),lastUpdatedAt:null};
    function setReady(engineId,ready=true){state[engineId].ready=Boolean(ready);state.lastUpdatedAt=new Date().toISOString();}
    function setCamera(ready){state.cameraReady=Boolean(ready);state.lastUpdatedAt=new Date().toISOString();}
    function setRunning(running){state.running=Boolean(running);state.lastUpdatedAt=new Date().toISOString();}
    function record(engineId,observation,inferenceMs){const engine=state[engineId];if(!engine)throw new TypeError(`unknown comparison engine: ${engineId}`);const validation=contract.validate(observation);if(!validation.ok){engine.failures+=1;engine.lastError=`${validation.firstFailure}: ${validation.detail}`;return validation;}engine.frames+=1;engine.lastObservation=observation;engine.lastInferenceMs=Number(inferenceMs)||0;engine.inferenceSamples.push(engine.lastInferenceMs);if(engine.inferenceSamples.length>180)engine.inferenceSamples.shift();engine.lastError=null;state.lastUpdatedAt=new Date().toISOString();return validation;}
    function fail(engineId,error){const engine=state[engineId];if(engine){engine.failures+=1;engine.lastError=String(error?.message||error||'unknown_error');}state.lastUpdatedAt=new Date().toISOString();}
    function checks(){const move=state.moveNet.lastObservation,media=state.mediaPipe.lastObservation,moveValidation=move?contract.validate(move):null,mediaValidation=media?contract.validate(media):null;const projection=media?contract.projectLegacy17(media):null,authority=projection?contract.assertAuthoritativeProjection(projection):null;return Object.freeze([
      {id:'contract',ok:state.contractReady,detail:`PoseObservationV${contract?.SCHEMA_VERSION||'missing'}`},
      {id:'camera',ok:state.cameraReady,detail:state.cameraReady?'one lab camera source ready':'camera not started'},
      {id:'movenet_model',ok:state.moveNet.ready,detail:state.moveNet.lastError||'MoveNet production baseline candidate'},
      {id:'mediapipe_model',ok:state.mediaPipe.ready,detail:state.mediaPipe.lastError||'MediaPipe experimental candidate'},
      {id:'movenet_frame',ok:state.moveNet.frames>0,detail:`${state.moveNet.frames} valid frame(s)`},
      {id:'mediapipe_frame',ok:state.mediaPipe.frames>0,detail:`${state.mediaPipe.frames} valid frame(s)`},
      {id:'movenet_contract',ok:moveValidation?.ok===true,detail:moveValidation?.detail||'waiting for MoveNet frame'},
      {id:'mediapipe_contract',ok:mediaValidation?.ok===true,detail:mediaValidation?.detail||'waiting for MediaPipe frame'},
      {id:'legacy_projection',ok:Boolean(projection?.length===17),detail:projection?`${projection.length}/17 compatibility joints projected`:'waiting for MediaPipe frame'},
      {id:'authority_boundary',ok:authority?.ok===true,detail:authority?.detail||authority?.firstFailure||'waiting for compatibility projection'}
    ]);}
    function snapshot(){const all=checks(),firstFailure=CHECK_ORDER.map(id=>all.find(item=>item.id===id)).find(item=>item&&!item.ok)||null;const engineSnapshot=engine=>Object.freeze({ready:engine.ready,frames:engine.frames,failures:engine.failures,lastInferenceMs:engine.lastInferenceMs,averageInferenceMs:average(engine.inferenceSamples),p95InferenceMs:percentile(engine.inferenceSamples,.95),lastError:engine.lastError,evidence:engine.lastObservation?evidenceSummary(engine.lastObservation):null});return Object.freeze({schemaVersion:1,productionDefault:'MoveNet',candidate:'MediaPipe Pose Landmarker',productionDefaultChanged:false,cameraOwners:state.cameraReady?1:0,schedulerOwners:state.running?1:0,running:state.running,checks:all,firstFailure:firstFailure?Object.freeze({id:firstFailure.id,detail:firstFailure.detail}):null,moveNet:engineSnapshot(state.moveNet),mediaPipe:engineSnapshot(state.mediaPipe),updatedAt:state.lastUpdatedAt});}
    return Object.freeze({setReady,setCamera,setRunning,record,fail,checks,snapshot});
  }

  return Object.freeze({CHECK_ORDER,createComparisonState,evidenceSummary});
});
