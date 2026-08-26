const fs=require("node:fs");
const path=require("node:path");

const root=path.resolve(__dirname,"..");
const source=path.join(root,"public");
const output=path.resolve(process.env.FRONTEND_BUILD_OUTPUT||path.join(root,"dist"));
const token="__MUFASA_VITE_GOOGLE_MAPS_BROWSER_API_KEY__";
const browserKey=String(process.env.VITE_GOOGLE_MAPS_BROWSER_API_KEY||"").trim();
const {execFileSync}=require("node:child_process");

function safeCommit(value){return /^[a-f0-9]{7,40}$/i.test(String(value||""))?String(value):null;}
function repositoryCommit(){
  const configured=safeCommit(process.env.RENDER_GIT_COMMIT||process.env.GIT_COMMIT);
  if(configured)return configured;
  try{return safeCommit(execFileSync("git",["rev-parse","HEAD"],{cwd:root,encoding:"utf8"}).trim());}catch{return null;}
}

if(!browserKey)throw new Error("VITE_GOOGLE_MAPS_BROWSER_API_KEY is required for the frontend production build");
fs.rmSync(output,{recursive:true,force:true});
fs.cpSync(source,output,{recursive:true});
const commit=repositoryCommit();
const build=process.env.FRONTEND_BUILD_VERSION||commit||"local-unversioned";
const generatedAt=new Date().toISOString();
const workoutPath=path.join(output,"workout.html");
fs.writeFileSync(workoutPath,fs.readFileSync(workoutPath,"utf8")
  .replaceAll("__FRONTEND_BUILD_VERSION__",()=>build)
  .replaceAll("__FRONTEND_COMMIT__",()=>commit||"unknown"));
fs.writeFileSync(path.join(output,"__frontend-version.json"),JSON.stringify({
  schemaVersion:1,service:"frontend",build,commit,generatedAt,sourceDirectory:"public"
},null,2)+"\n");
const mapPath=path.join(output,"trail-map.js");
const sourceText=fs.readFileSync(mapPath,"utf8");
if(!sourceText.includes(token))throw new Error("Frontend browser-key build token is missing");
fs.writeFileSync(mapPath,sourceText.replaceAll(token,()=>browserKey));
console.log(`Frontend static artifact built at ${output} from public (build ${build}; browser Maps key present; value redacted)`);
