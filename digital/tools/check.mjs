import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {QUESTIONS} from '../dist/questions.mjs';
import {shapeArt} from '../dist/art.mjs';
import {MESSAGES, QUESTION_COPY, localizeQuestion} from '../dist/i18n.mjs';
import {VERSION} from '../dist/core.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('dist/index.html'),css=read('dist/style.css'),design=read('DESIGN.md'),app=read('dist/app.mjs');
assert.equal(JSON.parse(read('package.json')).version,VERSION,'Digital version drift');
assert.ok(read('README.md').includes(`**v${VERSION}**`));
assert.ok(read('CHANGELOG.md').includes(`## v${VERSION}`));
assert.ok(html.includes(`V${VERSION}`));
const ids=[...html.matchAll(/\sid="([^"]+)"/g)].map(m=>m[1]);
assert.equal(new Set(ids).size,ids.length,'Duplicate HTML IDs');
for(const m of app.matchAll(/\$\('([\w-]+)'\)/g)) assert.ok(ids.includes(m[1]),`Missing element #${m[1]}`);
for(const m of html.matchAll(/aria-(?:describedby|controls|labelledby)="([^"]+)"/g)) for(const id of m[1].split(' '))assert.ok(ids.includes(id),`Missing aria target ${id}`);
assert.ok(html.includes('<html lang="ms">'));assert.ok(html.includes('<form id="player-form" novalidate>'));
const colors={primary:'primary',ink:'ink',background:'bg',surface:'surface',success:'success',danger:'danger',accent:'accent',muted:'muted',border:'border'};
for(const [token,variable] of Object.entries(colors)){
  const expected=design.match(new RegExp(`  ${token}: "(#[A-Fa-f0-9]+)"`))[1];
  assert.ok(css.toLowerCase().includes(`--${variable}:${expected.toLowerCase()}`),`Token drift: ${token}`);
}
const source=read('docs/question_bank.reference.h');
for(const q of QUESTIONS){ assert.ok(source.includes('"'+q.id+'"')); assert.ok(source.includes('"'+q.prompt+'"')); }
for(const shape of ['cube','cuboid','pyramid','cone','cylinder'])for(const kind of ['solid','net'])assert.ok(shapeArt(shape,kind).includes('role="img"'));
assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'));assert.ok(css.includes('touch-action:none'));
assert.ok(css.includes('scrollbar-color:'));assert.ok(css.includes(':focus-visible'));
assert.ok(!/\b(?:alert|confirm|prompt)\s*\(/.test(app));
for(const m of html.matchAll(/data-i18n(?:-(?:aria-label|title|placeholder|content))?="([^"]+)"/g)) {
  const key=m[1].replaceAll('&amp;','&').replaceAll('&#x27;',"'").replaceAll('&quot;','"');
  for(const language of ['ms','en'])assert.ok(MESSAGES[language][key],`Missing ${language} static message: ${key}`);
}
for(const m of app.matchAll(/\bt\((['"])([^'"\n]+)\1/g))for(const language of ['ms','en'])assert.ok(MESSAGES[language][m[2]],`Missing ${language} dynamic message: ${m[2]}`);
assert.deepEqual(Object.keys(MESSAGES.ms).sort(),Object.keys(MESSAGES.en).sort());
assert.equal(Object.keys(QUESTION_COPY).length,QUESTIONS.length);
for(const q of QUESTIONS)for(const language of ['ms','en']) {
  const text=localizeQuestion(q,language);assert.equal(text.id,q.id);assert.equal(text.shape,q.shape);assert.ok(text.prompt&&text.hint);
}
const standalone=read('artifacts/GeoDecoder_Digital_V1.html');
assert.ok(!/<(?:script|link)\b[^>]+(?:src|href)="\.\//.test(standalone),'Standalone file has external assets');
assert.ok(!/^import /m.test(standalone));assert.ok(!/^export /m.test(standalone));
const script=standalone.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
new vm.Script(script); // All imports/exports are inlined by the artifact builder.
assert.equal(standalone,read('dist/GeoDecoder_Digital_V1.html'));
assert.equal(standalone,read('GeoDecoder_Digital_V1.html'),'Published HTML differs from source build');
if(fs.existsSync(path.join(root,'../index.html')))assert.equal(standalone,read('../index.html'),'Root page differs from source build');
console.log(`PASS: standalone syntax/assets, ${ids.length} unique IDs, ARIA references, bank fidelity, 10 SVG diagrams, design-token drift and accessibility baselines.`);
