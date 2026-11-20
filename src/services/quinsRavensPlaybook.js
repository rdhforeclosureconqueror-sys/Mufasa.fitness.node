"use strict";
// Coach-supplied Lesson 003: RAVENS MF. The coordinates below are illustrative,
// NOT a transcription of the original Quinnnn(1).pdf artwork.
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
// Illustrative LHS scrum: front row 1/2/3, locks 4/5, back row 6/7/8.
// These are coaching-layout approximations, not traced PDF geometry.
const base={
 1:[72,108],2:[72,130],3:[72,152],
 4:[52,119],5:[52,141],6:[32,104],7:[32,156],8:[32,130],
 9:[104,130],10:[142,116],11:[165,50],12:[174,139],
 13:[205,113],14:[232,191],15:[240,75]
};
const offsets={
 scrum:{},
 unders:{9:[128,127],10:[160,115],12:[207,139],7:[176,170],8:[172,111]},
 ruck1:{12:[218,139],7:[204,166],8:[204,112],9:[151,129],6:[167,188],10:[180,94]},
 jets:{4:[170,68],5:[171,211],1:[120,46],2:[136,75],3:[143,103],11:[226,227],9:[156,139]},
 roll:{9:[174,139],10:[227,115]},
 wedge10:{10:[250,115],13:[280,82],6:[235,174]},
 wedge6:{6:[279,170],15:[308,128],11:[294,209],14:[338,235]},
 edge:{14:[353,235],6:[312,183],11:[324,218]},
 ruck2:{14:[353,235],6:[325,183],11:[328,219]},
 flash:{1:[240,46],2:[252,75],3:[259,103],11:[285,212]}
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
 return {id:'ravens-mf',branch,coachApproved:true,geometry:'illustrative-pending-original-pdf',attackDirection:'left-to-right',stages:selected.map(([id,title,instruction,ballCarrier,active],i)=>({id,title,instruction,ballCarrier,active,step:i+1,positions:coordinates(id)}))};
}
module.exports={getPlay};
