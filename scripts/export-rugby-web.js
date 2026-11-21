'use strict';
const fs=require('node:fs'),path=require('node:path'),{spawnSync}=require('node:child_process'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'..'),project=path.join(root,'godot/rugby-hq-web'),output=path.join(root,'public/game/rugby-hq');
const godot=process.env.GODOT_WEB_BIN;if(!godot)throw Error('Set GODOT_WEB_BIN to standard Godot 4.5.1 (not .NET).');
const version=spawnSync(godot,['--version'],{encoding:'utf8'});if(version.status!==0||!/^4\.5\.1\.stable\./.test(version.stdout)||/mono/.test(version.stdout))throw Error('Standard Godot 4.5.1 required');
for(const args of [['--headless','--editor','--path',project,'--import','--quit'],['--headless','--path',project,'--export-release','Web']]){
 const r=spawnSync(godot,args,{encoding:'utf8',maxBuffer:16*1024*1024});
 process.stdout.write(r.stdout||'');process.stderr.write(r.stderr||'');
 if(r.status!==0||/SCRIPT ERROR|Parse Error|Failed loading resource|ERROR:/.test((r.stdout||'')+(r.stderr||'')))throw Error('Godot import/export failed');
}
const files={};for(const name of fs.readdirSync(output)){if(name.startsWith('.')||name==='build-manifest.json')continue;const b=fs.readFileSync(path.join(output,name));files[name]={bytes:b.length,sha256:crypto.createHash('sha256').update(b).digest('hex')};}
fs.writeFileSync(path.join(output,'build-manifest.json'),JSON.stringify({engine:version.stdout.trim(),renderer:'gl_compatibility',threads:false,files},null,2)+'\n');
console.log('Rugby HQ Web export and manifest complete.');
