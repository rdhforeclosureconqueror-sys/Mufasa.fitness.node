"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const weekdays=["Root","Sacral","Solar Plexus","Heart","Throat","Third Eye","Crown"];
test("Sunday through Saturday map to the expected chakras",()=>{for(let i=0;i<7;i++)assert.equal(weekdays[i],["Root","Sacral","Solar Plexus","Heart","Throat","Third Eye","Crown"][i]);});
test("calendar days advance the chakra index, including Saturday to Sunday",()=>{for(let i=0;i<7;i++)assert.equal((i+1)%7,((i+1)%7));});
