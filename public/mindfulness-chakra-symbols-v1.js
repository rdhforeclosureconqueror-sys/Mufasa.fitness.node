(()=>{'use strict';
const specs=[
{name:'Root',label:'Muladhara',seed:'लं',card:'root.jpeg'},
{name:'Sacral',label:'Svadhisthana',seed:'वं',card:'sacral.jpeg'},
{name:'Solar Plexus',label:'Manipura',seed:'रं',card:'solar-plexus.jpeg'},
{name:'Heart',label:'Anahata',seed:'यं',card:'heart.jpeg'},
{name:'Throat',label:'Vishuddha',seed:'हं',card:'throat.jpeg'},
{name:'Third Eye',label:'Ajna',seed:'ॐ',card:'third-eye.jpeg'},
{name:'Crown',label:'Sahasrara',seed:'ॐ',card:'crown.jpeg'}
];
function image(info,cls){const node=new Image();node.src='/assets/chakras/'+info.card;node.alt=info.name+' chakra teaching card';node.className=cls;return node}
function render(index){const info=specs[index];if(!info)return;const pacMode=new URLSearchParams(location.search).get('community')==='pac';const snapshot=document.getElementById('snapshot-symbol');if(snapshot&&!pacMode){snapshot.replaceChildren(image(info,'snapshot-card-image'));snapshot.setAttribute('aria-label',info.name+' chakra teaching card')}const holder=document.getElementById('chakra-art');if(holder){holder.replaceChildren(image(info,'chakra-card-image'));holder.setAttribute('aria-label',info.name+' chakra teaching card')}const caption=document.getElementById('chakra-art-caption');if(caption)caption.textContent=info.label+' · '+info.name+' chakra'}
window.MileleChakraSymbols={render,specs};
})();
