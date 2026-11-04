import assert from 'node:assert/strict';
import {createServer} from 'node:http';
import {createRequire} from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {Game,SHAPES} from '../dist/core.mjs';
import {QUESTIONS} from '../dist/questions.mjs';
import {localizeQuestion} from '../dist/i18n.mjs';
import {formatRichText} from '../dist/format.mjs';

export const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
export const scoreKey='geodecoder.digital.single-attempt.v1.scores';
export const player={name:'Ease QA',category:'Tetamu',className:''};
export const rng=()=>.41;
export const roundFor=(mode='quiz',questionIds)=>new Game(QUESTIONS,player,0,rng,{mode,questionIds}).round;
export const choice=(page,kind,shape)=>page.locator(`.choice[data-kind="${kind}"][data-shape="${shape}"]`);
export const order=page=>page.locator('.choice').evaluateAll(nodes=>nodes.map(n=>[n.dataset.kind,n.dataset.shape,n.querySelector('.shape-art').dataset.tone]));
export const rawScores=page=>page.evaluate(key=>localStorage.getItem(key),scoreKey);
const touchSessions=new WeakMap();

export async function startHarness(){
  const mime={'.html':'text/html','.js':'text/javascript','.mjs':'text/javascript','.css':'text/css','.mp3':'audio/mpeg'};
  const server=createServer((request,response)=>{
    const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname);
    const file=path.resolve(root,'dist','.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
    if(!file.startsWith(path.join(root,'dist')+path.sep)){response.writeHead(403).end();return;}
    fs.readFile(file,(error,data)=>{if(error){response.writeHead(404).end();return;}response.writeHead(200,{'Content-Type':mime[path.extname(file)]||'application/octet-stream'});response.end(data);});
  });
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const require=createRequire(import.meta.url);
  let chromium;
  if(process.env.PLAYWRIGHT_MODULE_PATH)({chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH));
  else{
    try{({chromium}=require('playwright'));}
    catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
  }
  process.env.TMPDIR||='/dev/shm/geodecoder-richtext-qa';fs.mkdirSync(process.env.TMPDIR,{recursive:true});
  let browser;
  try{browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||(fs.existsSync('/tmp/chromium')&&fs.statSync('/tmp/chromium').size?'/tmp/chromium':chromium.executablePath()),args:['--no-sandbox','--disable-dev-shm-usage']});}
  catch(error){await new Promise(resolve=>server.close(resolve));throw error;}
  const evidence=process.env.EASE_EVIDENCE_DIR||path.join(root,'docs/ease-evidence',process.env.EASE_EVIDENCE_RUN||new Date().toISOString().replace(/[:.]/g,'-'));
  fs.mkdirSync(evidence,{recursive:true});
  const origin=`http://127.0.0.1:${server.address().port}/`;
  return {browser,evidence,origin,async close(){await browser.close();await new Promise(resolve=>server.close(resolve));}};
}

export async function newCase(harness,{offline=false,denied=false,viewport={width:1365,height:980},hasTouch=false,setup}={}){
  const context=await harness.browser.newContext({viewport,hasTouch,colorScheme:'light'});
  const errors=[],requests=[];
  await context.addInitScript(()=>{Math.random=()=>.41;});
  if(denied)await context.addInitScript(()=>{Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Denied','SecurityError');}});});
  if(setup)await setup(context);
  if(offline)await context.setOffline(true);
  const page=await context.newPage();
  page.setDefaultTimeout(10000);
  page.on('pageerror',error=>errors.push(error.message));
  page.on('request',request=>{if(/^https?:/.test(request.url()))requests.push(request.url());});
  try{await page.goto(offline?pathToFileURL(path.join(root,'artifacts/GeoDecoder_Digital_V2.html')).href:harness.origin);}
  catch(error){await context.close();throw error;}
  return {context,page,errors,requests,async done(){assert.deepEqual(errors,[],'No browser runtime errors');await context.close();}};
}

export async function settings(page,{language,theme,textSize}={},keepOpen=false){
  if(!await page.locator('#settings-panel').isVisible())await page.locator('#settings-button').click();
  if(language!==undefined)await page.locator('#language-select').selectOption(language);
  if(theme!==undefined)await page.locator('#theme-select').selectOption(theme);
  if(textSize!==undefined)await page.locator('#text-size-select').selectOption(String(textSize));
  if(!keepOpen){
    await page.locator('#dialog-close').click();
    // Normal scenarios wait for owned dialog cleanup. The separate dialog-race
    // case deliberately reopens before the native close event is dispatched.
    await page.locator('#settings-home #settings-panel').waitFor({state:'attached'});
  }
}

export async function selectMode(page,mode){
  const radio=page.locator(`input[name="game-mode-option"][value="${mode}"]`);
  if(await page.evaluate(()=>navigator.maxTouchPoints>0))await radio.tap();else await radio.check();
  assert.equal(await page.locator('#play-mode').inputValue(),mode,'Visible radio cards update the existing game-mode owner');
}

export async function finishEntryGuide(page,{complete=false}={}){
  if(!await page.locator('#guide-screen').isVisible())return;
  assert.equal(await page.locator('[data-guide-step]').count(),3);
  if(complete){
    for(const step of [1,2,3])assert.equal(await page.locator(`[data-guide-step="${step}"]`).isVisible(),true);
    await page.locator('#entry-demo-position').press('End');
    assert.equal(await page.locator('.guide-step-active[data-guide-step="3"]').count(),1);
    assert.equal(await page.locator('#entry-demo-time').textContent(),'00:24 / 00:24');
  }
  await page.locator('#guide-start-button').click();
}

export async function startGuest(page,{name=player.name,mode='quiz',tutorial='skip'}={}){
  await page.locator('#guest-button').click();
  await page.locator('#player-name').fill(name);
  await selectMode(page,mode);
  await page.locator('#player-form [type="submit"]').click();
  await finishEntryGuide(page,{complete:tutorial==='complete'});
  await page.locator('#game-screen').waitFor({state:'visible'});
}

// The engine computes the expected round. The real DOM clue proves the displayed
// question's stable ID; the test never exposes or mutates the app's Game instance.
export async function assertQuestion(page,q,index,total){
  const language=await page.locator('html').getAttribute('lang');
  const expected=formatRichText(localizeQuestion(q,language).hint,language);
  const text=await page.evaluate(html=>{const element=document.createElement('div');element.innerHTML=html;return element.textContent;},expected);
  assert.equal(await page.locator('#hint-text').textContent(),text,`Displayed question must be ${q.id}`);
  assert.match(await page.locator('#question-counter').innerText(),new RegExp(String(index+1).padStart(2,'0')+' / '+total));
}

export async function answer(page,q,index,total,{outcome='correct',hint=false,input='click',beforeScan,afterSolid}={}){
  await assertQuestion(page,q,index,total);
  if(hint)await page.locator('#hint-button').click();
  const wrong=SHAPES.find(shape=>shape!==q.shape);
  const act=async locator=>{
    if(input==='keyboard'){await locator.focus();await page.keyboard.press('Enter');}
    else if(input==='touch')await locator.tap();
    else await locator.click();
  };
  if(outcome==='skipped')await page.locator('#skip-button').click();
  else{
    await act(choice(page,'solid',outcome==='wrongR1'?wrong:q.shape));
    if(beforeScan)await beforeScan();
    await act(page.locator('#r1'));
    if(outcome!=='wrongR1'){
      assert.equal(await page.locator('#r1').isDisabled(),true,'Accepted R1 stays locked');
      assert.match(await page.locator('#step-progress').innerText(),/2.*2/);
      if(afterSolid)await afterSolid();
      await act(choice(page,'net',outcome==='wrongR2'?wrong:q.shape));
      await act(page.locator('#r2'));
    }
  }
  if(outcome!=='correct'){
    assert.equal(await page.locator('.choice:not([disabled])').count(),0,'An error/skip ends the one attempt');
    await page.locator('#continue-button').waitFor({state:'visible'});
    await page.waitForFunction(()=>!document.querySelector('#continue-button').disabled);
    await page.locator('#continue-button').click();
  }
  if(index===total-1)await page.locator('#result-screen').waitFor({state:'visible'});
  else await page.waitForFunction(number=>document.querySelector('#question-counter').textContent.includes(String(number).padStart(2,'0')+' /'),index+2);
}

export async function fits(page,label,{math=false}={}){
  const geometry=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,dialog:document.querySelector('dialog[open]')?{width:document.querySelector('dialog[open]').clientWidth,scroll:document.querySelector('dialog[open]').scrollWidth}:null}));
  assert.ok(geometry.scroll<=geometry.width,`${label}: document overflow ${JSON.stringify(geometry)}`);
  if(geometry.dialog)assert.ok(geometry.dialog.scroll<=geometry.dialog.width+1,`${label}: dialog overflow ${JSON.stringify(geometry)}`);
  if(math)assert.deepEqual(await page.locator('#question-detail math,#hint-text math').evaluateAll(nodes=>nodes.filter(el=>{
    if(!el.checkVisibility())return false;
    const r=el.getBoundingClientRect(),parent=el.closest('p').getBoundingClientRect();
    return r.width<1||r.left<parent.left-1||r.right>parent.right+1;
  }).map(el=>el.textContent)),[],`${label}: formula clipped`);
}

export async function screenshot(harness,page,name,{fullPage=true}={}){
  const file=path.join(harness.evidence,name+'.png');
  assert.equal(fs.existsSync(file),false,`Do not overwrite evidence: ${file}`);
  const touchPoints=await page.evaluate(()=>navigator.maxTouchPoints);
  await page.screenshot({animations:'disabled',path:file,fullPage});
  // Minimal Chromium can clear touch emulation while restoring the temporary
  // full-page capture viewport. Restore the test device, never app state.
  if(touchPoints>0){
    let session=touchSessions.get(page);
    if(!session){session=await page.context().newCDPSession(page);touchSessions.set(page,session);}
    await session.send('Emulation.setTouchEmulationEnabled',{enabled:true,maxTouchPoints:touchPoints});
    assert.equal(await page.evaluate(()=>navigator.maxTouchPoints),touchPoints,'Screenshot must preserve the emulated touch device');
  }
  console.log('EVIDENCE '+path.relative(root,file));
}
