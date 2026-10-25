// Real UI/MathML regression; Playwright is a development-only dependency.
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
const evidence=path.join(root,'docs/rich-text-evidence');mkdirSync(evidence,{recursive:true});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox']});
const server=spawn('python',['-m','http.server','8138','--bind','127.0.0.1','--directory',path.dirname(root)],{stdio:'ignore'});
const errors=[],covered=new Set();let views=0;
const expectedMath={P2:1,S2:2,K2:2,C1:1,C2:1,B2:1};
const screenshot=async(page,name)=>page.screenshot({animations:'disabled',path:path.join(evidence,name+'.png'),fullPage:true});
const order=page=>page.locator('.choice').evaluateAll(nodes=>nodes.map(n=>[n.dataset.kind,n.dataset.shape,n.querySelector('.shape-art').dataset.tone]));
const pick=async(page,kind,shape)=>page.locator(`.choice[data-kind="${kind}"][data-shape="${shape}"]`).click();
async function fits(page,context){
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),context+': page overflow');
  assert.deepEqual(await page.locator('#question-detail math,#hint-text math').evaluateAll(nodes=>nodes.filter(el=>{
    if(!el.checkVisibility())return false;
    const math=el.getBoundingClientRect(),parent=el.closest('p').getBoundingClientRect();
    return math.width<1||math.left<parent.left-1||math.right>parent.right+1;
  }).map(el=>el.textContent)),[],context+': formula clipped');
}
try{
  for(const seed of [.01,.41]){
    const page=await browser.newPage({viewport:{width:1365,height:980}});
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(value=>{Math.random=()=>value;},seed);
    for(let i=0;i<30;i++){
      try{await page.goto('http://127.0.0.1:8138/digital/dist/');break;}
      catch(e){if(i===29)throw e;await new Promise(resolve=>setTimeout(resolve,100));}
    }
    const select=page.locator('#language-select');
    await page.locator('#player-name').fill('Rich text QA');await page.locator('#player-class').fill('1 A');
    await page.locator('.start-button').click();
    const round=new Game(QUESTIONS,{name:'Rich text QA',category:'Murid',className:'1 A'},0,()=>seed).round;
    for(const [index,q] of round.entries()){
      covered.add(q.id);
      await pick(page,'solid',q.shape);await page.locator('#hint-button').click();
      const before=await order(page),score=await page.locator('#score-value').innerText();
      for(const language of ['ms','en']){
        await select.selectOption(language);
        assert.deepEqual(await order(page),before,q.id+': order/colours');
        assert.equal(await page.locator('.choice[aria-pressed="true"]').getAttribute('data-shape'),q.shape);
        assert.equal(await page.locator('#score-value').innerText(),score);
        assert.equal(await page.locator('#hint-button').getAttribute('aria-expanded'),'true');
        assert.equal(await page.locator('#question-detail [role="math"]').count(),expectedMath[q.id]||0,q.id+': equation count');
        assert.ok(await page.locator('#hint-text .geometry-term,#hint-text math').count()>0,q.id+': rich hint');
        for(const label of await page.locator('#question-detail [role="math"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))))assert.match(label,language==='ms'?/sama dengan/:/equals/);
        assert.ok(await page.locator('math').evaluateAll(nodes=>nodes.every(n=>n.namespaceURI==='http://www.w3.org/1998/Math/MathML')));
        if(['P2','C1'].includes(q.id)){
          assert.equal(await page.locator('#question-detail mfrac').count(),1);
          assert.equal(await page.locator('#question-detail mfrac > mn').last().textContent(),'3');
        }
        for(const width of [1365,390,320]){
          await page.setViewportSize({width,height:width===1365?980:844});
          await fits(page,q.id+':'+language+':'+width);views++;
          if(seed===.01&&q.id==='P2'&&width===1365)await screenshot(page,'fraction-desktop-'+language);
          if(seed===.01&&q.id==='S2'&&width===390)await screenshot(page,'formula-mobile-'+language);
        }
      }
      await page.setViewportSize({width:1365,height:980});
      await page.locator('#r1').click();
      await select.selectOption('ms');assert.ok(await page.locator('#r1').isDisabled());
      const deliberateError=seed===.01&&q.id==='P2';
      await pick(page,'net',deliberateError?'cube':q.shape);await page.locator('#r2').click();
      if(deliberateError){
        const art=await page.locator('#correction-pair svg').first().elementHandle();
        for(const language of ['ms','en']){
          await select.selectOption(language);assert.ok(await art.evaluate(el=>el.isConnected));
          assert.ok(await page.locator('#correction-explanation strong').count()>0);
          await page.setViewportSize({width:390,height:844});await fits(page,'correction:'+language);
          await screenshot(page,'correction-mobile-'+language);
        }
        await page.locator('#continue-button').click();
      }else if(index===9){await page.locator('#result-screen').waitFor({state:'visible'});}
      else{await page.waitForFunction(number=>document.querySelector('#question-counter').textContent.includes(String(number).padStart(2,'0')+' /'),index+2);}
    }
    assert.equal(await page.locator('#result-score').innerText(),seed===.01?'9':'10');
    assert.equal(await page.locator('#result-hints').innerText(),'10');
    assert.equal(await page.locator('.review-card').count(),10);
    const saved=await page.evaluate(()=>localStorage.getItem('geodecoder.digital.single-attempt.v1.scores'));
    const bars=await page.locator('.analysis-track span').evaluateAll(nodes=>nodes.map(n=>n.style.width));
    for(const language of ['ms','en']){
      await select.selectOption(language);assert.equal(await page.evaluate(()=>localStorage.getItem('geodecoder.digital.single-attempt.v1.scores')),saved);
      assert.deepEqual(await page.locator('.analysis-track span').evaluateAll(nodes=>nodes.map(n=>n.style.width)),bars);
      assert.ok(await page.locator('.review-prompt math').count()>0);
      await page.setViewportSize({width:320,height:844});
      assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'result:'+language);
    }
    await page.reload();assert.equal(await select.inputValue(),'en');await page.close();
  }
  assert.equal(covered.size,15);console.log(`PASS: all 15 questions, ${views} BM/English desktop/phone views, rich hints, 2 scored rounds and state preservation`);

  const offline=await browser.newContext();await offline.setOffline(true);
  const page=await offline.newPage({viewport:{width:390,height:844}}),requests=[];
  page.on('pageerror',e=>errors.push(e.message));page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
  await page.addInitScript(()=>{Math.random=()=>.41;});
  await page.goto('file://'+path.join(root,'GeoDecoder_Digital_V1.html'));
  await page.locator('#player-name').fill('<img src=x onerror=evil>');await page.locator('#player-class').fill('1 A');await page.locator('.start-button').click();
  assert.ok((await page.locator('#player-display').innerText()).startsWith('<img'));
  assert.equal(await page.locator('#player-display img').count(),0);
  for(const language of ['ms','en']){
    await page.locator('#language-select').selectOption(language);
    assert.equal(await page.locator('#question-detail mfrac').count(),1);await fits(page,'offline:'+language);
  }
  assert.deepEqual(requests,[]);assert.deepEqual(errors,[]);await offline.close();
  console.log('PASS: offline single-file fractions in both languages, safe player text, zero network requests/runtime errors');
}finally{await browser.close();server.kill();}
