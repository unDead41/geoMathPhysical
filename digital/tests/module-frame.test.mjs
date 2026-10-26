import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareModuleFrame} from '../dist/module-frame.mjs';
test('module fragment links remain in the srcdoc document instead of loading the parent app',()=>{
  const source='<a href="#main">Skip</a><a href="#panduan">Guide</a><a href="https://example.com/dskp">DSKP</a>';
  const embedded=prepareModuleFrame(source);
  assert.ok(embedded.includes('href="about:srcdoc#main"'));
  assert.ok(embedded.includes('href="about:srcdoc#panduan"'));
  assert.ok(embedded.includes('href="https://example.com/dskp"'));
  assert.equal(prepareModuleFrame(embedded),embedded);
});
