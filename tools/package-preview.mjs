import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const output=path.join(root,'dist');
fs.mkdirSync(output,{recursive:true});
// The published application uses its canonical external bundle. Standalone
// downloads are still built and verified by digital/tools/standalone.mjs.
for(const file of fs.readdirSync(path.join(root,'digital/dist'))){
  if(file==='index.html'||file==='app.bundle.js'||file.endsWith('.css'))fs.copyFileSync(path.join(root,'digital/dist',file),path.join(output,file));
}
fs.mkdirSync(path.join(output,'assets/audio'),{recursive:true});
for(const file of ['menu.mp3','map.mp3'])fs.copyFileSync(path.join(root,'digital/dist/assets/audio',file),path.join(output,'assets/audio',file));
console.log('Packaged GeoMath preview with the canonical bundle and audio assets.');
