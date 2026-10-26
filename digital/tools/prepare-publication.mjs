import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createHash} from 'node:crypto';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const canonical=fs.readFileSync(path.join(root,'artifacts/GeoDecoder_Digital_V2.html'));
const aliases=['GeoDecoder_Digital_V1.html','GeoDecoder_Digital_V2.html','dist/GeoDecoder_Digital_V1.html','dist/GeoDecoder_Digital_V2.html'];
for(const name of aliases){
  if(!fs.readFileSync(path.join(root,name)).equals(canonical))throw new Error('Standalone alias mismatch: '+name);
}
const version=JSON.parse(fs.readFileSync(path.join(root,'package.json'),'utf8')).version;
fs.writeFileSync(path.join(root,'..','index.html'),canonical);
fs.writeFileSync(path.join(root,'..','.nojekyll'),'');
const hash=createHash('sha256').update(canonical).digest('hex');
console.log(`main-digitalized publication prepared: Digital v${version}, ${canonical.length} bytes, SHA256 ${hash}.`);
