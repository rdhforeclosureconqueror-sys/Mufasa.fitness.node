"use strict";
/**
 * Isolated browser parity. This tests DOM file-input constraints and JS File
 * propagation; it cannot emulate the iOS Files provider or native selection UI.
 */
const {chromium,devices}=require("playwright");
const {createApp}=require("../server");
const assert=require("node:assert/strict");
const fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const dir=fs.mkdtempSync(path.join(os.tmpdir(),"milele-avatar-picker-ab-"));
const server=createApp({dataDir:dir,logger:{info(){},warn(){},error(){}}}).listen(0,"127.0.0.1");
let browser;const checks=[];let firstFailure=null;
const record=async(name,fn)=>{try{const result=await fn();checks.push({name,status:"PASS",result});return result;}catch(e){firstFailure={name,message:String(e.message).slice(0,400)};checks.push({name,status:"FAIL"});throw e;}};
const glb=Buffer.alloc(12);glb.write("glTF",0);glb.writeUInt32LE(2,4);glb.writeUInt32LE(12,8);
(async()=>{
 try{
  await new Promise((resolve,reject)=>{server.once("listening",resolve);server.once("error",reject);});
  const origin="http://127.0.0.1:"+server.address().port;
  browser=await chromium.launch({headless:true});
  const ctx=await browser.newContext({...devices["iPhone 13"],serviceWorkers:"block"});
  const scenarios=[
   {name:"original-workout",route:"/workout.html",input:"#avatarFileInput"},
   {name:"community-avatar-studio",route:"/push-up-release.html?avatarSetup=community",input:"#releaseAvatarFileInput"}
  ];
  const observed=[];
  for(const scenario of scenarios){
   const page=await ctx.newPage();
   try{
    await record(scenario.name+"-page-load",async()=>{
     const res=await page.goto(origin+scenario.route,{waitUntil:"domcontentloaded",timeout:30000});
     assert.equal(res.status(),200);await page.locator(scenario.input).waitFor({state:"attached"});
    });
    const attributes=await record(scenario.name+"-input-contract",async()=>{
     const data=await page.locator(scenario.input).evaluate(el=>({type:el.type,accept:el.accept,rawAccept:el.getAttribute("accept"),disabled:el.disabled,multiple:el.multiple,capture:el.getAttribute("capture"),tag:el.outerHTML}));
     assert.equal(data.type,"file");assert.equal(data.accept,"");assert.equal(data.rawAccept,null);assert.equal(data.disabled,false);assert.equal(data.multiple,false);assert.equal(data.capture,null);
     return data;
    });
    await record(scenario.name+"-change-event",async()=>{
     await page.locator(scenario.input).evaluate(el=>{window.__avatarPickerChangeCount=0;el.addEventListener("change",()=>window.__avatarPickerChangeCount++);});
     await page.locator(scenario.input).setInputFiles({name:"model.glb",mimeType:"model/gltf-binary",buffer:glb});
     const data=await page.locator(scenario.input).evaluate(el=>({fileName:el.files?.[0]?.name,fileSize:el.files?.[0]?.size,count:window.__avatarPickerChangeCount}));
     assert.equal(data.fileName,"model.glb");assert.equal(data.fileSize,12);assert.ok(data.count>=1);return data;
    });
    observed.push({name:scenario.name,attributes});
   }finally{await page.close();}
  }
  await record("identical-native-picker-constraints",()=>{
   const a=observed.map(x=>x.attributes);
   assert.deepEqual(a[0]&&{type:a[0].type,accept:a[0].accept,rawAccept:a[0].rawAccept,disabled:a[0].disabled,multiple:a[0].multiple,capture:a[0].capture},a[1]&&{type:a[1].type,accept:a[1].accept,rawAccept:a[1].rawAccept,disabled:a[1].disabled,multiple:a[1].multiple,capture:a[1].capture});
  });
  await ctx.close();
 }catch(e){if(!firstFailure)firstFailure={name:"setup",message:String(e.message).slice(0,400)};}
 finally{if(browser)await browser.close();await new Promise(resolve=>server.close(resolve));fs.rmSync(dir,{recursive:true,force:true});}
 console.log(JSON.stringify({mode:"ISOLATED_MOBILE_CHROMIUM_PICKER_PARITY",passed:!firstFailure,firstFailure,checks,realIOSFilesPickerTested:false,liveGLBUploadTested:false},null,2));
 if(firstFailure)process.exitCode=1;
})().catch(e=>{console.error(e);process.exitCode=1;});
