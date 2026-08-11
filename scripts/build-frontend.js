const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const source=path.join(root,"public");
const output=path.resolve(process.env.FRONTEND_BUILD_OUTPUT||path.join(root,"dist"));
const token="__MUFASA_VITE_GOOGLE_MAPS_BROWSER_API_KEY__";
const browserKey=String(process.env.VITE_GOOGLE_MAPS_BROWSER_API_KEY||"").trim();

if(!browserKey)throw new Error("VITE_GOOGLE_MAPS_BROWSER_API_KEY is required for the frontend production build");
fs.rmSync(output,{recursive:true,force:true});
fs.cpSync(source,output,{recursive:true});
const mapPath=path.join(output,"trail-map.js");
const sourceText=fs.readFileSync(mapPath,"utf8");
if(!sourceText.includes(token))throw new Error("Frontend browser-key build token is missing");
fs.writeFileSync(mapPath,sourceText.replaceAll(token,()=>browserKey));
console.log(`Frontend static artifact built at ${output} (browser Maps key present; value redacted)`);
