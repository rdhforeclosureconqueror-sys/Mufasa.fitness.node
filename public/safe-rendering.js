"use strict";
(function(root){
  const UNSAFE_SCHEME=/^(?:javascript|data):/i;
  function setText(node,value){ node.textContent=value==null?"":String(value); return node; }
  function normalizedScheme(value){return String(value||"").replace(/[\u0000-\u0020\u007f-\u009f]/g,"").trim();}
  function safeUrl(value,{allowDataImage=false}={}){const url=String(value||"").trim(),candidate=normalizedScheme(url);if(!url||UNSAFE_SCHEME.test(candidate)&&!(allowDataImage&&/^data:image\/(?:png|jpeg|gif|webp);base64,[a-z0-9+/=]+$/i.test(candidate)))throw new TypeError("Unsafe URL");return url;}
  const api={setText,safeUrl}; if(typeof module!=="undefined"&&module.exports)module.exports=api;root.MufasaSafeRendering=api;
})(typeof globalThis!=="undefined"?globalThis:this);
