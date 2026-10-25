// Exercise the real practice UI, same Game engine, storage boundary and offline HTML.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdirSync} from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {Game} from '../dist/core.mjs';
import {QUESTIONS} from '../dist/questions.mjs';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const evidence=path.join(root,'docs/practice-evidence');mkdirSync(evidence,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
const server=spawn('python',['-m','http.server','8139','--bind','127.0.0.1','--directory',path.join(root,'dist')],{stdio:'ignore'});
const player={name:'Latihan QA',category:'Murid',className:'1 A'};
const oldScore={id:'quiz-before',version:'1.3.0',ruleset:'single-attempt-v1',player,score:9,total:10,mistakes:1,hints:0,skipped:0,firstTry:9,elapsed:30000,completedAt:10000};
const errors=[];
const pick=(page,kind,shape)=>page.locator(`.choice[data-kind="${kind}"][data-shape="${shape}"]`).click();
const screenshot=(page,name)=>page.screenshot({animations:'disabled',path:path.join(evidence,name+'.png')});
async function fits(page){assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'No horizontal overflow');}
try{
  for(const mixed of [false,true]){
    const context=await browser.newContext({viewport:{width:1365,height:980}});
    if(!mixed)await context.setOffline(true);
    const page=await context.newPage(),requests=[];
    page.on('pageerror',error=>errors.push(error.message));
    page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
    await page.addInitScript(()=>{Math.random=()=>.41;});
    if(mixed){
      for(let i=0;i<30;i++){try{await page.goto('http://127.0.0.1:8139');break;}catch(error){if(i===29)throw error;await new Promise(r=>setTimeout(r,100));}}
    }else await page.goto('file://'+path.join(root,'GeoDecoder_Digital_V1.html'));
    await page.evaluate(record=>localStorage.setItem('geodecoder.digital.single-attempt.v1.scores',JSON.stringify([record])),oldScore);
    const originalScores=await page.evaluate(()=>localStorage.getItem('geodecoder.digital.single-attempt.v1.scores'));
    const language=page.locator('#language-select'),mode=page.locator('#play-mode');
    assert.equal(await mode.inputValue(),'quiz');
    await mode.selectOption('practice');assert.equal(await page.locator('#entry-question-count').innerText(),'15');
    for(const locale of ['ms','en']){
      await language.selectOption(locale);assert.equal(await mode.inputValue(),'practice');
      assert.match(await page.locator('#mode-description').innerText(),/15/);
      for(const width of [1365,390,320]){
        await page.setViewportSize({width,height:width===1365?980:844});await fits(page);
        assert.ok(await mode.evaluate(el=>{const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d'),css=getComputedStyle(el);ctx.font=css.font;return ctx.measureText(el.selectedOptions[0].textContent).width<el.clientWidth-44;}),'Selected mode text fits');
      }
      if(!mixed){await page.setViewportSize({width:1365,height:980});await screenshot(page,'practice-welcome-'+locale);}
    }
    await page.locator('[data-action="help"]').first().click();assert.match(await page.locator('.help-intro').innerText(),/15 out of 15/);await page.locator('#dialog-close').click();
    await page.locator('#player-name').fill(player.name);await page.locator('#player-class').fill(player.className);await page.locator('.start-button').click();
    const round=new Game(QUESTIONS,player,0,()=>.41,{mode:'practice'}).round;
    assert.equal(await page.locator('.progress-dot').count(),15);assert.match(await page.locator('#session-mode').innerText(),/Practice/);
    await page.locator('.leave-button').click();assert.match(await page.locator('#dialog-content').innerText(),/1 of 15/);await page.locator('#dialog-close').click();
    for(const [index,q] of round.entries()){
      assert.equal(await page.locator('#result-screen').isVisible(),false);
      await pick(page,'solid',q.shape);
      if(index===0||index===14)await page.locator('#hint-button').click();
      const selected=await page.locator('.choice[aria-pressed="true"]').getAttribute('data-shape');
      const before=await page.locator('.choice').evaluateAll(nodes=>nodes.map(el=>[el.dataset.kind,el.dataset.shape,el.querySelector('svg').dataset.tone]));
      for(const locale of ['ms','en']){
        await language.selectOption(locale);
        assert.match(await page.locator('#question-counter').innerText(),new RegExp(String(index+1).padStart(2,'0')+' / 15'));
        assert.match(await page.locator('#progress-dots').getAttribute('aria-label'),new RegExp((index+1)+(locale==='ms'?' daripada 15':' of 15')));
        assert.equal((await page.locator('#score-total').innerText()).trim(),'/ 15');
        assert.equal(await page.locator('.choice[aria-pressed="true"]').getAttribute('data-shape'),selected);
        assert.deepEqual(await page.locator('.choice').evaluateAll(nodes=>nodes.map(el=>[el.dataset.kind,el.dataset.shape,el.querySelector('svg').dataset.tone])),before);
        if(!mixed&&index===10){await page.setViewportSize({width:locale==='en'?390:1365,height:locale==='en'?844:980});await fits(page);await screenshot(page,'practice-game-'+locale);}
      }
      const wrong=['cube','cuboid','pyramid','cylinder','cone'].find(shape=>shape!==q.shape);
      const wrongR1=mixed&&(index===0||index===9),wrongR2=mixed&&index===1,skip=mixed&&(index===3||index===14);
      if(skip)await page.locator('#skip-button').click();
      else if(wrongR1){await pick(page,'solid',wrong);await page.locator('#r1').click();}
      else{
        await page.locator('#r1').click();await language.selectOption('ms');assert.ok(await page.locator('#r1').isDisabled());
        await pick(page,'net',wrongR2?wrong:q.shape);await page.locator('#r2').click();
      }
      if(wrongR1||wrongR2||skip){
        assert.equal(await page.locator('.choice:not([disabled])').count(),0);
        await page.locator('#continue-button').waitFor({state:'visible'});
        await page.waitForFunction(()=>!document.querySelector('#continue-button').disabled);
        assert.match(await page.locator('#continue-button').innerText(),index===14?/Lihat analisis|View analysis/:/Soalan seterusnya|Next question/);
        await page.locator('#continue-button').click();
      }else if(index===14)await page.locator('#result-screen').waitFor({state:'visible'});
      else await page.waitForFunction(n=>document.querySelector('#question-counter').textContent.includes(String(n).padStart(2,'0')+' / 15'),index+2);
    }
    assert.equal(await page.locator('#result-score').innerText(),mixed?'10':'15');
    assert.equal(await page.locator('#result-hints').innerText(),'2');
    assert.equal(await page.locator('#result-mistakes').innerText(),mixed?'3':'0');
    assert.equal(await page.locator('#result-first').innerText(),mixed?'11 / 15':'15 / 15');
    assert.equal(await page.locator('.review-card').count(),15);
    assert.equal(await page.locator('.review-card.wrong').count(),mixed?3:0);
    assert.equal(await page.locator('.review-card.skipped').count(),mixed?2:0);
    for(const locale of ['ms','en']){
      await language.selectOption(locale);
      assert.match(await page.locator('#result-total').innerText(),/15/);
      assert.match(await page.locator('#analysis-description').innerText(),/15.*3/);
      assert.equal(await page.locator('#practice-result-note').isVisible(),true);
      assert.ok((await page.locator('#analysis-shapes .analysis-row-title > span').allTextContents()).every(text=>text.includes('/ 3')));
      assert.equal(await page.evaluate(()=>localStorage.getItem('geodecoder.digital.single-attempt.v1.scores')),originalScores);
      assert.match(await page.locator('#result-title').innerText(),mixed?locale==='ms'?/Teruskan/:/Keep trying/:locale==='ms'?/Semua pasangan tepat/:/Every pair/);
      for(const width of [1365,390,320]){await page.setViewportSize({width,height:width===1365?980:844});await fits(page);}
      if(!mixed){await page.setViewportSize({width:1365,height:980});await page.evaluate(()=>scrollTo(0,0));await screenshot(page,'practice-result-'+locale);}
    }
    await page.locator('#replay-button').click();assert.match(await page.locator('#question-counter').innerText(),/01 \/ 15/);assert.equal(await page.locator('.progress-dot').count(),15);
    await page.locator('.leave-button').click();await page.locator('[data-dialog-action="home"]').click();
    assert.equal(await mode.inputValue(),'practice');await mode.selectOption('quiz');await page.locator('.start-button').click();
    assert.match(await page.locator('#question-counter').innerText(),/01 \/ 10/);assert.equal(await page.locator('.progress-dot').count(),10);
    if(!mixed)assert.deepEqual(requests,[]);
    console.log(`PASS: ${mixed?'10/15 mixed practice, correction at Q10 and final skip':'15/15 offline practice'}, both languages, replay, quiz switch and unchanged quiz storage`);
    await context.close();
  }
  assert.deepEqual(errors,[]);console.log('PASS: practice mode has no runtime errors; 320px/390px/desktop fit');
}finally{await browser.close();server.kill();}
