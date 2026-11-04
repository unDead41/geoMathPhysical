import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
const source=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../pwa');
export function offlineVersion({html,audio,worker,icon,manifest,assets}){
 const hash=createHash('sha256');
 for(const part of [html,...audio,worker,icon,manifest,JSON.stringify(assets)]){
  const bytes=Buffer.isBuffer(part)?part:Buffer.from(part);hash.update(String(bytes.length)).update('\0').update(bytes);
 }
 return hash.digest('hex').slice(0,24);
}
export function buildOfflinePackage({root,html}){
 const audio=['menu','map'].map(name=>fs.readFileSync(path.join(root,`dist/assets/audio/${name}.mp3`)));
 const directory=path.join(root,'artifacts/pwa');
 fs.mkdirSync(path.join(directory,'assets/audio'),{recursive:true});fs.mkdirSync(path.join(directory,'icons'),{recursive:true});
 const output=html.replace('</head>','<meta name="geomath-pwa" content="enabled"><meta name="theme-color" content="#142840"><link rel="manifest" href="./manifest.webmanifest"><link rel="icon" href="./icons/icon.svg" type="image/svg+xml"></head>');
 const assets=['index.html','assets/audio/menu.mp3','assets/audio/map.mp3','manifest.webmanifest','icons/icon.svg'];
 const workerTemplate=fs.readFileSync(path.join(source,'sw.js'),'utf8'),icon=fs.readFileSync(path.join(source,'icon.svg'));
 const manifest=JSON.stringify({id:'./',name:'GeoMath',short_name:'GeoMath',lang:'ms',start_url:'./',scope:'./',display:'standalone',background_color:'#F3F7FC',theme_color:'#142840',icons:[{src:'./icons/icon.svg',sizes:'any',type:'image/svg+xml',purpose:'any'}]},null,2)+'\n';
 const version=offlineVersion({html:output,audio,worker:workerTemplate,icon,manifest,assets});
 const worker=workerTemplate.replace('__GEOMATH_VERSION__',JSON.stringify(version)).replace('__GEOMATH_ASSETS__',JSON.stringify(assets));
 fs.writeFileSync(path.join(directory,'index.html'),output);fs.writeFileSync(path.join(directory,'sw.js'),worker);
 fs.writeFileSync(path.join(directory,'icons/icon.svg'),icon);
 fs.writeFileSync(path.join(directory,'manifest.webmanifest'),manifest);
 for(let i=0;i<audio.length;i++)fs.writeFileSync(path.join(directory,assets[i+1]),audio[i]);
 return {html:output,version,directory};
}
