"use strict";
const index=require("../../public/exercise-db/index.json");
const {slug}=require("./exerciseClassification");
const rows=Array.isArray(index)?index:(index.exercises||[]);
const byId=new Map(rows.map(row=>[slug(row.id||row.slug||row.name),row]));
function resolveMedia(exerciseId){const row=byId.get(slug(exerciseId));const images=(row?.images||[]).filter(x=>typeof x==="string"&&!x.includes("..")&&!x.startsWith("/")).map(x=>`/exercise-db/${x}`);return Object.freeze({thumbnail:images[0]||null,illustrations:Object.freeze(images),primaryVideo:null,alternateVideo:null,descriptiveText:row?`${row.name||exerciseId} demonstration images`:null,status:images.length?"available":"unavailable"});}
module.exports={resolveMedia};
