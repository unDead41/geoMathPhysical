// Local Chromium only. All service transports are intercepted; no real reports,
// email, issues, accounts, rooms or Duel matches are created by this suite.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {startHarness,newCase,startGuest,settings,choice,roundFor,order,fits,screenshot,root} from './ease-browser-helpers.mjs';
import {localizeQuestion} from '../dist/i18n.mjs';
import {DUEL_SESSION_KEY,DUEL_ENDPOINT} from '../dist/duel.mjs';
const harness=await startHarness();
harness.evidence=path.join(root,'docs/help-support-evidence',process.env.HELP_EVIDENCE_RUN||new Date().toISOString().replace(/[:.]/g,'-'));fs.mkdirSync(harness.evidence,{recursive:true});
const receipts=[],cases=[];
async function fresh(options={}){const test=await newCase(harness,options);cases.push(test);return test;}
const fill=async page=>{for(const [id,value] of Object.entries({description:'The scanner did not respond.',steps:'Select a card, then tap the scanner.',expected:'The card should be scanned.',actual:'The selected card stays on the shelf.'}))await page.locator('#support-'+id).fill(value);};
const preview=async page=>{await page.locator('[data-help-action=report]').click();await fill(page);await page.locator('#support-form [type=submit]').click();return page.locator('#support-preview').inputValue();};
const snapshot=page=>page.evaluate(()=>({order:[...document.querySelectorAll('.choice')].map(n=>[n.dataset.kind,n.dataset.shape,n.getAttribute('aria-pressed')]),r1:document.getElementById('scanner-body-r1').innerHTML,hint:document.getElementById('hint-panel').hidden,score:document.getElementById('score-value').textContent,question:document.getElementById('question-counter').textContent}));
const noServices=async context=>{await context.route('https://**/*',route=>route.abort('internetdisconnected'));};
try{
  for(const language of ['ms','en']){
    const test=await fresh({viewport:{width:language==='ms'?1365:390,height:language==='ms'?980:844},hasTouch:language==='en',setup:noServices});const {page}=test;
    await settings(page,{language});await page.locator('#help-button').press('Enter');
    assert.equal(await page.locator('#dialog-title').innerText(),language==='ms'?'Pusat Bantuan':'Help centre');
    assert.equal(await page.locator('.help-guides>details').count(),7);assert.equal(await page.locator('.help-more[open]').count(),0);
    await page.locator('[data-demo-action=pause]').click();assert.equal(await page.locator('[data-help-demo]').getAttribute('data-demo-state'),'paused');
    await page.locator('[data-demo-action=replay]').click();assert.equal(await page.locator('[data-help-demo]').getAttribute('data-demo-state'),'playing');await fits(page,'Help '+language);
    await screenshot(harness,page,'help-'+language+(language==='ms'?'-desktop':'-phone'));
    const report=await preview(page);assert.match(report,language==='ms'?/Hasil dijangka/:/Expected result/);
    assert.match(report,language==='ms'?/belum dihantar/:/not been sent/);assert.doesNotMatch(report,/access_token|refresh_token|publishable|@/);
    const [download]=await Promise.all([page.waitForEvent('download'),page.locator('[data-help-action=download]').click()]);
    assert.equal(fs.readFileSync(await download.path(),'utf8'),report,'Downloaded bytes equal the reviewed report');
    fs.writeFileSync(path.join(harness.evidence,'sample-report-'+language+'.txt'),report);
    await page.locator('[data-help-action=select]').click();
    assert.equal(await page.locator('#support-preview').evaluate(n=>n.selectionEnd-n.selectionStart),report.length);
    await fits(page,'Preview '+language);await screenshot(harness,page,'preview-'+language);
    for(let i=0;i<12;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement===document.body||!!document.activeElement.closest('#app-dialog')),true,'Native modal prevents focus reaching background controls');}
    await page.keyboard.press('Escape');assert.equal(await page.locator('#help-button').evaluate(n=>n===document.activeElement),true);
    await page.locator('#settings-button').click();await page.locator('[data-dialog-action=help-open]').click();assert.equal(await page.locator('[data-help-view=home]').isVisible(),true);
    await page.locator('[data-help-action=report]').click();assert.equal(await page.locator('#support-description').inputValue(),'The scanner did not respond.');
    assert.equal(test.requests.filter(u=>new URL(u).hostname.endsWith('supabase.co')).length,0,'Help and report make no service calls');
    receipts.push({case:'help-preview-download-keyboard-'+language,passed:true});await test.done();cases.pop();
  }
  {
    const test=await fresh({viewport:{width:320,height:844},setup:async context=>{
      await noServices(context);await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:()=>Promise.reject(new DOMException('Denied','NotAllowedError'))}}));
    }});const {page}=test;await settings(page,{language:'en',textSize:150,theme:'dark'});
    await page.locator('#help-button').click();await page.locator('[data-help-action=report]').click();await fill(page);
    await page.locator('#support-description').fill('');await page.locator('#support-form [type=submit]').click();
    assert.equal(await page.evaluate(()=>document.activeElement.id),'support-description');
    assert.equal(await page.locator('#support-description').evaluate(n=>{const r=n.getBoundingClientRect(),d=n.closest('dialog').getBoundingClientRect();return r.top>=d.top&&r.top<d.bottom;}),true,'First invalid field scrolls into the modal viewport');
    await page.locator('#support-description').fill('x'.repeat(10000));
    const length=await page.locator('#support-description').inputValue();
    await page.locator('#support-form [type=submit]').click();
    if(length.length>2000){assert.equal(await page.locator('#support-description').getAttribute('aria-invalid'),'true');await page.locator('#support-description').fill('x'.repeat(2000));await page.locator('#support-form [type=submit]').click();}
    await fits(page,'320px dark 150% long preview');await page.locator('[data-help-action=copy]').click();
    await page.waitForFunction(()=>document.getElementById('support-status').textContent.includes('Ctrl+C'));
    await page.locator('[data-help-action=select]').click();assert.ok(await page.locator('#support-preview').evaluate(n=>n.selectionEnd>2000));
    await screenshot(harness,page,'clipboard-denied-320-dark-150');
    receipts.push({case:'clipboard-denied-long-validation-320-dark-150',passed:true,acceptedLength:length.length});await test.done();cases.pop();
  }
  {
    const test=await fresh({offline:true,denied:true,viewport:{width:390,height:844},setup:async context=>{
      await context.addInitScript(()=>Object.defineProperty(navigator,'clipboard',{configurable:true,value:{async writeText(text){window.__qaCopiedReport=text;}}}));
    }});const {page}=test;
    await startGuest(page);const q=roundFor()[0];await choice(page,'solid',q.shape).click();
    const initial=await snapshot(page);await page.locator('#help-button').click();const clock=await page.locator('#time-value').innerText();await page.waitForTimeout(1200);assert.equal(await page.locator('#time-value').innerText(),clock,'Solo clock pauses');
    const report=await preview(page);assert.match(report,/offline/);assert.match(report,new RegExp(q.id));assert.match(report,/R1/);
    await page.locator('[data-help-action=copy]').click();await page.waitForFunction(()=>!!window.__qaCopiedReport);
    assert.equal(await page.evaluate(()=>window.__qaCopiedReport),report);await page.locator('#dialog-close').click();assert.deepEqual(await snapshot(page),initial);
    await page.locator('#r1').click();await page.locator('#hint-button').click();await choice(page,'net',q.shape).click();
    const r2=await snapshot(page);await page.locator('#help-button').click();assert.match(await preview(page),/R2/);await page.locator('#dialog-close').click();assert.deepEqual(await snapshot(page),r2);
    const wrong=await page.locator(`.choice[data-kind=net]:not([data-shape=${q.shape}])`).first().getAttribute('data-shape');await choice(page,'net',wrong).click();await page.locator('#r2').click();
    assert.equal(await page.locator('#correction-panel').isVisible(),true);const review=await snapshot(page);
    await page.locator('#help-button').click();const text=await preview(page);assert.match(text,/R2/);assert.match(text,/Semakan jawapan/);
    await screenshot(harness,page,'offline-review-report-r2');await page.locator('#dialog-close').click();assert.deepEqual(await snapshot(page),review);
    assert.equal(test.requests.length,0,'Standalone help and play make zero HTTP requests offline');receipts.push({case:'offline-storage-denied-copy-solo-R1-R2-review',passed:true});await test.done();cases.pop();
  }
  {
    const test=await fresh({setup:noServices});const {page}=test;await settings(page,{language:'en'});await page.locator('#module-button').click();
    const frame=page.frameLocator('#module-frame');await frame.locator('#module-help').waitFor({state:'visible'});
    assert.equal(await frame.locator('#module-help').innerText(),'Help centre');
    await frame.locator('#learn-labs').click();await frame.locator('#net-mode-editor').click();await frame.locator('#guided-prediction').fill('A sample prediction retained during help.');
    const source=await page.locator('#module-frame').getAttribute('srcdoc');const before=await frame.locator('#guided-prediction').inputValue();
    await frame.locator('#module-help').click();await page.locator('[data-help-view=home]').waitFor({state:'visible'});
    const report=await preview(page);assert.match(report,/Learning module/);assert.match(report,/Question ID: Not applicable/);
    await page.locator('#dialog-close').click();assert.equal(await page.locator('#module-frame').getAttribute('srcdoc'),source);assert.equal(await frame.locator('#guided-prediction').inputValue(),before);
    assert.equal(await frame.locator('#learn-labs').getAttribute('aria-pressed'),'true');
    await screenshot(harness,page,'module-after-help');
    await frame.locator('#module-help').click();await page.locator('[data-help-action=module-guide]').click();
    await page.waitForFunction(()=>!document.getElementById('app-dialog').open);
    assert.equal(await frame.locator('#panduan').evaluate(n=>n===document.activeElement),true);
    assert.equal(await frame.locator('#guided-prediction').inputValue(),before);
    receipts.push({case:'module-iframe-prediction-active-tab-and-existing-guide-preserved',passed:true});await test.done();cases.pop();
  }
  {
    const round=roundFor(),roomId='10000000-0000-4000-8000-000000000041',started=Date.now()-4000,actions=[];
    const test=await fresh({setup:async context=>{
      await context.addInitScript(({key,roomId})=>{if(window===window.top)sessionStorage.setItem(key,JSON.stringify({token:'a'.repeat(64),roomId,pending:null}));},{key:DUEL_SESSION_KEY,roomId});
      await context.route(DUEL_ENDPOINT,async route=>{
        const action=route.request().postDataJSON().action;actions.push(action);assert.equal(action,'state');
        await route.fulfill({json:{ok:true,protocol:2,serverNow:Date.now(),room:{id:roomId,code:'876543',status:'playing',total:10,startsAt:started,deadlineAt:started+900000},currentQuestion:{id:'duel-0',index:0,topic:'properties',copy:Object.fromEntries(['ms','en'].map(language=>{const q=localizeQuestion(round[0],language);return [language,{prompt:q.prompt,lines:q.lines}];}))},me:{id:'me',name:'PRIVATE_DUEL_ALIAS',score:0,answered:0,seq:0,elapsed:0,mistakes:0,skipped:0,hints:0,hintUsed:false,reviewPending:false,stage:'solid',attempts:{solid:null,net:null},answers:[],nextReadyAt:0,finishedAt:null},opponent:{id:'friend',name:'PRIVATE_OPPONENT',score:0,answered:0,finishedAt:null}}});
      });
    }});const {page}=test;await startGuest(page,{mode:'duel'});await page.locator('#game-screen').waitFor({state:'visible'});
    await choice(page,'solid',round[0].shape).click();const before=await snapshot(page);await page.locator('#help-button').click();const clock=await page.locator('#time-value').innerText();
    await page.waitForTimeout(1250);assert.notEqual(await page.locator('#time-value').innerText(),clock,'Duel clock keeps running');
    const report=await preview(page);assert.doesNotMatch(report,/876543|PRIVATE_|aaaaaaaa/);assert.match(report,/Duel/);await page.locator('#dialog-close').click();assert.deepEqual(await snapshot(page),before);
    receipts.push({case:'Duel-clock-and-state-intercepted-transport',passed:true,actions});await test.done();cases.pop();
  }
  {
    const round=roundFor(),id='20000000-0000-4000-8000-000000000041',roomId='30000000-0000-4000-8000-000000000041',actions=[];
    const state={attemptId:'40000000-0000-4000-8000-000000000041',roomId,questions:round.map(q=>q.id),index:0,stage:'net',status:'running',score:0,mistakes:0,hints:1,skipped:0,elapsed:1234,hintUsed:true,lastOutcome:null,wrongReader:null,attempts:{solid:round[0].shape,net:null},answers:[],readyInMs:0};
    const test=await fresh({setup:async context=>{
      await context.addInitScript(id=>{if(window===window.top)localStorage.setItem('geodecoder.cloud.auth',JSON.stringify({access_token:'fixture-access-token',refresh_token:'fixture-refresh-token',token_type:'bearer',expires_at:Math.floor(Date.now()/1000)+3600,expires_in:3600,user:{id,aud:'authenticated',role:'authenticated',email:'private@example.invalid',app_metadata:{provider:'email'},user_metadata:{}}}));},id);
      await context.routeWebSocket('**/*',ws=>ws.close());
      await context.route('https://fkrlwzxvyufndavlpzbp.supabase.co/**',async route=>{
        const req=route.request(),url=new URL(req.url());
        if(req.method()==='OPTIONS'){await route.fulfill({status:204,headers:{'access-control-allow-origin':'*','access-control-allow-headers':'*'}});return;}
        if(url.pathname.endsWith('/geo_module_progress')){await route.fulfill({json:{records:[]}});return;}
        assert.equal(url.pathname,'/rest/v1/rpc/geo_action');const {action,payload}=req.postDataJSON();actions.push(action);
        assert.ok(['snapshot','heartbeat','start_attempt','join_room'].includes(action));
        const room={id:roomId,class_id:'class-fixture',class_name:'PRIVATE_CLASS',name:'Fixture room',status:'playing',is_member:true,members_count:1,players:[],my_attempt:state};
        const data=action==='start_attempt'?{state}:action==='heartbeat'?{}:{profile:{id,role:'student',display_name:'PRIVATE_PUPIL',username:'private_pupil'},server_now:new Date().toISOString(),classes:[{id:'class-fixture',name:'PRIVATE_CLASS',members:[]}],invites:[],rooms:[room],...(payload.room_id?{room}:{})};
        await route.fulfill({headers:{'access-control-allow-origin':'*'},json:data});
      });
    }});const {page}=test;await page.locator('#welcome-account-button').click();await page.locator('[data-portal-action=join-room]').first().click();await page.locator('[data-portal-action=play]').click();await page.locator('#game-screen').waitFor({state:'visible'});
    await page.locator('#hint-button').click();await choice(page,'net',round[0].shape).click();const before=await snapshot(page);
    await page.locator('#help-button').click();const clock=await page.locator('#time-value').innerText();await page.waitForTimeout(1250);assert.notEqual(await page.locator('#time-value').innerText(),clock,'Classroom server estimate keeps running');
    const report=await preview(page);assert.match(report,/Bilik kelas/);assert.match(report,/R2/);assert.doesNotMatch(report,/PRIVATE_|private@|fixture-access|fixture-refresh|654321/);
    await page.locator('#dialog-close').click();assert.deepEqual(await snapshot(page),before);receipts.push({case:'classroom-clock-accepted-R1-hint-selection-intercepted-transport',passed:true,actions});await test.done();cases.pop();
  }
  fs.writeFileSync(path.join(harness.evidence,'browser-results.json'),JSON.stringify({runtime:'Chromium '+harness.browser.version(),date:'2026-10-26',mode:'local browser; intercepted service transports; no hosted writes',cases:receipts},null,2)+'\n');
  console.log('PASS '+receipts.length+' help/report browser scenarios; evidence in docs/help-support-evidence');
}finally{for(const c of cases)await c.context.close();await harness.close();}
