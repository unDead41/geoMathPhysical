import assert from 'node:assert/strict';
import {startHarness,newCase,settings,startGuest,fits,screenshot} from './ease-browser-helpers.mjs';
const harness=await startHarness();let test;
try{
  test=await newCase(harness,{viewport:{width:390,height:844},setup:async c=>{await c.route('https://**/*',r=>r.abort());}});const {page}=test;
  await settings(page,{language:'en'});await startGuest(page);
  await page.locator('#help-button').click();await page.locator('[data-help-action=tutorial]').click();
  const card=page.locator('.help-demo-card');
  assert.equal(await card.evaluate(n=>getComputedStyle(n).animationDuration),'4.8s');
  assert.equal(await card.evaluate(n=>getComputedStyle(n).animationIterationCount),'1');
  await page.locator('[data-demo-action=pause]').click();assert.equal(await card.evaluate(n=>getComputedStyle(n).animationPlayState),'paused');
  await page.locator('[data-demo-action=replay]').click();assert.equal(await card.evaluate(n=>getComputedStyle(n).animationPlayState),'running');
  await fits(page,'Visual tutorial phone');await screenshot(harness,page,'visual-tutorial-r1');
  await page.locator('[data-dialog-action=tutorial-next]').click();assert.match(await page.locator('.help-demo-pad').innerText(),/R2/);
  await screenshot(harness,page,'visual-tutorial-r2');
  await page.locator('[data-dialog-action=tutorial-next]').click();assert.match(await page.locator('.help-demo figcaption').innerText(),/R1 ✓.*R2 ✓.*\+1/s);
  await page.emulateMedia({reducedMotion:'reduce'});assert.equal(await page.locator('.help-demo-card').evaluate(n=>getComputedStyle(n).animationName),'none');
  assert.equal(await page.locator('.help-demo-controls').isVisible(),false);assert.equal(await page.locator('.help-demo figcaption').isVisible(),true);
  await page.emulateMedia({reducedMotion:'no-preference'});await page.locator('[data-dialog-action=tutorial-finish]').click();
  await page.locator('#dialog-close').click();await settings(page,{textSize:150},true);await page.locator('#motion-select').selectOption('reduce');await page.locator('#dialog-close').click();
  await page.locator('#help-button').click();assert.equal(await page.locator('.help-demo-card').evaluate(n=>getComputedStyle(n).animationName),'none');
  await page.setViewportSize({width:320,height:844});await fits(page,'Visual help 320px 150%');
  for(const summary of await page.locator('.help-guides>details>summary').all()){await summary.click();await fits(page,'Story panel 320px 150%');}
  assert.deepEqual(test.errors,[]);console.log('PASS visual tutorial: finite animation, pause/replay, R1/R2/+1, OS/app reduced motion, 320px 150% storyboards');
}finally{await test?.context.close();await harness.close();}
