"use strict";

const { haversineMeters } = require("../trails/geometry");
const { loadRoutePlanningConfig } = require("../config/routePlanningConfig");
const CONFIG=loadRoutePlanningConfig();

function localPoint(point, origin) {
  const radians = Math.PI / 180;
  return { x: (point.longitude-origin.longitude)*111320*Math.cos(origin.latitude*radians), y: (point.latitude-origin.latitude)*111320 };
}
function pointSegmentDistance(point, a, b) {
  const origin=point,p=localPoint(point,origin),x=localPoint(a,origin),y=localPoint(b,origin),dx=y.x-x.x,dy=y.y-x.y;
  const t=Math.max(0,Math.min(1,(dx*(p.x-x.x)+dy*(p.y-x.y))/(dx*dx+dy*dy||1)));
  return Math.hypot(p.x-(x.x+t*dx),p.y-(x.y+t*dy));
}
function distanceToNetwork(point, graph) {
  let best=Infinity;
  for(const edge of graph?.edges||[]){const a=graph.nodes?.[edge.from],b=graph.nodes?.[edge.to];if(a&&b)best=Math.min(best,pointSegmentDistance(point,a,b));}
  return best;
}
function pointInPolygon(point, boundary) {
  const ring=boundary?.coordinates?.[0]||boundary;
  if(!Array.isArray(ring)||ring.length<3)return null;
  let inside=false;
  for(let i=0,j=ring.length-1;i<ring.length;j=i++){
    const a=ring[i],b=ring[j],ax=Number(a.longitude??a[0]),ay=Number(a.latitude??a[1]),bx=Number(b.longitude??b[0]),by=Number(b.latitude??b[1]);
    if(((ay>point.latitude)!==(by>point.latitude))&&(point.longitude<(bx-ax)*(point.latitude-ay)/(by-ay)+ax))inside=!inside;
  }
  return inside;
}
function validateRouteCorridor({polyline,trailGraph,parkBoundary,corridorWidthMeters=CONFIG.TRAIL_CORRIDOR_WIDTH_METERS,maxOffTrailPercent=CONFIG.TRAIL_ROUTE_MAX_OFF_TRAIL_PERCENT,maxOutsideParkPercent=CONFIG.PARK_ROUTE_MAX_OUTSIDE_PERCENT}) {
  const validPolyline=Array.isArray(polyline)&&polyline.length>1&&polyline.every(point=>Number.isFinite(point?.latitude)&&point.latitude>=-90&&point.latitude<=90&&Number.isFinite(point?.longitude)&&point.longitude>=-180&&point.longitude<=180);
  const hasNetwork=Array.isArray(trailGraph?.edges)&&trailGraph.edges.length>0;
  const hasParkBoundary=pointInPolygon({latitude:0,longitude:0},parkBoundary)!==null;
  if(!validPolyline||!hasNetwork)return{totalRouteDistanceMeters:0,distanceInsideTrailCorridorMeters:0,distanceOutsideTrailCorridorMeters:0,trailAdherencePercent:0,offTrailPercent:100,distanceInsideParkMeters:hasParkBoundary?0:null,distanceOutsideParkMeters:hasParkBoundary?0:null,insideParkPercent:hasParkBoundary?0:null,outsideParkPercent:hasParkBoundary?100:null,maximumDeviationMeters:null,accepted:false};
  let total=0,insideTrail=0,insidePark=0,maxDeviation=0;
  for(let i=1;i<(polyline||[]).length;i++){
    const a=polyline[i-1],b=polyline[i],length=haversineMeters(a,b),mid={latitude:(a.latitude+b.latitude)/2,longitude:(a.longitude+b.longitude)/2},deviation=distanceToNetwork(mid,trailGraph);
    total+=length;maxDeviation=Math.max(maxDeviation,Number.isFinite(deviation)?deviation:0);
    if(deviation<=corridorWidthMeters)insideTrail+=length;
    if(hasParkBoundary&&pointInPolygon(mid,parkBoundary)===true)insidePark+=length;
  }
  const pct=value=>total?value/total*100:0,trailAdherencePercent=pct(insideTrail),insideParkPercent=hasParkBoundary?pct(insidePark):null;
  const offTrailPercent=100-trailAdherencePercent,outsideParkPercent=insideParkPercent==null?null:100-insideParkPercent;
  return {totalRouteDistanceMeters:total,distanceInsideTrailCorridorMeters:insideTrail,distanceOutsideTrailCorridorMeters:total-insideTrail,trailAdherencePercent,offTrailPercent,distanceInsideParkMeters:hasParkBoundary?insidePark:null,distanceOutsideParkMeters:hasParkBoundary?total-insidePark:null,insideParkPercent,outsideParkPercent,maximumDeviationMeters:maxDeviation,accepted:total>0&&offTrailPercent<=maxOffTrailPercent&&(outsideParkPercent==null||outsideParkPercent<=maxOutsideParkPercent)};
}

module.exports={pointInPolygon,distanceToNetwork,validateRouteCorridor};
