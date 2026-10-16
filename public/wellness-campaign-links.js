(()=>{"use strict";
  // Navigation-only attribution. No cookies, persistent identifiers, analytics calls or PII.
  const input=new URLSearchParams(window.location.search);
  const allow={utm_source:/^[a-z0-9_-]{1,40}$/,utm_medium:/^[a-z0-9_-]{1,40}$/,utm_campaign:/^[a-z0-9_-]{1,64}$/,campaign:/^[A-Za-z0-9_-]{1,40}$/,eventId:/^[a-zA-Z0-9_-]{1,80}$/};
  const safe=new URLSearchParams();
  for(const [key,pattern] of Object.entries(allow)){
    const values=input.getAll(key);
    if(values.length===1&&pattern.test(values[0]))safe.set(key,values[0]);
  }
  if(!safe.size)return;
  document.querySelectorAll('nav.links[aria-label="Choose your next step"] a[href]').forEach(anchor=>{
    const url=new URL(anchor.getAttribute("href"),window.location.origin);
    if(url.origin!==window.location.origin)return;
    for(const [key,value] of safe)if(!url.searchParams.has(key))url.searchParams.set(key,value);
    anchor.setAttribute("href",url.pathname+url.search+url.hash);
  });
})();
