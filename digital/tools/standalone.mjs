import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let html=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const css=fs.readFileSync(path.join(root,'dist/style.css'),'utf8');
const javascript=['questions','core','i18n','storage','art','format','app'].map(name=>fs.readFileSync(path.join(root,`dist/${name}.mjs`),'utf8').replace(/^import .+;\r?\n/gm,'').replace(/^export /gm,'')).join('\n\n');
if(javascript.includes('</script'))throw new Error('Unsafe inline script terminator');
html=html.replace('<link rel="stylesheet" href="./style.css">',`<style>\n${css}\n</style>`).replace('<script type="module" src="./app.mjs"></script>',`<script type="module">\n${javascript}\n</script>`);
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
fs.writeFileSync(path.join(root,'artifacts/GeoDecoder_Digital_V1.html'),html);
// A second identical entry is for testing the exact downloadable artifact through preview.
fs.writeFileSync(path.join(root,'dist/GeoDecoder_Digital_V1.html'),html);
console.log(`GeoDecoder_Digital_V1.html: ${Buffer.byteLength(html)} bytes, self-contained`);
