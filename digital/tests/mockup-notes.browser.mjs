import {createRequire} from 'node:module';
import assert from 'node:assert/strict';
import {createMockupReviewFixture} from './mockup-review.fixture.mjs';
const require=createRequire(import.meta.url),{chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const fixture=await createMockupReviewFixture();
const browser=await chromium.launch({headless:true,executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH||chromium.executablePath(),args:['--no-sandbox','--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:900},reducedMotion:'reduce'});
await context.route('**/*',route=>{const url=new URL(route.request().url());return ['localhost','127.0.0.1','[::1]'].includes(url.hostname)||['data:','blob:','about:'].includes(url.protocol)?route.continue():route.abort();});
const errors=[];const page=await context.newPage();page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto(fixture.origin);await page.waitForFunction(()=>window.__mockupQA);await page.evaluate(()=>window.__mockupQA.module());
 const frame=page.frameLocator('#module-frame');await frame.locator('#learn-notes').click();
 for(const shape of ['cube','cuboid','pyramid','cylinder','cone','triangular-prism','tetrahedron','pentagonal-prism','hexagonal-prism','sphere','hemisphere']){
  await frame.locator('#model-picker-panel').evaluate(n=>n.open=true);
  const choice=frame.locator(`.shape-choice[data-shape="${shape}"]`);
  if(await choice.count())await choice.click();else await frame.locator('#extra-shape-select').selectOption(shape);
  const values=await frame.locator('#notes-net-model').evaluate(n=>{const d=n.getContext('2d').getImageData(0,0,n.width,n.height).data;let painted=0;for(let i=3;i<d.length;i+=4)if(d[i])painted++;return {hidden:n.hidden,painted};});
  if(['sphere','hemisphere'].includes(shape)){assert.equal(values.hidden,true);assert.equal(await frame.locator('#notes-net-unavailable').isVisible(),true);}else{assert.equal(values.hidden,false);assert.ok(values.painted>30,shape+' net must be visible');}
  assert.equal(await frame.locator('#notes-model').evaluate(n=>{const d=n.getContext('2d').getImageData(0,0,n.width,n.height).data;return d.some((v,i)=>i%4===3&&v>0)}),true);
  console.log('PASS '+shape+': canonical solid and '+(values.hidden?'truthful no-net caption':values.painted+' drawn net pixels'));
 }
 assert.deepEqual(errors,[]);
 console.log('PASS all11Notes views, correct no-net scope, no page errors');
}finally{await context.close();await browser.close();await fixture.close();}
