import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const css=['style','portal'].map(name=>fs.readFileSync(path.join(root,`dist/${name}.css`),'utf8')).join('\n');
const built=await build({entryPoints:[path.join(root,'dist/app.mjs')],bundle:true,write:false,platform:'browser',format:'iife',target:['es2022'],minify:true,legalComments:'eof'});
const javascript=built.outputFiles[0].text;
fs.writeFileSync(path.join(root,'dist/app.bundle.js'),javascript);
if(javascript.includes('</script'))throw new Error('Unsafe inline script terminator');
html=html.replace('<link rel="stylesheet" href="./style.css">',`<style>\n${css}\n</style>`).replace('<link rel="stylesheet" href="./portal.css">','').replace('<script type="module" src="./app.bundle.js"></script>',`<script type="module">\n${javascript}\n</script>`);
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
fs.writeFileSync(path.join(root,'artifacts/GeoDecoder_Digital_V1.html'),html);
fs.writeFileSync(path.join(root,'artifacts/GeoDecoder_Digital_V2.html'),html);
// A second identical entry is for testing the exact downloadable artifact through preview.
fs.writeFileSync(path.join(root,'dist/GeoDecoder_Digital_V1.html'),html);
fs.writeFileSync(path.join(root,'dist/GeoDecoder_Digital_V2.html'),html);
console.log(`GeoDecoder_Digital_V2.html: ${Buffer.byteLength(html)} bytes, self-contained (V1 filename retained as a compatibility alias)`);
