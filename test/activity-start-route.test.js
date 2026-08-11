"use strict";
const test=require("node:test");
const assert=require("node:assert/strict");
const fs=require("node:fs");
const os=require("node:os");
const path=require("node:path");
const {createUserStore}=require("../src/repositories/userStore");
const {createSteppingIntoGreatnessService}=require("../src/services/steppingIntoGreatnessService");

function fixture(){const root=fs.mkdtempSync(path.join(os.tmpdir(),"activity-start-")),userStore=createUserStore({userDir:root});userStore.ensureDirs();return{userStore,service:createSteppingIntoGreatnessService({userStore,clock:()=>Date.parse("2026-08-11T12:00:00Z")})};}
const route={routeId:"generated-route-1",routeFingerprint:"fingerprint-1",routeSource:"google_walking_route",routeType:"loop",targetDistanceMeters:5000,estimatedDistanceMeters:5010,polyline:[{latitude:40,longitude:-74},{latitude:40.001,longitude:-74.001}]};
const start=(clientSessionId="start-1")=>({clientSessionId,activityType:"trail_run",startedAt:"2026-08-11T11:30:00Z",goal:{type:"five_k",label:"5K",distanceMeters:5000},selectedRoute:route});
const finish=clientSessionId=>({clientSessionId,activityType:"trail_run",startedAt:"2026-08-11T11:30:00Z",endedAt:"2026-08-11T12:00:00Z",elapsedTimeMs:1800000,movingTimeMs:1700000,pausedTimeMs:100000,distanceMeters:5000,goal:start().goal,selectedRoute:route,samples:[],gpsQuality:{rating:"good",acceptedSamples:2,rejectedSamples:0,suspiciousMovementDetected:false}});

test("route start persists a new owner-scoped in-progress activity and retry is idempotent",()=>{const {service}=fixture();const first=service.start("maya",start()),retry=service.start("maya",start());assert.equal(first.status,"in_progress");assert.ok(first.activityId);assert.equal(first.selectedRoute.routeId,route.routeId);assert.equal(retry.activityId,first.activityId);assert.equal(retry.duplicateStart,true);assert.equal(service.journey("maya").activities.length,1);assert.throws(()=>service.activity("other",first.activityId),/not found/i);});

test("two legitimate starts on the same route create distinct activities",()=>{const {service}=fixture();const a=service.start("maya",start("operation-a")),b=service.start("maya",start("operation-b"));assert.notEqual(a.activityId,b.activityId);assert.equal(service.journey("maya").activities.length,2);});

test("completion updates the started identity and completion retry creates no duplicate",()=>{const {service}=fixture();const begun=service.start("maya",start()),completed=service.complete("maya",finish("start-1")),retry=service.complete("maya",finish("start-1"));assert.equal(completed.activityId,begun.activityId);assert.equal(completed.status,"completed");assert.equal(completed.selectedRoute.routeId,route.routeId);assert.equal(retry.activityId,begun.activityId);assert.equal(retry.duplicateCompletion,true);assert.equal(service.journey("maya").activities.length,1);});

test("frontend opens recording only after persisted activity identity and retains retry operation",()=>{const source=fs.readFileSync(path.join(__dirname,"../public/greatness.js"),"utf8");const request=source.indexOf('api("/api/me/greatness/activities/start-with-route"'),identity=source.indexOf("created?.activityId",request),live=source.indexOf("tracker.start(addSample",identity);assert.ok(request>0&&identity>request&&live>identity);assert.match(source,/pendingStart \|\|=/);assert.match(source,/start_save_failed/);assert.match(source,/Retry Start Activity/);assert.match(source,/activityCreateHttpStatus/);});
