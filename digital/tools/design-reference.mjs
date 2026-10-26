import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';

const defaultRoot=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
/** Build the reference with the same token and component CSS that ships in the app. */
export function buildDesignReference({root=defaultRoot}={}){
  execFileSync(process.execPath,[path.join(root,'tools/design-tokens.mjs'),'--check'],{stdio:'inherit'});
  const source=path.join(root,'design-system');
  let html=fs.readFileSync(path.join(source,'reference.html'),'utf8');
  html=html.replace(/<link rel="stylesheet" href="([^"]+)">/g,(_,href)=>{
    const css=fs.readFileSync(path.resolve(source,href),'utf8');
    if(/<\/style/i.test(css))throw new Error('Unsafe reference style terminator');
    return '<style>\n'+css+'\n</style>';
  });
  const script=fs.readFileSync(path.join(source,'reference.mjs'),'utf8');
  if(/<\/script/i.test(script))throw new Error('Unsafe reference script terminator');
  html=html.replace('<script type="module" src="./reference.mjs"></script>','<script type="module">\n'+script+'\n</script>');
  const destination=path.join(root,'artifacts/GeoDecoder_Design_System.html');
  fs.mkdirSync(path.dirname(destination),{recursive:true});fs.writeFileSync(destination,html);
  const review=path.join(root,'docs/design-system-evidence/GeoDecoder_Design_System.html');fs.mkdirSync(path.dirname(review),{recursive:true});fs.writeFileSync(review,html);
  return {path:destination,bytes:Buffer.byteLength(html)};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  const result=buildDesignReference();console.log(`GeoDecoder design reference: ${result.bytes} bytes · self-contained · ${result.path}`);
}
