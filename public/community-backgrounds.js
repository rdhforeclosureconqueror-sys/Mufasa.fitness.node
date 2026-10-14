(()=>{"use strict";
const root=document.documentElement;
if(root.dataset.communityBackground==="off")return;
const items=(window.MileleCommunityBackgrounds||[]).filter(p=>typeof p==="string"&&/^\/[a-zA-Z0-9_./-]+\.(?:jpg|jpeg|png|webp)$/i.test(p)&&!p.includes(".."));
if(!items.length)return;
const key="milele.community.background.last.v1";
let previous=-1;
try{previous=Number(sessionStorage.getItem(key));}catch(_){}
let index=Math.floor(Math.random()*items.length);
if(items.length>1&&index===previous)index=(index+1+Math.floor(Math.random()*(items.length-1)))%items.length;
const img=new Image();
img.onload=()=>{root.style.setProperty("--milele-community-photo",'url("'+items[index]+'")');root.classList.add("milele-community-bg");try{sessionStorage.setItem(key,String(index));}catch(_){}};
img.onerror=()=>{root.classList.remove("milele-community-bg");};
img.src=items[index];
})();
