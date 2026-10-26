// Isolated, disposable PostgreSQL WASM + the real Edge handler. Never production.
import {PGlite} from '@electric-sql/pglite';
import {build} from 'esbuild';
import {createServer} from 'node:http';
import {readFileSync,readdirSync,existsSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createDuelHandler} from '../backend/duel/functions/geodecoder-duel/handler.mjs';
export async function createDuelFixture(){
  const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..'),db=new PGlite();
  await db.exec('create role anon; create role authenticated; create role service_role bypassrls;');
  await db.exec(readFileSync(path.join(root,'backend/duel/schema.sql'),'utf8'));
  const file=readdirSync(path.join(root,'backend/duel/supabase/migrations')).find(n=>n.endsWith('_duel_durable_review_v2.sql'));
  await db.exec(readFileSync(path.join(root,'backend/duel/supabase/migrations',file),'utf8'));
  await db.exec('set role service_role');
  const calls=[],handle=createDuelHandler({env:n=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'disposable-fixture-key'})[n],fetch:async(_,init)=>{
    const {payload}=JSON.parse(init.body);calls.push({action:payload.action,seq:payload.seq,questionIndex:payload.questionIndex});
    const {rows}=await db.query('select public.geodecoder_duel_gateway($1::jsonb) as result',[JSON.stringify(payload)]);
    return Response.json(rows[0].result);
  }});
  let bundle;
  const server=createServer(async(req,res)=>{
    try{
      if(req.url==='/api/duel'){
        const chunks=[];for await(const chunk of req)chunks.push(chunk);
        const response=await handle(new Request('http://127.0.0.1/api/duel',{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}));
        res.writeHead(response.status,Object.fromEntries(response.headers));res.end(Buffer.from(await response.arrayBuffer()));return;
      }
      if(req.url==='/app.bundle.js'){res.writeHead(200,{'Content-Type':'text/javascript'});res.end(bundle);return;}
      const route=decodeURIComponent(req.url.split('?')[0]),file=path.resolve(root,'dist','.'+(route==='/'?'/index.html':route));
      if(!file.startsWith(path.join(root,'dist')+path.sep)||!existsSync(file)){res.writeHead(404);res.end();return;}
      const type={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg'}[path.extname(file)]||'application/octet-stream';
      res.writeHead(200,{'Content-Type':type});res.end(readFileSync(file));
    }catch{res.writeHead(500);res.end('Fixture request failed');}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  bundle=(await build({entryPoints:[path.join(root,'dist/app.mjs')],bundle:true,write:false,platform:'browser',format:'iife',target:['es2022'],loader:{'.html':'text'},plugins:[{name:'isolated-duel-endpoint',setup(b){b.onLoad({filter:/[/\\]duel\.mjs$/},args=>({contents:readFileSync(args.path,'utf8').replace(/export const DUEL_ENDPOINT='[^']+';/,`export const DUEL_ENDPOINT='${origin}/api/duel';`),loader:'js'}));}}]})).outputFiles[0].text;
  return {origin,db,calls,async close(){await new Promise(resolve=>server.close(resolve));await db.close();}};
}
