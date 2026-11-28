export const COLORS = Object.freeze({primary:"#D4AF37",secondary:"#10B981",stabilizer:"#3B82F6",other:"#808080",unknown:"#808080"});
const roles=["primary","secondary","stabilizer"];
const sides=["left","right","bilateral","unspecified"];
export function resolveRegions(regions, mappings, status="unverified") {
  if (!Array.isArray(regions)||!Array.isArray(mappings)) throw new TypeError("Expected arrays");
  if (!["verified","unverified","missing"].includes(status)) throw new Error("Invalid status");
  const ids=new Set();
  for(const r of regions){
    if(!r.id||!r.muscleId||!["left","right","midline"].includes(r.side)||ids.has(r.id)) throw new Error("Invalid or duplicate region");
    ids.add(r.id);
  }
  const issues=[];
  const valid=[];
  for(const m of mappings){
    if(!m||!roles.includes(m.role)||!sides.includes(m.side)||!m.muscleId){issues.push({mapping:m,reason:"invalid_mapping"});continue;}
    if(!regions.some(r=>r.muscleId===m.muscleId&&(m.side==="bilateral"||m.side==="unspecified"||m.side===r.side))){issues.push({mapping:m,reason:"no_visible_region"});continue;}
    valid.push(m);
  }
  return {status,issues,regions:regions.map(r=>{
    const matches=valid.filter(m=>m.muscleId===r.muscleId&&(m.side==="bilateral"||m.side==="unspecified"||m.side===r.side));
    const role=status==="missing"?"unknown":roles.find(role=>matches.some(m=>m.role===role))||(status==="verified"&&!issues.length?"other":"unknown");
    return {...r,role,color:COLORS[role],sideUnspecified:matches.some(m=>m.side==="unspecified")};
  })};
}
export function paintRegions(svg, result, onSelect=()=>{}) {
  const nodes=[...svg.querySelectorAll("[data-region-id]")];
  const lookup=new Map(result.regions.map(r=>[r.id,r]));
  if(nodes.length!==lookup.size||new Set(nodes.map(n=>n.getAttribute("data-region-id"))).size!==nodes.length||nodes.some(n=>!lookup.has(n.getAttribute("data-region-id")))) throw new Error("Asset region mismatch");
  const cleanup=[];
  for(const node of nodes){
    const r=lookup.get(node.getAttribute("data-region-id"));
    node.setAttribute("fill",r.color);
    node.setAttribute("role","button");
    node.setAttribute("tabindex","0");
    node.setAttribute("aria-label",r.muscleId+" "+r.side+": "+r.role+(result.status!=="verified"?", unverified":""));
    const click=()=>onSelect(r);
    const key=e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();click();}};
    node.addEventListener("click",click);node.addEventListener("keydown",key);
    cleanup.push(()=>{node.removeEventListener("click",click);node.removeEventListener("keydown",key);});
  }
  return ()=>cleanup.forEach(fn=>fn());
}
