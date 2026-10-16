"use strict";
// Real Chromium browser smoke test; read-only, local HTTP, no production accounts.
const assert=require("node:assert/strict");
const {chromium}=require("playwright");
const {createApp}=require("../server");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const pages=["/quick-connect.html","/apartment-wellness.html","/residential-wellness.html","/community-hub.html","/free-run-club.html","/wellness-check-in.html","/admin-acceptance-lab.html"];
(async()=>{
 const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-browser-acceptance-"));
 const server=createApp({dataDir:dir}).listen(0,"127.0.0.1");
 let browser,firstFailure=null;
 const checks=[];
 try{
  await new Promise((resolve,reject)=>{server.once("listening",resolve);server.once("error",reject)});
  const base="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({serviceWorkers:"block"});
  const page=await context.newPage();
  for(const route of pages){
   try{
    const response=await page.goto(base+route,{waitUntil:"domcontentloaded",timeout:12000});
    assert.equal(response?.status(),200,"Page HTTP status");
    assert.equal(new URL(page.url()).pathname,route,"Unexpected redirect");
    assert.equal(await page.locator("body").count(),1,"Missing rendered body");
    checks.push({route,status:"PASS_BROWSER_DOM"});
   }catch(error){
    firstFailure={route,reason:String(error.message).slice(0,200)};
    checks.push({route,status:"FAIL",reason:firstFailure.reason});
    break;
   }
  }
  if(!firstFailure){
   const page=await context.newPage();
   await page.goto(base+"/quick-connect.html");
   const link=page.locator('a[href="/apartment-wellness.html"],a[href="apartment-wellness.html"]').first();
   if(await link.count()){
    await link.click();
    assert.equal(new URL(page.url()).pathname,"/apartment-wellness.html");
    checks.push({route:"quick-connect → apartment-wellness",status:"PASS_BROWSER_CLICK"});
   }else{
    firstFailure={route:"quick-connect → apartment-wellness",reason:"NAVIGATION_LINK_NOT_FOUND"};
    checks.push({route:firstFailure.route,status:"FAIL",reason:firstFailure.reason});
   }
  }
 }catch(error){firstFailure=firstFailure||{route:"browser-startup",reason:String(error.message).slice(0,200)}}
 finally{
  if(browser)await browser.close();
  await new Promise(resolve=>server.close(()=>resolve()));
  fs.rmSync(dir,{recursive:true,force:true});
 }
 const report={mode:"LOCAL_CHROMIUM_READ_ONLY",passed:!firstFailure,firstFailure,checks,cleanupVerified:!fs.existsSync(dir),productionBrowserCertified:false};
 console.log(JSON.stringify(report,null,2));
 if(!report.passed||!report.cleanupVerified)process.exitCode=1;
})().catch(error=>{console.error(error);process.exitCode=1});
