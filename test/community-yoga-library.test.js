"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const path=require("node:path");
const root=path.join(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("Community Hub links to the yoga practice library",()=>{
 assert.match(read("public/community-hub.html"),/href="\/community-yoga-library\.html"/);
});
test("Community yoga is instruction-first and keeps GIF slots unpublished",()=>{
 const html=read("public/community-yoga-library.html"),js=read("public/community-yoga-library.js");
 assert.match(html,/community-yoga-library\.js/);
 assert.match(html,/id="poseMedia"/);
 assert.match(js,/"mountain":"\/media\/yoga\/mountain-pose-v1\.svg"/);
 assert.doesNotMatch(html,/three\.module|MoveNet|motion-lab/);
});
test("Community yoga catalog matches canonical sessions and pose IDs",()=>{
 const js=read("public/community-yoga-library.js");
 const canonical=require("../data/yoga/sessions.v1.json").sessions;
 const poses=require("../data/yoga/poses.v1.json").poses;
 const match=js.match(/const flows=(\[[^;]+\]);/);
 assert.ok(match,"embedded flow registry exists");
 const flows=JSON.parse(match[1]);
 assert.deepEqual(flows.map(f=>f.id),canonical.map(f=>f.id));
 for(let i=0;i<flows.length;i++){
  assert.deepEqual(flows[i].poses,canonical[i].poses.map(p=>({id:p.poseId,holdSeconds:p.holdSeconds,restSeconds:p.restSeconds,transition:p.transition})));
 }
 for(const f of flows)for(const p of f.poses)assert.ok(poses.some(x=>x.id===p.id));
});
