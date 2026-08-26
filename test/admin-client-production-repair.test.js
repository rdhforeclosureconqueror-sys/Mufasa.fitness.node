"use strict";
const test=require("node:test"),assert=require("node:assert/strict"),fs=require("node:fs"),os=require("node:os"),path=require("node:path");
const {createApp}=require("../server");
test("admin CRM routes enforce server roles, detail scope, search, and messaging participants",async t=>{
 const keys=["AUTH_TOKEN_SECRET","PILOT_LOGIN_PASSWORD","LOGIN_SEED_EMAIL","AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS"],prior=Object.fromEntries(keys.map(k=>[k,process.env[k]]));Object.assign(process.env,{AUTH_TOKEN_SECRET:"admin-crm-production-repair-secret-32chars",PILOT_LOGIN_PASSWORD:"admin-password",LOGIN_SEED_EMAIL:"owner@example.test",AUTHZ_BOOTSTRAP_SUPER_ADMIN_USER_IDS:"pilot_admin"});t.after(()=>Object.entries(prior).forEach(([k,v])=>v==null?delete process.env[k]:process.env[k]=v));
 const root=fs.mkdtempSync(path.join(os.tmpdir(),"admin-crm-route-"));fs.mkdirSync(path.join(root,"public","exercise-db"),{recursive:true});fs.writeFileSync(path.join(root,"public","exercise-db","index.json"),"[]");const server=createApp({rootDir:root}).listen(0);await new Promise(r=>server.once("listening",r));t.after(()=>server.close());const base=`http://127.0.0.1:${server.address().port}`;
 async function request(route,{token,method="GET",body}={}){const response=await fetch(base+route,{method,headers:{...(token?{authorization:`Bearer ${token}`} :{}),...(body?{"content-type":"application/json"}:{})},body:body&&JSON.stringify(body)});return{response,json:await response.json().catch(()=>({}))}}
 await request("/api/auth/register",{method:"POST",body:{name:"Member One",email:"one@example.test",password:"password-one"}});await request("/api/auth/register",{method:"POST",body:{name:"Member Two",email:"two@example.test",password:"password-two"}});
 const login=async(email,password)=>(await request("/api/auth/login",{method:"POST",body:{email,password}})).json;
 const admin=await login("owner@example.test","admin-password"),one=await login("one@example.test","password-one");
 assert.equal((await request("/api/admin/members",{token:one.token})).response.status,403);assert.equal((await request("/api/admin/members?role=admin",{token:one.token})).response.status,403);
 const directory=await request("/api/admin/members?search=two%40example.test",{token:admin.token});assert.equal(directory.response.status,200);assert.equal(directory.json.data.members.length,1);const twoId=directory.json.data.members[0].userId;
 assert.equal((await request(`/api/admin/clients/${twoId}/overview`,{token:admin.token})).response.status,200);assert.equal((await request(`/api/admin/clients/${twoId}/overview`,{token:one.token})).response.status,403);
 const conversation=await request(`/api/admin/clients/${twoId}/conversation`,{token:admin.token,method:"POST",body:{}});assert.equal(conversation.response.status,201);assert.equal((await request(`/api/me/conversations/${conversation.json.data.id}/messages`,{token:one.token})).response.status,404);
 const conversationId=conversation.json.data.id;
 const adminMessage=await request(`/api/me/conversations/${conversationId}/messages`,{token:admin.token,method:"POST",body:{body:"Test message 1"}});assert.equal(adminMessage.response.status,201);assert.equal(adminMessage.json.data.senderUserId,admin.user.id);
 const client=await login("two@example.test","password-two");
 const clientConversations=await request("/api/me/conversations",{token:client.token});assert.equal(clientConversations.response.status,200);assert.equal(clientConversations.json.data.conversations.filter(item=>item.id===conversationId).length,1);
 const clientHistory=await request(`/api/me/conversations/${conversationId}/messages`,{token:client.token});assert.equal(clientHistory.response.status,200);assert.equal(clientHistory.json.data.messages[0].body,"Test message 1");
 const clientReply=await request(`/api/me/conversations/${conversationId}/messages`,{token:client.token,method:"POST",body:{body:"Test reply 1"}});assert.equal(clientReply.response.status,201);assert.equal(clientReply.json.data.senderUserId,twoId);
 const reused=await request(`/api/admin/clients/${twoId}/conversation`,{token:admin.token,method:"POST",body:{}});assert.equal(reused.json.data.id,conversationId);
 const adminHistory=await request(`/api/me/conversations/${conversationId}/messages`,{token:admin.token});assert.deepEqual(adminHistory.json.data.messages.map(message=>message.body),["Test message 1","Test reply 1"]);
});

test("messaging pages wait for canonical auth and use the configured API client",()=>{
 const root=path.join(__dirname,"..","public"),inboxHtml=fs.readFileSync(path.join(root,"inbox.html"),"utf8"),adminHtml=fs.readFileSync(path.join(root,"admin-client.html"),"utf8"),inbox=fs.readFileSync(path.join(root,"inbox.js"),"utf8"),admin=fs.readFileSync(path.join(root,"admin-client.js"),"utf8");
 for(const html of [inboxHtml,adminHtml]){assert.ok(html.indexOf("runtime-config.js")<html.indexOf("api-client.js"));assert.ok(html.indexOf("api-client.js")<html.indexOf("auth-state-runtime.js"));assert.ok(html.indexOf("auth-state-runtime.js")<html.indexOf(html===inboxHtml?"inbox.js":"admin-client.js"));}
 for(const source of [inbox,admin]){assert.match(source,/AuthStateRuntime\.whenReady\(\)/);assert.match(source,/MaatApiClient\.request/);assert.doesNotMatch(source,/localStorage\.getItem\("authToken"\)|sessionStorage\.getItem\("authToken"\)/);assert.doesNotMatch(source,/fetch\(/);assert.match(source,/Unable to load messages\. Please try again\./);}
 assert.match(inbox,/Array\.isArray\(data\?\.conversations\)/);assert.match(inbox,/encodeURIComponent\(String\(value\)\)/);assert.match(admin,/conversation\.find_or_create/);
});
