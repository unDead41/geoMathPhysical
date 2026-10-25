import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatMathText} from '../dist/format.mjs';
import * as display from '../dist/format.mjs';
test('math display preserves BM tepi and English overlapping while converting the pi token',()=>{
  assert.equal(formatMathText('12 tepi sama panjang. Faces must not be overlapping.'),'12 tepi sama panjang. Faces must not be overlapping.');
  assert.match(formatMathText('V=pi*j^2*t/3'),/<mi>π<\/mi>/);
});

// Hand-derived: the whole product a² × t is the numerator; 3 is the denominator.
test('pyramid volume renders the whole numerator over 3 with a semantic power',()=>{
  const html=formatMathText('V=a^2*t/3');
  assert.ok(html.includes('<mi>V</mi><mo>=</mo><mfrac><mrow><msup><mi>a</mi><mn>2</mn></msup><mo>×</mo><mi>t</mi></mrow><mn>3</mn></mfrac>'));
  assert.match(html,/role="math"/);
  assert.match(html,/aria-label="V sama dengan pecahan pengangka a kuasa dua darab t penyebut 3 tamat pecahan"/);
});
test('parentheses in surface area and separate equations keep their structure',()=>{
  const html=formatMathText('L=2*pi*j*(j+t); V=a^3','en');
  assert.match(html,/<mo>\(<\/mo><mrow><mi>j<\/mi><mo>\+<\/mo><mi>t<\/mi><\/mrow><mo>\)<\/mo>/);
  assert.match(html,/<msup><mi>a<\/mi><mn>3<\/mn><\/msup>/);
  assert.equal((html.match(/role="math"/g)||[]).length,2);
  assert.match(html,/aria-label="V equals a cubed"/);
});
test('spaces do not alter an equation and ordinary variable definitions stay readable',()=>{
  const html=formatMathText('V = pi * j ^ 2 * t / 3; j=radius','en');
  assert.match(html,/<mfrac>/);
  assert.ok(html.endsWith('; j = radius'));
});
test('measurements use protected unit spacing and semantic square/cube powers',()=>{
  const html=formatMathText('6cm x 4cm, tinggi 3cm; 2cm^2 dan 3cm^3');
  assert.ok(html.includes('<span class="measurement">6&nbsp;cm</span> × <span class="measurement">4&nbsp;cm</span>'));
  assert.ok(html.includes('2&nbsp;cm<sup>2</sup>'));
  assert.ok(html.includes('3&nbsp;cm<sup>3</sup>'));
  assert.ok(!html.includes('^'));
});
test('rich text supports explicit strong/emphasis and line breaks while rendering math',()=>{
  const html=display.formatRichText('**Remember**: _read carefully_\nV=a^3','en');
  assert.ok(html.startsWith('<strong>Remember</strong>: <em>read carefully</em><br>'));
  assert.match(html,/<msup>/);
});
test('glossary emphasis uses complete longest phrases and does not alter spelling',()=>{
  assert.equal(display.formatRichText('Satu permukaan melengkung dan puncak.','ms'),
    'Satu <strong class="geometry-term">permukaan melengkung</strong> dan <strong class="geometry-term">puncak</strong>.');
  assert.equal(display.formatRichText('A curved surface; faces must not be overlapping.','en'),
    'A <strong class="geometry-term">curved surface</strong>; <strong class="geometry-term">faces</strong> must not be overlapping.');
  assert.equal(display.formatRichText('A vertex is not in subvertex.','en'),
    'A <strong class="geometry-term">vertex</strong> is not in subvertex.');
});
test('rich markup never accepts HTML, event attributes, links or raw MathML',()=>{
  const html=display.formatRichText('**<img src=x onerror="alert(1)">** _<svg onload=evil>_ [x](javascript:evil) <math>','en');
  assert.ok(html.includes('<strong>&lt;img'));
  assert.ok(html.includes('<em>&lt;svg'));
  assert.ok(!/<(?:img|svg|a|math)\b/.test(html));
  assert.ok(html.includes('[x](javascript:evil)'));
});
test('unsupported or incomplete expressions remain literal escaped text',()=>{
  for(const value of ['a^','V=a*/3','V=(a+','V=(a+1','V=a^2/(3*t','<broken>V=</broken>']) {
    assert.ok(!formatMathText(value).includes('<math'));
  }
});
test('math display escapes markup rather than introducing executable HTML',()=>{
  assert.equal(formatMathText('<script>"tepi" & overlapping</script>'),'&lt;script&gt;&quot;tepi&quot; &amp; overlapping&lt;/script&gt;');
});
