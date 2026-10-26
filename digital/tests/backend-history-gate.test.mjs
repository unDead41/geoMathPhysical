import {test} from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const root=new URL('../../',import.meta.url);
const gate=new URL('../backend/operations/check-history.mjs',import.meta.url);
const manifest=JSON.parse(fs.readFileSync(new URL('supabase/hosted-history.json',root)));
const rows=()=>manifest.migrations.map(m=>({version:m.version,name:m.name,statements:[fs.readFileSync(new URL('supabase/migrations/'+m.file,root),'utf8').slice(0,-1)]}));
function run(value){const dir=fs.mkdtempSync(path.join(os.tmpdir(),'geo-history-'));try{const p=path.join(dir,'history.json');fs.writeFileSync(p,JSON.stringify(value));return spawnSync(process.execPath,[gate.pathname,p],{encoding:'utf8'});}finally{fs.rmSync(dir,{recursive:true,force:true});}}
test('history gate accepts the exact archived statement history',()=>assert.equal(run(rows()).status,0));
test('history gate rejects missing, added, renamed or edited hosted migrations',()=>{
 const cases=[rows().slice(1),[...rows(),{version:'20990101000000',name:'unexpected',statements:['select 1;']}]];
 for(const field of ['name','statements']){const r=rows();r[0][field]=field==='name'?'renamed':['select 1;'];cases.push(r);}
 for(const value of cases)assert.notEqual(run(value).status,0);
});
test('history gate fails closed without a fresh hosted export',()=>assert.notEqual(spawnSync(process.execPath,[gate.pathname],{encoding:'utf8'}).status,0));
