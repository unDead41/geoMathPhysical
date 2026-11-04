// Visual evidence collector, not an automatic visual-match assertion.
// All screenshots use the actual app and module UI. Auth/data are local fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {createMockupReviewFixture} from './mockup-review.fixture.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const arg=name=>{const i=process.argv.indexOf('--'+name);return i<0?null:process.argv[i+1];};
const profile=arg('profile')||'desktop';
assert.ok(['desktop','mobile'].includes(profile),'--profile desktop or mobile');
const mobile=profile==='mobile';
const moduleMode=arg('module')||'source';assert.ok(['source','vendored'].includes(moduleMode),'--module source or vendored');
if((arg('label')||'').startsWith('final')&&process.env.MOCKUP_REVIEW_MODULE_CSS)throw Error('Final captures require actual product styles with no QA CSS injection');
const requested=(arg('screens')||(mobile?'01,05,12,14,17,22,25,27,29,34,37,39,40':Array.from({length:40},(_,i)=>i+1).join(','))).split(',').map(Number);
assert.ok(requested.every(n=>Number.isInteger(n)&&n>=1&&n<=40),'screens must be 01–40');
const out=path.resolve(arg('out')||path.join(root,'artifacts/mockup-review',profile));fs.mkdirSync(out,{recursive:true});
const names=['home','choose-mode','resume','guide','quiz-r1','quiz-r2','correction','solo-results','scoreboard','duel-entry','duel-lobby','duel-play','duel-results','login','registration','recovery','teacher-overview','class-workspace','teacher-live-room','teacher-results','student-overview','student-waiting-room','profile','security','explore','orthographic-views','notes','calculator','net-studio','volume-lab','surface-workshop','composite','lab-hub','projection-studio','calculation-workshop','records','settings-light','settings-dark','help','support-report'];
const exceptions={4:'Canonical finite 4.8-second tutorial; Tab/Enter/Space keyboard flow.',9:'Device-only solo quiz scores; no Duel or class mixing.',16:'Synthetic verified recovery session; never an unverified reset form.',17:'Overview of existing classes; workspace opened by genuine anchor.',18:'Same real class dashboard as 17, reached by the Buka kelas anchor.',20:'Synthetic SQL display results; not evidence that learners achieved these scores; unsupported CSV omitted.',22:'Real waiting state, start action correctly unavailable until server permits.',26:'Active orthographic viewport is canonical 2D, not the raster perspective cube.',28:'Canonical dimension diagram follows actual measurements.',29:'Real cube-net editor selected through existing UI. Canonical preview/folding rules and gallery/studio alternatives preserved.',30:'Real unit-cube mode selected through existing UI; all volume modes remain available.',34:'Canonical Method 1 board arrangement and all project rules preserved.',36:'Synthetic reflection records, not mastery/TP/XP/streaks.',40:'Local report preview/copy/select/download; no automatic submission.'};
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const fixture=await createMockupReviewFixture({useVendoredModule:moduleMode==='vendored'});
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage','--enable-webgl','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader']});
const records=[],failures=[],blocked=[],allErrors=[];
const viewport=mobile?{width:390,height:844}:{width:1440,height:900};
const qa=(page,method,...args)=>page.evaluate(({method,args})=>window.__mockupQA[method](...args),{method,args});
async function newPage(){
  const context=await browser.newContext({viewport,reducedMotion:'reduce',hasTouch:mobile,colorScheme:mobile?'dark':'light',locale:mobile?'en-GB':'ms-MY'});
  await context.route('**/*',route=>{const url=new URL(route.request().url());if(['127.0.0.1','localhost','[::1]'].includes(url.hostname)||['data:','blob:','about:'].includes(url.protocol))return route.continue();blocked.push({host:url.hostname,path:url.pathname});return route.abort();});
  await context.addInitScript(({mobile})=>{if(window!==window.top)return;let seed=8354;Math.random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;};localStorage.setItem('geodecoder.digital.preferences.v1',JSON.stringify({tutorialSeen:true,music:false,effects:false,motion:'reduce',autoRotate:false,text:mobile?'largest':'normal'}));localStorage.setItem('geodecoder.digital.language',mobile?'en':'ms');localStorage.setItem('geodecoder.theme.v1',mobile?'dark':'light');},{mobile});
  const page=await context.newPage();page.setDefaultTimeout(12000);const errors=[];page.on('pageerror',error=>errors.push(error.stack||error.message));
  await page.goto(fixture.origin);
  try{await page.waitForFunction(()=>Boolean(window.__mockupQA),null,{timeout:30000});}
  catch(error){await page.screenshot({path:path.join(out,'fixture-start-FAILED.png'),fullPage:true}).catch(()=>{});fs.writeFileSync(path.join(out,'fixture-start-FAILED.bundle.js'),await page.evaluate(()=>fetch('/app.bundle.js').then(r=>r.text())));throw Error('App initialization did not reach the QA hook: '+(errors.join('; ')||error.message));}
  return {context,page,errors};
}
async function begin(page,mode='quiz',name='QA Player'){
  await qa(page,'guest');await page.locator('#player-name').fill(name);await page.locator(`input[name="game-mode-option"][value="${mode}"]`).check();await page.locator('.start-button').click();await page.locator(mode==='duel'?'#duel-screen':'#game-screen').waitFor({state:'visible'});
}
async function pick(page,kind,shape,target){await page.locator(`.choice[data-kind="${kind}"][data-shape="${shape}"]`).press('Enter');await page.locator('#'+target).press('Enter');}
async function formulaCheck(page){
  const wrappers=page.locator('.formula-scroll'),keyboard=[];
  for(let i=0;i<await wrappers.count();i++){
    const wrapper=wrappers.nth(i),before=await wrapper.evaluate(node=>({width:node.clientWidth,scrollWidth:node.scrollWidth,scrollLeft:node.scrollLeft}));
    if(before.scrollWidth>before.width+1){await wrapper.focus();await wrapper.press('End');await wrapper.press('ArrowRight');await page.waitForTimeout(180);const after=await wrapper.evaluate(node=>node.scrollLeft);assert.ok(after>0,'long formula remains keyboard-scrollable');keyboard.push({index:i,...before,afterKeyboard:after});await wrapper.evaluate(node=>{node.scrollLeft=0;});}
  }
  return {keyboard,bounds:await page.evaluate(()=>Object.fromEntries(['.question-panel','.question-content','#question-detail','.formula-line','.formula-scroll','math'].map(selector=>[selector,[...document.querySelectorAll(selector)].map(node=>{const r=node.getBoundingClientRect(),style=getComputedStyle(node);return {width:r.width,left:r.left,right:r.right,clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,overflowX:style.overflowX,fontSize:style.fontSize};})])))};
}
async function openModule(page){await qa(page,'module');await page.locator('#module-frame').waitFor({state:'visible'});const frame=page.frameLocator('#module-frame');await frame.locator('#learn-explore').waitFor();return frame;}
async function duelPair(page,{ready=false}={}){
  await begin(page,'duel','QA Host');await page.locator('#duel-create').click();await page.locator('#duel-room').waitFor({state:'visible'});
  const host=await page.evaluate(()=>({session:window.__mockupQA.duelClient.session,snapshot:window.__mockupQA.duelClient.snapshot}));
  const token=createHash('sha256').update(host.snapshot.room.id+'|qa-opponent').digest('hex'),request=async body=>(await fetch(fixture.origin+'/api/duel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({protocol:2,...body})})).json();
  let opponent=await request({action:'join',token,name:'QA Opponent',code:host.snapshot.room.code});assert.equal(opponent.ok,true,'opponent join: '+opponent.error);
  await page.evaluate(()=>window.__mockupQA.duelClient.refresh());
  if(ready){await page.locator('#duel-ready').click();opponent=await request({action:'ready',token,roomId:opponent.room.id,seq:opponent.me.seq+1});assert.equal(opponent.ok,true,'opponent ready: '+opponent.error);await page.evaluate(()=>window.__mockupQA.duelClient.refresh());await page.locator('#game-screen').waitFor({state:'visible',timeout:15000});}
  return {hostToken:host.session.token,token,roomId:opponent.room.id,request};
}
async function finishDuel(pair,page){
  // Feed real protocol-2 actions to the disposable server, honoring readiness times.
  await page.evaluate(()=>window.__mockupQA.duelClient.stopPolling());
  for(let index=0;index<10;index++){
    const {rows:[q]}=await fixture.duelDb.query('select q.shape from geodecoder_duel.rooms r join geodecoder_duel.questions q on q.id=r.question_ids[$1] where r.id=$2',[index+1,pair.roomId]);
    let host=await pair.request({action:'state',token:pair.hostToken,roomId:pair.roomId});
    host=await pair.request({action:'scan',token:pair.hostToken,roomId:pair.roomId,seq:host.me.seq+1,questionIndex:index,kind:'solid',shape:q.shape,target:'r1'});assert.equal(host.actionResult?.type,'solid','host solid '+index+': '+host.error);
    host=await pair.request({action:'scan',token:pair.hostToken,roomId:pair.roomId,seq:host.me.seq+1,questionIndex:index,kind:'net',shape:q.shape,target:'r2'});assert.equal(host.actionResult?.type,'correct','host net '+index+': '+host.error);
    let guest=await pair.request({action:'state',token:pair.token,roomId:pair.roomId});
    guest=await pair.request({action:'skip',token:pair.token,roomId:pair.roomId,seq:guest.me.seq+1,questionIndex:index});assert.equal(guest.ok,true,'opponent skip '+index+': '+guest.error);
    const delay=Math.max(host.me.nextReadyAt||0,guest.me.nextReadyAt||0)-Date.now()+30;if(delay>0)await new Promise(resolve=>setTimeout(resolve,Math.min(delay,2000)));
    // Every settled answer is durable until acknowledged, including correct ones.
    for(const token of [pair.hostToken,pair.token]){const settled=await pair.request({action:'state',token,roomId:pair.roomId});if(settled.me.reviewPending){const ack=await pair.request({action:'advance',token,roomId:pair.roomId,seq:settled.me.seq+1,questionIndex:index});assert.equal(ack.ok,true,'advance '+index+': '+ack.error);}}
  }
  await page.evaluate(()=>window.__mockupQA.duelClient.refresh());await page.locator('#result-screen').waitFor({state:'visible'});
}
async function setup(n,page){
  if(n===1)return;
  if(n===2){await qa(page,'guest');return;}
  if(n===3){await begin(page);await qa(page,'home');await qa(page,'navigate','resume');await page.locator('#resume-screen').waitFor({state:'visible'});return;}
  if(n===4){await qa(page,'guide');return;}
  if(n>=5&&n<=9){
    await begin(page,n===6?'practice':'quiz');
    if(n===6){const shape=await page.evaluate(()=>window.__mockupQA.state.question.shape);await pick(page,'solid',shape,'r1');await page.locator('#hint-button').click();}
    if(n===7){const shape=await page.evaluate(()=>window.__mockupQA.state.question.shape);await pick(page,'solid',shape,'r1');await pick(page,'net',shape==='cube'?'cone':'cube','r2');await page.locator('#correction-panel').waitFor({state:'visible'});await page.waitForTimeout(1850);}
    if(n===8||n===9){await qa(page,'finishSolo',{wrongIndices:[2,6,8]});await page.locator('#result-screen').waitFor({state:'visible'});if(n===9){for(let i=2;i<=5;i++){await begin(page,'quiz','QA Player '+i);await qa(page,'finishSolo',{wrongIndices:Array.from({length:i-1},(_,j)=>j)});}await qa(page,'scores');}}
    return mobile&&n===6?{formula:await formulaCheck(page)}:undefined;
  }
  if(n===10){await begin(page,'duel');return;}
  if(n===11){await duelPair(page);return;}
  if(n===12){await duelPair(page,{ready:true});return;}
  if(n===13){const pair=await duelPair(page,{ready:true});await finishDuel(pair,page);return;}
  if(n>=14&&n<=16){await qa(page,'actor',n===16?'student':null,n===16?{recovery:true}:{});await qa(page,'accounts');await page.locator('#portal-auth-title').waitFor({state:'visible'});if(n===15)await page.locator('.portal-auth-modes [data-mode="signup"]').click();return;}
  if(n>=17&&n<=24){
    await qa(page,'actor',[21,22,23,24].includes(n)?'student':'teacher');
    if(n===19||n===20||n===22)await qa(page,'accounts',fixture.seed[n===19?'liveRoomId':n===20?'closedRoomId':'openRoomId']);
    else await qa(page,'accounts',null,n===23?{profile:true}:n===24?{security:true}:{});
    if(n===17||n===18)await page.locator(`.portal-class-choice[data-id="${fixture.seed.classId}"]`).click();
    if(n===18){await page.locator('.portal-class-overview a[href="#portal-class-workspace"]').click();await page.locator('#portal-class-workspace').waitFor({state:'visible'});}
    return;
  }
  if(n>=25&&n<=36){
    if(n===36)await qa(page,'seedReflections');
    const frame=await openModule(page);
    if(n===26)await frame.locator('#mode-views').click();
    if(n===27)await frame.locator('#learn-notes').click();
    if(n===28)await frame.locator('#learn-measures').click();
    if(n>=29&&n<=33){await frame.locator('#learn-labs').click();if(n<=32)await frame.locator('#lab-'+['net','volume','area','composite'][n-29]).click();if(n===29){const modes=frame.locator('.lab-mode-options');if(await modes.getAttribute('open')===null)await modes.locator('summary').click();await frame.locator('#net-mode-editor').click();if(await modes.getAttribute('open')!==null)await modes.locator('summary').click();}if(n===30)await frame.locator('#volume-kind').selectOption('unit');}
    if(n===34)await frame.locator('#learn-projection').click();
    if(n===35)await frame.locator('#learn-calculation').click();
    if(n===36){await frame.locator('.progress-summary > summary').click();await frame.locator('.progress-summary').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));}
    else await page.frames().find(item=>item.parentFrame()===page.mainFrame()).evaluate(()=>scrollTo({top:0,behavior:'instant'}));
    return;
  }
  if(n===37||n===38){await qa(page,'theme',n===38?'dark':mobile?'dark':'light');await qa(page,'settings');await page.locator('#settings-panel').waitFor({state:'visible'});return;}
  await qa(page,'help');
  if(n===40){await page.locator('[data-help-action="report"]').first().click();await page.locator('#support-category').selectOption('other');await page.locator('#support-description').fill('QA synthetic report: the geometry model remains visible while using the controls.');await page.locator('#support-steps').fill('QA fixture: open the learning module, choose a model, then use the camera buttons.');await page.locator('#support-expected').fill('QA fixture: the model should respond to the selected control.');await page.locator('#support-actual').fill('QA fixture: record the observed result here. No real incident or automatic submission.');await page.locator('#support-form [type="submit"]').click();await page.locator('#support-preview').waitFor({state:'visible'});}
}

let fatal;
try{
  for(const n of requested){
    const {context,page,errors}=await newPage();const prefix=String(n).padStart(2,'0')+'-'+names[n-1];
    try{
      const workflowChecks=await setup(n,page)||{};await page.waitForTimeout(n>=25&&n<=36?650:150);
      if(n!==18)await page.evaluate(()=>scrollTo({top:0,behavior:'instant'}));
      await page.evaluate(()=>document.activeElement?.blur());
      await page.screenshot({path:path.join(out,prefix+'.png'),fullPage:false,animations:'disabled',timeout:45000});
      await page.screenshot({path:path.join(out,prefix+'-full.png'),fullPage:true,animations:'disabled',timeout:45000});
      const metrics=await page.evaluate(()=>({viewport:{width:innerWidth,height:innerHeight},document:{width:document.documentElement.scrollWidth,height:document.documentElement.scrollHeight},scroll:{x:scrollX,y:scrollY},language:document.documentElement.lang,theme:document.documentElement.dataset.theme,textSize:document.documentElement.dataset.textSize,typography:{root:getComputedStyle(document.documentElement).fontSize,body:getComputedStyle(document.body).fontSize,scale:getComputedStyle(document.documentElement).getPropertyValue('--text-scale'),stageInstruction:getComputedStyle(document.getElementById('stage-instruction')).fontSize},title:document.title,actualScreen:window.__mockupQA.state.screen,syntheticLabel:window.__mockupQA.label,regions:Object.fromEntries(['#solid-choices','#net-choices','#game-status','#settings-panel','#support-preview'].map(selector=>{const node=document.querySelector(selector),rect=node?.getBoundingClientRect();return [selector,rect&&rect.height?{top:rect.top,bottom:rect.bottom,left:rect.left,right:rect.right,width:rect.width,height:rect.height}:null];}))}));
      let moduleMetrics=null;
      if(n>=25&&n<=36){const embedded=page.frames().find(frame=>frame.parentFrame()===page.mainFrame());moduleMetrics=await embedded.evaluate(()=>({width:innerWidth,scrollWidth:document.documentElement.scrollWidth,height:innerHeight,scrollHeight:document.documentElement.scrollHeight,scrollY,language:document.documentElement.lang,theme:document.documentElement.dataset.theme,headings:[...document.querySelectorAll('h1,h2,h3')].filter(node=>node.getBoundingClientRect().height&&getComputedStyle(node).visibility!=='hidden').map(node=>node.textContent.trim()).slice(0,12),regions:Object.fromEntries(['#projection-sheet','#projection-grid-plan','#projection-grid-front','#projection-grid-right','.projection-sheet-scroll','#labs-canvas','#net-grid'].map(selector=>{const node=document.querySelector(selector),r=node?.getBoundingClientRect();return [selector,r&&r.height?{top:r.top,bottom:r.bottom,left:r.left,right:r.right,width:r.width,height:r.height,clientWidth:node.clientWidth,scrollWidth:node.scrollWidth,clientHeight:node.clientHeight,scrollHeight:node.scrollHeight}:null];}))}));}
      const supplemental=[];
      // Narrow, enlarged-text module navigation occupies the first iframe view.
      // Preserve that real entry image and additionally capture actual scrolled
      // activity/model views; no DOM, style, font or layout alteration is used.
      const mobileModuleTargets={25:['#explore-panel','#model-canvas'],27:['#study-panel','#notes-net-model'],29:['#labs-workspace','#labs-canvas'],34:['#projection-panel','#projection-sheet']};
      if(mobile&&mobileModuleTargets[n]){const embedded=page.frames().find(frame=>frame.parentFrame()===page.mainFrame());for(const [index,selector] of mobileModuleTargets[n].entries()){await embedded.locator(selector).evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));await page.locator('#module-frame').evaluate(node=>node.scrollIntoView({block:'start',behavior:'instant'}));await embedded.evaluate(()=>document.activeElement?.blur());await page.waitForTimeout(120);const file=prefix+(index?'-model':'-content')+'.png';await page.screenshot({path:path.join(out,file),fullPage:false,animations:'disabled'});supplemental.push({file,kind:index?'scrolled-model':'scrolled-content',selector,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex'),parentScroll:await page.evaluate(()=>({x:scrollX,y:scrollY})),moduleScroll:await embedded.evaluate(()=>({x:scrollX,y:scrollY}))});}}
      if(mobile&&[37,39,40].includes(n)){const dialog=page.locator('#app-dialog');const scroll=await dialog.evaluate(node=>{node.scrollTo({top:node.scrollHeight,behavior:'instant'});return {top:node.scrollTop,height:node.clientHeight,scrollHeight:node.scrollHeight};});await page.waitForTimeout(120);const file=prefix+'-bottom.png';await page.screenshot({path:path.join(out,file),fullPage:false,animations:'disabled'});supplemental.push({file,kind:'scrolled-dialog-bottom',selector:'#app-dialog',scroll,sha256:createHash('sha256').update(fs.readFileSync(path.join(out,file))).digest('hex')});}
      const item={screen:n,name:names[n-1],file:prefix+'.png',fullFile:prefix+'-full.png',sha256:createHash('sha256').update(fs.readFileSync(path.join(out,prefix+'.png'))).digest('hex'),...metrics,moduleMetrics,supplemental,workflowChecks,errors,exception:exceptions[n]||'',workflow:'captured',visualMatch:'PENDING HUMAN IMAGE REVIEW'};records.push(item);allErrors.push(...errors.map(error=>({screen:n,error})));
      console.log('CAPTURE '+String(n).padStart(2,'0')+' '+names[n-1]+' '+(metrics.document.width<=viewport.width+1?'fits':'HORIZONTAL OVERFLOW')+(errors.length?' PAGE ERRORS':''));
    }catch(error){const failure={screen:n,name:names[n-1],error:error.message,errors};failures.push(failure);await page.screenshot({path:path.join(out,prefix+'-FAILED.png'),fullPage:true}).catch(()=>{});console.error('FAILED '+n+': '+error.message.split('\n')[0]);}
    finally{await context.close();}
  }
}catch(error){fatal=error;}
finally{
  await browser.close();await fixture.close();
  const git=execFileSync('git',['rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim(),status=execFileSync('git',['status','--short'],{cwd:root,encoding:'utf8'}).trim();
  const report={label:arg('label')||'working-source',capturedAt:new Date().toISOString(),sourceCommit:git,sourceStatus:status,sourceEvidence:fixture.sourceEvidence,conceptCommit:'4d83561667cf74fbe5cd6144ce5e3e7f660a75cd',injectedModuleCss:process.env.MOCKUP_REVIEW_MODULE_CSS||null,environment:'Local real app/module/controllers, real PGlite classroom gateway + protocol 2 Duel handler, synthetic Auth and labelled synthetic records. No production requests.',profile,viewport,requested,records,failures,fatalFailure:fatal?.message||null,blockedExternalRequests:blocked,pageErrors:allErrors,visualStatus:'PENDING: functional capture is not visual acceptance'};
  fs.writeFileSync(path.join(out,'capture-manifest.json'),JSON.stringify(report,null,2)+'\n');
  fs.writeFileSync(path.join(out,'REVIEW.md'),`# ${profile} visual review\n\n${report.environment}\n\nSource: ${git}; label: ${report.label}. Every row still needs actual image comparison with the approved board. Capture success is not visual-match evidence.\n\n| Screen | Current image | Full content | Comparison | Contract exception |\n|---|---|---|---|---|\n`+records.map(r=>`| ${String(r.screen).padStart(2,'0')} ${r.name} | [viewport](${r.file}) | [full](${r.fullFile}) | PENDING | ${r.exception} |`).join('\n')+'\n\n'+failures.map(f=>`FAILED ${f.screen}: ${f.error}\n`).join('\n'));
}
if(fatal)throw fatal;if(failures.length||allErrors.length)process.exitCode=1;
