const test=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const view=fs.readFileSync(path.join(__dirname,'../public/rugby-threejs-existing-drills.js'),'utf8');const page=fs.readFileSync(path.join(__dirname,'../public/rugby-player.html'),'utf8');test('original Rugby IQ engines remain loaded alongside optional Three.js renderer',()=>{for(const file of ['rugby-attack-intelligence.js','rugby-three-v-two.js','rugby-ravens-protected.js','rugby-threejs-existing-drills.js'])assert.ok(page.includes(file));});test('Three.js view reads existing SVG nodes rather than duplicating rugby decisions',()=>{assert.match(view,/getBoundingClientRect/);assert.match(view,/quins-sim-carrier/);assert.match(view,/q32-a3/);assert.match(view,/View: Original nodes/);assert.match(view,/Camera angle/);});
test('RAVENS mirror consumes existing authorized SVG and not protected API directly',()=>{
 assert.match(view,/quins-ravens-live svg/);
 assert.match(view,/\[data-players\] \[data-p=/);
 assert.match(view,/\[data-defense\] circle/);
 assert.match(view,/\[data-drill\] circle/);
 assert.match(view,/\[data-ball\]/);
 assert.doesNotMatch(view,/\/api\/quins\/ravens\/play/);
});
test('Three.js toggle preserves SVG layout and computed node visibility',()=>{
 assert.match(view,/svg\.style\.opacity=enabled\?'0':''/);
 assert.doesNotMatch(view,/svg\.style\.visibility=enabled\?'hidden':''/);
 assert.match(view,/getComputedStyle\(el\)\.visibility/);
});

test('expanded viewer preserves original engines and provides mobile coaching controls',()=>{
 for(const phrase of ['Expand pitch','Scenario controls','Change scenario','Zoom','Reset view','clearTimeout(pending)','count.textContent=\'2\'','count.textContent=\'1\''])assert.ok(view.includes(phrase),phrase);
 assert.match(view,/select\.dispatchEvent\(new Event\('change'/);
 assert.match(view,/b\.click\(\)/);
 assert.doesNotMatch(view,/\/api\/quins\/ravens\/play/);
});

test('fullscreen does not reparent the original SVG or break original scenario listeners',()=>{
 assert.match(view,/stage\.insertBefore\(canvas,panel\)/);
 assert.match(view,/wrapper\.insertBefore\(canvas,canvasHome\.nextSibling\)/);
 assert.doesNotMatch(view,/stage\.insertBefore\(wrapper,panel\)/);
 assert.doesNotMatch(view,/svg\.style\.width='100%'/);
 assert.match(view,/svg\.getScreenCTM\(\)/);
 assert.match(view,/matrixTransform\(ctm\.inverse\(\)\)/);
 assert.match(view,/sourceRoot\?\.closest/);
});

test('expanded controls are strictly scoped to the active drill',()=>{
 assert.match(view,/controlRoot:'\.quins-simulator'/);
 assert.match(view,/controlRoot:'\.quins-3v2'/);
 assert.match(view,/controlRoot:'\.quins-ravens-live'/);
 assert.match(view,/excludeRoot:'\.quins-3v2, \.quins-ravens-live'/);
 assert.match(view,/svg\.closest\(cfg\.controlRoot\)/);
 assert.match(view,/!el\.closest\(cfg\.excludeRoot\)/);
 assert.doesNotMatch(view,/sourceRoot\?\.parentElement\|\|document\.body/);
});
