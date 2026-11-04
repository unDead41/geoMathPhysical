import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {fileURLToPath} from 'node:url';
import {createRequire} from 'node:module';
import {build} from 'esbuild';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
let playwright;
if(process.env.PLAYWRIGHT_MODULE_PATH)playwright=require(process.env.PLAYWRIGHT_MODULE_PATH);
else{try{playwright=require('playwright');}catch{playwright=require(path.join(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES||'/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules','playwright'));}}
const {chromium}=playwright;
const directory=path.join(root,'artifacts/pwa');
const evidence=process.env.OFFLINE_EVIDENCE_DIR||path.join(root,'docs/handoffs/digitalized-utility-offline-sync/evidence');fs.mkdirSync(evidence,{recursive:true});
const owner='11111111-1111-4111-8111-111111111111';
const reflection={activity:'net',stage:'prediction',prediction:'Enam muka',result:'',explanation:'',completed:false};
const index=fs.readFileSync(path.join(directory,'index.html'),'utf8'),worker=fs.readFileSync(path.join(directory,'sw.js'),'utf8');
const javascript=(await build({entryPoints:[path.join(root,'dist/app.mjs')],bundle:true,write:false,format:'iife',platform:'browser',loader:{'.html':'text'},target:['es2022']})).outputFiles[0].text;
assert.ok(javascript.includes('var cloud = new ClassroomCloud();'),'The existing test-only composition seam must match');
const fixture=fs.readFileSync(path.join(root,'dist/index.html'),'utf8').replace('<script type="module" src="./app.bundle.js"></script>',()=>'<script>'+javascript.replace('var cloud = new ClassroomCloud();','var cloud = new ClassroomCloud(); window.__offlineCloudFixture = cloud;').replace('offline.attachModule(moduleProgress);','offline.attachModule(moduleProgress); window.__offlineProgressFixture = moduleProgress;')+'</script>');
let generation=1,authorizedReads=0;
const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.mp3':'audio/mpeg','.webmanifest':'application/manifest+json'};
const server=createServer((request,response)=>{
 const url=new URL(request.url,'http://localhost');let file;
 if(url.pathname==='/fixture/'){response.writeHead(200,{'Content-Type':'text/html'}).end(fixture);return;}
 if(url.pathname.startsWith('/fixture/'))file=path.resolve(root,'dist',url.pathname.slice('/fixture/'.length));
 else if(url.pathname.startsWith('/source/'))file=path.resolve(root,'dist',url.pathname.slice('/source/'.length));
 else if(/^\/(geomath|incomplete)\//.test(url.pathname)){
  const relative=url.pathname.replace(/^\/(geomath|incomplete)\//,'')||'index.html';
  if(relative==='index.html'){
   if(request.headers.authorization){authorizedReads++;response.writeHead(200,{'Content-Type':'text/html'}).end('AUTHORIZED FIXTURE');return;}
   response.writeHead(200,{'Content-Type':'text/html'}).end(index.replace('</head>',`<meta name="offline-qa-generation" content="${generation}"></head>`));return;
  }
  if(relative==='sw.js'){response.writeHead(200,{'Content-Type':'text/javascript','Cache-Control':'no-store'}).end(generation===2?worker.replace(/const VERSION="[a-f0-9]+"/,'const VERSION="updated-offline-build"'):worker);return;}
  if(url.pathname.startsWith('/incomplete/')&&relative==='assets/audio/map.mp3'){response.writeHead(503).end();return;}
  file=path.resolve(directory,relative);
 }
 if(!file||!file.startsWith(root+path.sep)){response.writeHead(404).end();return;}
 fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return;}response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(data);});
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const origin=`http://127.0.0.1:${server.address().port}`;
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||(fs.existsSync('/tmp/chromium')&&fs.statSync('/tmp/chromium').size?'/tmp/chromium':chromium.executablePath()),args:['--no-sandbox','--disable-dev-shm-usage']});
const cases=[];
async function run(name,fn){if(process.env.OFFLINE_BROWSER_CASE&&!name.includes(process.env.OFFLINE_BROWSER_CASE))return;await fn();cases.push(name);console.log('PASS '+name);}
try{
 await run('native IndexedDB survives page closure, isolates owners and acknowledges exact IDs',async()=>{
  const context=await browser.newContext(),page=await context.newPage();await page.goto(origin+'/geomath/');
  await page.evaluate(async({owner,reflection})=>{
   const {OfflineDB}=await import('/source/offline-db.mjs');const db=new OfflineDB({name:'geomath-native-idb-qa'});
   const event={owner,id:'native:one',kind:'module',content_version:1,payload:reflection};
   await db.enqueue(event);await db.enqueue(event);if((await db.list(owner)).length!==1)throw Error('Duplicate queued');
   try{await db.enqueue({...event,payload:{...reflection,prediction:'A different record'}});throw Error('Conflicting ID accepted');}catch(e){if(e.message==='Conflicting ID accepted')throw e;}
  },{owner,reflection});
  await page.close();const reopened=await context.newPage();await reopened.goto(origin+'/geomath/');
  const count=await reopened.evaluate(async owner=>{
   const {OfflineDB}=await import('/source/offline-db.mjs');const db=new OfflineDB({name:'geomath-native-idb-qa'});
   const before=(await db.list(owner)).length;await db.ack('22222222-2222-4222-8222-222222222222',['native:one']);
   if((await db.list(owner)).length!==before)throw Error('Cross-owner ack deleted data');await db.ack(owner,['native:one']);
   if((await db.list(owner)).length)throw Error('Ack failed');return before;
  },owner);assert.equal(count,1);await context.close();
 });
 await run('complete PWA caches both tracks and reloads the actual learning website offline',async()=>{
  const context=await browser.newContext({viewport:{width:1365,height:980}}),page=await context.newPage(),errors=[];
  page.on('pageerror',error=>errors.push(error.message));await page.goto(origin+'/geomath/');
  await page.getByText('Sedia digunakan offline',{exact:true}).waitFor({state:'attached',timeout:45000});
  const resources=await page.evaluate(async()=>{const names=await caches.keys();const name=names.find(n=>n.startsWith('geodecoder-offline:/geomath/'));return (await (await caches.open(name)).keys()).map(r=>r.url);});
  assert.equal(resources.length,5);assert.equal(resources.filter(r=>r.endsWith('.mp3')).length,2);
  await context.setOffline(true);await page.reload();await page.locator('#module-button').click();
  await page.locator('#module-frame').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('#module-frame').contentDocument===null||document.querySelector('#module-frame').getAttribute('srcdoc')?.includes('GeoDecoder'));
  assert.match(await page.locator('#offline-panel').textContent(),/Tiada internet/);
  await page.locator('#offline-panel summary').click();await page.screenshot({path:path.join(evidence,'offline-module-desktop.png'),fullPage:true});
  assert.deepEqual(errors,[]);await context.close();
 });
 await run('a partial resource failure never claims offline readiness',async()=>{
  const context=await browser.newContext(),page=await context.newPage();await page.goto(origin+'/incomplete/');
  await page.getByText('Kandungan offline belum lengkap. Cuba lagi ketika online.',{exact:true}).waitFor({state:'attached',timeout:45000});
  assert.equal(await page.getByText('Sedia digunakan offline',{exact:true}).count(),0);
  assert.equal(await page.evaluate(async()=> (await caches.keys()).some(n=>n.startsWith('geodecoder-offline:/incomplete/'))),false);await context.close();
 });
 await run('authorization requests and callback query URLs never enter the public cache',async()=>{
  const context=await browser.newContext(),page=await context.newPage();await page.goto(origin+'/geomath/');
  await page.getByText('Sedia digunakan offline',{exact:true}).waitFor({state:'attached',timeout:45000});await page.reload();
  assert.equal(await page.evaluate(async()=> (await fetch('./index.html',{headers:{Authorization:'Bearer fixture-private'}})).text()),'AUTHORIZED FIXTURE');assert.equal(authorizedReads,1);
  await page.evaluate(()=>fetch('./?code=fixture-private-callback'));
  const cache=await page.evaluate(async()=>{const name=(await caches.keys()).find(n=>n.startsWith('geodecoder-offline:/geomath/'));const cache=await caches.open(name);return {keys:(await cache.keys()).map(r=>r.url),html:await(await cache.match(new URL('./index.html',location.href).href)).text()};});
  assert.ok(cache.keys.every(k=>!k.includes('fixture-private')));assert.ok(!cache.html.includes('AUTHORIZED FIXTURE'));await context.close();
 });
 await run('real app completion queues once offline; reconnect commits through controlled transport',async()=>{
  const context=await browser.newContext({viewport:{width:390,height:844}});
  await context.addInitScript(()=>{Math.random=()=>.41;});
  const page=await context.newPage(),errors=[];page.on('pageerror',error=>errors.push(error.message));
  await page.goto(origin+'/fixture/');await context.setOffline(true);
  await page.evaluate(owner=>{
   const cloud=window.__offlineCloudFixture;cloud.init=async()=>cloud.session;
   cloud.offlineSync=async(action,payload)=>{if(!navigator.onLine)throw Error('Offline');return {accepted:payload.events?.map(r=>r.id)||[],records:[]};};
   cloud.moduleProgress=async()=>({records:[]});cloud._setSession({user:{id:owner},access_token:'fixture-only'});cloud.profile={id:owner,role:'student'};
   for(const listener of cloud.listeners)listener(cloud.session);
  },owner);
  await page.locator('#guest-button').click();await page.locator('#player-name').fill('Offline QA');await page.locator('#player-form [type=submit]').click();
  if(await page.locator('#guide-screen').isVisible())await page.locator('#guide-start-button').click();
  for(let n=0;n<10;n++){await page.locator('#skip-button').click();await page.waitForFunction(()=>!document.querySelector('#continue-button').disabled);await page.locator('#continue-button').click();}
  await page.locator('#result-screen').waitFor({state:'visible'});await page.waitForFunction(()=>document.querySelector('[data-offline-status]').textContent.includes('1 rekod'));
  await page.locator('#settings-button').click();await page.locator('#language-select').selectOption('en');await page.locator('#theme-select').selectOption('dark');await page.locator('#dialog-close').click();
  await page.locator('#offline-panel summary').click();assert.ok(await page.locator('[data-offline-status]').textContent());
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
  await page.screenshot({path:path.join(evidence,'offline-result-mobile-en.png'),fullPage:true});
  await context.setOffline(false);await page.waitForFunction(()=>document.querySelector('[data-offline-status]').textContent==='All records synced',{},{timeout:15000});
  assert.deepEqual(errors,[]);await context.close();
 });
 await run('switching accounts rebuilds the open module and removes the previous private draft',async()=>{
  const context=await browser.newContext(),page=await context.newPage();await page.goto(origin+'/fixture/');
  async function account(id){await page.evaluate(id=>{
   const cloud=window.__offlineCloudFixture;cloud.init=async()=>cloud.session;cloud.moduleProgress=async()=>({records:[]});cloud.offlineSync=async()=>({accepted:[],records:[]});
   cloud._setSession({user:{id},access_token:'fixture-'+id});cloud.profile={id,role:'student'};for(const listener of cloud.listeners)listener(cloud.session,'SIGNED_IN');
  },id);}
  await account(owner);await page.locator('#module-button').click();
  const frame=page.frameLocator('#module-frame');await frame.locator('body').waitFor();
  await frame.locator('body').evaluate(body=>{const marker=body.ownerDocument.createElement('p');marker.id='private-account-a-draft';marker.textContent='Private draft of account A';body.append(marker);});
  await account('22222222-2222-4222-8222-222222222222');await frame.locator('#private-account-a-draft').waitFor({state:'detached',timeout:10000});
  await frame.locator('body').waitFor();
  await frame.locator('body').evaluate(()=>{
   window.addEventListener('message',event=>{if(event.data?.type==='geodecoder:module-context')window.__offlineFrameContext=event.data;});
   parent.postMessage({type:'geodecoder:module-ready',protocol:1},'*');
  });
  await frame.locator('body').evaluate(async()=>{for(let i=0;!window.__offlineFrameContext&&i<100;i++)await new Promise(r=>setTimeout(r,10));if(!window.__offlineFrameContext)throw Error('No new owner context');});
  await frame.locator('body').evaluate((_body,reflection)=>parent.postMessage({type:'geodecoder:module-progress',protocol:1,session:window.__offlineFrameContext.session,...reflection},'*'),{...reflection,prediction:'Account B new reflection'});
  try{await page.waitForFunction(()=>JSON.parse(localStorage.getItem('geodecoder.module.progress.v1.22222222-2222-4222-8222-222222222222')||'{}').records?.some(r=>r.prediction==='Account B new reflection'),{},{timeout:10000});}
  catch(error){console.log('OWNER DIAGNOSTIC '+JSON.stringify(await page.evaluate(()=>({state:window.__offlineProgressFixture?.state,active:window.__offlineProgressFixture?.active,ready:window.__offlineProgressFixture?.ready,session:window.__offlineProgressFixture?.session,profile:window.__offlineCloudFixture?.profile,local:Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith('geodecoder.module')).map(k=>[k,localStorage.getItem(k)]))}))));console.log('FRAME DIAGNOSTIC '+JSON.stringify(await frame.locator('body').evaluate(()=>window.__offlineFrameContext)));throw error;}
  await frame.locator('body').evaluate(body=>{const marker=body.ownerDocument.createElement('p');marker.id='private-account-b-draft';marker.textContent='B draft';body.append(marker);});
  await page.evaluate(()=>{const cloud=window.__offlineCloudFixture;cloud._setSession(null);for(const listener of cloud.listeners)listener(null,'SIGNED_OUT');});
  await frame.locator('#private-account-b-draft').waitFor({state:'detached',timeout:10000});await context.close();
 });
 await run('installing an update preserves the active game until explicit reload',async()=>{
  const context=await browser.newContext(),page=await context.newPage();await page.goto(origin+'/geomath/');
  await page.getByText('Sedia digunakan offline',{exact:true}).waitFor({state:'attached',timeout:45000});
  await page.locator('#guest-button').click();await page.locator('#player-name').fill('Update QA');await page.locator('#player-form [type=submit]').click();
  if(await page.locator('#guide-screen').isVisible())await page.locator('#guide-start-button').click();
  const question=await page.locator('#question-counter').textContent();generation=2;
  await page.evaluate(async()=>{const registration=await navigator.serviceWorker.getRegistration();await registration.update();});
  await page.waitForFunction(async()=>Boolean((await navigator.serviceWorker.getRegistration())?.waiting),{},{timeout:45000});
  assert.equal(await page.locator('#game-screen').isVisible(),true);assert.equal(await page.locator('#question-counter').textContent(),question);
  assert.equal(await page.locator('meta[name=offline-qa-generation]').getAttribute('content'),'1');
  await page.locator('#offline-panel summary').click();await page.locator('[data-offline-update]').click();await page.waitForFunction(()=>document.querySelector('meta[name=offline-qa-generation]')?.content==='2');
  assert.equal(await page.locator('#solo-resume-button').isVisible(),true);await context.close();generation=1;
 });
 fs.writeFileSync(path.join(evidence,'browser-results.json'),JSON.stringify({cases,passed:cases.length,hostedAuth:false,transport:'controlled fixture for signed-in completion; native browser storage and service worker'},null,2)+'\n');
}finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
