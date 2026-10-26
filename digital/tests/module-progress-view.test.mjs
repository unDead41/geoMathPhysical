import {test} from 'node:test';
import assert from 'node:assert/strict';
import {renderLearningRecords} from '../dist/module-progress-view.mjs';
test('teacher progress view distinguishes meaningful completion and unstarted activities',()=>{
  const html=renderLearningRecords([{activity:'net',stage:'prediction',prediction:'Boleh dilipat',result:'',explanation:'',completed:false}]);
  assert.match(html,/0\/4 aktiviti selesai/);assert.match(html,/Ramalan direkod/);
  assert.equal((html.match(/Belum direkod<\/span>/g)||[]).length,3);
  assert.ok(!html.includes('undefined'));
});
test('teacher view escapes learner text and ignores forged completion or broken timestamps',()=>{
  const html=renderLearningRecords([{activity:'net',stage:'explanation',prediction:'<img src=x onerror=alert(1)>',result:'A & B',explanation:'<script>bad</script>',completed:true,updated_at:'not a date'},
    {activity:'area',stage:'prediction',prediction:'x',result:'',explanation:'',completed:true}]);
  assert.match(html,/1\/4 aktiviti selesai/);assert.ok(html.includes('&lt;script&gt;bad&lt;/script&gt;'));
  assert.ok(!html.includes('<script>'));assert.ok(!html.includes('<img'));assert.ok(!html.includes('Invalid Date'));
});
