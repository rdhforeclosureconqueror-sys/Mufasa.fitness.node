"use strict";
(function(root){
  const UNSAFE_URL=/^[\u0000-\u0020]*(?:javascript|data):/i;
  function setText(node,value){ node.textContent=value==null?"":String(value); return node; }
  function safeUrl(value,{allowDataImage=false}={}){const url=String(value||"").trim();if(!url||UNSAFE_URL.test(url)&&!(allowDataImage&&/^data:image\/(?:png|jpeg|gif|webp);base64,/i.test(url)))throw new TypeError("Unsafe URL");return url;}
  const api={setText,safeUrl}; if(typeof module!=="undefined"&&module.exports)module.exports=api;root.MufasaSafeRendering=api;
})(typeof globalThis!=="undefined"?globalThis:this);
