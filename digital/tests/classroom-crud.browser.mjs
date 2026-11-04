// Local integration: real portal + ClassroomCloud + PostgreSQL gateway.
// Synthetic Auth/session adapter; no production account, email or database calls.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from 'esbuild';
import {database,ids} from './classroom-crud.fixture.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const out=path.join(root,'docs/classroom-crud/evidence');fs.mkdirSync(out,{recursive:true});
const h=await database();
const seeded=await h.call('teacher','create_class',{name:'2 STEM'}),cid=seeded.class_id;
await h.call('student','join_pin',{pin:seeded.classes[0].pin});
const seededRoom=await h.call('teacher','create_room',{class_id:cid,name:'Latihan Bongkah'}),rid=seededRoom.room_id;
await h.call('student','join_pin',{pin:seededRoom.room.pin});
await h.call('teacher','set_room',{room_id:rid,status:'playing'});
const attempt=(await h.call('student','start_attempt',{room_id:rid})).state.attemptId;
await h.call('teacher','set_room',{room_id:rid,status:'closed'});
// A display fixture, not evidence of a learner achieving a result.
await h.raw("update private.attempts set score=7,status='finished' where id=$1",[attempt]);
await h.raw('select private.sync_progress($1,$2,clock_timestamp())',[rid,ids.student]);
const script=(await build({stdin:{contents:`
 import {createPortal} from './dist/portal.mjs';
 import {ClassroomCloud} from './dist/cloud.mjs';
 const params=new URLSearchParams(location.search),actor=params.get('actor')||'teacher';
 document.documentElement.lang=params.get('lang')||'ms';
 document.documentElement.dataset.theme=params.get('theme')||'light';
 document.documentElement.style.setProperty('--text-scale',params.get('size')||'1');
 const cloud=new ClassroomCloud({url:'https://qa.invalid',publishableKey:'synthetic-public'});
 cloud._client={auth:{async getSession(){return {data:{session:cloud.session}};}},rpc(name,args){return {setHeader(){return this;},async abortSignal(signal){const reply=await fetch('/__rpc',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({actor,name,args}),signal});return reply.json();}}}};
 cloud._setSession({user:{id:${JSON.stringify(ids)}[actor]},access_token:'synthetic-qa-'+actor,refresh_token:'synthetic-refresh-'+actor});
 const portal=createPortal({cloud});window.__qa={portal,cloud};await portal.open();
 `,resolveDir:root,sourcefile:'classroom-qa.mjs',loader:'js'},bundle:true,write:false,format:'esm',platform:'browser',target:'es2022'})).outputFiles[0].text;
let queue=Promise.resolve(),failNext=false,failSnapshotNext=false;
const mime={'.css':'text/css','.mjs':'text/javascript','.js':'text/javascript','.html':'text/html'};
const server=createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/__fixture.js'){res.writeHead(200,{'Content-Type':'text/javascript'}).end(script);return;}
 if(url.pathname==='/'){
  res.writeHead(200,{'Content-Type':'text/html'}).end(`<!doctype html><html lang="ms"><head><meta name="viewport" content="width=device-width,initial-scale=1">${['design-tokens','style','portal','usability','foundation'].map(n=>`<link rel="stylesheet" href="/dist/${n}.css">`).join('')}</head><body><main><section id="portal-screen"></section></main><script type="module" src="/__fixture.js"></script></body></html>`);return;
 }
 if(url.pathname==='/__rpc'){
  let text='';for await(const part of req)text+=part;
  const {actor,name,args}=JSON.parse(text);if(!Object.hasOwn(ids,actor)){res.writeHead(403).end();return;}
  queue=queue.then(async()=>{
   if(failNext&&args.action==='rename_class'){failNext=false;return {data:null,error:{message:'Network connection failed'}};}
   if(failSnapshotNext&&args.action==='snapshot'){failSnapshotNext=false;return {data:null,error:{message:'Network connection failed'}};}
   if(name==='geo_module_progress')return {data:{class_id:args.payload.class_id,records:[],students:[]},error:null};
   return {data:await h.call(actor,args.action,args.payload),error:null};
  });
  try{res.writeHead(200,{'Content-Type':'application/json'}).end(JSON.stringify(await queue));}catch(error){res.writeHead(500).end(JSON.stringify({error:{message:error.message}}));}return;
 }
 const file=path.resolve(root,'.'+decodeURIComponent(url.pathname));
 if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
 fs.readFile(file,(err,data)=>{if(err){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data);});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin='http://127.0.0.1:'+server.address().port;
const require=createRequire(import.meta.url);const {chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||(fs.existsSync('/tmp/chromium')?'/tmp/chromium':chromium.executablePath()),args:['--no-sandbox','--disable-dev-shm-usage']});
const results=[];
const dialog=page=>page.locator('#portal-management-dialog');
const manage=(page,kind,operation)=>page.locator(`[data-portal-action="manage-${kind}"][data-operation="${operation}"]`).first();
async function confirm(page){await dialog(page).locator('[type=submit]').click();await dialog(page).waitFor({state:'hidden'});}
async function fits(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'page fits viewport');if(await dialog(page).isVisible())assert.ok(await dialog(page).evaluate(n=>{const r=n.getBoundingClientRect();return r.left>=0&&r.right<=innerWidth+1&&r.top>=0&&r.bottom<=innerHeight+1&&n.scrollWidth<=n.clientWidth+1;}),'dialog fits viewport');}
async function run(name,viewport,fn){const context=await browser.newContext({viewport,reducedMotion:'reduce'});await context.route('https://**',r=>r.abort());const page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));try{await fn(page);assert.deepEqual(errors,[]);results.push({name,pass:true});console.log('PASS '+name);}catch(error){await page.screenshot({path:path.join(out,'failed.png'),fullPage:true});throw error;}finally{await context.close();}}
try{
 await run('create, rename, archive, restore and delete empty class and room',{width:1440,height:1050},async page=>{
  await page.goto(origin);await page.locator('#portal-class-name').fill('3 Integrasi');await page.locator('[data-portal-form=create-class] [type=submit]').click();await page.locator('.portal-class-overview h2').filter({hasText:'3 Integrasi'}).waitFor();
  await manage(page,'class','rename').click();await page.locator('#portal-management-name').fill('\u{1d538}'.repeat(40));await confirm(page);
  assert.equal(await page.locator('.portal-class-overview h2').innerText(),'\u{1d538}'.repeat(40));
  await manage(page,'class','rename').click();await page.locator('#portal-management-name').fill('3 Cemerlang');await confirm(page);
  await page.locator('#portal-room-name').fill('Bilik Geometri');await page.locator('[data-portal-form=create-room] [type=submit]').click();await page.locator('.portal-room-heading').waitFor();
  await manage(page,'room','rename').click();await page.locator('#portal-management-name').fill('Latihan Kendiri');await confirm(page);assert.equal(await page.locator('.portal-room-heading h1').innerText(),'Latihan Kendiri');
  await manage(page,'room','archive').click();await confirm(page);await manage(page,'room','restore').click();await confirm(page);
  await manage(page,'room','delete').click();await confirm(page);await manage(page,'class','delete').click();await confirm(page);
  assert.equal(await page.locator('.portal-class-choice').filter({hasText:'3 Cemerlang'}).count(),0);
  await fits(page);await page.screenshot({path:path.join(out,'teacher-management-desktop.png'),fullPage:true});
 });
 await run('stale edit, explicit refresh and failed-save retry in English dark mobile',{width:390,height:844},async page=>{
  await page.goto(origin+'/?lang=en&theme=dark&size=1.25');await manage(page,'class','rename').click();
  await page.locator('#portal-management-name').fill('Teacher draft');
  await queue;const current=await h.call('teacher','snapshot');const version=current.classes.find(c=>c.id===cid).revision;
  await h.call('teacher','rename_class',{class_id:cid,name:'Concurrent edit',expected_revision:version});
  await dialog(page).locator('[type=submit]').click();await dialog(page).locator('[data-form-error]').filter({hasText:'changed'}).waitFor();
  await fits(page);await page.screenshot({path:path.join(out,'edit-conflict-mobile-dark-en.png'),fullPage:true});
  failSnapshotNext=true;await page.locator('[data-portal-action=management-refresh]').click();await dialog(page).locator('[data-form-error]').filter({hasText:/connection/i}).waitFor();
  assert.ok(await dialog(page).locator('[data-form-error]').evaluate(n=>n===document.activeElement));
  await page.locator('[data-portal-action=management-refresh]').click();await page.waitForFunction(()=>document.querySelector('#portal-management-dialog [data-form-error]').textContent==='');
  failNext=true;await dialog(page).locator('[type=submit]').click();await dialog(page).locator('[data-form-error]').filter({hasText:/connection/i}).waitFor();
  assert.equal(await page.locator('#portal-management-name').inputValue(),'Teacher draft');await confirm(page);
  await manage(page,'class','archive').click();assert.equal(await page.evaluate(()=>document.activeElement.dataset.portalAction),'management-cancel');
  await page.locator('[data-portal-action=management-refresh]').focus();await page.keyboard.press('Enter');await page.waitForFunction(()=>document.activeElement.dataset.portalAction==='management-cancel');
  for(let i=0;i<6;i++)await page.keyboard.press('Tab');assert.ok(await page.evaluate(()=>Boolean(document.activeElement.closest('dialog'))));
  await page.keyboard.press('Escape');assert.equal(await manage(page,'class','archive').evaluate(n=>n===document.activeElement),true);
 });
 await run('remove learner preserves real stored attempt and denies subsequent room access',{width:1440,height:1050},async page=>{
  await page.goto(origin);await page.locator('[data-portal-action=manage-member]').click();await dialog(page).locator('p').filter({hasText:'student'}).waitFor();await fits(page);
  await page.screenshot({path:path.join(out,'remove-student-confirmation.png'),fullPage:true});await confirm(page);
  await queue;assert.equal((await h.raw('select score from private.attempts where id=$1',[attempt]))[0].score,7);
  assert.equal((await h.call('student','snapshot',{room_id:rid})).error.code,'forbidden');
 });
 await run('student invitation decline and management permissions',{width:390,height:844},async page=>{
  await h.call('teacher','invite',{class_id:cid,username:'student'});
  await page.goto(origin+'/?actor=student&lang=en');await page.locator('[data-portal-action=manage-invite]').click();await confirm(page);
  assert.equal(await page.locator('[data-portal-action=manage-class]').count(),0);
  assert.equal(await page.locator('[data-portal-action=manage-invite]').count(),0);await fits(page);
 });
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));await h.db.close();fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify({environment:'local Chromium, real PostgreSQL via PGlite, synthetic Auth adapter',cases:results},null,2)+'\n');}
