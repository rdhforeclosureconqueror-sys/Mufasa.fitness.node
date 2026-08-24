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
});
