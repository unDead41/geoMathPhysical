import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {settings,startGuest} from './ease-browser-helpers.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
let chromium;
if(process.env.PLAYWRIGHT_MODULE_PATH)({chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH));
else{try{({chromium}=require('playwright'));}catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}}
const evidence=path.join(root,'docs/design-system-evidence',process.env.DESIGN_EVIDENCE_RUN||'');fs.mkdirSync(evidence,{recursive:true});
const mime={'.html':'text/html','.mjs':'text/javascript','.js':'text/javascript','.css':'text/css','.mp3':'audio/mpeg'};
const server=createServer((req,res)=>{const file=path.resolve(root,'.'+decodeURIComponent(new URL(req.url,'http://local').pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}fs.readFile(file,(e,b)=>{if(e){res.writeHead(404).end();return;}res.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'}).end(b);});});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));const origin=`http://127.0.0.1:${server.address().port}`;
const executablePath=process.env.PLAYWRIGHT_CHROMIUM_PATH||(fs.existsSync('/tmp/chromium')&&fs.statSync('/tmp/chromium').size>0?'/tmp/chromium':chromium.executablePath());
let browser;const results=[];
async function fits(page,name){const box=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,dialog:document.querySelector('dialog[open]')?{width:document.querySelector('dialog[open]').clientWidth,scroll:document.querySelector('dialog[open]').scrollWidth}:null}));assert.ok(box.scroll<=box.width+1,`${name}: document overflow ${JSON.stringify(box)}`);if(box.dialog)assert.ok(box.dialog.scroll<=box.dialog.width+1,`${name}: dialog overflow`);}
async function shot(page,name){await page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true,animations:'disabled'});}
async function run(name,viewport,fn){const context=await browser.newContext({viewport,reducedMotion:'reduce'}),errors=[];await context.addInitScript(()=>{Math.random=()=>.41;});const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await context.route('**/*',route=>{const url=route.request().url();return /^https?:/.test(url)&&!url.startsWith(origin)?route.abort():route.continue();});try{await fn(page,context);assert.deepEqual(errors,[],name+' runtime errors');results.push({name,pass:true});console.log('PASS '+name);}catch(error){await shot(page,'failed-'+name.replace(/[^a-z0-9]+/gi,'-'));console.log(JSON.stringify(await page.locator('body *').evaluateAll(nodes=>nodes.filter(n=>n.checkVisibility()).map(n=>({tag:n.tagName,id:n.id,cls:n.className,rect:n.getBoundingClientRect().toJSON(),text:n.textContent.slice(0,100)})).filter(n=>n.rect.right>innerWidth+1||n.rect.left< -1).slice(0,25)),null,2));throw error;}finally{await context.close();}}
try{
 browser=await chromium.launch({headless:true,executablePath,args:['--no-sandbox','--disable-dev-shm-usage']});
 for(const theme of ['light','dark']){
  await run('Home and Auth desktop '+theme,{width:1365,height:980},async page=>{
   await page.goto(origin+'/dist/index.html');await settings(page,{theme});await fits(page,'Home');await shot(page,'after-home-'+theme);
   await page.locator('#welcome-account-button').click();await fits(page,'Sign in');await shot(page,'after-signin-'+theme);
   await page.locator('label[for="portal-username"]').click();assert.equal(await page.locator('#portal-username').evaluate(n=>n===document.activeElement),true,'Label focuses username');
   await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>getComputedStyle(document.activeElement).outlineStyle),'solid','Keyboard focus visible');
   await page.locator('[data-portal-form="login"] [type="submit"]').click();assert.equal(await page.locator('#portal-username').getAttribute('aria-invalid'),'true');
   await page.locator('[data-mode="signup"]').click();await page.locator('[data-portal-form="signup"] [type="submit"]').click();await fits(page,'Signup error');await shot(page,'after-signup-'+theme);
   await page.locator('.portal-auth-modes [data-mode="login"]').click();await page.locator('[data-mode="recover-email"]').click();await page.locator('[data-portal-form="recover-email"] [type="submit"]').click();await fits(page,'Forgot error');await shot(page,'after-forgot-'+theme);
  });
 }
 for(const language of ['ms','en'])for(const theme of ['light','dark']){
  await run(`Phone150 ${language} ${theme}`,{width:320,height:900},async page=>{
   await page.goto(origin+'/dist/index.html');await settings(page,{language,theme,textSize:150},true);await fits(page,'Settings320150');await shot(page,`after-settings-${language}-${theme}-320-150`);await page.keyboard.press('Escape');assert.equal(await page.locator('#settings-button').evaluate(n=>n===document.activeElement),true,'Dialog restores settings focus');
   await page.locator('#welcome-account-button').click();await fits(page,'Signin320150');await page.locator('[data-mode="signup"]').click();await fits(page,'Signup320150');await page.locator('.portal-auth-modes [data-mode="login"]').click();await page.locator('[data-mode="recover-email"]').click();await fits(page,'Forgot320150');
   await page.locator('[data-portal-action="exit"]').click();await startGuest(page);await fits(page,'Game320150');await page.locator('.choice[data-kind="solid"]').first().click();await page.locator('.choice[data-kind="solid"]').first().focus();await page.keyboard.press('Tab');await fits(page,'Selected game');await shot(page,`after-game-${language}-${theme}-320-150`);
  });
 }
 await run('All 15 English question layouts at 320px and 150%',{width:320,height:900},async page=>{
  await page.goto(origin+'/dist/index.html');await settings(page,{language:'en',theme:'dark',textSize:150});await startGuest(page,{mode:'practice'});
  for(let i=0;i<15;i++){await fits(page,'Practice question '+(i+1));await page.locator('#hint-button').click();await fits(page,'Hint '+(i+1));for(const scroller of await page.locator('.formula-scroll').all()){if(await scroller.evaluate(n=>n.scrollWidth>n.clientWidth+1)){await scroller.focus();await scroller.press('ArrowRight');await page.waitForFunction(()=>[...document.querySelectorAll('.formula-scroll')].some(n=>n.scrollLeft>0));await shot(page,'after-formula-scroll-320-150');}}await page.locator('#skip-button').click();await page.locator('#continue-button').waitFor({state:'visible'});await fits(page,'Correction '+(i+1));await page.waitForFunction(()=>!document.querySelector('#continue-button').disabled);await page.locator('#continue-button').click();if(i<14)await page.waitForFunction(n=>document.querySelector('#question-counter').textContent.includes(String(n).padStart(2,'0')+' /'),i+2);}
  await page.locator('#result-screen').waitFor({state:'visible'});await fits(page,'Practice results');
 });
 for(const view of ['profile','security','reset'])for(const theme of ['light','dark']){
  await run(`${view} controlled fixture ${theme}`,{width:320,height:900},async page=>{
   await page.goto(origin+`/tests/browser/design-system.html?view=${view}&theme=${theme}&lang=en&size=largest`);
   await page.locator(view==='profile'?'[data-portal-form="profile"]':view==='security'?'[data-portal-form="change-password"]':'[data-portal-form="reset-password"]').waitFor();
   await fits(page,view+'320150');if(view!=='profile'){await page.locator(`[data-portal-form="${view==='security'?'change-password':'reset-password'}"] [type="submit"]`).click();assert.ok(await page.locator('[aria-invalid="true"]').count()>0,'Actual account validator marks fields');}
   const toggle=await page.locator('#fixture-toggle').boundingBox();assert.ok(toggle.width>toggle.height*1.5,'Toggle keeps switch geometry inside Settings');await page.locator('#fixture-toggle').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#fixture-toggle').isChecked(),true);await shot(page,`after-${view}-${theme}-320-150-fixture`);
  });
 }
 await run('Embedded pinned module preferences and math preserve values',{width:320,height:900},async page=>{
  await page.goto(origin+'/dist/index.html');await settings(page,{language:'en',theme:'dark',textSize:150});await page.locator('#module-button').click();const frame=page.frameLocator('#module-frame');await frame.locator('#learn-notes').click();await frame.locator('#measure-a').fill('7.5');const area=await frame.locator('#calculated-area').innerText();assert.match(area,/337.5/);await frame.locator('#module-settings').click();await page.locator('#app-dialog[open] #settings-panel').waitFor({state:'visible'});await settings(page,{language:'ms',theme:'light',textSize:125});assert.equal(await frame.locator('#measure-a').inputValue(),'7.5');assert.equal(await frame.locator('#calculated-area').innerText(),area);await page.waitForTimeout(100);assert.equal(await frame.locator('html').getAttribute('data-theme'),'light');const shared=await frame.locator('html').evaluate(n=>getComputedStyle(n).getPropertyValue('--border-control').trim());assert.equal(shared,'#7D94A8','Embedded module consumes central tokens');await fits(page,'Module parent');const child=await frame.locator('html').evaluate(n=>({width:innerWidth,scroll:n.scrollWidth}));assert.ok(child.scroll<=child.width+1,'Module reflows');await shot(page,'after-module-notes-320-125');
 });
 await run('Downloaded HTML offline uses same controls',{width:320,height:900},async(page,context)=>{await context.setOffline(true);await page.goto(pathToFileURL(path.join(root,'artifacts/GeoDecoder_Digital_V2.html')).href);await settings(page,{theme:'dark'});await page.locator('#guest-button').focus();await page.keyboard.press('Tab');await page.keyboard.press('Shift+Tab');assert.equal(await page.locator('#guest-button').evaluate(n=>n===document.activeElement&&n.matches(':focus-visible')),true,'Keyboard navigation exposes the focus ring');const outline=await page.locator('#guest-button').evaluate(n=>getComputedStyle(n).outlineWidth);assert.equal(outline,'3px');await page.locator('#module-button').click();await page.frameLocator('#module-frame').locator('#learn-notes').click();await fits(page,'Offline');});
}finally{await browser?.close();await new Promise(resolve=>server.close(resolve));fs.writeFileSync(path.join(evidence,'product-browser-results.json'),JSON.stringify({browser:'headless Chromium',cases:results},null,2)+'\n');}
console.log(`${results.length} design-system product browser cases passed.`);
