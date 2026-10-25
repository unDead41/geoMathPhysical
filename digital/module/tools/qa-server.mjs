import http from 'node:http';import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
http.createServer(async(req,res)=>{try{
 if(req.method==='POST'&&req.url==='/__capture'){
  const chunks=[];let size=0;for await(const chunk of req){size+=chunk.length;if(size>3000000)throw Error('Too large');chunks.push(chunk);}
  const fields=new URLSearchParams(Buffer.concat(chunks).toString()),name=fields.get('name');
  if(!/^[a-z0-9_-]{1,60}\.(png|jpg)$/.test(name))throw Error('Bad filename');
  const data=Buffer.from(fields.get('image').split(',').pop(),'base64');
  if(!(data[0]===137&&data[1]===80||data[0]===255&&data[1]===216))throw Error('Bad image');
  const out=path.join(root,'evidence');fs.mkdirSync(out,{recursive:true});fs.writeFileSync(path.join(out,name),data,{flag:'wx'});
  res.writeHead(201,{'Content-Type':'text/html'});res.end('<h1>Saved '+name+'</h1><p>'+data.length+' bytes</p><a href="/qa.html">Back to QA</a>');return;
 }
 const url=req.url.split('?')[0],file=path.resolve(root,url==='/'?'GeoDecoder_Modul_V1.html':url==='/qa.html'?'tools/qa.html':'.'+url);
 if(!file.startsWith(root+'/'))throw Error('Bad path');
 const data=fs.readFileSync(file),mime=file.endsWith('.html')?'text/html; charset=utf-8':'application/octet-stream';
 res.writeHead(200,{'Content-Type':mime,'Cache-Control':'no-store'});res.end(data);
}catch(e){res.writeHead(400,{'Content-Type':'text/plain'});res.end(e.message);}}).listen(4173,'0.0.0.0');
