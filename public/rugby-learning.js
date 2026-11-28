'use strict';
(()=>{
 for(const input of document.querySelectorAll('[data-card-search]')){
  const section=input.closest('section'),cards=[...section.querySelectorAll('[data-search-card]')],status=section.querySelector('[data-search-status]');
  input.addEventListener('input',()=>{const query=input.value.trim().toLocaleLowerCase();let count=0;for(const card of cards){card.hidden=!card.textContent.toLocaleLowerCase().includes(query);if(!card.hidden)count++;}status.textContent=count+' guide'+(count===1?'':'s')+' shown.';});
 }
 for(const select of document.querySelectorAll('[data-cohort-filter]'))select.addEventListener('change',()=>{for(const card of select.closest('section').querySelectorAll('[data-cohort]'))card.hidden=select.value!=='all'&&card.dataset.cohort!==select.value;});
 const button=document.querySelector('.listen'),status=document.querySelector('.speech-status');let reading=false;
 if(button&&'speechSynthesis' in window&&'SpeechSynthesisUtterance' in window){
  button.hidden=false;
  button.addEventListener('click',()=>{
   if(reading){window.speechSynthesis.cancel();reading=false;button.textContent='Listen to this guide';status.textContent='Reading stopped.';return;}
   const scope=document.querySelector('main').cloneNode(true);
   for(const el of scope.querySelectorAll('nav,button,input,select,script,[hidden],.speech-status'))el.remove();
   const utterance=new window.SpeechSynthesisUtterance(scope.textContent.replace(/\s+/g,' ').trim());
   utterance.onend=()=>{reading=false;button.textContent='Listen to this guide';status.textContent='Reading finished.';};
   utterance.onerror=()=>{reading=false;button.textContent='Listen to this guide';status.textContent='Reading unavailable. You can read the guide below.';};
   reading=true;button.textContent='Stop reading';status.textContent='Reading this guide aloud.';window.speechSynthesis.cancel();window.speechSynthesis.speak(utterance);
  });
  window.addEventListener('pagehide',()=>window.speechSynthesis.cancel());
 }
})();
