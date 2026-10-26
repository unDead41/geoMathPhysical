import assert from 'node:assert/strict';
import {startHarness} from './ease-browser-helpers.mjs';
const h=await startHarness();
try{
 const c=await h.browser.newContext({viewport:{width:1365,height:950}});const p=await c.newPage();const errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto(h.origin);await p.locator('#settings-button').click();await p.selectOption('#language-select','en');await p.selectOption('#text-size-select','150');await p.locator('#motion-button').click();await p.locator('[data-dialog-action="close"]').click();await p.locator('#module-button').click();
 const f=p.frameLocator('#module-frame');await f.locator('#model-title').waitFor();
 assert.equal(await f.locator('html').getAttribute('lang'),'en','Parent English must reach module before interaction');
 assert.equal(await f.locator('#model-title').innerText(),'Cube');
 assert.equal(await f.locator('html').getAttribute('data-text-size'),'150');
 assert.equal(await f.locator('#model-canvas').getAttribute('data-auto'),'false');
 console.log('PASS module starts with parent language, text size and motion');
 await p.setViewportSize({width:320,height:950});await f.locator('#learn-labs').click();
 const split=await f.locator('#labs-title,.lab-choices button').evaluateAll(roots=>{
  const bad=[];for(const root of roots){const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while(node=walker.nextNode())for(const m of node.textContent.matchAll(/\S+/g)){const range=document.createRange();range.setStart(node,m.index);range.setEnd(node,m.index+m[0].length);const lines=new Set([...range.getClientRects()].filter(r=>r.width>0).map(r=>Math.round(r.top)));if(lines.size>1)bad.push(m[0]);}}return bad;
 });
 assert.deepEqual(split,[],'Large-text mobile headings/cards must wrap between words, including two-digit numbers');
 console.log('PASS mobile150% module words and lab badges stay readable');
 assert.deepEqual(errors,[]);await c.close();
}finally{await h.close();}
