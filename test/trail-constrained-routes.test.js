"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {buildPedestrianGraph}=require("../src/services/trailGeometryService");
const {validateRouteCorridor,pointInPolygon}=require("../src/services/routeCorridorValidator");
const {planTrailGraphRoute,snapToGraph}=require("../src/services/trailGraphPlanner");
const {rankRoutes}=require("../src/services/walkingRouteService");
const boundary=[[-96.831,32.939],[-96.829,32.939],[-96.829,32.941],[-96.831,32.941],[-96.831,32.939]];
const elements=[
 {type:"node",id:1,lat:32.94,lon:-96.8308},{type:"node",id:2,lat:32.9408,lon:-96.8308},{type:"node",id:3,lat:32.9408,lon:-96.8292},{type:"node",id:4,lat:32.94,lon:-96.8292},
 {type:"node",id:5,lat:32.942,lon:-96.8308},{type:"node",id:6,lat:32.9399,lon:-96.8309},{type:"node",id:7,lat:32.94,lon:-96.831},
 {type:"way",id:10,nodes:[1,2,3,4,1],tags:{highway:"footway",name:"Vitruvian Park Loop"}},
 {type:"way",id:11,nodes:[2,5],tags:{highway:"track",foot:"no"}},
 {type:"way",id:12,nodes:[6,7],tags:{highway:"path",access:"private"}}
];
function graph(){return buildPedestrianGraph(elements,{parkBoundary:boundary});}
test("OSM graph keeps attributable pedestrian paths and excludes private and foot=no ways",()=>{const value=graph();assert.equal(value.edges.length,4);assert.ok(value.edges.every(e=>e.attribution.includes("OpenStreetMap")));assert.ok(!value.edges.some(e=>e.id.startsWith("11:")||e.id.startsWith("12:")));});
test("start snapping prefers the internal park path over a nearby outside node",()=>{const value=graph(),snap=snapToGraph({latitude:32.93995,longitude:-96.8309},value);assert.ok([1,2,3,4].includes(snap.id));});
test("half-mile and one-mile out-and-back stay entirely on graph geometry",()=>{for(const target of [804.672,1609.344]){const route=planTrailGraphRoute({targetDistanceMeters:target,graph:graph(),startPoint:{latitude:32.94,longitude:-96.8308}})[0];assert.equal(route.routeSource,"trail_network");assert.equal(route.trailAdherencePercent,100);assert.deepEqual(route.polyline,route.polyline.slice().reverse());}});
test("corridor validator rejects a route that leaves the internal trail north on a road",()=>{const value=graph(),bad=[value.nodes[2],{latitude:32.945,longitude:-96.8308}];const quality=validateRouteCorridor({polyline:bad,trailGraph:value,parkBoundary:boundary,corridorWidthMeters:35});assert.equal(quality.accepted,false);assert.ok(quality.offTrailPercent>10);assert.ok(quality.outsideParkPercent>15);});
test("park boundary containment identifies internal and external points",()=>{assert.equal(pointInPolygon({latitude:32.94,longitude:-96.83},boundary),true);assert.equal(pointInPolygon({latitude:32.945,longitude:-96.83},boundary),false);});
test("Vitruvian-style trail adherence outranks exact-distance road route",()=>{const trail={routeSource:"trail_network",trailAdherencePercent:100,insideParkPercent:100,distanceErrorPercent:4},road={routeSource:"google_walking_route",trailAdherencePercent:50,insideParkPercent:60,distanceErrorPercent:0};assert.equal(rankRoutes([road,trail])[0],trail);});
test("verified and network geometry precede unconstrained Google and place-only fallbacks",()=>{const sources=["place_only","google_walking_route","trail_network","verified_geometry"].map(routeSource=>({routeSource,distanceErrorPercent:0}));assert.deepEqual(rankRoutes(sources).map(x=>x.routeSource),["verified_geometry","trail_network","google_walking_route","place_only"]);});
