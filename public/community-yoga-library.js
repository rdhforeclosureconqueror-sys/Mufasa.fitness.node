"use strict";
// Community-only, instruction-first practice library. Media paths are opt-in and reviewed.
// Do not change canonical yoga completion, MoveNet coaching or membership contracts.
const flows=[
{id:"beginner-flow",name:"Beginner Full-Body Flow",purpose:"Foundational standing and floor poses",poses:["mountain","chair","warrior-ii","downward-dog","cobra","bridge"]},
{id:"morning-mobility",name:"Morning Mobility",purpose:"Gentle full-body movement",poses:["mountain","chair","triangle","downward-dog"]},
{id:"evening-recovery",name:"Evening Recovery",purpose:"Comfortable, slower holds",poses:["mountain","downward-dog","cobra","bridge"]},
{id:"balance-foundations",name:"Balance Foundations",purpose:"Practice balance and steadiness",poses:["mountain","tree","warrior-ii"]},
{id:"hip-mobility",name:"Hip Mobility",purpose:"Explore a comfortable range of motion",poses:["chair","warrior-i","warrior-ii","triangle"]},
{id:"upper-body-mobility",name:"Upper-Body Mobility",purpose:"Gentle upper-body movement",poses:["mountain","cobra","downward-dog","bridge"]}
];
const labels={"mountain":"Mountain Pose","chair":"Chair Pose","warrior-ii":"Warrior II","downward-dog":"Downward-Facing Dog","cobra":"Cobra Pose","bridge":"Bridge Pose","triangle":"Triangle Pose","tree":"Tree Pose","warrior-i":"Warrior I"};
const cues={"mountain":"Stand tall, soften your knees and breathe steadily.","chair":"Bend your knees gently and sit your hips back as comfortable.","warrior-ii":"Step into a wide stance, bend your front knee comfortably and extend both arms.","downward-dog":"Press through hands and feet, lengthening your back with bent knees as needed.","cobra":"Lie face down and lift your chest gently without forcing your lower back.","bridge":"Lie on your back with bent knees and lift your hips gently.","triangle":"Take a wide stance and hinge sideways within a comfortable range.","tree":"Stand on one leg, place the other foot against the ankle or inner calf, and use wall support if needed.","warrior-i":"Step one foot back, bend your front knee comfortably and lift your arms if comfortable."};
const media={}; // Approved asset example: "tree":"/media/yoga/tree-v1.gif"
const $=id=>document.getElementById(id);
let flow=flows[0],index=0;
function render(){const id=flow.poses[index],url=media[id],img=$("poseMedia");$("poseName").textContent=labels[id];$("instructions").textContent=cues[id];$("transition").textContent=index===0?"Begin with a comfortable stance.":"Transition slowly from the previous pose; pause when needed.";$("hold").textContent="Suggested practice: 30-second comfortable hold; rest as needed.";$("flowProgress").textContent="Pose "+(index+1)+" of "+flow.poses.length;$("purpose").textContent=flow.purpose;$("previous").disabled=index===0;$("next").disabled=index===flow.poses.length-1;img.hidden=true;img.removeAttribute("src");$("replay").hidden=true;$("mediaStatus").textContent="Animated demonstration coming soon · follow the instructions below.";if(url){img.alt=labels[id]+" animated yoga demonstration";img.onload=()=>{$("mediaStatus").textContent="Animated pose demonstration";img.hidden=false;$("replay").hidden=false};img.onerror=()=>{$("mediaStatus").textContent="Demonstration unavailable; use the written guidance.";img.hidden=true};img.src=url;}}
flows.forEach(f=>{const option=document.createElement("option");option.value=f.id;option.textContent=f.name;$("flow").append(option)});
$("flow").addEventListener("change",()=>{flow=flows.find(f=>f.id===$("flow").value)||flows[0];index=0;render()});
$("previous").addEventListener("click",()=>{if(index>0){index--;render()}});
$("next").addEventListener("click",()=>{if(index<flow.poses.length-1){index++;render()}});
$("replay").addEventListener("click",()=>{const img=$("poseMedia"),url=media[flow.poses[index]];if(url)img.src=url.split("?")[0]+"?replay="+Date.now()});
render();