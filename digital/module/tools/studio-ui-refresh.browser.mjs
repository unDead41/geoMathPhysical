// Run after npm run build. Playwright is a development-only dependency of the runner.
// GEOMATH_CHROMIUM can point at an existing local Chromium; no remote account is used.
import {chromium} from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {prepareModuleFrame} from '../../dist/module-frame.mjs';
const digital=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const evidence=path.join(digital,'docs/handoffs/digitalized-module-studio-ui-refresh/evidence');fs.mkdirSync(evidence,{recursive:true});
let screenshotDocument='';
const server=http.createServer((req,res)=>{try{if(req.url==='/__module_capture.html'){res.writeHead(200,{'Content-Type':'text/html'});res.end(screenshotDocument);return;}const file=path.resolve(digital,'.'+decodeURIComponent(req.url.split('?')[0]));if(!file.startsWith(digital+'/'))throw Error('Invalid path');const type=file.endsWith('.html')?'text/html':file.endsWith('.mjs')?'text/javascript':file.endsWith('.css')?'text/css':'application/octet-stream';res.writeHead(200,{'Content-Type':type});res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const browser=await chromium.launch({headless:true,...(process.env.GEOMATH_CHROMIUM?{executablePath:process.env.GEOMATH_CHROMIUM}:{}),args:['--no-sandbox','--disable-dev-shm-usage','--disable-gpu']});
const page=await browser.newPage({viewport:{width:1500,height:1150},reducedMotion:'reduce'}),errors=[],results={matrix:[],flows:[]};page.on('pageerror',e=>errors.push(e.message));page.on('requestfailed',r=>errors.push(r.url()+': '+r.failure()?.errorText));
async function capture(selector,name){
 if(process.env.GEOMATH_SKIP_CAPTURE)return;
 console.log('Capture',name);
 if(selector==='.progress-summary'){
  await page.locator('#qa-frame').evaluate(el=>{el.style.height=(el.contentDocument.documentElement.scrollHeight+64)+'px';el.contentWindow.scrollTo(0,0);});
  await page.evaluate(()=>window.scrollTo(0,0));const clip=await page.frameLocator('#qa-frame').locator(selector).boundingBox();await page.setViewportSize({width:1500,height:Math.ceil(clip.y+clip.height)+32});await page.frameLocator('#qa-frame').locator(selector).screenshot({path:path.join(evidence,name)});await page.setViewportSize({width:1500,height:1150});
  await page.locator('#qa-frame').evaluate(el=>{el.style.height='1000px';});return;
 }
 const language=await page.locator('#qa-language').inputValue(),theme=await page.locator('#qa-theme').inputValue(),textSize=Number(await page.locator('#qa-text').inputValue()),contrast=await page.locator('#qa-contrast').inputValue();
 const width=await page.locator('#qa-frame').evaluate(el=>el.contentWindow.innerWidth),settings={language,textSize,motionPaused:true,contrast,autoRotate:false,showLabels:true,audioEnabled:false,resume:false,lastSection:'explore'};
 screenshotDocument=prepareModuleFrame(fs.readFileSync(path.join(digital,'module/GeoDecoder_Modul_V1.html'),'utf8'),{instanceId:'screenshot-only',settings});
 const shot=await browser.newPage({viewport:{width,height:1100},reducedMotion:'reduce'});
 try{await shot.goto(`http://127.0.0.1:${server.address().port}/__module_capture.html`,{waitUntil:'domcontentloaded'});
  if(theme==='dark')await shot.locator('#module-theme').click();
  const section=selector==='#projection-panel'?'projection':'calculation';await shot.locator('#learn-'+section).click();
  if(section==='projection'){for(let i=0;i<3;i++)await shot.locator('#projection-guide-next').click();}
  else{await shot.locator('#calculation-formula').fill('6*a^2');await shot.locator('#calculation-check-formula').click();await shot.locator('#calculation-next-step').click();await shot.locator('#calculation-substitution').fill('6*4^2');await shot.locator('#calculation-check-substitution').click();}
  await shot.evaluate(()=>window.scrollTo(0,0));const clip=await shot.locator(selector).boundingBox();await shot.setViewportSize({width,height:Math.ceil(clip.y+clip.height)+32});await shot.locator(selector).screenshot({path:path.join(evidence,name)});
 }finally{await shot.close();}
}
try{
 await page.goto(`http://127.0.0.1:${server.address().port}/module/tools/learning-tools-qa.html`,{waitUntil:'domcontentloaded'});const frame=page.frameLocator('#qa-frame');await frame.locator('#learn-projection').waitFor({timeout:60000});console.log('Fixture ready');
 if(process.env.GEOMATH_CAPTURE_ONLY){
  await page.locator('[data-width="1440"]').click();await page.locator('#qa-language').selectOption('en');
  await capture('#projection-panel','34-studio-desktop-en-light.png');await page.locator('#qa-language').selectOption('ms');await capture('#calculation-panel','35-calculation-desktop-ms-light.png');
  await page.locator('#qa-language').selectOption('en');await page.locator('#qa-fixture-records').click();await frame.locator('.progress-summary>summary').click();await capture('.progress-summary','36-records-desktop-en-light-fixture.png');
  await page.locator('[data-width="390"]').click();await page.locator('#qa-theme').selectOption('dark');await page.locator('#qa-text').selectOption('150');await page.locator('#qa-contrast').selectOption('strong');
  await capture('#projection-panel','34-studio-390-en-dark-150.png');await capture('#calculation-panel','35-calculation-390-en-dark-150.png');await capture('.progress-summary','36-records-390-en-dark-150-fixture.png');
 }else{
 for(const width of process.env.GEOMATH_FOCUS_ONLY?[]:[1440,390])for(const language of ['ms','en'])for(const theme of ['light','dark'])for(const text of ['100','150']){
  await page.locator('[data-width="'+width+'"]').click();await page.locator('#qa-language').selectOption(language);await page.locator('#qa-theme').selectOption(theme);await page.locator('#qa-text').selectOption(text);await page.locator('#qa-motion').selectOption('true');
  for(const section of ['projection','calculation']){
   await page.locator('[data-section="'+section+'"]').click();await page.locator('#qa-inspect').click();
   const report=JSON.parse(await page.locator('#qa-result').textContent()).latest;
   results.matrix.push({section,width,language,theme,text,...report});assert.equal(report.pageOverflow,false,JSON.stringify({section,width,language,theme,text}));assert.deepEqual(report.duplicateIds,[]);assert.deepEqual(report.smallTargets,[]);assert.deepEqual(report.smallText,[]);
  }
  await frame.locator('.progress-summary>summary').click();
  const measure=await frame.locator('.progress-summary').evaluate(el=>{const d=el.ownerDocument;return {overflow:d.documentElement.scrollWidth>d.documentElement.clientWidth+1,rows:el.querySelectorAll('.module-record').length,title:el.querySelector('#module-records-title').textContent};});assert.equal(measure.rows,4);assert.equal(measure.overflow,false);results.matrix.push({section:'records',width,language,theme,text,...measure});await frame.locator('.progress-summary>summary').click();
 }
 // Activating a step from the top must bring its answer into the iframe viewport.
 await page.locator('[data-width="390"]').click();await page.locator('#qa-language').selectOption('en');await page.locator('#qa-text').selectOption('100');await page.locator('[data-section="calculation"]').click();await frame.locator('#calculation-formula').fill('6*a^2');await frame.locator('#calculation-check-formula').click();await frame.locator('#calculation-go-substitution').click();const focus=await frame.locator('#calculation-substitution').evaluate(el=>({top:el.getBoundingClientRect().top,bottom:el.getBoundingClientRect().bottom,height:el.ownerDocument.defaultView.innerHeight,focused:el.ownerDocument.activeElement===el}));assert.equal(focus.focused,true);assert.ok(focus.top>=0&&focus.bottom<=focus.height,JSON.stringify(focus));await frame.locator('#calculation-retry').click();console.log('Workflow passed');results.flows.push('mobile stepper keeps the newly focused answer visible');
 // Exercise the unchanged real guide, coordinates, selection, Undo and per-view checker.
 await page.locator('[data-width="1440"]').click();await page.locator('#qa-language').selectOption('ms');await page.locator('#qa-theme').selectOption('light');await page.locator('#qa-text').selectOption('100');await page.locator('[data-section="projection"]').click();
 await page.locator('#qa-frame').evaluate(el=>el.contentWindow.scrollTo(0,0));for(let i=0;i<3;i++)await frame.locator('#projection-guide-next').press('Enter');await frame.locator('#projection-practise').click();
 for(const v of [[1,1,5,1],[5,1,5,5],[5,5,1,5],[1,5,1,1]]){for(const [index,key] of ['x1','y1','x2','y2'].entries())await frame.locator('#projection-'+key).fill(String(v[index]));await frame.locator('#projection-add').click();}
 await frame.locator('#projection-check-active').click();assert.match(await frame.locator('#projection-feedback-front').textContent(),/tepat/);
 await frame.locator('#projection-selection').selectOption('0');await frame.locator('#projection-delete').click();await frame.locator('#projection-undo').click();await frame.locator('#projection-check-active').click();assert.equal(await frame.locator('#projection-feedback-front').getAttribute('data-success'),'true');
 await frame.locator('#projection-quick-circle').click();assert.equal(await frame.locator('#projection-tool').inputValue(),'circle');await frame.locator('#projection-quick-line').click();
 await frame.locator('#projection-grid-front').press('Home');await frame.locator('#projection-grid-front').press('Enter');await frame.locator('#projection-grid-front').press('Escape');
 await page.locator('#qa-language').selectOption('en');await page.locator('[data-section="calculation"]').click();await page.locator('[data-section="projection"]').click();assert.equal(await frame.locator('#projection-feedback-front').getAttribute('data-success'),'true');console.log('Workflow passed');results.flows.push('projection coordinate square, active check, delete/Undo, toolbar, keyboard and language/navigation draft retention');
 await frame.locator('#projection-title').scrollIntoViewIfNeeded();await capture('#projection-panel','34-studio-desktop-en-light.png');
 // Formula errors, provenance, unit checks and four sequential steps with retry/example.
 await page.locator('#qa-language').selectOption('ms');await page.locator('[data-section="calculation"]').click();
 await frame.locator('#calculation-formula').fill('eval(1)');await frame.locator('#calculation-check-formula').click();assert.equal(await frame.locator('#calculation-formula').getAttribute('aria-invalid'),'true');assert.equal(await frame.locator('#calculation-next-step').isDisabled(),true);
 await frame.locator('#calculation-hint-formula').click();await frame.locator('#calculation-example').click();assert.equal(await frame.locator('#calculation-example-panel').isVisible(),true);await frame.locator('#calculation-example').click();
 await frame.locator('#calculation-formula').fill('6*a^2');await frame.locator('#calculation-check-formula').click();await frame.locator('#calculation-next-step').click();
 await frame.locator('#calculation-substitution').fill('96+0');await frame.locator('#calculation-check-substitution').click();assert.equal(await frame.locator('#calculation-substitution').getAttribute('aria-invalid'),'true');
 await frame.locator('#calculation-substitution').fill('6*4^2');await frame.locator('#calculation-check-substitution').click();await capture('#calculation-panel','35-calculation-desktop-ms-light.png');await frame.locator('#calculation-next-step').click();
 await frame.locator('#calculation-calculation').fill('96');await frame.locator('#calculation-check-calculation').click();await frame.locator('#calculation-next-step').click();
 await frame.locator('#calculation-unit-value').fill('96');await frame.locator('#calculation-unit').selectOption('cm³');await frame.locator('#calculation-check-unit').click();assert.equal(await frame.locator('#calculation-unit-value').getAttribute('aria-invalid'),'true');await frame.locator('#calculation-unit').selectOption('cm²');await frame.locator('#calculation-check-unit').click();assert.equal(await frame.locator('#calculation-feedback-unit').getAttribute('data-success'),'true');
 await page.locator('#qa-language').selectOption('en');assert.equal(await frame.locator('#calculation-unit-value').inputValue(),'96');await frame.locator('#calculation-go-formula').click();await frame.locator('#calculation-formula').fill('bad');assert.equal(await frame.locator('#calculation-go-unit').isDisabled(),true);await frame.locator('#calculation-retry').click();assert.equal(await frame.locator('#calculation-formula').inputValue(),'');console.log('Workflow passed');results.flows.push('calculation parser-invalid, hint/example, substitution provenance, four steps, wrong/right unit, revisit invalidation, retry and locale retention');
 // Existing four-reflection protocol, explicitly synthetic local records.
 await page.locator('#qa-fixture-records').click();await frame.locator('.progress-summary>summary').click();assert.match(await frame.locator('#module-count').textContent(),/2 \/ 4/);await frame.locator('.module-record-reflection').first().locator('summary').click();await capture('.progress-summary','36-records-desktop-en-light-fixture.png');
 await frame.locator('#module-record-action-volume').click();assert.equal(await frame.locator('#labs-canvas').getAttribute('data-lab'),'volume');assert.match(await frame.locator('#module-count').textContent(),/2 \/ 4/);await page.locator('#qa-new-session').click();assert.match(await frame.locator('#module-count').textContent(),/0 \/ 4/);assert.equal(await frame.locator('#calculation-formula').inputValue(),'');assert.equal(await frame.locator('#projection-panel').getAttribute('data-mode'),'guide');console.log('Workflow passed');results.flows.push('records fixture, full reflection, canonical continue/revisit, achievement retention and new-session cleanup');
 // Representative narrow screenshots after the full settings bridge, including strong contrast.
 await page.locator('[data-width="390"]').click();await page.locator('#qa-language').selectOption('en');await page.locator('#qa-theme').selectOption('dark');await page.locator('#qa-text').selectOption('150');await page.locator('#qa-contrast').selectOption('strong');
 for(const section of ['projection','calculation']){await page.locator('[data-section="'+section+'"]').click();await capture('#'+section+'-panel',(section==='projection'?'34-studio':'35-calculation')+'-390-en-dark-150.png');}
 await page.locator('#qa-fixture-records').click();await capture('.progress-summary','36-records-390-en-dark-150-fixture.png');
 }
 assert.deepEqual(errors,[]);results.browser=await browser.version();results.errors=errors;results.status='pass';fs.writeFileSync(path.join(evidence,process.env.GEOMATH_CAPTURE_ONLY?'screenshot-results.json':'browser-results.json'),JSON.stringify(results,null,2));console.log('PASS',results.matrix.length,'responsive states;',results.flows.length,'real workflows;',results.browser);
}catch(error){fs.writeFileSync(path.join(evidence,'browser-failure.json'),JSON.stringify({error:error.stack,errors,fixtureStatus:await page.locator('#qa-result').textContent().catch(()=>''),frameDOM:await page.frameLocator('#qa-frame').locator('body').innerHTML().catch(()=>''),results},null,2));throw error;}
finally{await browser.close();await new Promise(resolve=>server.close(resolve));}
