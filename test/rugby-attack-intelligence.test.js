'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const source=fs.readFileSync(path.join(__dirname,'../public/rugby-attack-intelligence.js'),'utf8');
function setup(present=true){
 const nodes=new Map();
 function node(id){if(!nodes.has(id))nodes.set(id,{textContent:'',listeners:{},addEventListener(event,fn){this.listeners[event]=fn;},setAttribute(){},appendChild(){},querySelector(){return this.selected||null;}});return nodes.get(id);}
 const host=present?node('quins-structure-lesson'):null;
 const document={getElementById(id){return id==='quins-structure-lesson'?host:node(id);},createElement(){const n=node('lesson-stage');Object.defineProperty(n,'innerHTML',{set(value){this.html=value;},get(){return this.html;}});return n;}};
 vm.runInNewContext(source,{document});
 return {node,host};
}
test('lesson does not mount outside Rugby HQ',()=>{const {node}=setup(false);assert.equal(node('lesson-stage').html,undefined);});
test('Structure and Chaos produce distinct learning feedback',()=>{
 const {node,host}=setup();
 assert.equal(host!==null,true);
 node('quins-structure').listeners.click();
 assert.match(node('quins-lesson-feedback').textContent,/precision/i);
 node('quins-chaos').listeners.click();
 assert.match(node('quins-lesson-feedback').textContent,/adapt/i);
});
test('Rugby IQ requires an answer and explains both outcomes',()=>{
 const {node}=setup();
 node('quins-iq-check').listeners.click();
 assert.match(node('quins-iq-feedback').textContent,/Choose an answer/);
 node('lesson-stage').selected={value:'a'};
 node('quins-iq-check').listeners.click();
 assert.match(node('quins-iq-feedback').textContent,/Try again/);
 node('lesson-stage').selected={value:'b'};
 node('quins-iq-check').listeners.click();
 assert.match(node('quins-iq-feedback').textContent,/Correct/);
});
test('lesson is wired into authenticated dashboard, not public rugby landing',()=>{
 const dashboard=fs.readFileSync(path.join(__dirname,'../public/rugby-player.html'),'utf8');
 const landing=fs.readFileSync(path.join(__dirname,'../public/rugby.html'),'utf8');
 assert.match(dashboard,/AuthNavigation\?\.requireUser/);
 assert.match(dashboard,/rugby-attack-intelligence\.js/);
 assert.doesNotMatch(landing,/rugby-attack-intelligence\.js/);
});

test('mobile module cards keep each lesson inside a native expandable panel',()=>{
 const dashboard=fs.readFileSync(path.join(__dirname,'../public/rugby-player.html'),'utf8');
 assert.match(dashboard,/<details class="quins-module" id="quins-module-structure">/);
 assert.match(dashboard,/<details class="quins-module" id="quins-module-four-ps">/);
 assert.match(dashboard,/<details class="quins-module" id="quins-module-mf">/);
 assert.match(dashboard,/id="quins-structure-lesson"/);
 assert.match(dashboard,/\.quins-module-content fieldset\{min-width:0/);
});
