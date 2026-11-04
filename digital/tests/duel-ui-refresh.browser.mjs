// Presentation/recovery checks use the real protocol 2 handler and disposable SQL.
// This runner never connects to hosted services or mutates production matches.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createDuelFixture} from './duel-v2-fixture.mjs';
import {settings} from './ease-browser-helpers.mjs';
import {DUEL_SESSION_KEY} from '../dist/duel.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const fixture=await createDuelFixture();
const evidence=new URL('../docs/handoffs/digitalized-game-duel-ui-refresh/',import.meta.url);
const shots=new URL('screenshots/',evidence);mkdirSync(shots,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage']});
const checks=[],errors=[],contexts=[];
const pass=name=>{checks.push(name);console.log('PASS:',name);};
async function player(name,width,language='ms'){
  const context=await browser.newContext({viewport:{width,height:1000},reducedMotion:'reduce',hasTouch:width<600});contexts.push(context);
  await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
  await context.addInitScript(language=>{
    if(window!==window.top)return;
    if(!localStorage.getItem('geodecoder.digital.preferences.v1'))localStorage.setItem('geodecoder.digital.preferences.v1',JSON.stringify({tutorialSeen:true,music:false,effects:false,motion:'reduce'}));
    if(!localStorage.getItem('geodecoder.digital.language'))localStorage.setItem('geodecoder.digital.language',language);
  },language);
  const page=await context.newPage();page.setDefaultTimeout(12000);page.on('pageerror',e=>errors.push(e.message));
  await page.goto(fixture.origin);await page.locator('#guest-button').click();await page.locator('#player-name').fill(name);
  await page.locator('#play-mode').selectOption('duel');await page.locator('.start-button').click();
  await page.locator('#duel-screen').waitFor({state:'visible'});return {page,context};
}
async function fits(p,label){
  const widths=await p.page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(widths.scroll<=widths.width+1,label+': '+JSON.stringify(widths));
}
async function shot(p,name){await fits(p,name);await p.page.screenshot({path:new URL(name+'.png',shots).pathname,fullPage:true,animations:'disabled',timeout:45000});}
async function state(p){return p.page.evaluate(async key=>{const session=JSON.parse(sessionStorage.getItem(key));return (await fetch('/api/duel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocol:2,action:'state',token:session.token,roomId:session.roomId})})).json();},DUEL_SESSION_KEY);}
async function pick(p,kind,shape,target){await p.page.locator(`.choice[data-kind="${kind}"][data-shape="${shape}"]`).press('Enter');await p.page.locator('#'+target).press('Enter');}
async function resume(p){await p.page.reload();await p.page.locator('#duel-resume-button').click();await p.page.locator('#game-screen').waitFor({state:'visible'});}
try{
  const host=await player('Ijamm',1440),guest=await player('Aina',390,'en');
  assert.equal(await host.page.locator('#brand-home .brand-blue').textContent(),'Math');
  await shot(host,'10-entry-desktop');
  let layouts=0;
  for(const language of ['ms','en'])for(const theme of ['light','dark','system'])for(const textSize of [100,125,150]){
    await settings(guest.page,{language,theme,textSize});await fits(guest,'entry '+language+theme+textSize);layouts++;
    assert.equal(await guest.page.locator('#duel-pin').inputValue(),'');
  }
  await guest.page.locator('#settings-button').click();await guest.page.locator('#contrast-select').selectOption('strong');await guest.page.locator('#dialog-close').click();
  await settings(guest.page,{language:'en',theme:'dark',textSize:150});await shot(guest,'10-entry-mobile-en-dark-150');
  await guest.page.locator('label[for="duel-pin"]').click();assert.equal(await guest.page.locator('#duel-pin').evaluate(n=>n===document.activeElement),true);
  await guest.page.locator('#duel-pin').fill('12a');assert.equal(await guest.page.locator('#duel-pin').inputValue(),'12');
  const beforeInvalid=fixture.calls.length;await guest.page.locator('#duel-join').press('Enter');
  assert.equal(await guest.page.locator('#duel-pin').getAttribute('aria-invalid'),'true');assert.equal(fixture.calls.length,beforeInvalid);
  await guest.page.locator('#duel-pin').fill('000000');await guest.page.locator('#duel-join').press('Enter');
  await guest.page.waitForFunction(()=>document.querySelector('#duel-message').textContent.includes('not found'));
  assert.equal(await guest.page.locator('#duel-pin').getAttribute('aria-invalid'),'true');await shot(guest,'10-invalid-pin-mobile');
  pass(`${layouts} locale/theme/text entry layouts; high contrast, native label, sanitized PIN and real invalid-PIN recovery`);

  let release,observe;const held=new Promise(r=>{release=r;}),seen=new Promise(r=>{observe=r;});let createCalls=0;
  await host.page.route('**/api/duel',async route=>{
    if(route.request().postDataJSON().action==='create'){createCalls++;const response=await route.fetch();observe();await held;await route.fulfill({response});}
    else await route.continue();
  });
  const initialBox=await host.page.locator('#duel-create').boundingBox();
  await host.page.locator('#duel-create').dblclick();await seen;
  assert.equal(await host.page.locator('#duel-create').getAttribute('aria-busy'),'true');assert.equal(await host.page.locator('#duel-create').isDisabled(),true);
  const pendingBox=await host.page.locator('#duel-create').boundingBox();assert.equal(initialBox.height,pendingBox.height);assert.equal(initialBox.width,pendingBox.width);
  await shot(host,'10-create-pending');release();await host.page.locator('#duel-room').waitFor({state:'visible'});await host.page.unroute('**/api/duel');assert.equal(createCalls,1);
  assert.equal(await host.page.locator('#duel-lobby-players .duel-player').count(),2);assert.equal(await host.page.locator('#duel-lobby-players .waiting').count(),1);
  await shot(host,'11-waiting-desktop');
  const expired=await state(host);await fixture.db.query('update geodecoder_duel.rooms set created_at=$1::bigint-600000,lobby_expires_at=$1::bigint,expires_at=$1::bigint+85800000 where id=$2',[Date.now()-1,expired.room.id]);
  await guest.page.locator('#duel-pin').fill(expired.room.code);await guest.page.locator('#duel-join').click();
  await guest.page.waitForFunction(()=>/expired/i.test(document.querySelector('#duel-message').textContent));await shot(guest,'10-expired-pin-mobile');
  await host.page.locator('#duel-new-room').waitFor({state:'visible'});await host.page.locator('#duel-new-room').click();await host.page.locator('#duel-create').click();await host.page.locator('#duel-room').waitFor({state:'visible'});
  const created=await state(host);
  await host.context.grantPermissions(['clipboard-read','clipboard-write']);await host.page.locator('#duel-copy').click();assert.equal(await host.page.evaluate(()=>navigator.clipboard.readText()),created.room.code);
  await host.page.evaluate(()=>{navigator.clipboard.writeText=async()=>{throw new Error('Fixture clipboard denied');};});await host.page.locator('#duel-copy').click();
  assert.equal(await host.page.locator('#duel-room-code').evaluate(n=>n===document.activeElement&&n.selectionEnd-n.selectionStart===6),true);
  await guest.page.locator('#duel-pin').fill(created.room.code);await guest.page.locator('#duel-join').press('Enter');await guest.page.locator('#duel-room').waitFor({state:'visible'});
  await host.page.waitForFunction(()=>document.querySelector('#duel-lobby-players').textContent.includes('Aina'));
  await host.page.locator('#duel-ready').click();await host.page.waitForFunction(()=>document.querySelector('#duel-ready').disabled);
  await shot(host,'11-lobby-desktop');await shot(guest,'11-lobby-mobile-en-dark-150');
  await guest.page.locator('#duel-ready').click();await guest.page.waitForFunction(()=>document.querySelector('#duel-screen').dataset.phase==='countdown');await shot(guest,'11-countdown-mobile');
  pass('stable pending button, double-click protection, expired PIN, empty slot, copy/fallback, ready and server countdown');

  await Promise.all([host.page.locator('#game-screen').waitFor({state:'visible'}),guest.page.locator('#game-screen').waitFor({state:'visible'})]);
  for(const p of [host,guest]){await p.page.locator('#r1:not([disabled])').waitFor();assert.equal(await p.page.locator('#solid-choices .choice').count(),5);assert.equal(await p.page.locator('#net-choices .choice').count(),5);}
  await shot(host,'12-duel-desktop');await shot(guest,'12-duel-mobile-en-dark-150');
  const {rows:[first]}=await fixture.db.query('select q.shape from geodecoder_duel.rooms r join geodecoder_duel.questions q on q.id=r.question_ids[1] where r.id=$1',[created.room.id]);
  await host.page.locator('#hint-button').click();await host.page.locator('#hint-panel').waitFor({state:'visible'});assert.equal((await state(host)).me.hints,1);
  const selectedCard=host.page.locator(`.choice[data-kind="solid"][data-shape="${first.shape}"]`);await selectedCard.press('Enter');
  const order=await host.page.locator('.choice').evaluateAll(nodes=>nodes.map(n=>[n.dataset.kind,n.dataset.shape,n.querySelector('.shape-art').dataset.tone]));
  await settings(host.page,{language:'en',theme:'dark',textSize:150});assert.deepEqual(await host.page.locator('.choice').evaluateAll(nodes=>nodes.map(n=>[n.dataset.kind,n.dataset.shape,n.querySelector('.shape-art').dataset.tone])),order);
  assert.equal(await selectedCard.getAttribute('aria-pressed'),'true');assert.equal(await host.page.locator('#hint-panel').isVisible(),true);await fits(host,'desktop selected150');await shot(host,'12-duel-desktop-en-dark-150');
  await settings(host.page,{language:'ms',theme:'light',textSize:100});
  await host.context.setOffline(true);await host.page.locator('#r1').press('Enter');await host.page.waitForFunction(()=>document.querySelector('#duel-live-connection').textContent.includes('terputus'));
  const pending=await host.page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)).pending,DUEL_SESSION_KEY);assert.equal(pending.target,'r1');assert.equal(pending.kind,'solid');await shot(host,'12-offline-r1');
  await host.context.setOffline(false);await host.page.locator('#duel-live-retry').click();await host.page.locator('#r2:not([disabled])').waitFor();assert.equal((await state(host)).me.stage,'net');
  await resume(host);await host.page.locator('#r2:not([disabled])').waitFor();
  await pick(host,'net',first.shape==='cube'?'cone':'cube','r2');await host.page.locator('#correction-panel').waitFor({state:'visible'});await resume(host);await host.page.locator('#correction-panel').waitFor({state:'visible'});
  assert.equal((await state(host)).me.reviewPending,true);await shot(host,'12-review-restored-desktop');
  await guest.page.locator('#skip-button').click();await guest.page.locator('#correction-panel').waitFor({state:'visible'});await resume(guest);await guest.page.locator('#correction-panel').waitFor({state:'visible'});await shot(guest,'12-review-restored-mobile');
  pass('ten choices, retained selection/order/hint across language/theme/150%, pending R1 retry, R2 reload and durable reviews');

  const end=Date.now()-1;await fixture.db.query('update geodecoder_duel.rooms set starts_at=$1::bigint-900000,deadline_at=$1::bigint where id=$2',[end,created.room.id]);
  for(const p of [host,guest])await p.page.locator('#result-screen').waitFor({state:'visible',timeout:12000});
  await host.page.waitForFunction(()=>document.querySelector('#duel-result').dataset.verdict==='duel.draw');
  const final=await state(host);assert.equal(final.room.winnerId,null);assert.equal(final.me.score,0);assert.equal(final.opponent.score,0);
  await shot(host,'13-draw-desktop');await shot(guest,'13-draw-mobile-en-dark-150');
  await guest.page.locator('#result-details>summary').click();await fits(guest,'expanded result390150');await shot(guest,'13-review-mobile');
  const scoresBefore=await guest.page.evaluate(()=>localStorage.getItem('geodecoder.digital.single-attempt.v1.scores'));
  await guest.page.locator('#retry-wrong-button').click();await guest.page.locator('#game-screen').waitFor({state:'visible'});
  assert.equal(await guest.page.locator('#game-screen').getAttribute('data-mode'),'review');assert.equal(await guest.page.locator('#duel-live').isVisible(),false);
  assert.equal(await guest.page.locator('#brand-home .brand-blue').textContent(),'Decoder');assert.equal(await guest.page.evaluate(key=>sessionStorage.getItem(key),DUEL_SESSION_KEY),null);
  assert.equal(await guest.page.evaluate(()=>localStorage.getItem('geodecoder.digital.single-attempt.v1.scores')),scoresBefore);await fits(guest,'local missed-question practice');
  pass('server-determined draw, expanded answer review and real local missed-question practice with Duel token forgotten');
  assert.deepEqual(errors,[]);pass('no runtime errors; every external origin blocked');
}finally{
  writeFileSync(new URL('ui-browser-results.json',evidence),JSON.stringify({date:new Date().toISOString(),environment:'Chromium; real protocol 2 Edge handler + isolated PGlite; two independent browser contexts',checks,errors,limitations:['PGlite serializes SQL requests; not a PostgreSQL contention test.','Network offline and touch are browser emulation; no physical device or screen-reader test.']},null,2)+'\n');
  for(const context of contexts)await context.close();await browser.close();await fixture.close();
}
