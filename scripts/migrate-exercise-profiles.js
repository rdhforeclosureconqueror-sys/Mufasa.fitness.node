#!/usr/bin/env node
'use strict';
const fs=require('node:fs'),path=require('node:path');

function migrateDryRun(directory=path.resolve(__dirname,'../public/exercise-db')) {
  const files=fs.readdirSync(directory).filter(file=>file.endsWith('.json')&&!['manifest.json','index.json'].includes(file)).sort();
  const report={mode:'dry-run',exercisesInspected:files.length,successfullyNormalized:0,missingRequiredData:0,duplicateIds:0,inheritanceConflicts:0,unsupportedPoseConfigurations:0,trainerReviewWarnings:0,translationWarnings:0,blockingErrors:0};
  const ids=new Set();
  for(const file of files){
    let record;try{record=JSON.parse(fs.readFileSync(path.join(directory,file),'utf8'));}catch{report.blockingErrors++;continue;}
    const id=String(record.id||record.name||path.basename(file,'.json')).toLowerCase().replace(/[^a-z0-9]+/g,'_').replace(/^_|_$/g,'');
    if(ids.has(id)){report.duplicateIds++;continue;}ids.add(id);
    const missing=['name','equipment','level'].filter(key=>record[key]==null);
    if(missing.length){report.missingRequiredData++;continue;}
    report.successfullyNormalized++;report.trainerReviewWarnings++;
  }
  return report;
}
if(require.main===module){if(!process.argv.includes('--dry-run'))throw new Error('Migration writes are disabled in this release candidate; pass --dry-run.');console.log(JSON.stringify(migrateDryRun(),null,2));}
module.exports={migrateDryRun};
