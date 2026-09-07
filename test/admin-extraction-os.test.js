"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");

const root=path.join(__dirname,"..");
const html=fs.readFileSync(path.join(root,"public/admin-extraction.html"),"utf8");
const js=fs.readFileSync(path.join(root,"public/admin-extraction.js"),"utf8");
const css=fs.readFileSync(path.join(root,"public/admin-extraction.css"),"utf8");
const launch=fs.readFileSync(path.join(root,"public/admin-launch-readiness.html"),"utf8");
const contract=fs.readFileSync(path.join(root,"docs/EXTRACTION_OS_POCKET_PT_V1.md"),"utf8");

test("Extraction OS is linked from the existing admin launch command center",()=>{
  assert.match(launch,/href="\/admin-extraction\.html"/);
  assert.match(launch,/>Extraction OS<\/a>/);
  assert.match(html,/href="\/admin-launch-readiness\.html"/);
});

test("Extraction OS uses the existing privileged readiness API and does not invent a second auth header",()=>{
  assert.match(js,/MaatApiClient\.request\("\/api\/admin\/launch-readiness"\)/);
  assert.doesNotMatch(js,/Authorization\s*:/i);
  assert.match(js,/document\.body\.classList\.add\("extraction-authorized"\)/);
  assert.match(css,/body:not\(\.extraction-authorized\) main>section:not\(#access-status\)\{display:none!important\}/);
});

test("Pocket PT V1 scope explicitly cuts avatar and Godot from the launch dependency",()=>{
  assert.match(js,/Avatar \/ full live mirror/);
  assert.match(js,/Godot gym \/ Push-Up Arena world/);
  assert.match(js,/not allowed to block Pocket PT V1/);
  assert.match(contract,/Avatar \/ full live mirror\./);
  assert.match(contract,/Godot gym \/ Push-Up Arena world\./);
});

test("Extraction OS contains product, delivery, market, and Voice-of-the-People gates",()=>{
  for(const text of ["Product gate","Delivery gate","Market gate","Voice of the People","Marketing Contract","Launch decision"]){
    assert.match(html,new RegExp(text,"i"));
  }
  assert.match(js,/Reach → visit → register → onboard → first workout → return → pay → refer/);
  assert.match(js,/first point where actual behavior stopped matching the intended journey/i);
});

test("Extraction OS keeps human-required readiness under human authority",()=>{
  assert.match(html,/Human-required acceptance remains human authority/);
  assert.match(contract,/Human-required acceptance remains human authority/);
  assert.doesNotMatch(js,/humanVerified\s*=\s*true/);
});

test("V1 operator planning state is separated from canonical readiness evidence",()=>{
  assert.match(js,/pocketpt\.extractionOS\.v1/);
  assert.match(contract,/operator planning state, not canonical readiness evidence/i);
  assert.match(contract,/Cross-device\/server persistence can be added after the launch cycle proves/i);
});
