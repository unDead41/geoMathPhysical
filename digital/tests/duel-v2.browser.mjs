import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {mkdirSync,writeFileSync} from 'node:fs';
import {createDuelFixture} from './duel-v2-fixture.mjs';
import {DUEL_SESSION_KEY} from '../dist/duel.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const fixture=await createDuelFixture(),evidence=new URL(process.env.DUEL_V2_EVIDENCE_DIR||'../docs/duel-v2-evidence/',import.meta.url);mkdirSync(evidence,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
const errors=[],checks=[],contexts=[];
const pass=name=>{checks.push(name);console.log('PASS:',name);};
async function player(name,language='ms',width=1365,text='normal'){
 const context=await browser.newContext({viewport:{width,height:980},reducedMotion:'reduce'});contexts.push(context);
 // Any accidental hosted request fails this isolated test; only localhost is allowed.
 await context.route('**/*',route=>new URL(route.request().url()).hostname==='127.0.0.1'?route.continue():route.abort());
 await context.addInitScript(({language,text})=>{if(window!==window.top)return;localStorage.setItem('geodecoder.digital.preferences.v1',JSON.stringify({tutorialSeen:true,music:false,effects:false,motion:'reduce',text}));localStorage.setItem('geodecoder.digital.language',language);},{language,text});
 const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));await page.goto(fixture.origin);
 await page.locator('#settings-button').click();await page.locator('#language-select').selectOption(language);await page.locator('#dialog-close').click();
 await page.locator('#guest-button').click();await page.locator('input[name="game-mode-option"][value="duel"]').check();await page.locator('#player-name').fill(name);await page.locator('.start-button').click();
 await page.locator('#duel-screen').waitFor({state:'visible'});return {page,context,name};
}
async function state(p){return p.page.evaluate(async key=>{const s=JSON.parse(sessionStorage.getItem(key));return (await fetch('/api/duel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'state',protocol:2,token:s.token,roomId:s.roomId})})).json();},DUEL_SESSION_KEY);}
async function waitCounter(p,n){await p.page.waitForFunction(n=>document.querySelector('#question-counter').textContent.includes(String(n).padStart(2,'0')+' / 10'),n);await p.page.locator('#r1:not([disabled])').waitFor();assert.ok((await p.page.locator('#duel-live-progress').textContent()).includes(n+' / 10'),'Live question counter follows the accepted server snapshot');}
async function pick(p,kind,shape,target){const card=p.page.locator(`.choice[data-kind="${kind}"][data-shape="${shape}"]`);await card.focus();await card.press('Enter');await p.page.locator('#'+target).focus();await p.page.locator('#'+target).press('Enter');}
async function resume(p){await p.page.reload();await p.page.locator('#duel-resume-button').click();await p.page.locator('#game-screen').waitFor({state:'visible'});}
async function fits(p){assert.ok(await p.page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'horizontal viewport overflow');}
async function screenshot(p,name){await fits(p);await p.page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));await p.page.screenshot({path:new URL(name+'.png',evidence).pathname,fullPage:true,animations:'disabled'});}
async function start(a,b){await a.page.locator('#duel-ready').click();await b.page.locator('#duel-ready').click();await Promise.all([a.page.locator('#game-screen').waitFor({state:'visible'}),b.page.locator('#game-screen').waitFor({state:'visible'})]);}
try{
 const host=await player('Duel QA Host'),guest=await player('Duel QA <b>Guest</b>','en',390,'largest');
 await guest.page.locator('#duel-pin').fill('000000');await guest.page.locator('#duel-join').click();await guest.page.waitForFunction(()=>document.querySelector('#duel-message').textContent.includes('not found'));
 await host.page.locator('#duel-create').click();await host.page.locator('#duel-room').waitFor({state:'visible'});const created=await state(host),code=created.room.code;
 assert.equal(created.currentQuestion,null);assert.equal(created.room.questionIds,undefined);assert.match(code,/^\d{6}$/);
 await guest.page.locator('#duel-pin').fill(code);await guest.page.locator('#duel-join').click();await guest.page.locator('#duel-room').waitFor({state:'visible'});
 await host.page.waitForFunction(()=>document.querySelector('#duel-lobby-players').textContent.includes('Guest'));
 assert.equal(await host.page.locator('.duel-player strong b').count(),0);await screenshot(host,'lobby-bm');await screenshot(guest,'lobby-en-390-150');
 const third=await fetch(fixture.origin+'/api/duel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocol:2,action:'join',token:'aa'.repeat(32),name:'Third fixture',code})});assert.equal((await third.json()).error,'room_full');
 pass('invalid PIN, escaped aliases, two-player lobby, third-player rejection, BM/EN and mobile 150%');
 await start(host,guest);let hs=await state(host),gs=await state(guest);assert.equal(hs.room.startsAt,gs.room.startsAt);assert.equal(hs.currentQuestion.shape,undefined);assert.equal(hs.currentQuestion.copy.ms.hint,undefined);assert.equal(hs.room.questionIds,undefined);
 const {rows:[{ids}]}=await fixture.db.query('select question_ids as ids from geodecoder_duel.rooms where id=$1',[hs.room.id]);
 const {rows:questions}=await fixture.db.query('select id,shape from geodecoder_duel.questions');const bank=Object.fromEntries(questions.map(q=>[q.id,q.shape]));
 pass('common server start, current prompt only, no future IDs/answer/hint in player response');
 for(let i=0;i<10;i++){
  for(const p of [host,guest]){
   await waitCounter(p,i+1);const shape=bank[ids[i]];
   if(p===host&&i===0){
    let release,observed;const gate=new Promise(r=>{release=r;}),seen=new Promise(r=>{observed=r;});
    await p.page.route('**/api/duel',async route=>{const body=route.request().postDataJSON();if(body.action==='scan'&&body.kind==='solid'){const response=await route.fetch();observed();await gate;await route.fulfill({response});}else await route.continue();});
    await pick(p,'solid',shape,'r1');await seen;await p.page.locator('#pause-button').click();release();
    await p.page.waitForFunction(()=>document.querySelector('#scanner-body-r1').textContent.includes('diterima'));await p.page.locator('#dialog-close').click();await p.page.unroute('**/api/duel');
    pass('delayed accepted R1 survives opening a menu before ACK');
   }else if(p===guest&&i===0){
    const card=p.page.locator(`.choice[data-kind="solid"][data-shape="${shape}"]`);
    await card.focus();await card.press('Enter');assert.equal(await card.getAttribute('aria-pressed'),'true');
    await p.page.waitForResponse(response=>response.url().endsWith('/api/duel')&&response.request().postDataJSON()?.action==='state');
    await p.page.evaluate(()=>new Promise(requestAnimationFrame));
    assert.equal(await card.getAttribute('aria-pressed'),'true','Lobby error recovery must not clear the first choice on polling');
    await p.page.locator('#r1').focus();await p.page.locator('#r1').press('Enter');
    pass('invalid PIN recovery preserves the first keyboard choice across polling');
   }else await pick(p,'solid',shape,'r1');
   await p.page.locator('#r2:not([disabled])').waitFor().catch(async e=>{console.log('DEBUG R2',i,p.name,errors,JSON.stringify(await state(p)),await p.page.locator('#feedback-text').textContent(),await p.page.locator('#app-dialog').getAttribute('open'));throw e;});
   if(p===host&&i===1){await resume(p);await p.page.locator('#r2:not([disabled])').waitFor();assert.equal((await state(p)).me.stage,'net');pass('refresh resumes accepted R1 using the Home resume action');}
   if(p===host&&i===2){let dropped=false;await p.page.route('**/api/duel',async route=>{const body=route.request().postDataJSON();if(!dropped&&body.action==='scan'&&body.kind==='net'){dropped=true;await route.fetch();await route.abort('connectionreset');}else await route.continue();});}
   if(p===host&&i===6){await p.context.setOffline(true);await pick(p,'net',shape,'r2');await p.page.waitForFunction(()=>document.querySelector('#duel-live-connection').textContent.includes('terputus'));await p.context.setOffline(false);await p.page.locator('#duel-live-retry').click();pass('network-offline pending R2 reconnects with the same operation');}
   else await pick(p,'net',p===guest&&i===4?(shape==='cube'?'cone':'cube'):shape,'r2');
   if(p===host&&i===2){await p.page.waitForFunction(()=>document.querySelector('#score-value').textContent==='3');await p.page.unroute('**/api/duel');assert.equal((await state(p)).me.score,3);pass('lost R2 ACK retries without a second point');}
   if(p===guest&&i===4){await p.page.locator('#correction-panel').waitFor({state:'visible'});const before=await state(p);assert.equal(before.me.reviewPending,true);assert.equal(before.currentQuestion,null);await resume(p);await p.page.locator('#correction-panel').waitFor({state:'visible'});assert.equal((await state(p)).me.answered,5);await screenshot(p,'review-restored-en-390-150');await p.page.locator('#continue-button:not([disabled])').waitFor();await p.page.locator('#continue-button').click();pass('wrong-answer correction and server pacing survive refresh');}
   if(i===3){await screenshot(p,p===host?'game-bm':'game-en-390-150');}
   if(p===host&&i===9){await p.page.locator('#result-screen').waitFor({state:'visible'});assert.match(await p.page.locator('#result-title').textContent(),/Selesai menjawab/);assert.match(await p.page.locator('#duel-result-content').textContent(),/Menunggu keputusan lawan/);assert.equal(await p.page.locator('#duel-result .winner').count(),0);await screenshot(p,'waiting-result-bm');pass('own completion waits for the opponent without declaring the whole Duel complete or a winner');}
  }
 }
 await Promise.all([host.page.locator('#result-screen').waitFor({state:'visible'}),guest.page.locator('#result-screen').waitFor({state:'visible'})]);
 await host.page.waitForFunction(()=>document.querySelector('#duel-result-content').textContent.includes('Anda menang'));
 hs=await state(host);gs=await state(guest);assert.equal(hs.me.score,10);assert.equal(gs.me.score,9);assert.equal(hs.room.winnerId,gs.room.winnerId);
 await screenshot(host,'result-bm');await screenshot(guest,'result-en-390-150');pass('complete ten-question two-session match, 10–9 winner agrees on both clients');
 // Rematch is intentionally a fresh PIN; no shared Auth/classroom backend is used.
 await host.page.locator('#replay-button').click();await host.page.locator('#duel-create').click();await host.page.locator('#duel-room').waitFor({state:'visible'});const next=await state(host);
 await guest.page.locator('#replay-button').click();await guest.page.locator('#duel-pin').fill(next.room.code);await guest.page.locator('#duel-join').click();await guest.page.locator('#duel-room').waitFor({state:'visible'});await start(host,guest);
 const {rows:[firstAgain]}=await fixture.db.query('select q.shape from geodecoder_duel.rooms r join geodecoder_duel.questions q on q.id=r.question_ids[1] where r.id=$1',[next.room.id]);
 await pick(guest,'solid',firstAgain.shape==='cube'?'cone':'cube','r1');await guest.page.locator('#correction-panel').waitFor({state:'visible'});await resume(guest);await guest.page.locator('#correction-panel').waitFor({state:'visible'});
 assert.doesNotMatch(await guest.page.locator('#scanner-body-r1').innerText(),/accepted|diterima/i);pass('a wrong R1 restored after refresh is never labelled as accepted');
 await guest.page.locator('#brand-home').click();await guest.page.locator('[data-dialog-action="duel-leave"]').click();await host.page.locator('#result-screen').waitFor({state:'visible'});await host.page.waitForFunction(()=>document.querySelector('#duel-result-content').textContent.includes('Menyerah kalah'));
 assert.equal((await state(host)).room.reason,'forfeit');await screenshot(host,'forfeit-bm');pass('fresh-PIN replay and confirmed departure produce one consistent forfeit result');
 const timeoutA=await player('Timeout host'),timeoutB=await player('Timeout guest','en',320,'largest');
 await timeoutA.page.locator('#duel-create').click();await timeoutA.page.locator('#duel-room').waitFor({state:'visible'});const timeout=await state(timeoutA);
 await timeoutB.page.locator('#duel-pin').fill(timeout.room.code);await timeoutB.page.locator('#duel-join').click();await timeoutB.page.locator('#duel-room').waitFor({state:'visible'});await start(timeoutA,timeoutB);
 const end=Date.now()-1;await fixture.db.query('update geodecoder_duel.rooms set starts_at=$1::bigint-900000,deadline_at=$1::bigint where id=$2',[end,timeout.room.id]);
 await timeoutA.page.locator('#result-screen').waitFor({state:'visible',timeout:12000});await timeoutB.page.locator('#result-screen').waitFor({state:'visible',timeout:12000});
 const final=await state(timeoutA);assert.equal(final.me.answers.length,10);assert.equal(final.me.skipped,10);await fits(timeoutB);pass('server deadline settles unanswered questions and displays final results at 320 px / 150%');
 const lateA=await player('Late ACK host'),lateB=await player('Late ACK guest','en');
 await lateA.page.locator('#duel-create').click();await lateA.page.locator('#duel-room').waitFor({state:'visible'});const late=await state(lateA);
 await lateB.page.locator('#duel-pin').fill(late.room.code);await lateB.page.locator('#duel-join').click();await lateB.page.locator('#duel-room').waitFor({state:'visible'});await start(lateA,lateB);
 const {rows:[first]}=await fixture.db.query('select q.shape from geodecoder_duel.rooms r join geodecoder_duel.questions q on q.id=r.question_ids[1] where r.id=$1',[late.room.id]);
 await pick(lateA,'solid',first.shape,'r1');await lateA.page.locator('#r2:not([disabled])').waitFor();
 let lost=false;await lateA.page.route('**/api/duel',async route=>{const body=route.request().postDataJSON();if(!lost&&body.action==='scan'&&body.kind==='net'){lost=true;await route.fetch();const end=Date.now()-1;await fixture.db.query('update geodecoder_duel.rooms set starts_at=$1::bigint-900000,deadline_at=$1::bigint where id=$2',[end,late.room.id]);await route.abort('connectionreset');}else await route.continue();});
 await pick(lateA,'net',first.shape,'r2');await lateA.page.locator('#result-screen').waitFor({state:'visible',timeout:10000});assert.equal((await state(lateA)).me.score,1);pass('accepted answer with lost ACK replayed after deadline opens final results without scoring twice');
 assert.deepEqual(errors,[]);pass('no browser runtime errors; all browser traffic stayed on the isolated local fixture');
}finally{
 writeFileSync(new URL('results.json',evidence),JSON.stringify({date:new Date().toISOString(),environment:'Chromium, two independent contexts, real Edge handler + isolated PGlite; no hosted writes',checks,errors,limitations:['PGlite serializes SQL requests; not evidence of independent PostgreSQL row-lock contention.','Network offline was emulated, not a physical network test.']},null,2)+'\n');
 for(const context of contexts)await context.close();await browser.close();await fixture.close();
}
