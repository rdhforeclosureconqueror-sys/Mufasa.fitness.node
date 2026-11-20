"use strict";
// Coach-supplied Lesson 003: RAVENS MF. Source-informed positions from supplied
// coach diagram screenshots; these are approximate, not pixel-traced PDF geometry.
const stages=[
 ["scrum","LHS EDGE SCRUM","Forwards win the scrum; right-side NUDGE preferred.",9,[1,2,3,4,5,6,7,8]],
 ["unders","#12 UNDERS CRASH","Backs run RAVENS; #12 takes the UNDERS crash option.",12,[9,10,12]],
 ["ruck1","RUCK 1","#7 and #8 clean for #12; #6 moves inside #10.",null,[12,7,8,6,10]],
 ["jets","DECOY JETS / FLASH SET","#4 and #5 run decoy JETS. #1/#2/#3 with #11 align for FLASH.",9,[4,5,1,2,3,11,9]],
 ["roll","#9 ROLL TO #10","#9 rolls or misses JETS and hits #10.",10,[9,10,4,5]],
 ["wedge10","#10 WEDGE","#10 runs WEDGE with #13 CRASH and #6 BACKDOOR.",6,[10,13,6]],
 ["wedge6","#6 DOUBLE WEDGE","#6 WEDGE with #15 CRASH, #11 BACKDOOR, then #14 wide.",14,[6,15,11,14]],
 ["edge","#14 EDGE CARRY","#14 carries to EDGE; #6 and #11 prepare to clean.",14,[14,6,11]],
 ["ruck2","RUCK 2","#6 and #11 clean for #14; EDGE / POWER / PUNCH / EDGE reorganize.",null,[14,6,11]]
];
// Source-informed reconstruction from the coach's three supplied screenshots.
// Diagram 1: LHS scrum; Diagram 2: Ruck 1 and JETS / WEDGE;
// Diagram 3: Ruck 2 and EDGE / PUNCH / POWER realignment.
// Jersey assignments are coach sourced; exact distances are approximate.
// Attack runs left-to-right on this teaching canvas.
const base={
 1:[70,102],2:[70,126],3:[70,150],
 4:[48,116],5:[48,140],6:[29,103],7:[29,154],8:[29,129],
 9:[112,151],10:[168,170],11:[128,206],12:[194,184],
 13:[230,190],14:[332,214],15:[265,202]
};
const offsets={
 scrum:{},
 unders:{12:[207,162],9:[133,149],10:[174,170],7:[177,150],8:[173,124]},
 ruck1:{12:[213,160],7:[194,148],8:[193,123],9:[217,181],6:[242,185],10:[248,169]},
 jets:{4:[258,120],5:[269,142],1:[123,95],2:[101,149],3:[146,120],11:[171,194],9:[217,181]},
 roll:{9:[225,177],10:[265,169]},
 wedge10:{10:[277,166],13:[302,142],6:[287,192]},
 wedge6:{6:[308,190],15:[330,171],11:[309,211],14:[350,223]},
 edge:{14:[352,213],6:[319,194],11:[331,222]},
 // Coach Diagram 3: left EDGE 1/2/12; PUNCH 8/3/15;
 // POWER 4/5/13; #9 at Ruck 2; #6/#11 clean for #14.
 ruck2:{1:[84,159],2:[67,201],12:[119,199],
 8:[169,159],3:[192,180],15:[216,190],
 4:[272,149],5:[253,131],13:[291,169],
 14:[350,185],6:[336,172],11:[340,202],
 9:[355,153],7:[146,174],10:[303,192]},
 flash:{1:[220,108],2:[198,155],3:[238,125],11:[257,193]}
};
function separate(p,locked){
 // Avoid unreadable overlapping jersey numbers while retaining approximate shape.
 const ids=Object.keys(p).map(Number);
 for(let iteration=0;iteration<18;iteration++){
  let changed=false;
  for(let a=0;a<ids.length;a++)for(let b=a+1;b<ids.length;b++){
   const i=ids[a],j=ids[b],dx=p[j][0]-p[i][0],dy=p[j][1]-p[i][1];
   const distance=Math.hypot(dx,dy);
   if(distance>=25)continue;
   const shift=(25-distance)/2+.3;
   const ux=distance>0?dx/distance:0,uy=distance>0?dy/distance:1;
   if(!locked.has(i)){p[i][0]-=ux*shift;p[i][1]-=uy*shift;}
   if(!locked.has(j)){p[j][0]+=ux*shift;p[j][1]+=uy*shift;}
   changed=true;
  }
  if(!changed)break;
 }
 for(const pos of Object.values(p)){pos[0]=Math.max(15,Math.min(375,Math.round(pos[0])));pos[1]=Math.max(54,Math.min(237,Math.round(pos[1])));}
 return p;
}
function coordinates(id){
 const p=Object.fromEntries(Object.entries(base).map(([n,v])=>[n,[...v]]));
 const order=['scrum','unders','ruck1','jets','roll','wedge10','wedge6','edge','ruck2'];
 for(const k of order){Object.assign(p,Object.fromEntries(Object.entries(offsets[k]).map(([n,v])=>[n,[...v]])));if(k===id)break;}
 if(id==='flash')Object.assign(p,offsets.flash);
 return separate(p,new Set(id==='scrum'?[1,2,3,4,5,6,7,8]:[]));
}
function getPlay(branch='wedge'){
 if(!['wedge','flash'].includes(branch))throw new Error('Unsupported RAVENS branch');
 const selected=branch==='flash'?[...stages.slice(0,4),['flash','FLASH OPTION','FLASH is available off Ruck 1 after decoy JETS develop. Detailed carrier sequence requires diagram confirmation.',null,[1,2,3,11]]]:stages;
 return {id:'ravens-mf',branch,coachApproved:true,geometry:'source-informed-approximate-from-coach-screenshots',attackDirection:'left-to-right',stages:selected.map(([id,title,instruction,ballCarrier,active],i)=>({id,title,instruction,ballCarrier,active,step:i+1,positions:coordinates(id)}))};
}
module.exports={getPlay};
