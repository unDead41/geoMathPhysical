import assert from 'node:assert/strict';
import {startHarness,newCase,settings,startGuest,fits,screenshot} from './ease-browser-helpers.mjs';
const harness=await startHarness();let test;
try{
  // Catch unreadable theme colors and fixed-size badges under enlarged text.
  test=await newCase(harness,{viewport:{width:320,height:844},setup:async c=>{await c.route('https://**/*',r=>r.abort());}});
  const badgePage=test.page,failures=[],measurements=[],standardSizes=new Map();
  const luminance=color=>{
    const channels=color.match(/[\d.]+/g).slice(0,3).map(Number).map(value=>value/255).map(value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4);
    return .2126*channels[0]+.7152*channels[1]+.0722*channels[2];
  };
  for(const theme of ['dark','light'])for(const contrast of ['standard','strong'])for(const textSize of [100,150]){
    await settings(badgePage,{language:'en',theme,textSize},true);
    await badgePage.locator('#contrast-select').selectOption(contrast);
    await badgePage.locator('#motion-select').selectOption('reduce');
    await badgePage.locator('#dialog-close').click();
    await badgePage.locator('#settings-home #settings-panel').waitFor({state:'attached'});
    await badgePage.locator('#help-button').click();
    for(const details of await badgePage.locator('.help-guides>details').all())if(!await details.evaluate(node=>node.open))await details.locator('summary').first().click();
    const rows=await badgePage.locator('.help-demo-success,.help-demo figcaption b,.help-story-number').evaluateAll(nodes=>nodes.filter(node=>node.checkVisibility()).map(node=>{
      const style=getComputedStyle(node);
      return {kind:node.className||'caption-number',color:style.color,background:style.backgroundColor,fontSize:parseFloat(style.fontSize)};
    }));
    const badgeOverlap=await badgePage.evaluate(()=>{
      const badge=document.querySelector('.help-demo-success').getBoundingClientRect(),label=document.querySelector('.help-demo-pad>span').getBoundingClientRect();
      return Math.min(badge.right,label.right)>Math.max(badge.left,label.left)&&Math.min(badge.bottom,label.bottom)>Math.max(badge.top,label.top);
    });
    if(badgeOverlap)failures.push({theme,contrast,textSize,reason:'success badge obscures the scanner label'});
    assert.ok(rows.length>=5,'The real help demo and storyboard badges are present');
    if(textSize===100)standardSizes.set(`${theme}/${contrast}`,rows.map(row=>row.fontSize));
    for(const [index,row] of rows.entries()){
      const levels=[luminance(row.color),luminance(row.background)].sort((a,b)=>a-b);
      row.ratio=(levels[1]+.05)/(levels[0]+.05);
      if(row.ratio<4.5)failures.push({theme,contrast,textSize,...row,reason:'text contrast below 4.5:1'});
      if(row.fontSize<12*textSize/100-.01)failures.push({theme,contrast,textSize,...row,reason:'badge text does not follow the text-size preference'});
      if(textSize===150&&Math.abs(row.fontSize/standardSizes.get(`${theme}/${contrast}`)[index]-1.5)>.01)failures.push({theme,contrast,textSize,...row,reason:'enlarged badge text is not 150% of the standard size'});
    }
    measurements.push({theme,contrast,textSize,minContrast:Math.min(...rows.map(row=>row.ratio)),fontSizes:[...new Set(rows.map(row=>row.fontSize))]});
    await fits(badgePage,`Help badges ${theme}/${contrast}/${textSize}%`);
    if(theme==='dark'&&contrast==='strong'&&textSize===150){
      await badgePage.locator('.help-demo').scrollIntoViewIfNeeded();
      await screenshot(harness,badgePage,'help-badges-dark-strong-150');
    }
    await badgePage.locator('#dialog-close').click();
  }
  console.log('HELP_BADGE_COMPUTED_STYLES '+JSON.stringify(measurements));
  assert.deepEqual(failures,[],'Help badges keep readable contrast and follow 100/150% text preferences');
  assert.deepEqual(test.errors,[]);await test.context.close();
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
