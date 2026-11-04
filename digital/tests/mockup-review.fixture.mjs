// QA ONLY. Real application/controllers and SQL gateways, synthetic local Auth.
// Builds in memory; does not modify dist bundles or the vendored module artifact.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {createServer} from 'node:http';
import {createHash} from 'node:crypto';
import {build} from 'esbuild';
import {PGlite} from '@electric-sql/pglite';
import {database,ids} from './classroom-crud.fixture.mjs';
import {createDuelHandler} from '../backend/duel/functions/geodecoder-duel/handler.mjs';
import {designTokenCss,iconMarkup} from '../module/src/design-system.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const reflectionRecords=[
  {activity:'net',stage:'explanation',prediction:'QA fixture: six squares will close into a cube.',result:'QA fixture: tested a connected cube net.',explanation:'QA fixture: paired edges close without overlapping faces.',completed:true},
  {activity:'volume',stage:'explanation',prediction:'QA fixture: the cuboid will hold 18 unit cubes.',result:'QA fixture: filled three layers of six unit cubes.',explanation:'QA fixture: volume equals the number of unit cubes.',completed:true},
  {activity:'area',stage:'experiment',prediction:'QA fixture: opposite cube faces have equal areas.',result:'QA fixture: selected two opposite faces.',explanation:'',completed:false}
];

function freshModuleHtml(){
  const moduleRoot=path.join(root,'module/src');
  let html=fs.readFileSync(path.join(moduleRoot,'index.html'),'utf8');
  const css=['style.css','net-tools.css','projection-studio.css','calculation-workshop.css'].map(n=>fs.readFileSync(path.join(moduleRoot,n),'utf8')).join('\n')+'\n'+fs.readFileSync(path.join(root,'dist/module-foundation.css'),'utf8')+(process.env.MOCKUP_REVIEW_MODULE_CSS?'\n'+fs.readFileSync(process.env.MOCKUP_REVIEW_MODULE_CSS,'utf8'):'');
  const names=['central-tokens','design-system','ui','geometry','content','lessons','lab-geometry','preset-nets','learning-mesh','volume-lab','volume-transfer','surface-workshop','net-studio-geometry','net-studio','net-print','renderer','notes','guided','accessibility','labs','projection-geometry','projection-studio','calculation-steps','calculation-workshop','app'];
  const js=names.map(n=>fs.readFileSync(path.join(moduleRoot,n+'.mjs'),'utf8').replace(/^import .+;\r?\n/gm,'').replace(/^export /gm,'')).join('\n\n');
  if(/<\/script/i.test(js))throw Error('Unsafe module script terminator');
  return html.replace('<link rel="stylesheet" href="./design-tokens.css">',()=>'<style>'+designTokenCss()+'</style>')
    .replace('<link rel="stylesheet" href="./style.css">',()=>'<style>'+css+'</style>')
    .replace('<link rel="stylesheet" href="../../dist/module-foundation.css">','')
    .replace(/^[ \t]*<link rel="stylesheet" href="\.\/(?:projection-studio|calculation-workshop)\.css">\r?\n/gm,'')
    .replace(/<svg data-icon="([a-z]+)"><\/svg>/g,(_,name)=>iconMarkup(name))
    .replace('<script type="module" src="./app.mjs"></script>',()=>'<script>\n\'use strict\';\n(()=>{\n'+js+'\n})();\n</script>');
}

// Appended only by this file's esbuild plugin. No demo branch in product sources.
function appHook(origin,actors,seed){return `
const qaActors=${JSON.stringify(actors)},qaSeed=${JSON.stringify(seed)};
let qaActor=null,qaAuthSession=null;
const qaEncode=v=>btoa(JSON.stringify(v)).replace(/=/g,'').replace(/\\+/g,'-').replace(/\\//g,'_');
const qaSession=actor=>{const user={id:qaActors[actor],email:actor+'@example.test',aud:'authenticated',role:'authenticated',created_at:'2026-11-01T00:00:00Z',app_metadata:{provider:'email',providers:['email']},user_metadata:{qa_fixture:true}};return {user,access_token:qaEncode({alg:'HS256',typ:'JWT'})+'.'+qaEncode({sub:user.id,session_id:'qa-'+actor,exp:4102444800,iat:1793491200,aud:'authenticated'})+'.cWE',refresh_token:'local-qa-'+actor,token_type:'bearer',expires_in:3600,expires_at:4102444800};};
const qaClient={
 auth:{
  async initialize(){return {data:{session:qaAuthSession},error:null};},
  async getSession(){return {data:{session:qaAuthSession},error:null};},
  async getUser(){return {data:{user:qaAuthSession?.user||null},error:null};},
  onAuthStateChange(){return {data:{subscription:{unsubscribe(){}}}};},
  async setSession(){return {data:{session:qaAuthSession},error:null};},
  async signOut(){qaAuthSession=null;return {error:null};},
  async resetPasswordForEmail(){return {data:{},error:null};},
  async resend(){return {data:{},error:null};}
 },
 rpc(name,args){return {setHeader(){return this;},async abortSignal(signal){const response=await fetch('/__rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actor:qaActor,name,args}),signal});return response.json();}};},
 channel(){const channel={on(){return channel;},subscribe(callback){queueMicrotask(()=>callback('SUBSCRIBED'));return channel;}};return channel;},removeChannel(){}
};
cloud.config={url:${JSON.stringify(origin)},publishableKey:'qa-local-public',authRedirectUrl:${JSON.stringify(origin+'/')}};
cloud.ready=true;cloud._client=qaClient;cloud._initialization=Promise.resolve();
// This fixture has no remote realtime service. RPCs still use the real gateway.
cloud.startHeartbeat=()=>{};
window.__mockupQA={
 label:'SYNTHETIC QA ONLY — local PostgreSQL and Auth adapter',seed:qaSeed,
 cloud,portal,duelClient,moduleProgress,preferenceStore,
 get state(){return {screen,mode:playMode,player,question:game?.question,index:game?.index,stage:game?.stage,status:game?.status,result:lastResult};},
 async actor(actor,{recovery=false}={}){portal.close();qaActor=actor;qaAuthSession=actor?qaSession(actor):null;cloud._clearRecovery();cloud._setSession(qaAuthSession);cloud._invalidateSnapshots();if(actor)await cloud.rpc('snapshot');if(recovery)cloud._rememberRecovery(qaAuthSession);for(const listener of cloud.listeners)listener(qaAuthSession,actor?'SIGNED_IN':'SIGNED_OUT');await offline.wake({force:true});return qaAuthSession?.user?.id||null;},
 preferences(patch){preferenceStore.set(patch);},
 language(language){if(locale.setLanguage(language))applyLanguage();},theme:setTheme,
 home:returnHome,guest:openGuest,guide:openEntryGuide,scores:openScores,navigate:navigateEntry,
 accounts:openAccounts,module:openLearningModule,
 settings:()=>usabilityUI.openSettings(),help:openHelp,
 async scan(kind,shape,target){await scan({kind,shape,letter:'QA'},target);},
 // Advance only an existing feedback/review state; the real Game rules generate results.
 settleSolo(){if(!game||game.mode==='duel')return false;const tick=Math.max(now(),game.transitionAt,game.reviewReadyAt)+1;if(game.reviewing)game.continueReview(tick);else game.update(tick);if(game.status==='finished')finishGame();else{lastLed={};renderQuestion();}return true;},
 async finishSolo({wrongIndices=[]}={}){let limit=0;while(game&&game.status!=='finished'&&limit++<40){if(game.status==='running'){await scan({kind:'solid',shape:game.question.shape,letter:'QA'},'r1');const shape=wrongIndices.includes(game.index)?(game.question.shape==='cube'?'cone':'cube'):game.question.shape;await scan({kind:'net',shape,letter:'QA'},'r2');}this.settleSolo();}return lastResult;},
 seedReflections(){storage.setItem(moduleProgress.key,JSON.stringify({version:1,records:${JSON.stringify(reflectionRecords)}}));moduleProgress.refreshLocal();},
 closeDialog
};
window.dispatchEvent(new Event('mockup-qa-ready'));
`;}

export async function createMockupReviewFixture({useVendoredModule=false}={}){
  const classroom=await database(),actors={...ids};
  for(let n=2;n<=5;n++){
    const actor='student'+n,id='44444444-4444-4444-8444-'+String(n).padStart(12,'0');actors[actor]=id;
    await classroom.raw('insert into auth.users(id,email) values($1,$2)',[id,actor+'@example.test']);
    await classroom.raw('insert into private.profiles(id,username,display_name,role) values($1,$2,$3,$4)',[id,actor,'QA Student '+n,'student']);
  }
  await classroom.raw("update private.profiles set display_name=case username when 'teacher' then 'QA Teacher' when 'student' then 'QA Student 1' else 'QA Other Teacher' end where username in ('teacher','student','other')");
  async function call(actor,action,payload={}){
    if(!actors[actor])throw Error('Unknown synthetic actor');
    await classroom.db.exec('reset role');
    await classroom.db.query("select set_config('request.jwt.claims',$1,false)",[JSON.stringify({sub:actors[actor],role:'authenticated'})]);
    await classroom.db.exec('set role authenticated');
    return (await classroom.db.query('select public.geo_action($1,$2::jsonb) result',[action,JSON.stringify(payload)])).rows[0].result;
  }
  const classOne=await call('teacher','create_class',{name:'QA Geometri 2A'}),classId=classOne.class_id;
  for(const actor of ['student','student2','student3','student4'])await call(actor,'join_pin',{pin:classOne.classes.find(c=>c.id===classId).pin});
  const classTwo=await call('teacher','create_class',{name:'QA Geometri 2B'}),secondClassId=classTwo.class_id;
  await call('teacher','invite',{class_id:secondClassId,username:'student'});
  await call('teacher','invite',{class_id:classId,username:'student5'});
  const open=await call('teacher','create_room',{class_id:classId,name:'QA Ruang menunggu'}),openRoomId=open.room_id;
  for(const actor of ['student','student2','student3'])await call(actor,'join_pin',{pin:open.room.pin});
  const live=await call('teacher','create_room',{class_id:classId,name:'QA Latihan bongkah'}),liveRoomId=live.room_id;
  for(const actor of ['student','student2','student3','student4'])await call(actor,'join_pin',{pin:live.room.pin});
  await call('teacher','set_room',{room_id:liveRoomId,status:'playing'});
  for(const actor of ['student','student2','student3']){
    const attempt=(await call(actor,'start_attempt',{room_id:liveRoomId})).state.attemptId;
    await classroom.raw("update private.attempts set score=$1,status='finished',timer_started_at=null,question_index=9,elapsed_ms=125000 where id=$2",[actor==='student'?7:actor==='student2'?8:5,attempt]);
    await classroom.raw('select private.sync_progress($1,$2,clock_timestamp())',[liveRoomId,actors[actor]]);
  }
  const closed=await call('teacher','create_room',{class_id:classId,name:'QA Semakan keputusan'}),closedRoomId=closed.room_id;
  for(const actor of ['student','student2','student3'])await call(actor,'join_pin',{pin:closed.room.pin});
  await call('teacher','set_room',{room_id:closedRoomId,status:'playing'});
  for(const actor of ['student','student2','student3']){
    const attempt=(await call(actor,'start_attempt',{room_id:closedRoomId})).state.attemptId;
    await classroom.raw("update private.attempts set score=$1,status='finished',timer_started_at=null,question_index=9,elapsed_ms=136000 where id=$2",[actor==='student'?7:actor==='student2'?9:6,attempt]);
    await classroom.raw('select private.sync_progress($1,$2,clock_timestamp())',[closedRoomId,actors[actor]]);
  }
  await call('teacher','set_room',{room_id:closedRoomId,status:'closed'});
  const seed={classId,secondClassId,openRoomId,liveRoomId,closedRoomId};
  const duelDb=new PGlite();
  await duelDb.exec('create role anon;create role authenticated;create role service_role bypassrls;');
  await duelDb.exec(fs.readFileSync(path.join(root,'backend/duel/schema.sql'),'utf8'));
  const duelMigration=fs.readdirSync(path.join(root,'backend/duel/supabase/migrations')).find(n=>n.endsWith('_duel_durable_review_v2.sql'));
  await duelDb.exec(fs.readFileSync(path.join(root,'backend/duel/supabase/migrations',duelMigration),'utf8'));
  await duelDb.exec('set role service_role');
  const calls=[],handleDuel=createDuelHandler({env:n=>({SUPABASE_URL:'https://fixture.invalid',SUPABASE_SERVICE_ROLE_KEY:'qa-disposable-service-key'})[n],fetch:async(_,init)=>{
    const {payload}=JSON.parse(init.body);calls.push({kind:'duel',action:payload.action});
    const {rows}=await duelDb.query('select public.geodecoder_duel_gateway($1::jsonb) as result',[JSON.stringify(payload)]);return Response.json(rows[0].result);
  }});
  const staticVisuals=new Map();
  for(const name of fs.readdirSync(path.join(root,'dist'),{recursive:true}).filter(name=>name==='index.html'||name.endsWith('.css')))staticVisuals.set(path.join(root,'dist',name),fs.readFileSync(path.join(root,'dist',name)));
  let bundle,queue=Promise.resolve();
  const server=createServer(async(req,res)=>{
    try{
      const url=new URL(req.url,'http://localhost');
      if(url.pathname==='/api/duel'){
        const chunks=[];for await(const chunk of req)chunks.push(chunk);
        const response=await handleDuel(new Request('http://127.0.0.1/api/duel',{method:req.method,headers:req.headers,...(req.method==='POST'?{body:Buffer.concat(chunks)}:{})}));
        res.writeHead(response.status,Object.fromEntries(response.headers)).end(Buffer.from(await response.arrayBuffer()));return;
      }
      if(url.pathname==='/__rpc'){
        let body='';for await(const chunk of req)body+=chunk;const {actor,name,args}=JSON.parse(body);
        queue=queue.catch(()=>{}).then(async()=>{
          calls.push({kind:'classroom',actor,name,action:args.action});
          if(name==='geo_security_sessions')return {data:{server_now:new Date().toISOString(),capabilities:{revoke_individual:false},truncated:false,sessions:[{is_current:true,started_at:'2026-11-04T02:00:00Z',user_agent:'Mozilla/5.0 (Windows NT 10.0) Chrome/151.0 Safari/537.36',status:'recorded'},{is_current:false,started_at:'2026-11-03T08:00:00Z',user_agent:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari/604.1',status:'recorded'}]},error:null};
          if(name==='geo_module_progress')return {data:args.action==='class'?{class_id:args.payload?.class_id,records:[],students:[]}:{records:reflectionRecords},error:null};
          if(name==='geo_offline_sync')return {data:{accepted:(args.payload?.events||[]).map(event=>event.id),rejected:[],records:[]},error:null};
          return {data:await call(actor,args.action,args.payload),error:null};
        });
        res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(await queue));return;
      }
      if(url.pathname==='/app.bundle.js'){res.writeHead(200,{'Content-Type':'text/javascript'}).end(bundle);return;}
      const route=decodeURIComponent(url.pathname),file=path.resolve(root,'dist','.'+(route==='/'?'/index.html':route));
      if(!file.startsWith(path.join(root,'dist')+path.sep)||!fs.existsSync(file)){res.writeHead(404).end();return;}
      const type={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg','.wav':'audio/wav','.svg':'image/svg+xml'}[path.extname(file)]||'application/octet-stream';
      let data=staticVisuals.get(file)||fs.readFileSync(file);
      if(route==='/')data=Buffer.from(data.toString().replace(/<meta http-equiv="Content-Security-Policy"[^>]*>/i,''));
      res.writeHead(200,{'Content-Type':type}).end(data);
    }catch(error){res.writeHead(500,{'Content-Type':'application/json'}).end(JSON.stringify({error:{message:error.message}}));}
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
  const importedModule=fs.readFileSync(path.join(root,'dist/app.mjs'),'utf8').match(/import moduleHtml from '([^']+)'/);
  if(!importedModule)throw Error('Actual module import could not be identified');
  const moduleFile=path.resolve(root,'dist',importedModule[1]);
  const html=useVendoredModule?fs.readFileSync(moduleFile,'utf8'):freshModuleHtml();
  bundle=(await build({entryPoints:[path.join(root,'dist/app.mjs')],bundle:true,write:false,platform:'browser',format:'iife',target:['es2022'],loader:{'.html':'text'},plugins:[{name:'mockup-review-local-only',setup(b){
    b.onLoad({filter:/[/\\]app\.mjs$/},args=>args.path===path.join(root,'dist/app.mjs')?{contents:fs.readFileSync(args.path,'utf8')+appHook(origin,actors,seed),loader:'js'}:null);
    b.onLoad({filter:/[/\\]duel\.mjs$/},args=>({contents:fs.readFileSync(args.path,'utf8').replace(/export const DUEL_ENDPOINT='[^']+';/,`export const DUEL_ENDPOINT='${origin}/api/duel';`),loader:'js'}));
    b.onLoad({filter:/[/\\]module-v[^/\\]+\.html$/},()=>({contents:html,loader:'text'}));
  }}]})).outputFiles[0].text;
  const hash=value=>createHash('sha256').update(value).digest('hex');
  const moduleBytes=Buffer.from(html),builtBundle=path.join(root,'dist/app.bundle.js');
  const sourceEvidence={bundleSha256:hash(bundle),appSourceSha256:hash(fs.readFileSync(path.join(root,'dist/app.mjs'))),builtAppBundleSha256:fs.existsSync(builtBundle)?hash(fs.readFileSync(builtBundle)):null,moduleMode:useVendoredModule?'packaged-vendor':'current-source-in-memory',moduleImport:path.relative(root,moduleFile),moduleHtmlSha256:hash(moduleBytes),moduleGitBlobSha1:createHash('sha1').update(Buffer.from('blob '+moduleBytes.length+'\0')).update(moduleBytes).digest('hex'),staticVisuals:Object.fromEntries([...staticVisuals].map(([file,data])=>[path.relative(root,file),hash(data)]))};
  return {origin,seed,actors,calls,classroom,duelDb,sourceEvidence,async close(){await new Promise(resolve=>server.close(resolve));await classroom.db.close();await duelDb.close();}};
}
