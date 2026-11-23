'use strict';
// Real browser touch events, including two simultaneous fingers. QA is read-only.
const {chromium}=require('../tmp/rugby-browser/node_modules/playwright');
const assert=require('node:assert/strict'),fs=require('node:fs');
(async()=>{
 const base=process.env.RUGBY_TEST_URL||'http://127.0.0.1:8781';
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true});
 const results=[];
 try { for(const viewport of [{width:844,height:390},{width:390,height:844}]) {
  const context=await browser.newContext({viewport,hasTouch:true,isMobile:true});
  const page=await context.newPage(),errors=[];page.on('pageerror',e=>errors.push(String(e)));
  await page.goto(base+'/game/rugby-hq/index.html?qa=1');await page.locator('#start').click();
  await page.waitForFunction(()=>window.rugbySnapshot,null,{timeout:120000});await page.waitForTimeout(500);
  const state=()=>page.evaluate(()=>window.rugbySnapshot);
  const b=await page.locator('#canvas').boundingBox(),size=await page.locator('#canvas').evaluate(c=>({width:c.width,height:c.height}));
  const point=(xy,id)=>({id,x:b.x+xy[0]*b.width/size.width,y:b.y+xy[1]*b.height/size.height});
  let s=await state();const scale=Math.min(size.width/1152,size.height/648),ox=(size.width-1152*scale)/2,oy=(size.height-648*scale)/2;
  const center=point([ox+104*scale,oy+510*scale],1),j={...center,x:center.x+45*scale};
  const p=point(s.button_screen,2),r=point(s.restart_screen,2);
  assert.equal(await page.evaluate(({x,y})=>document.elementFromPoint(x,y)?.id,r),'canvas','RESTART is not obscured by page content');
  const cdp=await context.newCDPSession(page);
  const touch=(type,touchPoints)=>cdp.send('Input.dispatchTouchEvent',{type,touchPoints});
  await touch('touchStart',[center]);await touch('touchMove',[j]);await page.waitForTimeout(400);
  await touch('touchStart',[j,p]);await page.waitForTimeout(150);await touch('touchEnd',[p]);
  await page.waitForFunction(n=>window.rugbySnapshot.passes===n+1,s.passes,{timeout:3000});
  await page.waitForTimeout(600);s=await state();assert.equal(s.passes,1,'one physical tap produces one pass');assert.ok(s.position[0]>0.6,'joystick remains active during pass');assert.equal(s.holder,'Support','moving touch pass caught');
  await touch('touchStart',[j,r]);await page.waitForTimeout(100);await touch('touchEnd',[r]);await touch('touchEnd',[]);await page.waitForTimeout(300);
  s=await state();assert.equal(s.holder,'Attacker');assert.equal(s.over,false);assert.ok(Math.abs(s.position[0])<0.1);assert.ok(Math.abs(s.position[2]-5)<0.1);
  await page.touchscreen.tap(p.x,p.y);await page.waitForFunction(()=>window.rugbySnapshot.holder==='Support');await page.waitForTimeout(500);assert.equal((await state()).passes,2);
  await page.touchscreen.tap(r.x,r.y);await page.waitForTimeout(300);
  const up={...center,y:center.y-45*scale};await touch('touchStart',[center]);await touch('touchMove',[up]);
  await page.waitForFunction(()=>window.rugbySnapshot.over,null,{timeout:20000});await touch('touchEnd',[]);
  const ended=(await state()).passes;await page.touchscreen.tap(p.x,p.y);await page.waitForTimeout(300);
  s=await state();assert.equal(s.passes,ended);assert.match(s.status,/Tap RESTART/);
  await page.touchscreen.tap(r.x,r.y);await page.waitForTimeout(300);s=await state();assert.equal(s.over,false);assert.equal(s.holder,'Attacker');assert.equal(s.ball_visible,true);
  await touch('touchStart',[center]);await touch('touchMove',[j]);await page.waitForTimeout(700);await touch('touchEnd',[]);assert.ok((await state()).position[0]>0.6,'movement restored after restart');
  assert.deepEqual(errors,[]);assert.deepEqual(await page.evaluate(()=>window.rugbyErrors),[]);
  fs.mkdirSync('tmp/rugby-multitouch-qa',{recursive:true});await page.screenshot({path:`tmp/rugby-multitouch-qa/${viewport.width}.png`});
  results.push({viewport,pass:true,checks:['simultaneous joystick/PASS','exactly one pass','support catch','second-finger RESTART','single-finger PASS','game-over feedback','restart possession and movement'],errors});console.log(results.at(-1));await context.close();
 }} finally {await browser.close();}
 fs.writeFileSync('tmp/rugby-multitouch-qa/results.json',JSON.stringify({base,results},null,2));
})().catch(e=>{console.error(e);process.exitCode=1});
