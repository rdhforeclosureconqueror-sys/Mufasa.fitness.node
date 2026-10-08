"use strict";
const test=require("node:test"),assert=require("node:assert/strict");
const {parseCSV,importRows}=require("../scripts/import-mindfulness-csv");
test("parses quoted commas and escaped quotes",()=>assert.deepEqual(parseCSV('Chakra,Text\nRoot,"I am safe, ""today""."\n'),[["Chakra","Text"],["Root",'I am safe, "today".']]));
test("imports only selected content columns",()=>{const r=importRows("Chakra,Text\nRoot,I feel grounded\nCrown,I reflect\n");assert.equal(r.items.length,2);assert.equal(r.items[0].chakra,"Root");});
test("rejects unknown chakra",()=>assert.throws(()=>importRows("Chakra,Text\nOther,Test"),/Invalid educational row/));
test("rejects secret-like text",()=>assert.throws(()=>importRows("Chakra,Text\nRoot,bot_token=private"),/sensitive/));
test("rejects broken CSV",()=>assert.throws(()=>importRows('Chakra,Text\nRoot,"unfinished'),/Unclosed/));
