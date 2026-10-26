#!/usr/bin/env node
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {resolve} from 'node:path';
import {EMAIL_TEMPLATES,emailManifest,emailPayload,renderEmail,previewEmail} from '../backend/email/templates.mjs';

const root=new URL('../',import.meta.url);
export async function buildEmails({check=false}={}){
  const files=[...EMAIL_TEMPLATES.map(item=>[`backend/email/templates/${item.id}.html`,renderEmail(item)]),['backend/email/manifest.json',JSON.stringify(emailManifest(),null,2)+'\n']];
  for(const [path,content] of files){
    const url=new URL(path,root);
    if(check){
      if(await readFile(url,'utf8')!==content)throw Error(`${path} is stale. Run node tools/email-templates.mjs --build.`);
    }else{
      await mkdir(new URL('.',url),{recursive:true});
      await writeFile(url,content);
    }
  }
  return files.length;
}

export async function buildPreviews(){
  const dir=new URL('artifacts/email-previews/',root);
  await mkdir(dir,{recursive:true});
  for(const item of EMAIL_TEMPLATES){
    await writeFile(new URL(`${item.id}.html`,dir),previewEmail(item));
    await writeFile(new URL(`${item.id}-long.html`,dir),previewEmail(item,{longEmail:true}));
  }
  await writeFile(new URL('index.html',dir),`<!doctype html><html lang="ms"><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>GeoDecoder — Pratonton e-mel</title><body style="max-width:680px;margin:32px auto;padding:0 20px;font:16px/1.6 'Segoe UI',Arial,sans-serif;color:#18334B;background:#F3F7FB;"><h1>E-mel GeoDecoder Digital</h1><p>Pratonton sahaja / Preview only. Semua pautan dan akaun menggunakan data rekaan.</p><ul>${EMAIL_TEMPLATES.map(item=>`<li><a href="${item.id}.html">${item.name}</a> · <a href="${item.id}-long.html">Alamat panjang / Long address</a></li>`).join('')}</ul></body></html>`);
  return fileURLToPath(new URL('index.html',dir));
}

export async function main(args=process.argv.slice(2)){
  if(args.length!==1||!['--build','--check','--preview','--payload'].includes(args[0])){
    throw Error('Usage: node tools/email-templates.mjs --build | --check | --preview | --payload (local only; never sends email or changes hosted settings)');
  }
  if(args[0]==='--payload'){process.stdout.write(JSON.stringify(emailPayload(),null,2)+'\n');return;}
  if(args[0]==='--preview'){console.log(await buildPreviews());return;}
  console.log(`${args[0]==='--check'?'Checked':'Built'} ${await buildEmails({check:args[0]==='--check'})} email template files.`);
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  main().catch(error=>{console.error(error.message);process.exitCode=1;});
}
