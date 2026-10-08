(()=>{'use strict';
const NS='http://www.w3.org/2000/svg';
const specs=[
{name:'Root',petals:4,color:'#cf4147',label:'Muladhara',seed:'लं'},
{name:'Sacral',petals:6,color:'#ed903b',label:'Svadhisthana',seed:'वं'},
{name:'Solar Plexus',petals:10,color:'#e6be3c',label:'Manipura',seed:'रं'},
{name:'Heart',petals:12,color:'#5ebd8a',label:'Anahata',seed:'यं'},
{name:'Throat',petals:16,color:'#4aa8ed',label:'Vishuddha',seed:'हं'},
{name:'Third Eye',petals:2,color:'#8274cf',label:'Ajna',seed:'ॐ'},
{name:'Crown',petals:32,color:'#b891dc',label:'Sahasrara',seed:'ॐ'}
];
function node(name,attrs={}){const e=document.createElementNS(NS,name);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,String(v));return e}
function renderChakraSymbol(index){const info=specs[index];if(!info)return;const holder=document.getElementById('chakra-art');if(!holder)return;const svg=node('svg',{viewBox:'0 0 240 240',xmlns:NS,'aria-hidden':'true',focusable:'false'});const g=node('g',{transform:'translate(120 120)'});const n=info.petals;for(let i=0;i<n;i++){const petal=node('path',{d:n>20?'M 0 -112 Q 15 -95 0 -69 Q -15 -95 0 -112 Z':'M 0 -111 C -24 -99 -23 -78 0 -61 C 23 -78 24 -99 0 -111 Z',fill:info.color,'fill-opacity':'.55',stroke:info.color,'stroke-width':2,transform:'rotate('+(360*i/n)+')'});g.append(petal)}
g.append(node('circle',{r:60,fill:info.color,'fill-opacity':'.35',stroke:info.color,'stroke-width':3}));g.append(node('circle',{r:51,fill:'#171b21',stroke:info.color,'stroke-width':1.5}));
if(index===4){g.append(node('circle',{r:38,fill:'none',stroke:info.color,'stroke-width':1.8}));g.append(node('polygon',{points:'-40,-30 40,-30 0,40',fill:'none',stroke:info.color,'stroke-width':2.5}));}
else if(index===3){g.append(node('polygon',{points:'0,-42 38,26 -38,26',fill:'none',stroke:info.color,'stroke-width':2}));g.append(node('polygon',{points:'0,42 38,-26 -38,-26',fill:'none',stroke:info.color,'stroke-width':2}));}
else if(index===0||index===2){g.append(node('polygon',{points:index===0?'-35,-35 35,-35 35,35 -35,35':'-37,-22 37,-22 0,42',fill:'none',stroke:info.color,'stroke-width':2}));}
else g.append(node('circle',{r:37,fill:'none',stroke:info.color,'stroke-width':1.5}));
const text=node('text',{'text-anchor':'middle','dominant-baseline':'middle',fill:info.color,'font-size':index===6?28:25,'font-family':'serif'});text.textContent=info.seed;g.append(text);svg.append(g);holder.replaceChildren(svg);const snapshot=document.getElementById('snapshot-symbol');if(snapshot){snapshot.replaceChildren(svg.cloneNode(true));snapshot.setAttribute('aria-label',info.label+' chakra symbol')}holder.style.setProperty('--chakra-glow',info.color);holder.setAttribute('aria-label',info.label+' chakra lotus symbol, '+info.petals+' stylized petals');const caption=document.getElementById('chakra-art-caption');if(caption)caption.textContent=info.label+' · '+info.name+' chakra'}
window.MileleChakraSymbols={render:renderChakraSymbol,specs};
})();