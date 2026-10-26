import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {DUEL_QUESTIONS, DUEL_SOURCES} from '../backend/duel/functions/geodecoder-duel/questions.mjs';
import {QUESTIONS} from '../dist/questions.mjs';
import {questionTopic} from '../dist/core.mjs';
import {localizeQuestion, translate} from '../dist/i18n.mjs';

test('Duel has exactly the 15 canonical IDs, correct shapes and stable topics',()=>{
  assert.equal(Object.keys(DUEL_QUESTIONS).length,15);
  assert.deepEqual(Object.keys(DUEL_QUESTIONS).sort(),QUESTIONS.map(q=>q.id).sort());
  for(const original of QUESTIONS){
    const q=DUEL_QUESTIONS[original.id];
    assert.equal(q.id,original.id);
    assert.equal(q.shape,original.shape);
    assert.equal(q.topic,questionTopic(original));
    assert.equal(Object.isFrozen(q),true);
  }
});

test('every server presentation is complete in BM/English and preserves formulas and measurements',()=>{
  for(const original of QUESTIONS)for(const language of ['ms','en']){
    const q=DUEL_QUESTIONS[original.id],copy=q.copy[language];
    assert.deepEqual(Object.keys(q.copy).sort(),['en','ms']);
    assert.deepEqual(Object.keys(copy).sort(),['hint','lines','prompt']);
    assert.ok(copy.prompt.trim()&&copy.hint.trim(),`${q.id}:${language}`);
    assert.equal(copy.lines.length,3);
    assert.ok(copy.lines.every(line=>typeof line==='string'&&line.trim()));
    assert.equal(copy.prompt,copy.lines.join(' '));
    assert.equal(Object.isFrozen(copy.lines),true);
    for(const formula of original.prompt.match(/[VL]=[^; ]+/g)||[])
      assert.ok(copy.prompt.includes(formula),`${q.id}:${language}:${formula}`);
    assert.deepEqual(copy.prompt.match(/\d+/g),original.prompt.match(/\d+/g),`${q.id}:${language}:numbers`);
    if(!['B1','B2'].includes(q.id)){
      const canonical=localizeQuestion(original,language);
      assert.equal(copy.prompt,canonical.prompt);
      assert.equal(copy.hint,canonical.hint);
      assert.deepEqual(copy.lines,canonical.lines);
    }
  }
});

test('B1/B2 explicitly limit different dimensions to this example without changing the answer',()=>{
  for(const id of ['B1','B2']){
    const q=DUEL_QUESTIONS[id];
    assert.equal(q.shape,'cuboid');
    assert.match(q.copy.ms.prompt,/contoh ini/i);
    assert.match(q.copy.en.prompt,/this example/i);
    assert.match(q.copy.ms.hint,/panjang.*lebar.*tinggi/i);
    assert.match(q.copy.en.hint,/length.*width.*height/i);
    assert.doesNotMatch(q.copy.ms.prompt,/semua kuboid/i);
    assert.doesNotMatch(q.copy.en.prompt,/all cuboids/i);
  }
  assert.match(DUEL_QUESTIONS.B2.copy.ms.prompt,/V=p\*l\*t/);
  assert.match(DUEL_QUESTIONS.B2.copy.en.prompt,/V=p\*l\*t/);
});

test('S2 alone has the existing bilingual formula legend',()=>{
  assert.deepEqual(Object.keys(DUEL_QUESTIONS).filter(id=>DUEL_QUESTIONS[id].formulaKey),['S2']);
  for(const language of ['ms','en'])
    assert.equal(DUEL_QUESTIONS.S2.formulaKey[language],translate(language,'V = isi padu · L = luas permukaan · j = jejari · t = tinggi'));
});

test('each item has verified source pages and partial curriculum alignment, with difficulty labelled as a team estimate',()=>{
  const allowedStandards=new Set(['6.1.1','6.2.1','6.3.1','6.4.1']);
  for(const q of Object.values(DUEL_QUESTIONS)){
    assert.equal(q.curriculum.form,2);
    assert.equal(q.curriculum.chapter,6);
    assert.ok(q.curriculum.learningStandards.length);
    for(const standard of q.curriculum.learningStandards){
      assert.ok(allowedStandards.has(standard.code));
      assert.equal(standard.alignment,'partial_support');
      assert.ok(standard.purpose.trim());
    }
    assert.ok(q.sources.some(source=>source.id==='D2'));
    assert.ok(q.sources.some(source=>source.id==='BM2'));
    assert.ok(q.sources.some(source=>source.id==='EN2'));
    for(const source of q.sources){
      assert.ok(DUEL_SOURCES[source.id]);
      assert.ok(source.printedPages.length&&source.pdfPages.length&&source.purpose.trim());
      assert.ok(source.printedPages.every(page=>Number.isInteger(page)&&page>0));
      assert.ok(source.pdfPages.every(page=>Number.isInteger(page)&&page>0));
      if(source.id==='D2'){
        assert.deepEqual(source.pdfPages,source.printedPages.map(page=>page+12));
        assert.ok(source.pdfPages.every(page=>[64,65].includes(page)));
        for(const standard of q.curriculum.learningStandards){
          const printed=standard.code==='6.4.1'?53:52;
          assert.ok(source.printedPages.includes(printed),`${q.id}:${standard.code}:printed`);
          assert.ok(source.pdfPages.includes(printed+12),`${q.id}:${standard.code}:pdf`);
        }
      }
      if(source.id==='BM2'||source.id==='EN2')
        for(const printed of source.printedPages)assert.ok(source.pdfPages.includes(Math.floor(printed/2)+5),`${q.id}:${source.id}:${printed}`);
    }
    assert.ok(['easy','medium','easy_to_medium'].includes(q.difficulty.level));
    assert.equal(q.difficulty.basis,'team_estimate');
    assert.equal(q.difficulty.studentValidated,false);
  }
  assert.equal(DUEL_SOURCES.D3.form,3);
  assert.deepEqual(DUEL_SOURCES.D3.printedPages,[58,59,60]);
  assert.deepEqual(DUEL_SOURCES.D3.pdfPages,[70,71,72]);
  assert.deepEqual(DUEL_SOURCES.BM3.printedPages,[170,171,182,183,184]);
  assert.deepEqual(DUEL_SOURCES.BM3.pdfPages,[180,181,192,193,194]);
  assert.ok(Object.values(DUEL_QUESTIONS).every(q=>q.sources.every(source=>!['D3','BM3','EN3'].includes(source.id))));
});

test('all six attached sources are inventoried and server content has no frontend/runtime import',()=>{
  assert.deepEqual(Object.keys(DUEL_SOURCES).sort(),['BM2','BM3','D2','D3','EN2','EN3']);
  for(const source of Object.values(DUEL_SOURCES)){
    assert.ok(source.fileName.endsWith('.pdf'));
    assert.equal(source.verified,true);
  }
  const module=readFileSync(new URL('../backend/duel/functions/geodecoder-duel/questions.mjs',import.meta.url),'utf8');
  assert.doesNotMatch(module,/^\s*import\s/m);
  assert.doesNotMatch(module,/\b(?:document|localStorage|sessionStorage|Deno|process)\s*\./);
});
