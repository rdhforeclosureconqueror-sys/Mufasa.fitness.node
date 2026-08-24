"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),path=require("node:path"),os=require("node:os");
const {createApp}=require("../server");

test("global navigation is centralized and installed on every public HTML surface",()=>{
  const source=fs.readFileSync(path.join(__dirname,"..","public","global-nav.js"),"utf8");
  assert.match(source,/const NAV_ITEMS/);assert.match(source,/data-maat-signout/);assert.match(source,/roles:\["admin","super_admin"\]/);
  for(const file of fs.readdirSync(path.join(__dirname,"..","public")).filter(name=>name.endsWith(".html")&&name!=="run-club-login.html")) assert.match(fs.readFileSync(path.join(__dirname,"..","public",file),"utf8"),/global-nav\.(?:js|css)/,file);
});

test("login UI makes remember me explicit and unchecked",()=>{
  const html=fs.readFileSync(path.join(__dirname,"..","public","login.html"),"utf8");
  assert.match(html,/id="remember" type="checkbox"/);assert.doesNotMatch(html,/id="remember"[^>]*checked/);assert.match(html,/Create Account/);
});

test("remember me selects configured token duration and logout revokes the token",async t=>{
  const prior=Object.fromEntries(["AUTH_TOKEN_SECRET","PILOT_LOGIN_PASSWORD","LOGIN_SEED_EMAIL","AUTH_TOKEN_SESSION_TTL_MS","AUTH_TOKEN_PERSISTENT_TTL_MS"].map(k=>[k,process.env[k]]));
  Object.assign(process.env,{AUTH_TOKEN_SECRET:"navigation-auth-test-secret-32-characters",PILOT_LOGIN_PASSWORD:"valid-password",LOGIN_SEED_EMAIL:"member@example.test",AUTH_TOKEN_SESSION_TTL_MS:"60000",AUTH_TOKEN_PERSISTENT_TTL_MS:"120000"});
  t.after(()=>Object.entries(prior).forEach(([k,v])=>v==null?delete process.env[k]:process.env[k]=v));
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"navigation-auth-"));fs.mkdirSync(path.join(root,"public","exercise-db"),{recursive:true});fs.writeFileSync(path.join(root,"public","exercise-db","index.json"),"[]");
  const app=createApp({rootDir:root}),server=app.listen(0);await new Promise(r=>server.once("listening",r));t.after(()=>server.close());const base=`http://127.0.0.1:${server.address().port}`;
  const login=async rememberMe=>(await (await fetch(base+"/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email:"member@example.test",password:"valid-password",rememberMe})})).json());
  const short=await login(false),persistent=await login(true);assert.ok(persistent.expiresAt-short.expiresAt>50000);
  assert.equal((await fetch(base+"/api/auth/me",{headers:{authorization:`Bearer ${short.token}`}})).status,200);
  assert.equal((await fetch(base+"/api/auth/logout",{method:"POST",headers:{authorization:`Bearer ${short.token}`}})).status,200);
  assert.equal((await fetch(base+"/api/auth/me",{headers:{authorization:`Bearer ${short.token}`}})).status,401);
});

test("role-aware menu matrix hides privileged tools from ordinary memberships",()=>{
  const vm=require("node:vm"),source=fs.readFileSync(path.join(__dirname,"..","public","global-nav.js"),"utf8");
  const window={addEventListener(){},document:{readyState:"loading",addEventListener(){}}};window.window=window;
  vm.runInNewContext(source,{window,document:window.document,console});
  const labels=user=>window.MaatNavigation.getVisibleItems(user?{isAuthenticated:true,user}:{isAuthenticated:false,user:null}).map(item=>item.label);
  const signedOut=labels(),free=labels({role:"user",roles:["user"],accessTier:"free"}),trial=labels({role:"user",roles:["user"],accessTier:"trial_member"}),paid=labels({role:"user",roles:["user"],accessTier:"paid_member"}),trainer=labels({role:"trainer",roles:["trainer"],accessTier:"paid_member"}),admin=labels({role:"admin",roles:["admin","operator"],accessTier:"paid_member"});
  assert.equal(JSON.stringify(signedOut),JSON.stringify(["Home","Exercise Library","Run Club"]));
  for(const member of [free,trial,paid]){assert.ok(member.includes("Dashboard"));assert.ok(member.includes("Yoga"));assert.ok(!member.includes("Trainer / Coach"));assert.ok(!member.includes("Member CRM"));}
  assert.ok(trainer.includes("Trainer / Coach"));assert.ok(!trainer.includes("Member CRM"));
  assert.ok(admin.includes("Trainer / Coach"));assert.ok(admin.includes("Admin Dashboard"));assert.ok(admin.includes("Member CRM"));
});

test("global navigation follows auth runtime exactly once and after it on every page",()=>{
  const root=path.join(__dirname,"..","public");
  for(const file of fs.readdirSync(root).filter(name=>name.endsWith(".html")&&name!=="run-club-login.html")){const html=fs.readFileSync(path.join(root,file),"utf8"),navScripts=html.match(/<script[^>]+global-nav\.js[^>]*>/g)||[],navStyles=html.match(/<link[^>]+global-nav\.css[^>]*>/g)||[];assert.equal(navScripts.length,1,`${file} nav script`);assert.equal(navStyles.length,1,`${file} nav style`);assert.ok(html.indexOf("auth-state-runtime.js")<html.indexOf("global-nav.js"),`${file} auth before nav`);}
});

test("mobile navigation contract is bounded, scrollable, safe-area aware and keyboard operable",()=>{
  const css=fs.readFileSync(path.join(__dirname,"..","public","global-nav.css"),"utf8"),js=fs.readFileSync(path.join(__dirname,"..","public","global-nav.js"),"utf8");
  assert.match(css,/@media\(max-width:849px\).*\.maat-nav-panel\{position:fixed/);assert.match(css,/width:min\(86vw,360px\)/);assert.match(css,/overflow-y:auto/);assert.match(css,/safe-area-inset-top/);assert.match(css,/safe-area-inset-bottom/);assert.match(css,/\.maat-nav-open\{overflow:hidden;overflow-x:hidden\}/);assert.match(css,/overflow-wrap:anywhere/);
  assert.match(css,/\.maat-nav-backdrop:not\(\[hidden\]\).*position:fixed/);assert.match(css,/z-index:10002/);assert.match(css,/min-height:4[68]px/);assert.match(js,/aria-expanded/);assert.match(js,/event\.key==="Escape"/);assert.match(js,/backdrop\.onclick/);assert.match(js,/else toggle\.focus\(\)/);
});

test("auth restoration requires recorded Remember Me consent and reports a redacted source",async()=>{
  const vm=require("node:vm"),localMap=new Map(),makeStorage=map=>({get length(){return map.size},key:index=>[...map.keys()][index]??null,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)});
  const token=`${Buffer.from("{}").toString("base64url")}.${Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString("base64url")}.signature`;
  const boot=(sessionMap=new Map())=>{const window={localStorage:makeStorage(localMap),sessionStorage:makeStorage(sessionMap),location:{origin:"https://example.test",pathname:"/workout.html",assign(){}},setTimeout,atob:value=>Buffer.from(value,"base64").toString("binary"),CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail}},dispatchEvent(){},addEventListener(){},fetch:async()=>({ok:true,status:200,headers:{get(){return null}},json:async()=>({ok:true,user:{id:"member",email:"member@example.test"}})})};window.window=window;vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","public","auth-state-runtime.js"),"utf8"),{window,globalThis:window,console,Date,JSON,Promise,Buffer});return window};
  let session=new Map(),window=boot(session);await window.AuthStateRuntime.persistCanonicalAuthState({token,user:{id:"member"}},{rememberMe:false});assert.equal(window.AuthStateRuntime.storageInspection().source,"sessionStorage");
  window=boot(new Map());await new Promise(resolve=>setTimeout(resolve,0));assert.equal(window.AuthStateRuntime.getCanonicalAuthState().isAuthenticated,false);assert.equal(window.__MAAT_AUTH_RESTORE_DIAGNOSTICS__.tokenSource,"none");
  await window.AuthStateRuntime.persistCanonicalAuthState({token,user:{id:"member"}},{rememberMe:true});window=boot(new Map());await window.AuthStateRuntime.whenReady();assert.equal(window.AuthStateRuntime.getCanonicalAuthState().isAuthenticated,true);assert.equal(window.__MAAT_AUTH_RESTORE_DIAGNOSTICS__.tokenSource,"localStorage");assert.equal(window.__MAAT_AUTH_RESTORE_DIAGNOSTICS__.rememberMeConsent,true);assert.equal(window.__MAAT_AUTH_RESTORE_DIAGNOSTICS__.bundle,"20260824-auth-unified-drawer-v2");
  localMap.set("maatAuthToken",token);localMap.delete("maatAuthPersistence");window=boot(new Map());await new Promise(resolve=>setTimeout(resolve,0));assert.equal(window.AuthStateRuntime.getStoredToken(),null);assert.equal(localMap.has("maatAuthToken"),false);assert.equal(window.__MAAT_AUTH_RESTORE_DIAGNOSTICS__.rejectedUnconsentedLocalToken,true);
});

test("all HTML surfaces pin the production auth and navigation bundle",()=>{
  const version="20260824-auth-unified-drawer-v2",root=path.join(__dirname,"..","public");
  for(const file of fs.readdirSync(root).filter(name=>name.endsWith(".html")&&name!=="run-club-login.html")){const html=fs.readFileSync(path.join(root,file),"utf8");assert.match(html,new RegExp(`auth-state-runtime\\.js\\?v=${version}`),file);assert.match(html,new RegExp(`global-nav\\.js\\?v=${version}`),file);assert.match(html,new RegExp(`global-nav\\.css\\?v=${version}`),file);}
});

test("Account A can logout, Account B remains isolated, and Account A can return",async t=>{
  const keys=["AUTH_TOKEN_SECRET","PILOT_LOGIN_PASSWORD","LOGIN_SEED_EMAIL"],prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));Object.assign(process.env,{AUTH_TOKEN_SECRET:"account-switch-test-secret-32-characters",PILOT_LOGIN_PASSWORD:"seed-password",LOGIN_SEED_EMAIL:"owner@example.test"});t.after(()=>Object.entries(prior).forEach(([k,v])=>v==null?delete process.env[k]:process.env[k]=v));
  const root=fs.mkdtempSync(path.join(os.tmpdir(),"account-switch-"));fs.mkdirSync(path.join(root,"public","exercise-db"),{recursive:true});fs.writeFileSync(path.join(root,"public","exercise-db","index.json"),"[]");const server=createApp({rootDir:root}).listen(0);await new Promise(r=>server.once("listening",r));t.after(()=>server.close());const base=`http://127.0.0.1:${server.address().port}`;
  async function request(route,options={}){const response=await fetch(base+route,options);return{response,payload:await response.json().catch(()=>({}))}}
  await request("/api/auth/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:"Account A",email:"a@example.test",password:"password-a"})});await request("/api/auth/register",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({name:"Account B",email:"b@example.test",password:"password-b"})});
  const login=async(email,password)=>(await request("/api/auth/login",{method:"POST",headers:{"content-type":"application/json"},body:JSON.stringify({email,password,rememberMe:true})})).payload;
  const me=token=>request("/api/auth/me",{headers:{authorization:`Bearer ${token}`}}),logout=token=>request("/api/auth/logout",{method:"POST",headers:{authorization:`Bearer ${token}`}});
  const firstA=await login("a@example.test","password-a");assert.equal((await me(firstA.token)).payload.user.email,"a@example.test");await logout(firstA.token);assert.equal((await me(firstA.token)).response.status,401);
  const b=await login("b@example.test","password-b"),bUser=(await me(b.token)).payload.user;assert.equal(bUser.email,"b@example.test");assert.notEqual(bUser.name,"Account A");assert.equal(bUser.role,"user");assert.doesNotMatch(JSON.stringify(bUser),/Account A|a@example\.test/);await logout(b.token);assert.equal((await me(b.token)).response.status,401);
  const secondA=await login("a@example.test","password-a");assert.equal((await me(secondA.token)).payload.user.email,"a@example.test");
});

test("explicit persistence choice creates one canonical token copy and logout clears both stores",async()=>{
  const vm=require("node:vm"),values={local:new Map(),session:new Map()},storage=map=>({get length(){return map.size},key:index=>[...map.keys()][index]??null,getItem:key=>map.get(key)??null,setItem:(key,value)=>map.set(key,String(value)),removeItem:key=>map.delete(key)}),window={localStorage:storage(values.local),sessionStorage:storage(values.session),location:{origin:"https://example.test",assign(){}},setTimeout,atob:value=>Buffer.from(value,"base64").toString("binary"),CustomEvent:class{constructor(type,{detail}={}){this.type=type;this.detail=detail}},dispatchEvent(){},addEventListener(){},fetch:async()=>({ok:true,status:200,json:async()=>({ok:true,user:{id:"member",role:"user"}})})};window.window=window;
  vm.runInNewContext(fs.readFileSync(path.join(__dirname,"..","public","auth-state-runtime.js"),"utf8"),{window,globalThis:window,console,Date,JSON,Promise,Buffer});
  const token=()=>`${Buffer.from("{}").toString("base64url")}.${Buffer.from(JSON.stringify({exp:Math.floor(Date.now()/1000)+3600})).toString("base64url")}.sig`;
  const first=token();assert.equal((await window.AuthStateRuntime.persistCanonicalAuthState({token:first,user:{id:"member"}},{rememberMe:false})).ok,true);assert.equal(values.session.get("maatAuthToken"),first);assert.equal(values.local.has("maatAuthToken"),false);
  const remembered=token();assert.equal((await window.AuthStateRuntime.persistCanonicalAuthState({token:remembered,user:{id:"member"}},{rememberMe:true})).ok,true);assert.equal(values.local.get("maatAuthToken"),remembered);assert.equal(values.session.has("maatAuthToken"),false);
  await window.AuthStateRuntime.logout();assert.equal(values.local.has("maatAuthToken"),false);assert.equal(values.session.has("maatAuthToken"),false);assert.equal(values.local.has("maatAuthPersistence"),false);
});

test("all authentication entry and exit links use the canonical login surface",()=>{
 const root=path.join(__dirname,"..","public"),legacy=[];
 for(const file of fs.readdirSync(root).filter(name=>/\.(?:html|js)$/.test(name))){const text=fs.readFileSync(path.join(root,file),"utf8");if(file!=="run-club-login.html"&&file!=="run-club-login.js"&&text.includes("/run-club-login.html"))legacy.push(file)}
 assert.deepEqual(legacy,[]);assert.match(fs.readFileSync(path.join(root,"global-nav.js"),"utf8"),/redirectTo:"\/login\.html\?signedOut=1"/);
 const redirect=fs.readFileSync(path.join(root,"run-club-login.html"),"utf8");assert.match(redirect,/location\.replace/);assert.doesNotMatch(redirect,/<form/);
});

test("workout mobile drawer remains an overlay at production phone widths",()=>{
 const html=fs.readFileSync(path.join(__dirname,"..","public","workout.html"),"utf8"),css=fs.readFileSync(path.join(__dirname,"..","public","global-nav.css"),"utf8");
 for(const width of [320,375,390,430])assert.ok(width<850);
 assert.match(html,/display: flex;\s*flex-direction: column;/);assert.match(html,/\.app \{[\s\S]*?width: 100%;[\s\S]*?margin: 0 auto;/);
 assert.match(css,/body>\.maat-global-header>\.maat-nav-panel\{position:fixed!important/);assert.match(css,/body>\.maat-global-header>\.maat-nav-backdrop:not\(\[hidden\]\)\{position:fixed!important/);
 assert.match(css,/body\.maat-nav-open>main\{width:100%!important/);assert.doesNotMatch(css,/maat-nav-open[^}]*?(margin-left:(?!0)|translateX\((?!0)|grid-template-columns)/);
});

test("canonical login resolves the configured API origin and emits no credential diagnostics",()=>{const js=fs.readFileSync(path.join(__dirname,"..","public","login.js"),"utf8");assert.match(js,/MaatApiClient\?\.resolve/);assert.match(js,/MAAT_BACKEND_ORIGIN/);assert.match(js,/__MAAT_LOGIN_DIAGNOSTIC__/);assert.doesNotMatch(js,/report=\{[^}]*password|report=\{[^}]*token/)});
