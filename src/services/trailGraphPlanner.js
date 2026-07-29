"use strict";
const { haversineMeters } = require("../trails/geometry");
const { distanceToNetwork, pointInPolygon } = require("./routeCorridorValidator");

function snapToGraph(point,graph,{preferInsidePark=true}={}){
  let best=null;
  for(const node of Object.values(graph?.nodes||{})){const distance=haversineMeters(point,node),inside=pointInPolygon(node,graph.parkBoundary);const penalty=preferInsidePark&&inside===false?10000:0;if(!best||distance+penalty<best.score)best={node,distanceMeters:distance,score:distance+penalty};}
  return best&&{...best.node,distanceMeters:best.distanceMeters};
}
function adjacency(graph){const map=new Map();for(const edge of graph.edges||[]){if(edge.access==="private")continue;(map.get(edge.from)||map.set(edge.from,[]).get(edge.from)).push({...edge,next:edge.to});(map.get(edge.to)||map.set(edge.to,[]).get(edge.to)).push({...edge,next:edge.from});}return map;}
function pathToDistance(graph,startId,wanted){const adj=adjacency(graph),path=[graph.nodes[startId]],used=new Set(),edges=[];let current=startId,total=0;while(total<wanted){const choices=(adj.get(current)||[]).filter(e=>!used.has(e.id)).sort((a,b)=>(b.parkMembership==="inside")-(a.parkMembership==="inside")||a.lengthMeters-b.lengthMeters);const edge=choices[0]||(adj.get(current)||[])[0];if(!edge)break;const next=graph.nodes[edge.next],remaining=wanted-total;if(edge.lengthMeters>remaining){const from=graph.nodes[current],ratio=remaining/edge.lengthMeters;path.push({latitude:from.latitude+(next.latitude-from.latitude)*ratio,longitude:from.longitude+(next.longitude-from.longitude)*ratio});total=wanted;break;}used.add(edge.id);edges.push(edge);path.push(next);total+=edge.lengthMeters;current=edge.next;}return{path,distanceMeters:total,edges};}
function planTrailGraphRoute({targetDistanceMeters,graph,startPoint,routeType="out_and_back",tolerancePercent=5}){
 const snapped=snapToGraph(startPoint,graph);if(!snapped)return[];const target=Number(targetDistanceMeters),out=pathToDistance(graph,snapped.id,target/2);if(out.path.length<2)return[];const polyline=[...out.path,...out.path.slice(0,-1).reverse()],estimated=out.distanceMeters*2,error=estimated-target,errorPercent=Math.abs(error)/target*100,inside=graph.parkBoundary?polyline.slice(0,-1).filter(p=>pointInPolygon(p,graph.parkBoundary)).length/(polyline.length-1)*100:null;
 return[{routeSource:"trail_network",routeSourceLabel:"Trail-network route",routeType:routeType==="loop"?"partial_loop":"out_and_back",targetDistanceMeters:target,estimatedDistanceMeters:estimated,distanceErrorMeters:error,distanceErrorPercent:errorPercent,withinTolerance:errorPercent<=tolerancePercent,polyline,startPoint:polyline[0],turnaroundPoint:out.path.at(-1),endPoint:polyline.at(-1),loopCount:null,waypointCount:0,warnings:["Follow posted trail signs, closures, and local conditions."],confidence:"high",trailAdherencePercent:100,insideParkPercent:inside,instructions:`Follow known walking paths for ${(out.distanceMeters/1609.344).toFixed(2)} miles, then return along the same path.`,associationConfidence:"medium",geometrySource:graph.source,attribution:graph.attribution}];
}
module.exports={snapToGraph,planTrailGraphRoute};
