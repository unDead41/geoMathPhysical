import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {buildDesignReference} from '../tools/design-reference.mjs';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(import.meta.url);
let chromium;
if(process.env.PLAYWRIGHT_MODULE_PATH)({chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH));
else{
  try{({chromium}=require('playwright'));}
  catch{({chromium}=require('/opt/codex/runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
}
const evidence=path.join(root,'docs/design-system-evidence',process.env.DESIGN_EVIDENCE_RUN||'');
fs.mkdirSync(evidence,{recursive:true});
const built=buildDesignReference();
const results=[];
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage']});

async function fits(page,name){
  const sizes=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth,dialog:[...document.querySelectorAll('dialog[open]')].map(node=>({width:node.clientWidth,scroll:node.scrollWidth,left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right}))}));
  assert.ok(sizes.scroll<=sizes.width,`${name}: document overflow ${JSON.stringify(sizes)}`);
  for(const dialog of sizes.dialog){assert.ok(dialog.scroll<=dialog.width+1,`${name}: dialog inner overflow`);assert.ok(dialog.left>=-1&&dialog.right<=sizes.width+1,`${name}: dialog exceeds viewport`);}
}
async function configure(page,{language='ms',theme='light',contrast='standard',textSize='normal'}={}){
  await page.locator('#ds-language').selectOption(language);
  await page.locator('#ds-theme').selectOption(theme);
  await page.locator('#ds-contrast').selectOption(contrast);
  await page.locator('#ds-text').selectOption(textSize);
}
async function screenshot(page,name){
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:path.join(evidence,name+'.png'),fullPage:true,animations:'disabled'});
}
async function scenario({name,width=1440,height=1000,language='ms',theme='light',contrast='standard',textSize='normal',image,interact=false,reducedMotion='no-preference'}){
  const context=await browser.newContext({viewport:{width,height},reducedMotion});
  const page=await context.newPage();page.setDefaultTimeout(8000);
  const errors=[],networks=[];
  page.on('pageerror',error=>errors.push(error.message));
  page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
  page.on('request',request=>{if(/^https?:/.test(request.url()))networks.push(request.url());});
  await context.addInitScript(()=>{
    window.__referenceStorageCalls=0;
    for(const key of ['localStorage','sessionStorage'])Object.defineProperty(window,key,{configurable:true,get(){window.__referenceStorageCalls++;throw new DOMException('Reference must not access persisted data','SecurityError');}});
  });
  try{
    await page.goto(pathToFileURL(built.path).href);
    await configure(page,{language,theme,contrast,textSize});
    assert.equal(await page.locator('html').getAttribute('lang'),language);
    assert.equal(await page.locator('html').getAttribute('data-theme'),theme);
    assert.equal(await page.locator('html').getAttribute('data-contrast'),contrast);
    assert.equal(await page.locator('html').getAttribute('data-text-size'),textSize);
    assert.deepEqual(await page.locator('[data-copy],[data-copy-aria]').evaluateAll(nodes=>nodes.filter(node=>node.textContent==='undefined'||node.getAttribute('aria-label')==='undefined').map(node=>node.outerHTML)),[],'All visible/ARIA copy resolves');
    await fits(page,name);
    const states=await page.evaluate(()=>{
      const style=selector=>{const node=document.querySelector(selector),s=getComputedStyle(node);return {background:s.backgroundColor,color:s.color,outline:s.outlineWidth,opacity:s.opacity,border:s.borderColor};};
      return {normal:style('.ds-state-grid .button-primary:not([data-preview])'),hover:style('[data-preview="hover"]'),pressed:style('[data-preview="active"]'),focus:style('[data-preview="focus"]'),selected:style('#ds-selected'),error:style('.ds-feedback-list [data-tone="error"]'),info:style('.ds-feedback-list [data-tone="info"]'),toggleFocus:getComputedStyle(document.querySelector('#ds-switch')).outlineWidth};
    });
    assert.notEqual(states.normal.background,states.hover.background,'Hover state has a shared visual treatment');
    assert.notEqual(states.normal.background,states.pressed.background,'Pressed state has a shared visual treatment');
    assert.equal(states.focus.outline,'3px','Focus preview uses the shared ring');
    assert.notEqual(states.error.background,states.info.background,'Error and information feedback are distinct');
    if(image)await screenshot(page,image);

    if(interact){
      // Native label activation and keyboard focus use the shipped DOM, not a fixture.
      await page.locator('label[for="ds-name"]').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'ds-name');
      await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement.id),'ds-topic');
      assert.equal(await page.locator('#ds-topic').evaluate(node=>node.matches(':focus-visible')),true);
      assert.equal(await page.locator('#ds-topic').evaluate(node=>getComputedStyle(node).outlineWidth),'3px');
      await page.locator('#ds-topic').press('Space');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
      assert.equal(await page.locator('#ds-topic').inputValue(),'nets','Opened native select supports keyboard choice');

      await page.locator('#ds-save').click();assert.equal(await page.evaluate(()=>document.activeElement.id),'ds-name');
      assert.equal(await page.locator('#ds-name').getAttribute('aria-invalid'),'true');
      assert.equal(await page.locator('#ds-form-status').getAttribute('data-tone'),'error');
      assert.ok((await page.locator('#ds-name-error').innerText()).length>0);
      await page.locator('#ds-name').fill('Ijamm');
      const before=await page.locator('#ds-save').boundingBox();
      await page.locator('#ds-save').click();
      assert.equal(await page.locator('#ds-save').getAttribute('aria-busy'),'true');
      assert.equal(await page.locator('#ds-save').isDisabled(),true);
      const during=await page.locator('#ds-save').boundingBox();assert.equal(during.width,before.width,'Busy button width is stable');assert.equal(during.height,before.height,'Busy button height is stable');
      await page.waitForFunction(()=>!document.getElementById('ds-save').disabled);
      assert.equal(await page.locator('#ds-form-status').getAttribute('data-tone'),'success');
      assert.equal(await page.locator('#ds-save').getAttribute('aria-busy'),null);

      await page.locator('#ds-selected').click();assert.equal(await page.locator('#ds-selected').getAttribute('aria-pressed'),'false');
      await page.locator('#ds-selected').press('Space');assert.equal(await page.locator('#ds-selected').getAttribute('aria-pressed'),'true');
      await page.locator('#ds-switch').focus();await page.keyboard.press('Space');assert.equal(await page.locator('#ds-switch').isChecked(),false);
      await page.locator('#ds-range').focus();await page.keyboard.press('Home');assert.equal(await page.locator('#ds-range').inputValue(),'0');await page.keyboard.press('End');assert.equal(await page.locator('#ds-range-output').innerText(),'100%');
      await page.locator('#ds-tab-explore').focus();await page.keyboard.press('ArrowRight');assert.equal(await page.evaluate(()=>document.activeElement.id),'ds-tab-notes');assert.equal(await page.locator('#ds-tab-notes').getAttribute('aria-selected'),'true');assert.equal(await page.locator('#ds-panel-notes').isVisible(),true);assert.equal(await page.locator('#ds-panel-explore').isVisible(),false);
      await page.keyboard.press('Home');assert.equal(await page.locator('#ds-tab-explore').getAttribute('aria-selected'),'true');

      await page.locator('#ds-open-dialog').click();
      assert.equal(await page.locator('#ds-dialog').evaluate(node=>node.matches(':modal')),true,'Native dialog is actually modal');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'ds-cancel-dialog');
      assert.equal(await page.evaluate(()=>{document.getElementById('ds-name').focus();return document.getElementById('ds-dialog').contains(document.activeElement);}),true,'Native modal makes background unfocusable');
      // Chromium may expose BODY while Tab visits browser chrome. A native modal
      // must never focus any background page control; the following Tab returns.
      for(let i=0;i<5;i++){await page.keyboard.press('Tab');assert.equal(await page.evaluate(()=>document.activeElement===document.body||document.getElementById('ds-dialog').contains(document.activeElement)),true,'Tab cannot focus background page controls');}
      await page.keyboard.press('Shift+Tab');assert.equal(await page.evaluate(()=>document.getElementById('ds-dialog').contains(document.activeElement)),true);
      await fits(page,name+' modal');
      await page.keyboard.press('Escape');assert.equal(await page.locator('#ds-dialog').isVisible(),false);assert.equal(await page.evaluate(()=>document.activeElement.id),'ds-open-dialog');
      await page.locator('#ds-danger').click();await page.locator('#ds-confirm-dialog').click();assert.equal(await page.locator('#ds-action-status').getAttribute('data-tone'),'success');assert.equal(await page.evaluate(()=>document.activeElement.id),'ds-danger');

      await page.locator('#ds-motion').check();
      assert.equal(await page.locator('.ds-state-grid [aria-busy="true"]').evaluate(node=>getComputedStyle(node,'::after').animationName),'none','Reduced-motion choice removes spinner movement');
      const nameBefore=await page.locator('#ds-name').inputValue();
      await page.locator('#ds-language').focus();await page.locator('#ds-language').selectOption(language==='ms'?'en':'ms');
      assert.equal(await page.evaluate(()=>document.activeElement.id),'ds-language','Language keeps focused control');assert.equal(await page.locator('#ds-name').inputValue(),nameBefore,'Language preserves example input');
      await fits(page,name+' after interaction');
    }
    if(reducedMotion==='reduce')assert.equal(await page.locator('.ds-state-grid [aria-busy="true"]').evaluate(node=>getComputedStyle(node,'::after').animationName),'none','System reduced-motion respected');
    assert.deepEqual(errors,[],'No runtime/console errors');assert.deepEqual(networks,[],'No runtime network');assert.equal(await page.evaluate(()=>window.__referenceStorageCalls),0,'Reference never reads or writes persisted preferences');
    results.push({name,width,height,language,theme,contrast,textSize,reducedMotion,interaction:interact,status:'PASS'});
    console.log('PASS '+name);
  }finally{await context.close();}
}
try{
  await scenario({name:'reference-light-desktop',image:'reference-light-desktop',interact:true});
  await scenario({name:'reference-dark-desktop',language:'en',theme:'dark',image:'reference-dark-desktop',interact:true});
  for(const language of ['ms','en'])for(const theme of ['light','dark'])for(const contrast of ['standard','strong']){
    await scenario({name:`reference-${language}-${theme}-${contrast}-320-150`,width:320,height:780,language,theme,contrast,textSize:'largest',image:language==='en'&&theme==='dark'&&contrast==='strong'?'reference-en-dark-320-150':undefined,interact:contrast==='strong'});
  }
  await scenario({name:'reference-system-reduced-motion',reducedMotion:'reduce'});
  fs.writeFileSync(path.join(evidence,'reference-browser-results.json'),JSON.stringify({browser:'Chromium via Playwright',fileOrigin:true,scenarios:results},null,2)+'\n');
  console.log(`PASS ${results.length} reference browser scenarios; screenshots and report in ${path.relative(root,evidence)}`);
}finally{await browser.close();}
