// Real deployed Supabase + two independent browser sessions. No service key.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdirSync,appendFileSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {QUESTIONS} from '../dist/questions.mjs';
import {DUEL_ENDPOINT,DUEL_PUBLIC_KEY,DUEL_SESSION_KEY} from '../dist/duel.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=path.join(root,'docs/ease-evidence/duel');mkdirSync(evidence,{recursive:true});
let proxy;
if(process.env.HTTPS_PROXY){const u=new URL(process.env.HTTPS_PROXY);proxy={server:u.origin,bypass:'127.0.0.1,localhost'};if(u.username){proxy.username=decodeURIComponent(u.username);proxy.password=decodeURIComponent(u.password);}}
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox',...(proxy?['--disable-http2','--disable-quic']:[])],...(proxy?{proxy}:{})});
const server=spawn('python',['-m','http.server','8140','--bind','127.0.0.1','--directory',path.join(root,'dist')],{stdio:'ignore'});
const errors=[],fixtures=[];
async function newPlayer(name,language='ms',mobile=false){
  const context=await browser.newContext({ignoreHTTPSErrors:!!proxy,viewport:{width:mobile?390:1365,height:mobile?844:980}});
  await context.addInitScript(()=>{if(window===window.top&&location.origin==='http://127.0.0.1:8140')localStorage.setItem('geodecoder.digital.preferences.v1',JSON.stringify({sound:false,motionPaused:false,textSize:100,tutorialSeen:true}));});
  const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
  for(let i=0;i<30;i++){try{await page.goto('http://127.0.0.1:8140');break;}catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,100));}}
  await enter(page,name,language);return {context,page};
}
async function enter(page,name,language){
  await setLanguage(page,language);await page.locator('#guest-button').click();await page.locator('#play-mode').selectOption('duel');
  assert.match(await page.locator('#privacy-note-text').innerText(),language==='ms'?/dikongsi/:/shared/);
  assert.equal(await page.locator('#player-class').count(),0,'Guests enter a nickname only');
  await page.locator('#player-name').fill(name);await page.locator('.start-button').click();
  await page.locator('#duel-screen').waitFor({state:'visible'});
}
async function setLanguage(page,language){
  await page.locator('#settings-button').click();await page.locator('#language-select').selectOption(language);await page.locator('#dialog-close').click();
}
async function state(page,credentials=null){return page.evaluate(async({endpoint,key,sessionKey,credentials})=>{
  const saved=credentials||JSON.parse(sessionStorage.getItem(sessionKey));
  const response=await fetch(endpoint,{method:'POST',headers:{'Content-Type':'application/json',apikey:key},body:JSON.stringify({action:'state',token:saved.token,roomId:saved.roomId})});return response.json();
},{endpoint:DUEL_ENDPOINT,key:DUEL_PUBLIC_KEY,sessionKey:DUEL_SESSION_KEY,credentials});}
async function recordRoom(page){const s=await state(page);assert.equal(s.ok,true);fixtures.push(s.room.id);appendFileSync(path.join(root,'../../duel-live-fixtures.jsonl'),JSON.stringify({id:s.room.id})+'\n');return s;}
const pick=(page,kind,shape)=>page.locator(`.choice[data-kind="${kind}"][data-shape="${shape}"]`).click();
const shot=(page,name)=>page.screenshot({animations:'disabled',path:path.join(evidence,name+'.png'),fullPage:false});
const fits=async page=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
try{
  if(!process.env.DUEL_SMOKE_ONLY&&!process.env.DUEL_RECOVERY_ONLY){
  const host=await newPlayer('Duel QA Host'),guest=await newPlayer('Duel QA <b>Guest</b>','en',true);
  await host.page.locator('#duel-create').click();await host.page.locator('#duel-room').waitFor({state:'visible',timeout:30000});
  const created=await recordRoom(host.page),code=created.room.code;assert.match(code,/^[0-9]{6}$/);
  await guest.page.locator('#duel-pin').fill(code);await guest.page.locator('#duel-join').click();
  await guest.page.locator('#duel-room').waitFor({state:'visible',timeout:30000});
  await host.page.waitForFunction(()=>document.querySelector('#duel-lobby-players').textContent.includes('Guest'));
  assert.equal(await host.page.locator('.duel-player > strong b').count(),0,'Friend alias stays escaped');
  await shot(host.page,'lobby-bm');await shot(guest.page,'lobby-en-mobile');await fits(host.page);await fits(guest.page);
  const third=await newPlayer('Duel QA Third','en');await third.page.locator('#duel-pin').fill(code);await third.page.locator('#duel-join').click();
  await third.page.waitForFunction(()=>document.querySelector('#duel-message').textContent.includes('two players'));
  assert.equal(await third.page.locator('#duel-entry').isVisible(),true);await third.context.close();
  await Promise.all([host.page.locator('#duel-ready').click(),guest.page.locator('#duel-ready').click()]);
  await Promise.all([host.page.locator('#game-screen').waitFor({state:'visible',timeout:30000}),guest.page.locator('#game-screen').waitFor({state:'visible',timeout:30000})]);
  const hs=await state(host.page),gs=await state(guest.page);assert.deepEqual(hs.room.questionIds,gs.room.questionIds);assert.equal(new Set(hs.room.questionIds).size,10);assert.equal(hs.room.startsAt,gs.room.startsAt);
  for(const field of ['answers','attempts','seq','tokenHash'])assert.equal(hs.opponent[field],undefined);
  const round=hs.room.questionIds.map(id=>QUESTIONS.find(q=>q.id===id));
  console.log('PASS live PIN/lobby/max2/shared round/common start/opponent privacy');

  // The server accepts R1, but delay the ACK until a menu has paused the local Game.
  let release,received;const gate=new Promise(r=>{release=r;}),observed=new Promise(r=>{received=r;});let held=false;
  await host.page.route(DUEL_ENDPOINT,async route=>{
    const body=route.request().postDataJSON();
    if(!held&&body.action==='scan'&&body.kind==='solid'&&body.questionIndex===0){held=true;const response=await route.fetch();received();await gate;await route.fulfill({response});}
    else await route.continue();
  });
  await pick(host.page,'solid',round[0].shape);await host.page.locator('#r1').click();await Promise.race([observed,new Promise((_,reject)=>setTimeout(()=>reject(new Error('No delayed ACK received')),30000))]);
  await host.page.locator('#pause-button').click();assert.equal(await host.page.locator('#app-dialog').isVisible(),true);
  release();await host.page.waitForFunction(()=>document.querySelector('#scanner-body-r1').textContent.includes('diterima'));
  await host.page.locator('#dialog-close').click();await host.page.waitForFunction(()=>!document.querySelector('#r2').disabled);
  await host.page.unroute(DUEL_ENDPOINT);assert.equal((await state(host.page)).me.stage,'net');
  console.log('PASS a server-accepted scan survives opening a menu while its ACK is delayed');

  async function play(page,isGuest){
    let dropped=false;
    if(!isGuest)await page.route(DUEL_ENDPOINT,async route=>{
      const body=route.request().postDataJSON();
      if(!dropped&&body.action==='scan'&&body.kind==='net'&&body.questionIndex===3){dropped=true;await route.fetch();await route.abort('connectionreset');}
      else await route.continue();
    });
    for(const [i,q] of round.entries()){
      await page.waitForFunction(n=>document.querySelector('#question-counter').textContent.includes(String(n).padStart(2,'0')+' / 10'),i+1);
      if(!(i===0&&!isGuest)){
        await pick(page,'solid',q.shape);
        if(i===1){
          const selected=await page.locator('.choice[aria-pressed="true"]').getAttribute('data-shape');
          const before=await state(page),order=await page.locator('.choice').evaluateAll(nodes=>nodes.map(node=>node.dataset.kind+':'+node.dataset.shape));
          await page.locator('#settings-button').click();
          await page.locator('#language-select').selectOption(isGuest?'ms':'en');
          assert.equal(await page.locator('#r1').isDisabled(),true,'Settings pause local inputs');
          await page.waitForTimeout(1100);
          const during=await state(page);assert.ok(during.serverNow>before.serverNow+900,'The authoritative clock keeps running in Settings');
          assert.equal(during.me.seq,before.me.seq);assert.equal(during.me.score,before.me.score);
          await page.locator('#language-select').selectOption(isGuest?'en':'ms');await page.locator('#dialog-close').click();
          assert.deepEqual(await page.locator('.choice').evaluateAll(nodes=>nodes.map(node=>node.dataset.kind+':'+node.dataset.shape)),order);
          assert.equal(await page.locator('.choice[aria-pressed="true"]').getAttribute('data-shape'),selected);
        }
        await page.locator('#r1').click();await page.waitForFunction(()=>!document.querySelector('#r2').disabled);
      }
      if(!isGuest&&i===2){
        const prior=await state(page);await page.reload();await enter(page,'Duel QA Reload','ms');await page.locator('#game-screen').waitFor({state:'visible',timeout:30000});
        assert.match(await page.locator('#question-counter').innerText(),/03 \/ 10/);assert.equal(await page.locator('#player-display').innerText(),'Duel QA Host');assert.ok(await page.locator('#r1').isDisabled());
        assert.equal((await state(page)).me.score,prior.me.score);
        // The same page retains the retry interception across navigation.
        console.log('PASS reload recovers the same room, scores and accepted R1');
      }
      const wrong=['cube','cuboid','pyramid','cylinder','cone'].find(shape=>shape!==q.shape);
      await pick(page,'net',isGuest&&i===0?wrong:q.shape);await page.locator('#r2').click();
      if(isGuest&&i===0){await page.waitForFunction(()=>!document.querySelector('#continue-button').disabled);await page.locator('#continue-button').click();}
      else if(i===9)await page.locator('#result-screen').waitFor({state:'visible',timeout:30000});
      else await page.waitForFunction(n=>document.querySelector('#question-counter').textContent.includes(String(n).padStart(2,'0')+' / 10'),i+2);
      if(i===3){await shot(page,isGuest?'game-en-mobile':'game-bm');await fits(page);}
    }
    if(!isGuest){await page.unroute(DUEL_ENDPOINT);assert.equal(dropped,true);}
    assert.equal(await page.locator('#result-score').innerText(),isGuest?'9':'10');
    assert.equal(await page.locator('.review-card').count(),10);
    assert.equal(await page.evaluate(()=>localStorage.getItem('geodecoder.digital.single-attempt.v1.scores')),null,'Duel does not write quiz scores');
  }
  await Promise.all([play(host.page,false),play(guest.page,true)]);
  await host.page.waitForFunction(()=>document.querySelector('#duel-result-content').textContent.includes('Anda menang'));
  await guest.page.waitForFunction(()=>document.querySelector('#duel-result-content').textContent.includes('Your friend wins'));
  const result=await state(host.page);assert.equal(result.room.status,'complete');assert.equal(result.room.winnerId,result.me.id);assert.equal(result.me.score,10);assert.equal(result.opponent.score,9);
  assert.equal(result.me.answers.length,10);assert.equal(new Set(result.me.answers.map(a=>a.id)).size,10);
  await host.page.evaluate(()=>scrollTo(0,0));await guest.page.evaluate(()=>scrollTo(0,0));await shot(host.page,'result-bm');await shot(guest.page,'result-en-mobile');
  await fits(guest.page);
  // A finished Duel can supply a local review subset without any new Duel/classroom writes.
  const guestCredentials=await guest.page.evaluate(key=>JSON.parse(sessionStorage.getItem(key)),DUEL_SESSION_KEY);
  const guestResult=await state(guest.page),reviewWrites=[];
  guest.page.on('request',request=>{if((request.url()===DUEL_ENDPOINT&&request.postDataJSON()?.action!=='state')||request.url().includes('/rest/v1/rpc/'))reviewWrites.push(request.url());});
  await guest.page.locator('#retry-wrong-button').click();await guest.page.locator('#game-screen').waitFor({state:'visible'});
  assert.match(await guest.page.locator('#question-counter').innerText(),/01 \/ 1$/);
  assert.equal(await guest.page.locator('#duel-live').isVisible(),false);
  assert.equal(await guest.page.evaluate(key=>sessionStorage.getItem(key),DUEL_SESSION_KEY),null);
  assert.equal(await guest.page.locator('#score-value').innerText(),'0');
  await pick(guest.page,'solid',round[0].shape);await guest.page.locator('#r1').click();await guest.page.waitForFunction(()=>!document.querySelector('#r2').disabled);
  await pick(guest.page,'net',round[0].shape);await guest.page.locator('#r2').click();await guest.page.locator('#result-screen').waitFor({state:'visible'});
  assert.equal(await guest.page.locator('#result-score').innerText(),'1');assert.equal(await guest.page.locator('.review-card').count(),1);
  assert.equal(await guest.page.locator('#duel-result').isVisible(),false);assert.deepEqual(reviewWrites,[]);
  const afterReview=await state(guest.page,guestCredentials);assert.deepEqual(afterReview.me.answers,guestResult.me.answers);assert.equal(afterReview.me.score,9);
  assert.equal(await guest.page.evaluate(()=>localStorage.getItem('geodecoder.digital.single-attempt.v1.scores')),null);
  await shot(guest.page,'review-result-en-mobile');
  await host.context.close();await guest.context.close();
  console.log('PASS two complete live games:10–9, authoritative winner on both devices, lost-ACK retry, BM/English and isolated quiz scores');
  console.log('PASS finished Duel wrong-question practice uses its original one-question subset, clears the Duel token, writes no online/quiz scores and preserves the server result');
  }

  if(!process.env.DUEL_SMOKE_ONLY){
  const expired=await newPlayer('Duel QA Expired','en');await expired.page.locator('#duel-create').click();await expired.page.locator('#duel-room').waitFor({state:'visible',timeout:30000});await recordRoom(expired.page);
  await expired.page.route(DUEL_ENDPOINT,async route=>{if(route.request().postDataJSON().action==='state')await route.fulfill({status:401,contentType:'application/json',body:JSON.stringify({ok:false,error:'invalid_token'})});else await route.continue();});
  await expired.page.locator('#duel-new-room').waitFor({state:'visible',timeout:15000});await expired.page.locator('#duel-new-room').click();
  assert.equal(await expired.page.locator('#duel-entry').isVisible(),true);assert.equal(await expired.page.evaluate(key=>sessionStorage.getItem(key),DUEL_SESSION_KEY),null);
  await expired.context.close();assert.deepEqual(errors,[]);
  console.log('PASS expired-session recovery starts a fresh lobby; no runtime errors');
  }
  const quitter=await newPlayer('Duel QA Forfeit','en',true),winner=await newPlayer('Duel QA Walkover','en',true);
  await quitter.page.locator('#duel-join').click();assert.equal(await quitter.page.locator('#duel-pin').getAttribute('aria-invalid'),'true');
  assert.match(await quitter.page.locator('#duel-message').innerText(),/Check/);
  await setLanguage(quitter.page,'ms');assert.match(await quitter.page.locator('#duel-message').innerText(),/Semak/);
  await quitter.page.locator('#duel-create').click();await quitter.page.locator('#duel-room').waitFor({state:'visible',timeout:30000});
  const walkover=await recordRoom(quitter.page);await quitter.page.locator('#duel-copy').click();
  await quitter.page.waitForFunction(()=>/PIN disalin|PIN dipilih/.test(document.querySelector('#duel-message').textContent));
  await winner.page.locator('#duel-pin').fill(walkover.room.code);await winner.page.locator('#duel-join').click();await winner.page.locator('#duel-room').waitFor({state:'visible',timeout:30000});
  await Promise.all([quitter.page.locator('#duel-ready').click(),winner.page.locator('#duel-ready').click()]);
  await Promise.all([quitter.page.locator('#game-screen').waitFor({state:'visible',timeout:30000}),winner.page.locator('#game-screen').waitFor({state:'visible',timeout:30000})]);
  await quitter.page.locator('.leave-button').click();await quitter.page.locator('[data-dialog-action="duel-leave"]').click();
  await quitter.page.locator('#welcome').waitFor({state:'visible',timeout:30000});
  await winner.page.waitForFunction(()=>document.querySelector('#duel-result-content').textContent.includes('You win'));
  const won=await state(winner.page);assert.equal(won.room.reason,'forfeit');assert.equal(won.room.winnerId,won.me.id);assert.equal(won.me.answers.length,10);
  assert.equal(await quitter.page.evaluate(key=>sessionStorage.getItem(key),DUEL_SESSION_KEY),null);
  await winner.page.evaluate(()=>scrollTo(0,0));await shot(winner.page,'forfeit-en-mobile');await fits(winner.page);
  await quitter.context.close();await winner.context.close();assert.deepEqual(errors,[]);
  console.log('PASS bilingual PIN validation/copy and live surrender UI: opponent wins, remaining answers settle, leaving token cleared');
}finally{await browser.close();server.kill();}
