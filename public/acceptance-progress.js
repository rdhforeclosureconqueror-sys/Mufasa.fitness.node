"use strict";
(function(){
 const entries={business:{label:"Business OS synthetic",total:3},routes:{label:"Browser route checks",total:7},synthetic:{label:"Isolated customer simulation",total:9}};
 const list=document.getElementById("acceptance-progress-list"),failure=document.getElementById("acceptance-first-failure");
 if(!list)return;
 const values={};
 function render(){
  list.replaceChildren();
  for(const [type,config] of Object.entries(entries)){
   const item=document.createElement("li"),result=values[type];
   item.textContent=config.label+" · "+(result?(result.passed?"PASS":"FAIL")+" · "+result.count+"/"+result.total+" · "+result.timestamp:"Not run in this session")+" · "+(type==="routes"?"Route reachability only":type==="synthetic"?"Temporary service-level fixtures":"Business OS simulation");
   item.className=result?(result.passed?"pass":"fail"):"muted";list.append(item);
  }
  const failed=Object.entries(values).find(([,value])=>!value.passed);
  failure.textContent=failed?"First failure: "+failed[0]+" / "+(failed[1].firstFailure||"See full report"):"No failure reported in this session. This is not full end-to-end certification.";
 }
 window.addEventListener("milele-acceptance-result",event=>{
  const detail=event.detail;if(!detail||!entries[detail.type])return;
  values[detail.type]={...detail,timestamp:new Date().toLocaleString()};render();
 });
 render();
})();
