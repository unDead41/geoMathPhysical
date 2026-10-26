import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
await build({entryPoints:[path.join(root,'tests/security-browser-fixture.mjs')],bundle:true,minify:true,outfile:path.join(root,'artifacts/security-fixture.bundle.js'),format:'esm',platform:'browser',target:'es2022'});
fs.copyFileSync(path.join(root,'tests/security-preview.html'),path.join(root,'artifacts/security-fixture.html'));
console.log('Controlled Auth preview built. From digital/, run: python -m http.server 8765, then open http://localhost:8765/artifacts/security-fixture.html');
