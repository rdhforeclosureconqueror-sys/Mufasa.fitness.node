'use strict';
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const {outputs,build,validate}=require('../scripts/build-rugby-learning-guides');
const benchmark=require('../data/rugby/learning/benchmarks.v1.json');
const root=path.resolve(__dirname,'..');
test('all 15 positions and 29 assessment pages are generated deterministically',()=>{
 assert.equal(validate(),true);const files=outputs();assert.equal([...files.keys()].filter(p=>p.startsWith('public/rugby-positions/')).length,15);assert.equal([...files.keys()].filter(p=>p.startsWith('public/rugby-assessment-guides/')).length,29);assert.equal(build(true),73);
});
test('every generated internal link and illustration resolves in the public artifact',()=>{
 for(const [file,html] of outputs()){
  if(!file.endsWith('.html'))continue;
  for(const m of html.matchAll(/(?:href|src)="(\/[^"?#]*)(?:[?#][^"]*)?"/g))assert.ok(fs.existsSync(path.join(root,'public',m[1])),`${file}: broken ${m[1]}`);
  if(file.includes('/rugby-assessment-guides/'))assert.match(html,/<img[^>]+alt="[^"]+"/);
 }
});
test('505 guide separates timed distance, plant leg, cohorts and unavailable national scores',()=>{
 const html=outputs().get('public/rugby-assessment-guides/cod_505_left.html');
 assert.match(html,/10 m run-in/);assert.match(html,/5 m timed out/);assert.match(html,/left plant leg/);assert.match(html,/2\.38/);assert.match(html,/2\.18/);assert.match(html,/2\.682/);assert.match(html,/No verified comparable result table found/);assert.match(html,/not split by plant leg/);assert.match(html,/mean-of-two score is not equivalent/);
 assert.doesNotMatch(html,/qualifying score[^<]*2\./);
});
test('benchmarks retain source, population, metric and explicit non-selection meaning',()=>{
 for(const b of benchmark.benchmarks){const source=benchmark.sources.find(s=>s.id===b.sourceId);assert.ok(source?.url.startsWith('https://'));assert.ok(source.population&&source.year);assert.ok(b.n>0&&b.sd>=0&&b.method&&b.limits&&b.sex&&b.metric);assert.equal(b.selectionCutoff,false);}
 assert.ok(benchmark.benchmarks.some(b=>b.tier==='International'));
 assert.equal(benchmark.benchmarks.some(b=>/USA|Falcons|All Blacks/.test(b.group)),false);
});
test('observation guide has no invented numerical pass score and preserves contact coaching',()=>{
 const html=outputs().get('public/rugby-assessment-guides/tackle_sequence.html');assert.match(html,/no universal professional number/);assert.match(html,/qualified supervision/);assert.match(html,/Tracking, preparation, connection, acceleration and finish/i);assert.match(html,/Ways to develop this quality/);
});
test('strength reference labels relative 1RM separately from generic load capture',()=>{
 const html=outputs().get('public/rugby-assessment-guides/lower_strength.html');assert.match(html,/1\.84/);assert.match(html,/relative 1RM metric, not kg/);assert.match(html,/squat 1RM \/ body mass/);
});
test('guide search and population controls do not leak hidden cohorts into display',()=>{
 const cards=[{textContent:'505 turn left',hidden:false},{textContent:'10 m acceleration',hidden:false}],status={},input={value:'',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},closest(){return section;}};
 const cohorts=[{dataset:{cohort:'Women'},hidden:false},{dataset:{cohort:'Men'},hidden:false}];
 const filter={value:'all',handlers:{},addEventListener(type,fn){this.handlers[type]=fn;},closest(){return {querySelectorAll:()=>cohorts};}};
 const section={querySelectorAll:()=>cards,querySelector:()=>status};
 const document={querySelectorAll:selector=>selector==='[data-card-search]'?[input]:selector==='[data-cohort-filter]'?[filter]:[],querySelector:()=>null};
 vm.runInNewContext(fs.readFileSync(path.join(root,'public/rugby-learning.js'),'utf8'),{document,window:{}});
 input.value='505';input.handlers.input();assert.equal(cards[0].hidden,false);assert.equal(cards[1].hidden,true);assert.equal(status.textContent,'1 guide shown.');
 input.value='unknown';input.handlers.input();assert.ok(cards.every(c=>c.hidden));assert.equal(status.textContent,'0 guides shown.');
 filter.value='Women';filter.handlers.change();assert.equal(cohorts[0].hidden,false);assert.equal(cohorts[1].hidden,true);filter.value='all';filter.handlers.change();assert.ok(cohorts.every(c=>!c.hidden));
});
