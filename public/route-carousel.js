const setInert=(node,value)=>{if("inert" in node)node.inert=value;else if(value)node.setAttribute("inert","");else node.removeAttribute("inert");};

/** A deterministic, non-queueing carousel state machine. All cards remain in the DOM. */
export function createRouteCarousel(root,{onChange=()=>{},onDiagnostic=()=>{}}={}){
  const cards=[...root.querySelectorAll(".route-option")];
  let selected=0,transitioning=false,frame=0;
  const diagnose=()=>{const fingerprints=new Set();const active=cards.filter(card=>card.classList.contains("is-active")&&!card.hidden);const duplicateFingerprints=cards.filter(card=>{const key=card.dataset.routeFingerprint;if(!key||!fingerprints.has(key)){fingerprints.add(key);return false;}return true;}).length;onDiagnostic("route_carousel_state",{routeCardCount:cards.length,activeRouteCardCount:active.length,selectedIndex:selected,duplicateRouteIds:cards.length-new Set(cards.map(card=>card.dataset.routeId)).size,duplicateFingerprints,carouselTransitionState:transitioning?"transitioning":"idle",visibleCardOverlapDetected:active.length!==1});};
  const apply=index=>{selected=(index+cards.length)%cards.length;cards.forEach((card,i)=>{const active=i===selected;card.classList.toggle("is-active",active);card.hidden=false;card.setAttribute("aria-hidden",String(!active));card.setAttribute("aria-selected",String(active));if(active)card.setAttribute("aria-current","true");else card.removeAttribute("aria-current");card.tabIndex=active?0:-1;setInert(card,!active);});root.querySelectorAll(".pagination-dots i").forEach((dot,i)=>dot.classList.toggle("active",i===selected));root.querySelector("[data-route-position]")?.replaceChildren(String(selected+1));diagnose();onChange(selected);};
  const select=index=>{cancelAnimationFrame(frame);transitioning=false;apply(index);transitioning=true;frame=requestAnimationFrame(()=>{transitioning=false;diagnose();});return selected;};
  if(!cards.length)throw new Error("Route carousel requires at least one card");
  apply(0);
  return{cards,select,get selected(){return selected;},cancel(){cancelAnimationFrame(frame);transitioning=false;apply(selected);},diagnose};
}
