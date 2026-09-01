'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

test('presentation repairs external mutations without feeding its own observer forever', () => {
  const jobs = [], observers = [];
  class MutationObserver {
    constructor(callback) { this.callback=callback; this.targets=new Set(); this.records=[]; this.queued=false; observers.push(this); }
    observe(target) { this.targets.add(target); }
    takeRecords() { return this.records.splice(0); }
    record(target) {
      if (!this.targets.has(target)) return;
      this.records.push({target});
      if (this.queued) return;
      this.queued=true;
      jobs.push(() => { this.queued=false; const records=this.takeRecords(); if (records.length) this.callback(records,this); });
    }
  }
  const elements = new Map(['workoutPresentation','video','overlay','avatar3d'].map(id => {
    const element={};
    const changed=()=>observers.forEach(observer=>observer.record(element));
    element.dataset=new Proxy({}, {set(target,key,value){target[key]=value;changed();return true;}});
    element.style={setProperty(){changed();}};
    return [id,element];
  }));
  const window={document:{getElementById:id=>elements.get(id)}, MutationObserver,
    queueMicrotask:job=>jobs.push(job), addEventListener(){}, dispatchEvent(){}};
  const CustomEvent=class { constructor(type,options){this.type=type;this.detail=options?.detail;} };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,'../public/workout-presentation-state.js'),'utf8'), {window,MutationObserver,CustomEvent});
  const authority=window.WorkoutPresentationState;
  authority.configure({});
  const flush=()=>{
    for(let count=0;jobs.length&&count<20;count++) jobs.shift()();
    assert.equal(jobs.length,0,'presentation observer must settle so browser boot and input can proceed');
  };
  authority.setPresentationMode('avatar_only');
  flush();
  const root=elements.get('workoutPresentation');
  root.dataset.avatarPresentation='camera';
  flush();
  assert.equal(root.dataset.avatarPresentation,'avatar_only');
  assert.equal(authority.getState().authorityConflictCount,1);
});
