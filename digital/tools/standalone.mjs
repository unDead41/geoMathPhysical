import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {execFileSync} from 'node:child_process';
import {buildDesignReference} from './design-reference.mjs';
import {buildOfflinePackage} from './offline-package.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
execFileSync(process.execPath,[path.join(root,'tools/design-tokens.mjs')],{stdio:'inherit'});
const moduleRelease=JSON.parse(fs.readFileSync(path.join(root,'vendor/module-release.json'),'utf8'));
const template=fs.readFileSync(path.join(root,'dist/index.html'),'utf8');
const css=['design-tokens','style','portal','usability','help-support','foundation','entry'].map(name=>fs.readFileSync(path.join(root,`dist/${name}.css`),'utf8')).join('\n');
const options={entryPoints:[path.join(root,'dist/app.mjs')],bundle:true,write:false,platform:'browser',format:'iife',target:['es2022'],minify:true,legalComments:'eof',loader:{'.html':'text'}};
const javascript=(await build(options)).outputFiles[0].text;
fs.writeFileSync(path.join(root,'dist/app.bundle.js'),javascript);
function page(script){
  if(script.includes('</script'))throw new Error('Unsafe inline script terminator');
  return template.replace('<link rel="stylesheet" href="./style.css">',()=>`<style>\n${css}\n</style>`).replace('<link rel="stylesheet" href="./design-tokens.css">','').replace('<link rel="stylesheet" href="./foundation.css">','').replace('<link rel="stylesheet" href="./portal.css">','').replace('<link rel="stylesheet" href="./usability.css">','').replace('<link rel="stylesheet" href="./help-support.css">','').replace('<link rel="stylesheet" href="./entry.css">','').replace('<script type="module" src="./app.bundle.js"></script>',()=>`<script type="module">\n${script}\n</script>`);
}
fs.mkdirSync(path.join(root,'artifacts'),{recursive:true});
// Pages loads music on demand, keeping the first Home download small.
const website=buildOfflinePackage({root,html:page(javascript)});
fs.writeFileSync(path.join(root,'artifacts/site-index.html'),website.html);
// The downloadable HTML carries both complete tracks and the pinned module.
let offline=javascript;
for(const name of ['menu','map']){
  const needle=JSON.stringify(`./assets/audio/${name}.mp3`);
  if(offline.split(needle).length!==2)throw new Error(`Expected exactly one ${name} track URL in the bundle`);
  const embedded=JSON.stringify('data:audio/mpeg;base64,'+fs.readFileSync(path.join(root,`dist/assets/audio/${name}.mp3`)).toString('base64'));
  offline=offline.replaceAll(needle,()=>embedded);
}
const html=page(offline);
const canonical=path.join(root,'artifacts/GeoDecoder_Digital_V2.html');
fs.writeFileSync(canonical,html);
for(const target of ['GeoDecoder_Digital_V1.html','GeoDecoder_Digital_V2.html','artifacts/GeoDecoder_Digital_V1.html','dist/GeoDecoder_Digital_V1.html','dist/GeoDecoder_Digital_V2.html']){
  const destination=path.join(root,target);fs.rmSync(destination,{force:true});fs.linkSync(canonical,destination);
}
console.log(`GeoDecoder Digital: website ${Buffer.byteLength(page(javascript))} bytes; offline HTML ${Buffer.byteLength(html)} bytes including both complete music tracks and module v${moduleRelease.version}.`);

const reference=buildDesignReference({root});console.log(`Design reference: ${reference.bytes} bytes, self-contained.`);
