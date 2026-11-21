'use strict';
const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),{spawn}=require('node:child_process');
const root=path.resolve(__dirname,'../public');
const reportDir=path.resolve(__dirname,'../tmp/rugby-web-qa');
fs.mkdirSync(reportDir,{recursive:true});
const browser=process.env.RUGBY_BROWSER||'C:/Program Files/Google/Chrome/Application/chrome.exe';
const harness=`<!doctype html><html><body style="margin:0"><iframe id="game" style="width:1152px;height:740px;border:0" src="/game/rugby-hq/index.html?qa=1"></iframe><pre id="result">RUNNING</pre><script>
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const checks=[];
function check(ok,label){checks.push({label,pass:!!ok});if(!ok)throw Error(label);}
async function until(fn,timeout=90000){const end=Date.now()+timeout;while(Date.now()<end){if(fn())return;await sleep(100);}throw Error('Timed out waiting for game state');}
(async()=>{
let w;
try{
await until(()=>document.getElementById('game').contentWindow.document.getElementById('start'));
w=document.getElementById('game').contentWindow;w.document.getElementById('start').click();
await until(()=>w.rugbySnapshot);
const canvas=w.document.getElementById('canvas');
const state=()=>JSON.parse(JSON.stringify(w.rugbySnapshot));
function key(code,keyName,n,down){canvas.dispatchEvent(new w.KeyboardEvent(down?'keydown':'keyup',{code,key:keyName,keyCode:n,which:n,bubbles:true,cancelable:true}));}
async function tap(code,keyName,n){key(code,keyName,n,true);await sleep(60);key(code,keyName,n,false);await sleep(180);}
async function reset(){await tap('KeyR','r',82);check(!state().over&&state().holder==='Attacker','reset restores possession');}
check(state().players===3&&state().bones===52&&state().walls===4,'3 Rashad players, original rig, 4 walls');
check(state().ball_visible,'ball visible in scene');
for(const [code,name,num,axis,sign] of [['KeyW','w',87,2,-1],['ArrowUp','ArrowUp',38,2,-1],['KeyS','s',83,2,1],['ArrowDown','ArrowDown',40,2,1],['KeyA','a',65,0,-1],['ArrowLeft','ArrowLeft',37,0,-1],['KeyD','d',68,0,1],['ArrowRight','ArrowRight',39,0,1]]){
await reset();const before=state();canvas.focus();key(code,name,num,true);await sleep(650);const moving=state();key(code,name,num,false);
check((moving.position[axis]-before.position[axis])*sign>1.0,code+' actual displacement');
check(moving.animation==='Run',code+' run animation');
check(moving.forward[axis===0?0:1]*sign>0.9,code+' visual facing');
}
await reset();key('KeyD','d',68,true);await sleep(600);const pose=state();await sleep(1000);const sustained=state();check(sustained.position[0]-pose.position[0]>3,'sustained motion across animation loop');check(JSON.stringify(pose.leg)!==JSON.stringify(sustained.leg),'avatar skeleton animates');
const passesBefore=state().passes;key('Space',' ',32,true);await sleep(80);key('Space',' ',32,false);await until(()=>state().passes>passesBefore,1500);check(state().passes>passesBefore,'Space dispatch reaches game');key('KeyD','d',68,false);await until(()=>state().holder==='Support',3000);check(state().holder==='Support','moving pass caught by support');
await reset();const rect=canvas.getBoundingClientRect();const x=rect.left+rect.width*(state().button_screen[0]/canvas.width),y=rect.top+rect.height*(state().button_screen[1]/canvas.height);const count=state().passes;
for(const type of ['mouseover','pointermove','mousedown','mouseup']){canvas.dispatchEvent(new w.PointerEvent(type,{bubbles:true,clientX:x,clientY:y,button:0,buttons:type==='mousedown'?1:0}));await sleep(100);}
await sleep(200);check(state().passes===count+1,'HUD PASS click reaches same action');
await reset();canvas.focus();const scroll=w.scrollY;key('ArrowDown','ArrowDown',40,true);await sleep(200);key('ArrowDown','ArrowDown',40,false);check(w.scrollY===scroll,'arrows do not scroll page');
check(w.rugbyErrors.length===0,'no browser/engine errors');
const result={pass:true,checks,userAgent:navigator.userAgent,final:state()};document.getElementById('result').textContent=JSON.stringify(result);await fetch('/__result',{method:'POST',body:JSON.stringify(result)});
}catch(e){const result={pass:false,error:String(e),checks,engineErrors:w?.rugbyErrors||[],state:w?.rugbySnapshot||null};document.getElementById('result').textContent=JSON.stringify(result);await fetch('/__result',{method:'POST',body:JSON.stringify(result)});}
})();
</script></body></html>`;
let child,timeout;
const mime={'.html':'text/html','.js':'text/javascript','.wasm':'application/wasm','.pck':'application/octet-stream','.png':'image/png','.svg':'image/svg+xml','.css':'text/css','.json':'application/json'};
const server=http.createServer((req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/__qa'){res.setHeader('Content-Type','text/html');return res.end(harness);}
 if(url.pathname==='/__result'&&req.method==='POST'){let body='';req.on('data',c=>body+=c);req.on('end',()=>{res.end('ok');let report;try{report=JSON.parse(body);}catch{return;}fs.writeFileSync(path.join(reportDir,'result.json'),JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));clearTimeout(timeout);setTimeout(()=>{child?.kill();server.close();process.exitCode=report.pass?0:1;},500);});return;}
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname.endsWith('/')?url.pathname+'index.html':url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403);return res.end();}
 if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404);return res.end('Not found');}
 res.setHeader('Content-Type',mime[path.extname(file)]||'application/octet-stream');fs.createReadStream(file).pipe(res);
});
server.listen(8779,'127.0.0.1',()=>{
 console.log('Browser QA on http://127.0.0.1:8779/__qa');
 child=spawn(browser,['--headless=new','--no-first-run','--no-default-browser-check','--autoplay-policy=no-user-gesture-required','--window-size=1280,900','--user-data-dir='+path.join(reportDir,'browser-profile'),'http://127.0.0.1:8779/__qa'],{stdio:['ignore','ignore','pipe'],windowsHide:true});
 child.stderr.on('data',c=>fs.appendFileSync(path.join(reportDir,'browser.log'),c));
 timeout=setTimeout(()=>{console.error('Browser QA timed out');child.kill();server.close();process.exitCode=1;},120000);
});
