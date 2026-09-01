"use strict";
const test=require("node:test");const assert=require("node:assert/strict");const fs=require("fs");const path=require("path");const root=path.resolve(__dirname,"..");
const read=p=>fs.readFileSync(path.join(root,p),"utf8");
test("Free Run Club UI uses a real image file picker and explicit post status",()=>{const html=read("public/free-run-club.html");assert.match(html,/type="file"/);assert.match(html,/accept="image\/jpeg,image\/png,image\/webp"/);assert.match(html,/id="postStatus"/);assert.doesNotMatch(html,/Optional image URL/);});
test("browser resizes photos locally and sends bounded imageData",()=>{const js=read("public/free-run-club.js");assert.match(js,/resizePhoto/);assert.match(js,/canvas\.toDataURL\("image\/jpeg",\.8\)/);assert.match(js,/imageData/);assert.match(js,/Posted ✓/);assert.match(js,/Not posted:/);});
test("service validates image data and preserves 24-hour expiry",()=>{const service=read("src/services/freeRunClubCommunityService.js");assert.match(service,/MAX_IMAGE_DATA_LENGTH/);assert.match(service,/data:image\\\/\(jpeg\|png\|webp\);base64/);assert.match(service,/expiresAt:iso\(clock\(\)\+DAY_MS\)/);assert.match(service,/board_media_bounds/);});
