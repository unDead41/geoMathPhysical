import assert from 'node:assert/strict';
import {startHarness,newCase,startGuest,settings,choice,order,roundFor,fits} from './ease-browser-helpers.mjs';
import {SOLO_KEY} from '../dist/solo-save.mjs';
const harness=await startHarness();
const read=page=>page.evaluate(key=>JSON.parse(localStorage.getItem(key)),SOLO_KEY+'guest');
async function resume(page){await page.locator('#solo-resume-button').click();await page.locator('[data-dialog-action=solo-resume]').click();await page.locator('#game-screen').waitFor({state:'visible'});}
try{
 for(const language of ['ms','en'])for(const mobile of [false,true]){
  const f=await newCase(harness,{hasTouch:mobile,viewport:mobile?{width:390,height:844}:{width:1365,height:980}});const {page}=f;
  try{
   await settings(page,{language});await startGuest(page,{mode:'practice'});
   const round=roundFor('practice'),initial=await order(page);
   await choice(page,'solid',round[0].shape).click();
   await page.reload();await resume(page);assert.deepEqual(await order(page),initial);
   assert.equal(await choice(page,'solid',round[0].shape).getAttribute('aria-pressed'),'true');
   await page.locator('#r1').click();await page.locator('#hint-button').click();const saved=await read(page);
   const next=await f.context.newPage();await page.close();await next.goto(harness.origin);await resume(next);
   assert.equal((await read(next)).state.stage,'net');assert.equal((await read(next)).state.hints,1);assert.equal(await next.locator('#hint-button').getAttribute('aria-expanded'),'true');
   assert.ok((await read(next)).elapsed<saved.elapsed+5000,'Closed time not charged');
   const wrong=round[0].shape==='cube'?'cone':'cube';await choice(next,'net',wrong).click();await next.locator('#r2').click();
   await next.reload();await resume(next);assert.equal((await read(next)).state.status,'review');assert.equal((await read(next)).state.mistakes,1);assert.equal(await next.locator('#continue-button').isDisabled(),true);
   await next.locator('#continue-button').click();assert.equal((await read(next)).state.index,1);assert.equal((await read(next)).state.score,0);
   await next.locator('#skip-button').click();await next.reload();await resume(next);assert.equal((await read(next)).state.skipped,1);
   await fits(next);await next.screenshot({path:harness.evidence+`/solo-${language}-${mobile?'mobile':'desktop'}.png`,fullPage:true});
   await next.close();console.log(`PASS ${language} ${mobile?'mobile':'desktop'}: cold R1/R2/hint/wrong/skip recovery and review lock`);
  }finally{await f.done();}
 }
 for(const opts of [{offline:true},{denied:true}]){
  const f=await newCase(harness,opts);try{await startGuest(f.page);if(opts.offline){await f.page.reload();await resume(f.page);assert.equal((await read(f.page)).state.index,0);}else assert.match(await f.page.locator('#solo-save-status').innerText(),/belum dapat disimpan/);console.log('PASS '+JSON.stringify(opts));}finally{await f.done();}
 }
 const f=await newCase(harness);try{await f.page.evaluate(key=>localStorage.setItem(key,'{bad'),SOLO_KEY+'guest');await f.page.reload();await f.page.locator('#solo-resume-button').click();assert.match(await f.page.locator('#dialog-content').innerText(),/rosak/);await f.page.locator('[data-dialog-action=solo-new]').click();await f.page.locator('[data-dialog-action=solo-back]').click();assert.equal(await f.page.evaluate(key=>localStorage.getItem(key),SOLO_KEY+'guest'),'{bad');console.log('PASS damaged data and cancel discard');}finally{await f.done();}
}finally{await harness.close();}
