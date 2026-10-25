// Real Chromium regression; install Playwright separately or set PLAYWRIGHT_MODULE_PATH.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {Game} from '../dist/core.mjs';
import {QUESTIONS} from '../dist/questions.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=path.join(root,'docs/dwi-evidence');mkdirSync(evidence,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
const server=spawn('python',['-m','http.server','8137','--bind','127.0.0.1','--directory',path.join(root,'dist')],{stdio:'ignore'});
const failures=[],checks=[];
async function check(name,fn){await fn();checks.push(name);console.log('PASS '+name);}
try{
  const page=await browser.newPage({viewport:{width:1365,height:980}});
  page.on('pageerror',e=>failures.push(e.message));
  await page.addInitScript(()=>{Math.random=()=>.41;});
  for(let i=0;i<30;i++){try{await page.goto('http://127.0.0.1:8137');break;}catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,100));}}
  const select=page.locator('#language-select');
  await check('BM default, one language selector and English welcome',async()=>{
    assert.equal(await select.count(),1);assert.equal(await select.inputValue(),'ms');
    await page.screenshot({animations:'disabled',path:path.join(evidence,'welcome-bm.png'),fullPage:true});
    await select.selectOption('en');assert.equal(await page.locator('html').getAttribute('lang'),'en');
    assert.match(await page.locator('#welcome-title').innerText(),/Discover/);
    await page.screenshot({animations:'disabled',path:path.join(evidence,'welcome-en.png'),fullPage:true});
  });
  await check('registration errors refresh without clearing entered values',async()=>{
    await page.locator('.start-button').click();assert.match(await page.locator('#name-error').innerText(),/name/);
    await page.locator('#player-name').fill('Aisyah');await select.selectOption('ms');assert.equal(await page.locator('#player-name').inputValue(),'Aisyah');
    await select.selectOption('en');await page.locator('#player-class').fill('1 Bestari');await page.locator('.start-button').click();
  });
  const round=new Game(QUESTIONS,{name:'Aisyah',category:'Murid',className:'1 Bestari'},0,()=>.41).round;
  const order=()=>page.locator('.choice').evaluateAll(nodes=>nodes.map(n=>[n.dataset.kind,n.dataset.shape,n.querySelector('.shape-art').dataset.tone]));
  const pick=async(kind,shape)=>{await page.locator(`.choice[data-kind="${kind}"][data-shape="${shape}"]`).click();};
  await check('selected card/order, hint use and accepted R1 survive language changes',async()=>{
    const before=await order();await pick('solid',round[0].shape);
    await select.selectOption('ms');assert.deepEqual(await order(),before);assert.equal(await page.locator('.choice[aria-pressed="true"]').count(),1);
    assert.match(await page.locator('#feedback-text').innerText(),/^Bongkah /);
    assert.match(await page.locator('.progress-dot').first().getAttribute('title'),/^Soalan /);
    await page.locator('#r1').click();assert.match(await page.locator('#status-r1').innerText(),/betul/);
    await page.locator('#hint-button').click();const hint=await page.locator('#hint-text').innerText();
    await select.selectOption('en');assert.notEqual(await page.locator('#hint-text').innerText(),hint);
    assert.equal(await page.locator('#hint-button').getAttribute('aria-expanded'),'true');assert.equal(await page.locator('#r1').isDisabled(),true);
    const wrong=['cube','cuboid','pyramid','cylinder','cone'].find(s=>s!==round[0].shape);
    await pick('net',wrong);await page.locator('#r2').click();
    const correctionArt=await page.locator('#correction-pair .shape-art').first().elementHandle();
    await select.selectOption('ms');assert.match(await page.locator('#feedback-text').innerText(),/belum sepadan/);
    assert.equal(await correctionArt.evaluate(el=>el.isConnected),true,'Language change preserves the running correction animation');
    assert.match(await page.locator('.progress-dot').first().getAttribute('title'),/: salah/);
    await page.screenshot({animations:'disabled',path:path.join(evidence,'game-bm.png'),fullPage:true});
    await select.selectOption('en');assert.match(await page.locator('#feedback-text').innerText(),/does not match/);
    assert.match(await page.locator('.progress-dot').first().getAttribute('title'),/: wrong/);
    await page.screenshot({animations:'disabled',path:path.join(evidence,'game-en.png'),fullPage:true});
  });
  await check('pause/help/scores/erase/leave dialogs translate and keep time paused',async()=>{
    await page.locator('#pause-button').click();const clock=await page.locator('#time-value').innerText();
    await select.selectOption('ms');assert.match(await page.locator('#dialog-title').innerText(),/dijeda/);
    await page.waitForTimeout(1100);await select.selectOption('en');assert.equal(await page.locator('#time-value').innerText(),clock);
    await page.locator('#dialog-close').click();await page.locator('[data-action="help"]').first().click();await select.selectOption('ms');assert.match(await page.locator('#dialog-title').innerText(),/Cara main/);await page.locator('#dialog-close').click();
    await page.locator('[data-action="scores"]').first().click();await select.selectOption('en');assert.match(await page.locator('#dialog-title').innerText(),/Leaderboard/);await page.locator('#dialog-close').click();
    await page.locator('.leave-button').click();await select.selectOption('ms');assert.match(await page.locator('#dialog-title').innerText(),/Tamatkan/);await page.locator('#dialog-close').click();
    await select.selectOption('en');
  });
  await check('single-attempt round, translated analysis, one saved record and localized CSV',async()=>{
    assert.equal(await page.locator('.choice:not([disabled])').count(),0);
    assert.match(await page.locator('#correction-title').innerText(),/Correct answer/);
    await select.selectOption('ms');assert.match(await page.locator('#correction-title').innerText(),/Jawapan betul/);
    await page.screenshot({animations:'disabled',path:path.join(evidence,'correction-bm.png'),fullPage:true});
    await select.selectOption('en');await page.screenshot({animations:'disabled',path:path.join(evidence,'correction-en.png'),fullPage:true});
    await page.locator('#continue-button').click();
    for(let i=1;i<10;i++){
      await pick('solid',round[i].shape);await page.locator('#r1').click();
      await pick('net',round[i].shape);await page.locator('#r2').click();
      await page.waitForTimeout(1000);
    }
    assert.equal(await page.locator('#result-score').innerText(),'9');
    assert.equal(await page.locator('#result-hints').innerText(),'1');assert.equal(await page.locator('#result-mistakes').innerText(),'1');
    assert.equal(await page.locator('#result-first').innerText(),'10 / 10');
    await select.selectOption('ms');assert.match(await page.locator('#result-title').innerText(),/Bagus/);
    await page.screenshot({animations:'disabled',path:path.join(evidence,'result-bm.png'),fullPage:true});
    await select.selectOption('en');assert.match(await page.locator('#result-title').innerText(),/Well done/);assert.equal(await page.locator('.review-card').count(),10);
    assert.match(await page.locator('#analysis-stages').innerText(),/Match nets/);
    const percentages=await page.locator('.analysis-track span').evaluateAll(nodes=>nodes.map(n=>n.style.width));
    await select.selectOption('ms');await select.selectOption('en');assert.deepEqual(await page.locator('.analysis-track span').evaluateAll(nodes=>nodes.map(n=>n.style.width)),percentages);
    await page.screenshot({animations:'disabled',path:path.join(evidence,'result-en.png'),fullPage:true});
    await select.selectOption('ms');await select.selectOption('en');
    assert.equal(await page.evaluate(()=>JSON.parse(localStorage.getItem('geodecoder.digital.single-attempt.v1.scores')).length),1);
    await page.evaluate(()=>{const key='geodecoder.digital.single-attempt.v1.scores',r=JSON.parse(localStorage.getItem(key))[0];localStorage.setItem(key,JSON.stringify(Array.from({length:12},(_,i)=>({...r,id:i===0?r.id:'fixture-'+i,completedAt:r.completedAt+i}))));});
    await page.locator('[data-action="scores"]').first().click();
    assert.equal(await page.locator('[data-dialog-action="show-all"]').innerText(),'View all scores');
    await page.locator('[data-dialog-action="show-all"]').click();assert.equal(await page.locator('.score-table tbody tr').count(),12);
    await select.selectOption('ms');await select.selectOption('en');assert.equal(await page.locator('.score-table tbody tr').count(),12);
    const download=page.waitForEvent('download');await page.locator('[data-dialog-action="export"]').click();assert.match((await download).suggestedFilename(),/\.csv$/);
    await page.locator('[data-dialog-action="erase"]').click();await select.selectOption('ms');assert.match(await page.locator('#dialog-title').innerText(),/Padam semua/);
    await page.locator('[data-dialog-action="back-scores"]').click();await page.locator('#dialog-close').click();
    await select.selectOption('en');await page.reload();assert.equal(await select.inputValue(),'en');
  });
  await check('390px and 320px BM/BI pages fit their language label and have no horizontal overflow',async()=>{
    for(const width of [390,320])for(const locale of ['en','ms']){
      await page.setViewportSize({width,height:844});await select.selectOption(locale);
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`${width}:${locale}`);
      assert.ok(await select.evaluate(el=>{const style=getComputedStyle(el),canvas=document.createElement('canvas'),ctx=canvas.getContext('2d');ctx.font=style.font;return ctx.measureText(el.selectedOptions[0].textContent).width<=el.clientWidth-parseFloat(style.paddingLeft)-parseFloat(style.paddingRight);}),`${width}:${locale}:language label fits`);
    }
    await page.setViewportSize({width:390,height:844});await select.selectOption('en');await page.screenshot({animations:'disabled',path:path.join(evidence,'mobile-en.png'),fullPage:true});
    await select.selectOption('ms');await page.screenshot({animations:'disabled',path:path.join(evidence,'mobile-bm.png'),fullPage:true});
    await page.locator('#player-name').fill('Mobile');await page.locator('#player-class').fill('1 A');await page.locator('.start-button').click();
    for(const locale of ['ms','en']){
      await select.selectOption(locale);assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),`mobile game:${locale}`);
      await page.screenshot({animations:'disabled',path:path.join(evidence,'mobile-game-'+(locale==='ms'?'bm':'en')+'.png'),fullPage:true});
    }
  });
  await check('standalone HTML starts and plays with network offline',async()=>{
    const isolated=await browser.newContext();await isolated.setOffline(true);const offline=await isolated.newPage();
    offline.on('pageerror',e=>failures.push('offline: '+e.message));
    const requests=[];offline.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
    await offline.goto('file://'+path.join(root,'GeoDecoder_Digital_V1.html'));
    await offline.locator('#language-select').selectOption('en');await offline.locator('#player-name').fill('Offline');await offline.locator('#player-class').fill('1 A');await offline.locator('.start-button').click();
    assert.equal(await offline.locator('.choice').count(),10);assert.equal(requests.length,0);await isolated.close();
  });
  await check('English still works when localStorage is denied',async()=>{
    const denied=await browser.newContext();const tab=await denied.newPage();
    await tab.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError');}});});
    await tab.goto('http://127.0.0.1:8137');await tab.locator('#language-select').selectOption('en');assert.match(await tab.locator('#storage-warning').innerText(),/Browser storage/);
    await tab.locator('#player-name').fill('Private');await tab.locator('#player-class').fill('1 A');await tab.locator('.start-button').click();assert.equal(await tab.locator('.choice').count(),10);await denied.close();
  });
  assert.deepEqual(failures,[]);console.log(`PASS ${checks.length} browser scenarios; no runtime errors`);
}finally{await browser.close();server.kill();}
