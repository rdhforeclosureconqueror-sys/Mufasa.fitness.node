(()=>{'use strict';
const out=document.getElementById('affirmation-collection'),tabs=document.getElementById('affirmation-chakra-tabs'),jump=document.getElementById('affirmation-chakra-jump');
if(!out||!tabs)return;
fetch('/mindfulness-affirmation-library-v1.json').then(r=>{if(!r.ok)throw Error('Content unavailable');return r.json()}).then(data=>{
const keys=Object.keys(data.sets||{});if(!keys.length)throw Error('No affirmations');
let selected=keys[0],index=0;
function render(){
 const items=data.sets[selected]||[];out.replaceChildren();
 const title=document.createElement('h3');title.textContent=selected;out.append(title);
 if(!items.length){out.append('No affirmations available.');return}
 index=(index+items.length)%items.length;
 const wrap=document.createElement('div');wrap.className='affirmation-browser';
 const prev=document.createElement('button');prev.type='button';prev.textContent='←';prev.setAttribute('aria-label','Previous affirmation');
 const message=document.createElement('p');message.textContent=items[index];message.setAttribute('aria-live','polite');
 const next=document.createElement('button');next.type='button';next.textContent='→';next.setAttribute('aria-label','Next affirmation');
 prev.addEventListener('click',()=>{index--;render()});next.addEventListener('click',()=>{index++;render()});
 wrap.append(prev,message,next);out.append(wrap);
 const count=document.createElement('p');count.className='muted small';count.textContent='Affirmation '+(index+1)+' of '+items.length;out.append(count);
 for(const b of tabs.children)b.setAttribute('aria-pressed',String(b.dataset.chakra===selected));
 if(jump)jump.value=selected;
}
function choose(key){selected=key;index=0;render()}
for(const key of keys){
 const b=document.createElement('button');b.type='button';b.textContent=key;b.dataset.chakra=key;b.addEventListener('click',()=>choose(key));tabs.append(b);
 if(jump){const o=document.createElement('option');o.value=key;o.textContent=key;jump.append(o)}
}
if(jump)jump.addEventListener('change',()=>choose(jump.value));
render();
}).catch(()=>{out.textContent='Affirmation library temporarily unavailable. Please try again.'});
})();