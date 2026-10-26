import test from 'node:test';
import assert from 'node:assert/strict';
import {installModuleLanguage} from '../dist/module-language.mjs';

// A DOM port isolates the host adapter contract from the studio's own translator.
// Removing the native-language exclusion must fail both text and attribute checks.
function nativeLanguageDocument(){
 const element=native=>({nodeType:1,attributes:{'aria-label':'Betul'},parentElement:null,
  closest(selector){return native&&selector.includes('[data-module-native-language]')?this:null;},
  hasAttribute(name){return name in this.attributes;},getAttribute(name){return this.attributes[name];},
  setAttribute(name,value){this.attributes[name]=value;}});
 const own=element(true),legacy=element(false);
 const texts=[{nodeType:3,nodeValue:'Betul',parentElement:own},{nodeType:3,nodeValue:'Betul',parentElement:legacy}];
 const document={documentElement:{},createTreeWalker(){let i=0;return {nextNode:()=>texts[i++]||null};},querySelectorAll:()=>[own,legacy]};
 return {document,own,legacy,texts};
}
test('host translation leaves natively bilingual feature text and labels to their owner',()=>{
 const d=nativeLanguageDocument(),translator=installModuleLanguage({language:'en',catalog:{exact:{Betul:'Correct'}},document:d.document,window:null});
 assert.equal(d.texts[0].nodeValue,'Betul');assert.equal(d.own.attributes['aria-label'],'Betul');
 assert.equal(d.texts[1].nodeValue,'Correct');assert.equal(d.legacy.attributes['aria-label'],'Correct');
 translator.setLanguage('ms');assert.equal(d.texts[0].nodeValue,'Betul');assert.equal(d.texts[1].nodeValue,'Betul');
});
