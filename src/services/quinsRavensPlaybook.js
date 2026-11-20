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
const base=Object.fromEntries(Array.from({length:15},(_,i)=>[i+1,[42+(i%5)*29,52+Math.floor(i/5)*61]]));
const offsets={
 scrum:{9:[105,120],10:[145,120],12:[180,130],14:[115,192]},
 unders:{12:[222,130],7:[197,105],8:[201,153]},
 ruck1:{12:[225,130],7:[213,108],8:[213,151],9:[163,131],6:[166,153]},
 jets:{4:[221,65],5:[223,189],1:[199,40],2:[207,82],3:[215,103],11:[184,209]},
 roll:{9:[188,130],10:[236,130]},
 wedge10:{10:[255,130],13:[277,106],6:[245,160]},
 wedge6:{6:[277,161],15:[294,139],11:[283,187],14:[315,204]},
 edge:{14:[339,204],6:[308,182],11:[313,221]},
 ruck2:{14:[339,204],6:[325,183],11:[326,221]},
 flash:{1:[254,40],2:[260,80],3:[270,105],11:[287,151]}
};
function coordinates(id){const p=Object.fromEntries(Object.entries(base).map(([n,v])=>[n,[...v]]));const order=['scrum','unders','ruck1','jets','roll','wedge10','wedge6','edge','ruck2'];for(const k of order){Object.assign(p,offsets[k]);if(k===id)break;}if(id==='flash')Object.assign(p,offsets.flash);return p;}
function getPlay(branch='wedge'){
 if(!['wedge','flash'].includes(branch))throw new Error('Unsupported RAVENS branch');
 const selected=branch==='flash'?[...stages.slice(0,4),['flash','FLASH OPTION','FLASH is available off Ruck 1 after decoy JETS develop. Detailed carrier sequence requires diagram confirmation.',null,[1,2,3,11]]]:stages;
 return {id:'ravens-mf',branch,coachApproved:true,geometry:'illustrative-pending-original-pdf',attackDirection:'left-to-right',stages:selected.map(([id,title,instruction,ballCarrier,active],i)=>({id,title,instruction,ballCarrier,active,step:i+1,positions:coordinates(id)}))};
}
module.exports={getPlay};
