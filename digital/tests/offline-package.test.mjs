import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {buildOfflinePackage,offlineVersion} from '../tools/offline-package.mjs';
test('changing any cached asset or worker policy invalidates the offline package',()=>{
 const input={html:'page',audio:['menu','map'],worker:'policy',icon:'cube',manifest:'manifest',assets:['index.html']};
 const before=offlineVersion(input);
 for(const [key,value] of Object.entries({icon:'new icon',manifest:'new manifest',worker:'new policy'}))assert.notEqual(offlineVersion({...input,[key]:value}),before);
});
test('offline builder emits a complete deployable subdirectory and a scoped install manifest',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'geomath-offline-build-'));
 try{
  fs.mkdirSync(path.join(root,'dist/assets/audio'),{recursive:true});fs.writeFileSync(path.join(root,'dist/assets/audio/menu.mp3'),'menu');fs.writeFileSync(path.join(root,'dist/assets/audio/map.mp3'),'map');
  const result=buildOfflinePackage({root,html:'<!doctype html><html><head><title>GeoMath</title></head><body>Learning</body></html>'});
  const directory=path.join(root,'artifacts/pwa');
  assert.equal(fs.readFileSync(path.join(directory,'index.html'),'utf8'),result.html);
  const manifest=JSON.parse(fs.readFileSync(path.join(directory,'manifest.webmanifest'),'utf8'));
  assert.equal(manifest.start_url,'./');assert.equal(manifest.scope,'./');assert.equal(manifest.display,'standalone');
  for(const asset of ['sw.js','icons/icon.svg','assets/audio/menu.mp3','assets/audio/map.mp3'])assert.ok(fs.statSync(path.join(directory,asset)).size>0);
  assert.equal(fs.readFileSync(path.join(directory,'assets/audio/map.mp3'),'utf8'),'map');
  const first=result.version;const changed=buildOfflinePackage({root,html:'<!doctype html><html><head></head><body>Updated learning</body></html>'});
  assert.notEqual(changed.version,first);
 }finally{fs.rmSync(root,{recursive:true,force:true});}
});
