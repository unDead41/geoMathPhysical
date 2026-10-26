import test from 'node:test';
import assert from 'node:assert/strict';
import {VERSION} from '../dist/core.mjs';
import {QUESTIONS} from '../dist/questions.mjs';
import {createReportContext,validateReport,formatReport,redactReportText,REPORT_LIMITS} from '../dist/support-report.mjs';

const draft={category:'game',description:'The scanner does not respond.',steps:'Choose a card, then select R1.',expected:'The solid is scanned.',actual:'Nothing changes.'};
test('automatic diagnostic context is an explicit allowlist, with no answer or personal data',()=>{
  const context=createReportContext({screen:'game',mode:'duel',language:'en',questionId:QUESTIONS[0].id,stage:'R2',width:390,height:844,browserOnline:true,service:'last-response-ok',
    pin:'917263',token:'private-token',password:'private-password',email:'person@example.test',className:'Private class',opponent:{name:'Opponent'},answer:QUESTIONS[0].shape,storage:{secret:'dump'},url:'https://app.test/#access_token=private'});
  assert.equal(context.appVersion,VERSION);assert.equal(context.screen,'game');assert.equal(context.questionId,QUESTIONS[0].id);assert.equal(context.stage,'R2');
  assert.deepEqual(context.viewport,{width:390,height:844});assert.equal(context.connection.browser,'online-unverified');
  assert.equal(context.connection.service,'last-response-ok');
  assert.deepEqual(Object.keys(context).sort(),['appVersion','build','connection','language','mode','questionId','screen','stage','phase','viewport'].sort());
  assert.doesNotMatch(JSON.stringify(context),/917263|private-|person@|Private class|Opponent|access_token|dump/);
});
test('invalid and unrelated diagnostic fields cannot be smuggled into reports',()=>{
  const c=createReportContext({screen:'person@example.test',mode:'917263',language:'other',questionId:'private-token',stage:'the-answer',width:Infinity,height:-5,browserOnline:'yes',service:'confirmed internet'});
  assert.equal(c.screen,'unknown');assert.equal(c.mode,'none');assert.equal(c.questionId,null);assert.equal(c.stage,null);
  assert.equal(c.language,'ms');assert.deepEqual(c.viewport,{width:null,height:null});assert.equal(c.connection.browser,'unknown');assert.equal(c.connection.service,'not-checked');
  assert.equal(createReportContext({screen:'module',questionId:QUESTIONS[0].id,stage:'R1'}).questionId,null);
  const review=createReportContext({screen:'game',questionId:QUESTIONS[0].id,stage:'R2',phase:'review'});
  assert.equal(review.stage,'R2');assert.equal(review.phase,'review');
});
test('all report fields validate, and long input is rejected without silently truncating it',()=>{
  assert.deepEqual(validateReport(draft),{});
  for(const field of ['category','description','steps','expected','actual'])assert.ok(validateReport({...draft,[field]:'  '})[field]);
  for(const [field,max] of Object.entries(REPORT_LIMITS))assert.equal(validateReport({...draft,[field]:'x'.repeat(max+1)})[field],'long');
  assert.equal(validateReport({...draft,category:'unknown'}).category,'required');
});
test('review text is localized and neutralizes obvious credential patterns in user descriptions',()=>{
  const ctx=createReportContext({screen:'game',mode:'practice',language:'en',questionId:QUESTIONS[0].id,stage:'R1',browserOnline:false});
  for(const lang of ['ms','en']){
    const text=formatReport({...draft,actual:'<script>alert(1)</script> person@example.test PIN 917263 password=badvalue Bearer abc.DEF.ghi'},ctx,lang);
    assert.match(text,new RegExp(VERSION.replaceAll('.','\\.')));assert.match(text,lang==='ms'?/Hasil dijangka/:/Expected result/);
    assert.doesNotMatch(text,/person@example|917263|badvalue|abc\.DEF\.ghi/);assert.match(text,/\[.*\]/);
    assert.match(text,lang==='ms'?/belum dihantar/:/not been sent/);
  }
  assert.doesNotMatch(redactReportText('https://site.test/?token=SECRET#access_token=MORE'),/SECRET|MORE/);
});
