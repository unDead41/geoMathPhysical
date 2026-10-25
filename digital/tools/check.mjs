import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {QUESTIONS} from '../dist/questions.mjs';
import {shapeArt} from '../dist/art.mjs';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const read=p=>fs.readFileSync(path.join(root,p),'utf8');
const html=read('dist/index.html'),css=read('dist/style.css'),design=read('DESIGN.md'),app=read('dist/app.mjs');
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
const standalone=read('artifacts/GeoDecoder_Digital_V1.html');
assert.ok(!/<(?:script|link)\b[^>]+(?:src|href)="\.\//.test(standalone),'Standalone file has external assets');
assert.ok(!/^import /m.test(standalone));assert.ok(!/^export /m.test(standalone));
const script=standalone.match(/<script type="module">([\s\S]*?)<\/script>/)[1];
new vm.Script(script); // All imports/exports are inlined by the artifact builder.
assert.equal(standalone,read('dist/GeoDecoder_Digital_V1.html'));
console.log(`PASS: standalone syntax/assets, ${ids.length} unique IDs, ARIA references, bank fidelity, 10 SVG diagrams, design-token drift and accessibility baselines.`);
