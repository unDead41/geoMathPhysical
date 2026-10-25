import {test} from 'node:test';
import assert from 'node:assert/strict';
import {formatMathText} from '../dist/format.mjs';
test('math display preserves BM tepi and English overlapping while converting the pi token',()=>{
  assert.equal(formatMathText('12 tepi sama panjang. Faces must not be overlapping.'),'12 tepi sama panjang. Faces must not be overlapping.');
  assert.equal(formatMathText('V=pi*j^2*t/3'),'V = π × j² × t/3');
});
test('math display escapes markup rather than introducing executable HTML',()=>{
  assert.equal(formatMathText('<script>"tepi" & overlapping</script>'),'&lt;script&gt;&quot;tepi&quot; &amp; overlapping&lt;/script&gt;');
});
