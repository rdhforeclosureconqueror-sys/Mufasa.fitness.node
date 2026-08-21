"use strict";
const {defineConfig}=require("playwright/test");
module.exports=defineConfig({testDir:"./e2e",testMatch:/\.spec\.js$/,webServer:{command:"node server.js",url:"http://127.0.0.1:3000/challenges/8-week-kettlebell-strength-power",reuseExistingServer:true},use:{baseURL:"http://127.0.0.1:3000",trace:"retain-on-failure"}});
