(()=>{"use strict";
const $=id=>document.getElementById(id);
const choices={
 interests:{yoga:"Yoga",meditation:"Meditation",sound_healing:"Sound healing",pranayama:"Breathwork",fitness:"Fitness",nutrition:"Nutrition",community:"Community"},
 goals:{make_friends:"Make friends",reduce_stress:"Reduce stress",build_consistency:"Consistency",mindfulness:"Mindfulness",strength:"Strength",confidence:"Confidence",recovery:"Recovery"}
};
function renderOptions(key,element){Object.entries(choices[key]).forEach(([value,label])=>{const wrap=document.createElement("label");const input=document.createElement("input");input.type="checkbox";input.name=key;input.value=value;wrap.append(input,document.createTextNode(label));$(element).append(wrap);});}
renderOptions("interests","interestChoices");renderOptions("goals","goalChoices");
const form=$("communityCardForm"),status=$("status"),save=$("saveCard");
let viewer=null,chosenClip=null;
function checked(key){return [...form.querySelectorAll('input[name="'+key+'"]:checked')].map(e=>e.value);}
function paintChips(id,list,key){const parent=$(id);parent.replaceChildren();list.forEach(v=>{const e=document.createElement("span");e.className="chip";e.textContent=choices[key][v]||v;parent.append(e);});}
function preview(){$("previewName").textContent=$("displayName").value.trim()||"Your community name";$("previewBio").textContent=$("bioShort").value.trim()||"Your story starts here.";paintChips("previewInterests",checked("interests"),"interests");paintChips("previewGoals",checked("goals"),"goals");$("previewPrivacy").textContent=$("visibility").value==="members"?"Visible to signed-in community members":"Private — only you can see this card";}
form.addEventListener("input",e=>{if(e.target.type==="checkbox"){const list=checked(e.target.name);if(list.length>3){e.target.checked=false;status.textContent="Choose up to three in each section.";}}preview();});
const backend=()=>window.MaatApiClient?.origin?.()||window.MAAT_BACKEND_ORIGIN||"https://mufasa-fitness-node.onrender.com";
const login=()=>location.replace("/login.html?returnTo="+encodeURIComponent(location.pathname));
async function auth(){await window.AuthStateRuntime?.whenReady?.();const token=window.AuthStateRuntime?.getAuthToken?.()||window.APP_AUTH?.token;if(!token){login();throw Error("Sign in required");}return token;}
async function api(path,options={}){const token=await auth();const response=await fetch(new URL(path,backend()),{method:options.method||"GET",headers:{"Authorization":"Bearer "+token,...(options.body?{"Content-Type":"application/json"}:{})},body:options.body,cache:"no-store",credentials:"omit"});if(response.status===401){login();throw Error("Your session expired");}const result=await response.json().catch(()=>({}));if(!response.ok)throw Error(result.error?.message||result.message||"Card request failed");return result.data||result;}
function apply(card){if(!card)return;chosenClip=typeof card.animationClip==="string"?card.animationClip:null;$("displayName").value=card.displayName||"";$("bioShort").value=card.bioShort||"";$("visibility").value=card.visibility==="members"?"members":"private";for(const key of ["interests","goals"]){const selected=new Set(card[key]||[]);form.querySelectorAll('input[name="'+key+'"]').forEach(e=>e.checked=selected.has(e.value));}preview();}
form.addEventListener("submit",async e=>{e.preventDefault();save.disabled=true;status.textContent="Saving your card…";try{const payload={displayName:$("displayName").value,bioShort:$("bioShort").value,interests:checked("interests"),goals:checked("goals"),visibility:$("visibility").value,animationClip:chosenClip};const data=await api("/api/me/community-card",{method:"PUT",body:JSON.stringify(payload)});apply(data.card);status.textContent="Your Community ID is saved!";}catch(err){status.textContent=err.message;}finally{save.disabled=false;}});
async function loadAvatar(){
 const message=$("avatarStatus"),select=$("avatarAnimation"),container=$("avatarSpace"),fallback=$("avatarFallback");
 try {
   const token=await auth(),data=await api("/api/me/profile");
   const modelUrl=data.profile?.avatar?.avatarModelUrl || data.avatar?.avatarModelUrl;
   if(!window.MileleCommunityAvatar?.allowedAvatarPath(modelUrl)){
     message.textContent="No saved avatar found. Create or upload one through PocketPT.";return;
   }
   viewer?.dispose();container.querySelectorAll("canvas").forEach(c=>c.remove());
   viewer=window.MileleCommunityAvatar.create({
     container,token,backend:backend(),preferredClip:chosenClip||"",
     reducedMotion:window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches===true,
     onClips:clips=>{
       select.replaceChildren();
       for(const clip of clips){const option=document.createElement("option");option.value=clip.name;option.textContent=clip.name;select.append(option);}
       select.disabled=clips.length<2;
       if(clips.length)select.value=clips.some(c=>c.name===chosenClip)?chosenClip:clips[0].name;
     },
     onStatus:code=>{message.textContent=({
       playing:"Playing your avatar's own animation.",
       "static-avatar":"Your avatar is ready; no embedded animation was found.",
       "clip-incompatible":"This animation is incompatible with the saved avatar.",
       "avatar-load-failed":"Could not load your saved avatar. You can still use your card.",
       "renderer-unavailable":"3D preview is unavailable on this device.",
       "reduced-motion":"Animation is paused for your reduced-motion preference."
     })[code]||"Avatar status: "+code;}
   });
   const result=await viewer.start(modelUrl);
   if(["playing","static-avatar"].includes(result.status))fallback.hidden=true;
 } catch(error){message.textContent="Avatar unavailable: "+error.message; }
}
$("avatarAnimation").addEventListener("change",e=>{
 if(!viewer)return;
 const result=viewer.selectClip(e.target.value);
 if(result.status==="playing"){chosenClip=e.target.value;status.textContent="Animation selected. Tap Save My Card to keep it.";}
});
window.addEventListener("pagehide",()=>viewer?.dispose(),{once:true});
(async()=>{try{const data=await api("/api/me/community-card");apply(data.card);save.disabled=false;status.textContent=data.card?"Your saved card is ready to edit.":"Your private Community ID is ready to create.";await loadAvatar();}catch(err){status.textContent=err.message;}})();
})();