import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {execFileSync,spawnSync} from 'node:child_process';
import {LIGHT_TOKENS,DARK_TOKENS,STRONG_TOKENS,DARK_STRONG_TOKENS,UI_TIMING,designTokenCss,effectiveTokens} from '../design-system/tokens.mjs';
import {UI_TOKENS,UI_DARK_TOKENS,UI_MOTION,designTokenCss as moduleCss} from '../module/src/design-system.mjs';
const resolve=(tokens,name)=>{
  let value=tokens[name];const seen=new Set([name]);
  while(/^var\(--[\w-]+\)$/.test(value)){
    const key=value.slice(6,-1);assert.ok(!seen.has(key),'Token alias cycle: '+key);seen.add(key);
    assert.ok(key in tokens,'Missing token target '+key);value=tokens[key];
  }
  return value;
};
const luminance=hex=>{
 const rgb=hex.slice(1).match(/../g).map(v=>parseInt(v,16)/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4);
 return rgb[0]*.2126+rgb[1]*.7152+rgb[2]*.0722;
};
const ratio=(a,b)=>{const [x,y]=[luminance(a),luminance(b)];return (Math.max(x,y)+.05)/(Math.min(x,y)+.05);};

test('text, button states and form boundaries remain legible in both themes and contrast modes',()=>{
 for(const theme of ['light','dark'])for(const contrast of ['standard','strong']){
  const tokens=effectiveTokens({theme,contrast});
  for(const name of Object.keys(tokens))assert.ok(resolve(tokens,name)!==undefined,theme+'/'+contrast+'/'+name);
  const textPairs=[['ink','surface'],['muted','surface'],['placeholder','field-bg'],['primary','surface'],['primary-dark','blue-soft'],['on-primary','primary'],['success','mint-soft'],['danger','danger-soft'],['warning-ink','warning-soft'],['purple','purple-soft']];
  for(const bg of ['primary-fill','primary-fill-hover','primary-fill-pressed'])textPairs.push(['on-primary-fill',bg]);
  for(const bg of ['danger-fill','danger-fill-hover','danger-fill-pressed'])textPairs.push(['on-danger',bg]);
  for(const [fg,bg] of textPairs)assert.ok(ratio(resolve(tokens,fg),resolve(tokens,bg))>=4.5,`${theme}/${contrast}: ${fg} on ${bg}`);
  for(const [fg,bg] of [['border-control','field-bg'],['focus-color','surface']])assert.ok(ratio(resolve(tokens,fg),resolve(tokens,bg))>=3,`${theme}/${contrast}: ${fg}/${bg}`);
 }
});

test('generated module adapts one owner while preserving educational durations',()=>{
 assert.deepEqual(UI_DARK_TOKENS,DARK_TOKENS);
 for(const key of Object.keys(LIGHT_TOKENS))assert.equal(UI_TOKENS[key],key==='page-max'?LIGHT_TOKENS['module-page-max']:LIGHT_TOKENS[key]);
 assert.equal(moduleCss(),designTokenCss({module:true}));
 assert.equal(UI_MOTION.fast,UI_TIMING.fast);assert.equal(UI_MOTION.panel,UI_TIMING.panel);
 assert.deepEqual(Object.fromEntries(['camera','unfold','fold','join','pour','layer','compareAdd','compareFill','hold','maxFrame'].map(k=>[k,UI_MOTION[k]])),{camera:700,unfold:5800,fold:4000,join:1600,pour:2600,layer:600,compareAdd:1200,compareFill:2600,hold:1000,maxFrame:100});
});

test('portal and module CSS keep dark, strong contrast and adapter output deterministic',()=>{
 assert.equal(fs.readFileSync(new URL('../dist/design-tokens.css',import.meta.url),'utf8'),designTokenCss());
 assert.equal(fs.readFileSync(new URL('../module/src/design-tokens.css',import.meta.url),'utf8'),moduleCss());
 assert.match(designTokenCss(),/:root\[data-theme="dark"\]\[data-contrast="strong"\]/);
 for(const overrides of [DARK_TOKENS,STRONG_TOKENS,DARK_STRONG_TOKENS])for(const key of Object.keys(overrides))assert.ok(key in LIGHT_TOKENS,'Unmapped theme token '+key);

});


test('drift CLI detects stale generated CSS/JS, changed module recipe input and a shadow token owner',()=>{
 const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'geodecoder-token-check-'));
 const source=new URL('../',import.meta.url);
 try{
  for(const relative of ['tools/design-tokens.mjs','design-system/tokens.mjs','dist/module-foundation.css']){
   const target=path.join(temporary,relative);fs.mkdirSync(path.dirname(target),{recursive:true});
   fs.copyFileSync(new URL(relative,source),target);
  }
  const generator=path.join(temporary,'tools/design-tokens.mjs');
  const generate=()=>execFileSync(process.execPath,[generator],{stdio:'pipe'});
  const check=()=>spawnSync(process.execPath,[generator,'--check'],{encoding:'utf8'});
  generate();assert.equal(check().status,0);
  for(const relative of ['dist/design-tokens.css','module/src/central-tokens.mjs','dist/module-design.mjs']){
   fs.appendFileSync(path.join(temporary,relative),'\n/* manual edit */');
   const result=check();assert.equal(result.status,1);assert.ok(result.stderr.includes('STALE '+relative),result.stderr);generate();
  }
  fs.appendFileSync(path.join(temporary,'dist/module-foundation.css'),'\n/* shared recipe changed */');
  let result=check();assert.equal(result.status,1);assert.ok(result.stderr.includes('STALE dist/module-design.mjs'));generate();
  fs.writeFileSync(path.join(temporary,'dist/portal.css'),':root{--primary:#123456;}');
  result=check();assert.equal(result.status,1);assert.ok(result.stderr.includes('TOKEN OWNER DRIFT dist/portal.css: --primary'));
 }finally{fs.rmSync(temporary,{recursive:true,force:true});}
});
