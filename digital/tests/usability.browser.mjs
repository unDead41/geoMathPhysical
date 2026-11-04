// Maintained browser suite. EASE_CASES=navigation,quiz-review selects named cases.
// Chromium emulation does not certify physical phones or Safari.
import assert from 'node:assert/strict';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {QUESTIONS} from '../dist/questions.mjs';
import {Game,SHAPES} from '../dist/core.mjs';
import {classroomFixture} from './classroom-transport.fixture.mjs';
import {startHarness,newCase,settings,startGuest,selectMode,roundFor,choice,order,answer,assertQuestion,fits,screenshot,rawScores,scoreKey,player} from './ease-browser-helpers.mjs';
const expectedMath={P2:1,S2:2,K2:2,C1:1,C2:1,B2:1};
const oldScore={id:'quiz-before',version:'2.3.0',ruleset:'single-attempt-v1',mode:'quiz',player:{name:'Existing pupil',category:'Murid',className:'1 A'},score:9,total:10,mistakes:1,hints:0,skipped:0,firstTry:9,elapsed:30000,completedAt:10000};
const cases={};

cases.navigation=async(harness,track)=>{
  const test=track(await newCase(harness,{hasTouch:true,viewport:{width:390,height:844}})),{page}=test;
  assert.equal(await page.locator('html').getAttribute('lang'),'ms');
  for(const id of ['guest-button','module-button','welcome-account-button'])assert.equal(await page.locator('#'+id).isVisible(),true);
  assert.equal(await page.locator('#language-select').count(),1,'One Settings language control');
  await page.setViewportSize({width:1365,height:980});await screenshot(harness,page,'home-bm-desktop');
  await settings(page,{language:'en'});await page.setViewportSize({width:390,height:844});
  assert.match(await page.locator('#welcome-title').innerText(),/Geometry[\s\S]*can explore/);await screenshot(harness,page,'home-en-mobile');
  await page.locator('#module-button').click();assert.equal(await page.locator('#module-frame').isVisible(),true);await page.waitForFunction(()=>document.querySelector('#module-frame').getAttribute('srcdoc')?.length>10000);assert.ok((await page.locator('#module-frame').getAttribute('srcdoc')).length>10000,'Learn opens the embedded pinned module after asynchronous session preparation');await page.locator('#module-back-button').click();assert.equal(await page.locator('#module-frame').getAttribute('srcdoc'),null);
  await page.locator('#guest-button').click();
  assert.equal(await page.locator('#player-class,input[name="category"]').count(),0,'Only nickname is required for a guest');
  await page.locator('#player-form [type="submit"]').click();assert.match(await page.locator('#name-error').innerText(),/2.*60/);
  await page.locator('#player-name').fill('Guru');await selectMode(page,'practice');
  await settings(page,{language:'ms'});assert.equal(await page.locator('#player-name').inputValue(),'Guru');assert.equal(await page.locator('#play-mode').inputValue(),'practice');
  await selectMode(page,'quiz');await page.locator('#player-form [type="submit"]').click();
  assert.equal(await page.locator('#guide-screen').isVisible(),true);assert.equal(await page.locator('[data-guide-step]').count(),3);
  assert.equal(await page.locator('#game-screen').isVisible(),false,'First guide precedes creating a solo game');
  await page.waitForTimeout(1100);assert.equal(await page.locator('#game-screen').isVisible(),false);
  await screenshot(harness,page,'tutorial-bm-mobile');await page.locator('#guide-back-button').click();
  assert.equal(await page.locator('#guest-screen').isVisible(),true);
  await page.locator('#player-form [type="submit"]').click();assert.equal(await page.locator('#guide-screen').isVisible(),true);
  await page.locator('#guide-start-button').click();await page.locator('#game-screen').waitFor({state:'visible'});
  assert.equal(await page.locator('#score-value').innerText(),'0');assert.match(await page.locator('#question-counter').innerText(),/01 \/ 10/);
  assert.equal(await page.locator('#time-value').innerText(),'00:00');assert.match(await page.locator('#step-progress').innerText(),/1.*2/);
  assert.equal(await page.locator('#r2').isDisabled(),true);
  const gameHash=await page.evaluate(()=>location.hash);await page.locator('.skip-link').focus();await page.locator('.skip-link').press('Enter');
  assert.equal(await page.locator('#main').evaluate(node=>node===document.activeElement),true);assert.equal(await page.evaluate(()=>location.hash),gameHash);assert.equal(await page.locator('#app-dialog').isVisible(),false,'Skip to content must not invoke the Play route');
  assert.match(await page.locator('#input-instruction').innerText(),/Sentuh kad.*sentuh pengimbas/,'Touch devices lead with tap-card/tap-scanner instructions');
  const q=roundFor()[0];await assertQuestion(page,q,0,10);await choice(page,'solid',q.shape).tap();
  assert.equal(await page.locator('#score-value').innerText(),'0');assert.equal(await page.locator('#r2').isDisabled(),true,'Selection spends no attempt');
  assert.equal(await page.locator('.progress-dot.wrong').count(),0);
  assert.match(await page.locator('#feedback-text').innerText(),/Sentuh R1/);
  const before=await order(page),selected=await page.locator('.choice[aria-pressed="true"]').getAttribute('data-shape');
  await settings(page,{language:'en',theme:'dark',textSize:150},true);
  const clock=await page.locator('#time-value').innerText();await page.waitForTimeout(1100);assert.equal(await page.locator('#time-value').innerText(),clock,'Settings pauses solo time');
  await page.locator('#sound-button').click();await page.locator('#music-button').click();await page.locator('#motion-select').selectOption('reduce');
  await fits(page,'Settings English 390px 150%');await screenshot(harness,page,'settings-en-mobile-150');await page.locator('#dialog-close').click();
  assert.deepEqual(await order(page),before);assert.equal(await page.locator('.choice[aria-pressed="true"]').getAttribute('data-shape'),selected);assert.equal(await page.locator('#score-value').innerText(),'0');
  await settings(page,{language:'ms',textSize:100,theme:'light'});await screenshot(harness,page,'game-r1-bm-mobile');
  await page.locator('[data-action="help"]').first().click();await page.locator('[data-help-action="tutorial"]').click();const helpClock=await page.locator('#time-value').innerText();
  await page.waitForTimeout(1100);assert.equal(await page.locator('#time-value').innerText(),helpClock,'Reopened tutorial pauses solo time');
  assert.equal(await page.locator('[data-dialog-action="tutorial-skip"]').count(),0);
  await page.locator('[data-dialog-action="tutorial-next"]').click();assert.match(await page.locator('#tutorial-progress').innerText(),/2.*3/);
  await page.locator('[data-dialog-action="tutorial-previous"]').click();assert.match(await page.locator('#tutorial-progress').innerText(),/1.*3/);
  await page.locator('[data-dialog-action="tutorial-next"]').click();await page.locator('[data-dialog-action="tutorial-next"]').click();await page.locator('[data-dialog-action="tutorial-finish"]').click();
  await page.locator('[data-help-view="home"]').waitFor({state:'visible'});await page.locator('#dialog-close').click();
  assert.deepEqual(await order(page),before);assert.equal(await page.locator('.choice[aria-pressed="true"]').getAttribute('data-shape'),selected);
  await page.locator('#r1').tap();assert.match(await page.locator('#step-progress').innerText(),/2.*2/);await screenshot(harness,page,'game-r2-bm-mobile');
  await settings(page,{language:'en'});assert.equal(await page.locator('#player-display').innerText(),'Guru','Literal nickname does not translate');assert.equal(await page.locator('#r1').isDisabled(),true);
  await choice(page,'net',q.shape).focus();await page.keyboard.press('Enter');await page.locator('#r2').focus();await page.keyboard.press('Enter');
  await page.waitForFunction(()=>document.querySelector('#question-counter').textContent.includes('02 / 10'));assert.equal(await page.locator('#score-value').innerText(),'1','Touch and keyboard scans agree');
  await page.reload();assert.equal(await page.locator('html').getAttribute('lang'),'en');
  await settings(page,{},true);assert.equal(await page.locator('#sound-button').getAttribute('aria-pressed'),'true');assert.equal(await page.locator('#music-button').getAttribute('aria-pressed'),'false');assert.equal(await page.locator('#motion-select').inputValue(),'reduce');
  await page.locator('#dialog-close').click();await page.locator('#solo-resume-button').click();await page.locator('#resume-continue-button').click();assert.equal(await page.locator('#guide-screen').isVisible(),false,'First guide stays dismissed after reload');assert.equal(await page.locator('#app-dialog').isVisible(),false);
};

cases['quiz-review']=async(harness,track)=>{
  const test=track(await newCase(harness)),{page}=test;await startGuest(page,{tutorial:'complete'});
  const round=roundFor(),outcomes=['wrongR1','wrongR2','correct','skipped'];
  for(const [index,q] of round.entries())await answer(page,q,index,10,{outcome:outcomes[index]||'correct',hint:index===1,afterSolid:index===1?async()=>{
    const before=await order(page);await settings(page,{language:'en',theme:'dark',textSize:125});assert.deepEqual(await order(page),before);assert.equal(await page.locator('#r1').isDisabled(),true);assert.equal(await page.locator('#score-value').innerText(),'0');
  }:undefined});
  assert.equal(await page.locator('#result-score').innerText(),'7');assert.equal(await page.locator('#result-mistakes').innerText(),'2');assert.equal(await page.locator('#result-hints').innerText(),'1');
  assert.equal(await page.locator('#result-details').getAttribute('open'),null);assert.equal(await page.locator('#review-list').isVisible(),false,'Long review starts collapsed');await screenshot(harness,page,'quiz-result-collapsed');
  const original=await rawScores(page),saved=JSON.parse(original);assert.equal(saved.length,1);assert.equal(saved[0].player.category,'Tetamu');assert.equal(saved[0].player.className,'');
  assert.deepEqual(saved[0].answers.map(a=>a.id),round.map(q=>q.id));
  assert.deepEqual(saved[0].answers.filter(a=>a.outcome!=='correct').map(a=>a.id),[round[0].id,round[1].id,round[3].id]);
  await page.locator('#result-details > summary').click();assert.equal(await page.locator('.review-card').count(),10);assert.equal(await page.locator('.review-card.wrong').count(),2);assert.equal(await page.locator('.review-card.skipped').count(),1);
  const bars=await page.locator('.analysis-track span').evaluateAll(nodes=>nodes.map(n=>n.style.width));await settings(page,{language:'ms'});
  assert.deepEqual(await page.locator('.analysis-track span').evaluateAll(nodes=>nodes.map(n=>n.style.width)),bars);assert.equal(await rawScores(page),original);
  for(const language of ['ms','en'])for(const textSize of [125,150])for(const width of [390,320]){
    await page.setViewportSize({width,height:844});await settings(page,{language,textSize});await fits(page,`Expanded result ${language}/${textSize}/${width}`);
    assert.equal(await page.locator('#result-details').getAttribute('open'),'');
    if(language==='en'&&textSize===150&&width===320)await screenshot(harness,page,'quiz-review-expanded-en-320-150');
  }
  await settings(page,{language:'ms',textSize:100});await page.setViewportSize({width:1365,height:980});
  await page.locator('#retry-wrong-button').click();const ids=[round[0].id,round[1].id,round[3].id],review=roundFor('review',ids),observed=[];
  assert.equal(await page.locator('.progress-dot').count(),3);assert.match(await page.locator('#session-mode').innerText(),/Latihan semula|Review practice/);assert.equal(await rawScores(page),original);
  await screenshot(harness,page,'review-practice-original-three');
  for(const [index,q] of review.entries()){observed.push(q.id);await answer(page,q,index,3);assert.equal(await rawScores(page),original);}
  assert.deepEqual(observed.sort(),ids.sort(),'Review exact original wrong/skipped IDs');assert.equal(await page.locator('#result-score').innerText(),'3');assert.equal(await page.locator('#retry-wrong-button').isVisible(),false);
  assert.equal(await page.locator('#practice-result-note').isVisible(),true);assert.equal(await rawScores(page),original,'Review cannot change original quiz record');await page.locator('#replay-button').click();assert.equal(await page.locator('.progress-dot').count(),3);
};

async function practice(harness,track,{mixed=false,offline=false,rich=false}={}){
  const test=track(await newCase(harness,{offline})),{page}=test;
  await page.evaluate(({key,record})=>localStorage.setItem(key,JSON.stringify([record])),{key:scoreKey,record:oldScore});const original=await rawScores(page);
  await settings(page,{language:'en'});await startGuest(page,{name:rich?'<img src=x onerror=evil>':player.name,mode:'practice'});
  if(rich){assert.ok((await page.locator('#player-display').innerText()).startsWith('<img'));assert.equal(await page.locator('#player-display img').count(),0);}
  const round=roundFor('practice'),seen=new Set();let richViews=0;assert.equal(await page.locator('.progress-dot').count(),15);
  for(const [index,q] of round.entries()){
    if(rich){
      await page.locator('#hint-button').click();const before=await order(page);
      for(const language of ['ms','en']){
        await settings(page,{language});await assertQuestion(page,q,index,15);assert.deepEqual(await order(page),before,q.id+': card order/colors');assert.equal(await page.locator('#hint-button').getAttribute('aria-expanded'),'true');
        assert.equal(await page.locator('#question-detail [role="math"]').count(),expectedMath[q.id]||0,q.id+': MathML equation count');assert.ok(await page.locator('#hint-text .geometry-term,#hint-text math').count()>0,q.id+': rich hint');
        assert.ok(await page.locator('math').evaluateAll(nodes=>nodes.every(n=>n.namespaceURI==='http://www.w3.org/1998/Math/MathML')));
        for(const label of await page.locator('#question-detail [role="math"]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label'))))assert.match(label,language==='ms'?/sama dengan/:/equals/);
        if(['P2','C1'].includes(q.id)){assert.equal(await page.locator('#question-detail mfrac').count(),1);assert.equal(await page.locator('#question-detail mfrac > mn').last().textContent(),'3');}
        for(const width of [1365,390,320]){await page.setViewportSize({width,height:width===1365?980:844});await fits(page,q.id+':'+language+':'+width,{math:true});richViews++;if(q.id==='P2'&&width===390)await screenshot(harness,page,'rich-fraction-mobile-'+language);}
      }
      await page.setViewportSize({width:1365,height:980});
    }
    seen.add(q.id);const outcome=!mixed?'correct':[0,9].includes(index)?'wrongR1':index===1?'wrongR2':[3,14].includes(index)?'skipped':'correct';
    await answer(page,q,index,15,{outcome,hint:!rich&&[0,14].includes(index)});
  }
  assert.deepEqual([...seen].sort(),QUESTIONS.map(q=>q.id).sort());assert.equal(await page.locator('#result-score').innerText(),mixed?'10':'15');assert.equal(await page.locator('#result-mistakes').innerText(),mixed?'3':'0');assert.equal(await page.locator('#result-first').innerText(),mixed?'11 / 15':'15 / 15');assert.equal(await page.locator('#result-hints').innerText(),rich?'15':'2');assert.equal(await rawScores(page),original,'Practice cannot alter quiz scores');
  assert.equal(await page.locator('#result-details').getAttribute('open'),null);await page.locator('#result-details > summary').click();assert.equal(await page.locator('.review-card').count(),15);assert.equal(await page.locator('.review-card.wrong').count(),mixed?3:0);assert.equal(await page.locator('.review-card.skipped').count(),mixed?2:0);
  for(const language of ['ms','en']){await settings(page,{language});assert.equal(await rawScores(page),original);assert.equal(await page.locator('#practice-result-note').isVisible(),true);assert.ok((await page.locator('#analysis-shapes .analysis-row-title > span').allTextContents()).every(text=>text.includes('/ 3')));if(rich)assert.ok(await page.locator('.review-prompt math').count()>0);await page.setViewportSize({width:320,height:844});await fits(page,'practice result '+language);}
  await page.locator('#replay-button').click();assert.equal(await page.locator('.progress-dot').count(),15);await page.locator('.leave-button').click();await page.locator('[data-dialog-action="home"]').click();await page.locator('#guest-button').click();assert.equal(await page.locator('#play-mode').inputValue(),'practice');
  await selectMode(page,'quiz');await page.locator('#player-form [type="submit"]').click();
  // The accepted solo-save flow protects the practice round abandoned above.
  await page.locator('#resume-new-button').click();await page.locator('[data-dialog-action="solo-discard"]').click();
  await page.locator('#game-screen').waitFor({state:'visible'});assert.equal(await page.locator('.progress-dot').count(),10);
  if(offline)assert.deepEqual(test.requests,[],'Standalone solo play makes zero HTTP(S) requests');
  if(rich)console.log(`DETAIL all 15 IDs, ${richViews} BM/English rich-text views, offline standalone with zero HTTP(S) requests`);
}
cases['practice-correct']=async(h,t)=>practice(h,t,{offline:true,rich:true});
cases['practice-mixed']=async(h,t)=>practice(h,t,{mixed:true});

cases.layout=async(harness,track)=>{
  const test=track(await newCase(harness)),{page}=test;let views=0;const failures=[];
  async function checkFit(label,options){try{await fits(page,label,options);}catch(error){failures.push(error.message);}}
  async function matrix(screen){
    for(const language of ['ms','en'])for(const theme of ['light','dark'])for(const textSize of [100,125,150])for(const width of [1365,390,320]){
      await page.setViewportSize({width,height:width===1365?980:844});await settings(page,{language,theme,textSize},true);await checkFit(`${screen} settings ${language}/${theme}/${textSize}/${width}`);views++;
      await page.locator('#dialog-close').click();await page.locator('#settings-home #settings-panel').waitFor({state:'attached'});await checkFit(`${screen} ${language}/${theme}/${textSize}/${width}`,{math:screen==='game'});views++;
      assert.equal(await page.locator('html').getAttribute('data-theme'),theme);assert.equal(await page.locator('html').getAttribute('data-text-size'),String(textSize));if(screen==='result')assert.equal(await page.locator('#result-details').getAttribute('open'),null);
    }
  }
  await matrix('home');await startGuest(page);const round=roundFor();await page.locator('#hint-button').click();await matrix('game');await page.setViewportSize({width:1365,height:980});await settings(page,{language:'ms',theme:'light',textSize:100});
  for(const [index,q] of round.entries())await answer(page,q,index,10);await matrix('result');console.log(`DETAIL ${views} Home/game/result/Settings layout checks: 2 languages × 2 themes × 3 text sizes × 3 viewport widths`);assert.deepEqual(failures,[],'Every layout combination must fit');
};

cases['dialog-race']=async(harness,track)=>{
  const test=track(await newCase(harness)),{page}=test;await startGuest(page);const q=roundFor()[0];
  await choice(page,'solid',q.shape).click();await page.locator('#r1').click();await settings(page,{},true);
  // These are actual UI handlers in one task, not access to application state.
  // A delayed native close event must not restore an obsolete focus target.
  await page.evaluate(shape=>{document.querySelector('#dialog-close').click();document.querySelector(`.choice[data-kind="net"][data-shape="${shape}"]`).focus();},q.shape);
  await page.waitForTimeout(30);
  assert.deepEqual(await page.evaluate(()=>({kind:document.activeElement.dataset.kind,shape:document.activeElement.dataset.shape})),{kind:'net',shape:q.shape},'Late dialog close cannot steal the next card focus');
  await page.keyboard.press('Enter');await page.locator('#r2').press('Enter');await page.waitForFunction(()=>document.querySelector('#question-counter').textContent.includes('02 / 10'));
  assert.equal(await page.locator('#score-value').innerText(),'1');await settings(page,{},true);
  await page.evaluate(()=>{document.querySelector('#dialog-close').click();document.querySelector('#settings-button').click();});
  await page.waitForTimeout(30);assert.equal(await page.locator('#app-dialog').isVisible(),true);assert.equal(await page.locator('#settings-panel').isVisible(),true,'Late close cannot stash the newly reopened Settings panel');
};

cases.drag=async(harness,track)=>{
  const test=track(await newCase(harness)),{page}=test;await startGuest(page);const q=roundFor()[0];
  for(const [kind,target] of [['solid','r1'],['net','r2']]){
    await choice(page,kind,q.shape).scrollIntoViewIfNeeded();await page.locator('#'+target).scrollIntoViewIfNeeded();
    const card=await choice(page,kind,q.shape).boundingBox(),scanner=await page.locator('#'+target).boundingBox();
    assert.ok(card&&scanner);await page.mouse.move(card.x+card.width/2,card.y+card.height/2);await page.mouse.down();
    await page.mouse.move(scanner.x+scanner.width/2,scanner.y+scanner.height/2,{steps:12});await page.mouse.up();
    if(kind==='solid')assert.equal(await page.locator('#r1').isDisabled(),true);
  }
  await page.waitForFunction(()=>document.querySelector('#question-counter').textContent.includes('02 / 10'));assert.equal(await page.locator('#score-value').innerText(),'1','Pointer drag scans the same solid/net pair');
};

cases.storage=async(harness,track)=>{
  const test=track(await newCase(harness,{denied:true,viewport:{width:320,height:844}})),{page}=test;assert.equal(await page.locator('#storage-warning').isVisible(),true);
  await settings(page,{language:'en',theme:'dark',textSize:150},true);assert.match(await page.locator('#storage-warning').innerText(),/storage/i);assert.match(await page.locator('#settings-notice').innerText(),/not saved|cannot.*save|could not.*save|does not allow saving/i);await fits(page,'Denied storage settings');await page.locator('#dialog-close').click();
  await startGuest(page);await answer(page,roundFor()[0],0,10);assert.equal(await page.locator('#score-value').innerText(),'1');
};

cases.account=async(harness,track)=>{
  const test=track(await newCase(harness)),{page}=test;await page.locator('#welcome-account-button').click();await page.locator('#portal-auth-title').waitFor();const form=page.locator('[data-portal-form="login"]');
  await form.locator('input[name="username"]').fill('typed_before_language_change');await form.locator('input[name="password"]').fill('synthetic QA value');await settings(page,{language:'en'});assert.equal(await form.locator('input[name="username"]').inputValue(),'typed_before_language_change');assert.equal(await form.locator('input[name="password"]').inputValue(),'synthetic QA value','Settings language retains the in-memory password');await settings(page,{language:'ms'});
  await form.locator('input[name="username"]').fill('invalid username');await form.locator('button[type="submit"]').click();assert.equal(await form.locator('input[name="username"]').getAttribute('aria-invalid'),'true');assert.match(await form.locator('[data-error-for="username"]').innerText(),/email/);assert.match(await form.locator('[data-form-error]').innerText(),/Semak/);
  await settings(page,{language:'en'});assert.equal(await form.locator('input[name="username"]').inputValue(),'invalid username');assert.equal(await form.locator('input[name="username"]').getAttribute('aria-invalid'),'true','Language change retains invalid-field context');assert.match(await form.locator('[data-error-for="username"]').innerText(),/valid email|valid.*username/i);assert.match(await form.locator('[data-form-error]').innerText(),/check/i);
  await screenshot(harness,page,'account-invalid-en-password-preserved');
};

cases['classroom-fixture']=async(harness,track)=>{
  for(const role of ['teacher','student']){
    let actions;const test=track(await newCase(harness,{setup:async context=>{actions=await classroomFixture(context,role);}})),{page}=test;await page.locator('#welcome-account-button').click();await page.locator('.portal-account-chip b').waitFor();assert.equal(await page.locator('.portal-account-chip b').innerText(),'Guru');
    const className=page.locator(role==='teacher'?'.portal-class-choice b':'.portal-student-classes li b');assert.equal(await className.innerText(),'Bilik');await settings(page,{language:'en',theme:'dark',textSize:150});
    assert.equal(await page.locator('.portal-account-chip b').innerText(),'Guru','Literal profile name does not translate');assert.equal(await className.innerText(),'Bilik','Literal class name does not translate');assert.equal(await page.locator('.portal-room-card h3').innerText(),'Kelas','Literal room name does not translate');assert.match(await page.locator('#portal-title').innerText(),role==='teacher'?/class|learn/i:/discover|match/i);
    for(const width of [1365,390,320]){await page.setViewportSize({width,height:width===1365?980:844});await fits(page,role+' transport fixture');}await screenshot(harness,page,'classroom-'+role+'-fixture-en-320');assert.ok(actions.includes('snapshot'));assert.ok(actions.every(action=>['snapshot','heartbeat'].includes(action)));await test.context.close();
  }
  console.log('DETAIL classroom views used read-only fixture transport; no live classroom account/backend/email');
};

cases['classroom-errors-fixture']=async(harness,track)=>{
  let actions;const test=track(await newCase(harness,{setup:async context=>{actions=await classroomFixture(context,'student',{snapshotFailures:1});}})),{page}=test;
  await settings(page,{language:'en'});await page.locator('#welcome-account-button').click();await page.locator('.portal-load-error').waitFor();
  const message=await page.locator('#portal-alert').innerText();assert.match(message,/connection|try again/i);assert.doesNotMatch(message,/Tekan|Muat semula|Data terakhir|masih dipaparkan/,'English network recovery message contains no BM suffix');
  await settings(page,{language:'ms'});assert.match(await page.locator('#portal-alert').innerText(),/Sambungan|sambungan/);assert.equal(await page.locator('.portal-load-error [data-portal-action="refresh"]').isVisible(),true,'Language change retains the recovery action');
  await settings(page,{language:'en'});assert.doesNotMatch(await page.locator('#portal-alert').innerText(),/Tekan|Muat semula|Data terakhir|masih dipaparkan/);
  await page.locator('.portal-load-error [data-portal-action="refresh"]').click();await page.locator('.portal-account-chip b').waitFor();assert.equal(await page.locator('#portal-alert').innerText(),'');
  assert.equal(actions.filter(action=>action==='snapshot').length,2);assert.ok(actions.every(action=>['snapshot','heartbeat'].includes(action)));
};

async function classroomReview(harness,track,{single=false}={}){
  const remote=new Game(QUESTIONS,{name:'Guru',category:'Pelajar',className:'Bilik'},0,()=>.41);let time=0;
  while(remote.status!=='finished'){
    if(remote.index===0){remote.scan('solid',SHAPES.find(shape=>shape!==remote.question.shape),'r1',time+=50);remote.continueReview(time+=1800);}
    else if(remote.index===3&&!single){remote.skip(time+=50);remote.continueReview(time+=1800);}
    else{remote.scan('solid',remote.question.shape,'r1',time+=50);remote.scan('net',remote.question.shape,'r2',time+=50);remote.update(time+=900);}
  }
  const state={roomId:'30000000-0000-4000-8000-000000000001',attemptId:'40000000-0000-4000-8000-000000000001',questions:remote.round.map(q=>q.id),...Object.fromEntries(['index','stage','status','score','mistakes','hints','skipped','elapsed','hintUsed','lastOutcome','wrongReader','attempts','answers'].map(key=>[key,remote[key]])),readyInMs:0};
  const original=JSON.stringify(state),ids=remote.answers.filter(answer=>answer.outcome!=='correct').map(answer=>answer.id);let actions;
  const test=track(await newCase(harness,{setup:async context=>{actions=await classroomFixture(context,'student',{finishedState:state});}})),{page}=test;
  await page.locator('#welcome-account-button').click();await page.locator('[data-portal-action="view-room"]').click();await page.locator('[data-portal-action="play-result"]').click();
  await page.locator('#result-screen').waitFor({state:'visible'});assert.equal(await page.locator('#result-score').innerText(),single?'9':'8');assert.equal(await rawScores(page),null,'Remote result is not saved to local quiz board');
  if(single)await settings(page,{language:'en'});
  await page.locator('#retry-wrong-button').click();const review=roundFor('review',ids);assert.equal(await page.locator('#online-game-bar').isVisible(),false);
  for(const [index,q] of review.entries())await answer(page,q,index,review.length);
  assert.equal(await page.locator('#result-score').innerText(),String(ids.length));assert.equal(await rawScores(page),null);assert.equal(JSON.stringify(state),original,'Local review leaves remote result object unchanged');
  assert.ok(actions.every(action=>['snapshot','heartbeat'].includes(action)),'Review issues no classroom score/answer action');
  if(single){
    assert.equal(await page.locator('#result-total').innerText(),'/ 1 point');await page.setViewportSize({width:390,height:844});await screenshot(harness,page,'review-one-question-result-en-mobile');
    await settings(page,{textSize:150,theme:'dark'});await page.setViewportSize({width:320,height:844});await fits(page,'One-question review result English 320px 150%');await screenshot(harness,page,'review-one-question-result-en-320-150');
  }
  console.log('DETAIL completed classroom-result fixture → exact wrong/skipped local review; no score/answer backend action');
}
cases['classroom-review-fixture']=async(h,t)=>classroomReview(h,t);
cases['review-one-fixture']=async(h,t)=>classroomReview(h,t,{single:true});

export async function runEaseCases(selected=Object.keys(cases)){
  if(process.env.EASE_CASES)selected=process.env.EASE_CASES.split(',').filter(Boolean);
  for(const name of selected)assert.ok(cases[name],'Unknown case '+name);
  const harness=await startHarness(),failures=[];let passed=0;
  console.log('EASE browser cases: '+selected.join(', '));console.log('EVIDENCE_DIRECTORY '+harness.evidence);
  try{
    for(const name of selected){
      const tests=[],track=test=>{tests.push(test);return test;};console.log('RUN '+name);
      try{
        await cases[name](harness,track);
        for(const test of tests)assert.deepEqual(test.errors,[],'No runtime errors');
        console.log('PASS '+name);passed++;
      }catch(error){
        failures.push({case:name,error});console.error('FAIL '+name+'\n'+error.stack);
        for(const test of tests)for(const runtime of test.errors)console.error('RUNTIME '+name+': '+runtime);
        const current=tests.at(-1)?.page;
        if(current&&!current.isClosed())await screenshot(harness,current,'failure-'+name).catch(e=>console.error('Failure screenshot: '+e.message));
      }finally{
        for(const test of tests)await test.context.close();
      }
    }
  }finally{await harness.close();}
  console.log(`RESULT ${passed}/${selected.length} browser cases passed; ${failures.length} failures`);
  if(failures.length)throw new AggregateError(failures.map(item=>item.error),'Browser QA failed: '+failures.map(item=>item.case).join(', '));
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href)await runEaseCases();
