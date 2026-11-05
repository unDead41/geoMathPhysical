import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {learningSchema} from '../../../../tools/module/learning_schema.mjs';

test('Dart storage validation agrees with the actual private JavaScript checkpoint schema',()=>{
  const command=process.env.DART_BIN||'dart';
  const run=spawnSync(command,[fileURLToPath(new URL('./checkpoint_schema_probe.dart',import.meta.url))],{
    encoding:'utf8',timeout:30000,maxBuffer:8*1024*1024,
  });
  assert.equal(run.status,0,run.error?.message||run.stderr);
  const corpus=JSON.parse(run.stdout);
  assert.ok(corpus.fullUndoBytes>65536&&corpus.fullUndoBytes<=learningSchema.maxBytes);
  for(const {name,value,expected,dartValid} of corpus.cases){
    assert.equal(dartValid,expected,name+' Dart');
    assert.equal(learningSchema.checkpoint(value),expected,name+' JavaScript');
  }
});
