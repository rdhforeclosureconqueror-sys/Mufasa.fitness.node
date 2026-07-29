"use strict";

const { haversineMeters } = require("../trails/geometry");

const METERS_PER_MILE = 1609.344;
const DISTANCE_GOALS = Object.freeze({ half_mile: .5 * METERS_PER_MILE, one_mile: METERS_PER_MILE, two_miles: 2 * METERS_PER_MILE, "5k": 5000, "10k": 10000, half_marathon: 13.1 * METERS_PER_MILE });

function pointAtDistance(points, wanted) {
  let covered = 0;
  for (let index = 1; index < points.length; index++) {
    const segment = haversineMeters(points[index - 1], points[index]);
    if (covered + segment >= wanted) {
      const ratio = segment ? (wanted - covered) / segment : 0;
      return { index, point: { latitude: points[index - 1].latitude + (points[index].latitude - points[index - 1].latitude) * ratio, longitude: points[index - 1].longitude + (points[index].longitude - points[index - 1].longitude) * ratio } };
    }
    covered += segment;
  }
  return { index: points.length - 1, point: points[points.length - 1] };
}
function partialPath(points, wanted) { const hit = pointAtDistance(points, wanted), path = points.slice(0, hit.index); path.push(hit.point); return path; }
function option({ target, estimated, geometry, routeType, turnaroundPoint = null, loopCount = null, instructions }) {
  return { routeSource:"verified_geometry", routeSourceLabel:"Verified trail route", routeType, targetDistanceMeters:target, estimatedDistanceMeters:estimated, distanceErrorMeters:estimated-target, distanceErrorPercent:target?Math.abs(estimated-target)/target*100:0, polyline:geometry, startPoint:geometry[0], turnaroundPoint, endPoint:geometry[geometry.length-1], loopCount, warnings:["Follow posted trail signs, closures, and local conditions."], confidence:"high", instructions };
}
function planVerifiedRoute({ targetDistanceMeters, geometry, routeType = "point_to_point", tolerancePercent = 2 }) {
  const target=Number(targetDistanceMeters); if(!Number.isFinite(target)||target<=0||!Array.isArray(geometry)||geometry.length<2)return [];
  const full=geometry.slice(1).reduce((sum,p,i)=>sum+haversineMeters(geometry[i],p),0), options=[];
  if(routeType==="loop"){
    const complete=Math.floor(target/full),remainder=Math.max(0,target-complete*full),path=[];
    for(let i=0;i<complete;i++)path.push(...geometry.slice(i?1:0));
    if(remainder>1)path.push(...partialPath(geometry,remainder).slice(path.length?1:0));
    if(path.length>1)options.push(option({target,estimated:complete*full+remainder,geometry:path,routeType:"loop",loopCount:complete+(remainder?remainder/full:0),instructions:remainder?`${complete} complete loop${complete===1?"":"s"}, then a partial loop.`:`Complete ${complete} loop${complete===1?"":"s"}.`}));
    for(const count of new Set([Math.max(1,Math.round(target/full)),Math.max(1,Math.floor(target/full)),Math.max(1,Math.ceil(target/full))]))options.push(option({target,estimated:count*full,geometry:Array.from({length:count},(_,i)=>geometry.slice(i?1:0)).flat(),routeType:"loop",loopCount:count,instructions:`Complete ${count} full loop${count===1?"":"s"}.`}));
  } else {
    const outbound=Math.min(target/2,full),out=partialPath(geometry,outbound),turnaroundPoint=out[out.length-1],polyline=[...out,...out.slice(0,-1).reverse()];
    options.push(option({target,estimated:outbound*2,geometry:polyline,routeType:"out_and_back",turnaroundPoint,instructions:`Turn around after approximately ${(outbound/METERS_PER_MILE).toFixed(2)} miles and return on the same trail.`}));
  }
  return options.sort((a,b)=>a.distanceErrorPercent-b.distanceErrorPercent||((a.loopCount||0)-(b.loopCount||0))).map(x=>({...x,withinTolerance:x.distanceErrorPercent<=tolerancePercent}));
}
function unavailableRoute(place,targetDistanceMeters){return{routeSource:"place_only",routeSourceLabel:"Place location only",routeType:null,targetDistanceMeters,estimatedDistanceMeters:null,distanceErrorMeters:null,distanceErrorPercent:null,withinTolerance:false,polyline:[],startPoint:place?{latitude:place.latitude,longitude:place.longitude}:null,turnaroundPoint:null,endPoint:null,loopCount:null,waypointCount:0,warnings:["This location is available, but a reliable route could not be generated."],confidence:"unavailable",provider:null,providerRouteId:null,generatedAt:new Date().toISOString(),expiresAt:null};}
module.exports={METERS_PER_MILE,DISTANCE_GOALS,pointAtDistance,planVerifiedRoute,unavailableRoute};
