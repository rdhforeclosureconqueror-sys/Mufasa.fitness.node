'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const source=fs.readFileSync(path.join(__dirname,'../public/rugby-attack-intelligence.js'),'utf8');
const dashboard=fs.readFileSync(path.join(__dirname,'../public/rugby-player.html'),'utf8');
const landing=fs.readFileSync(path.join(__dirname,'../public/rugby.html'),'utf8');
test('interactive 2v1 is loaded only in authenticated player dashboard',()=>{
 assert.match(dashboard,/AuthNavigation\?\.requireUser/);
 assert.match(dashboard,/rugby-attack-intelligence\.js/);
 assert.doesNotMatch(landing,/rugby-attack-intelligence\.js/);
 assert.match(source,/getElementById\('quins-structure-lesson'\)/);
});
test('simulation provides positioning, timed defender commitment and three tactical decisions',()=>{
 for(const id of ['quins-sim-outside','quins-sim-inside','quins-sim-start','quins-sim-reset','quins-sim-decisions','quins-sim-outcome'])assert.ok(source.includes(id),id);
 for(const choice of ['pass','outside','inside'])assert.ok(source.includes('data-choice="'+choice+'"'),choice);
 assert.match(source,/phase='running'/);
 assert.match(source,/phase='decision'/);
 assert.match(source,/setTimeout/);
 assert.match(source,/clearTimeout/);
});
test('simulator distinguishes support position and inside-cover traffic',()=>{
 assert.match(source,/lane==='outside'/);
 assert.match(source,/SUPPORT INTO TRAFFIC/);
 assert.match(source,/CONTACT \/ ISOLATION RISK/);
 assert.match(source,/SPACE CREATED/);
 assert.match(source,/DUMMY AND OUTSIDE/);
});
test('simulation has accessible labels and reduced motion fallback',()=>{
 assert.match(source,/aria-label="Interactive rugby training pitch/);
 assert.match(source,/aria-live="polite"/);
 assert.match(source,/prefers-reduced-motion:reduce/);
 assert.match(source,/keydown/);
});
test('visual academy retains the three coaching modules',()=>{
 for(const id of ['quins-module-structure','quins-module-four-ps','quins-module-mf'])assert.ok(dashboard.includes(id));
 assert.match(dashboard,/quins-role-grid/);
});
