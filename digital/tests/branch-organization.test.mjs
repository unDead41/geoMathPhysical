import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, readFile, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {organizeBranches, runCli} from '../tools/organize-branches.mjs';

const token = 'fixture-secret-never-log';
const a = 'a'.repeat(40), b = 'b'.repeat(40), changed = 'c'.repeat(40);
const preserved = ['main-digitalized', 'main', 'sharing', 'codex/game-flow-rgb', 'codex/question-audio-elevenlabs', 'codex/question-bank-harmonised-lcd', 'codex/serial-unassign', 'testing/components'];
const rows = [
  {from:'digitalize', to:'digitalized-core-portal', sha:a},
  {from:'digital-dwi', to:'digitalized-game-language', sha:b}
];
const registry = (renames = rows) => ({schemaVersion:1, repository:'unDead41/geodecoder', publicationBranch:'main-digitalized', protectedBranches:preserved, renames});

function api(initial, intercept = async () => undefined) {
  const refs = new Map(Object.entries(initial)), calls = [];
  const fetchImpl = async (url, init) => {
    const call = {url, ...init};
    calls.push(call);
    const replacement = await intercept(call, refs, calls);
    if (replacement) return replacement;
    const pathname = new URL(url).pathname;
    const prefix = '/repos/unDead41/geodecoder';
    assert.equal(new URL(url).origin, 'https://api.github.com');
    if (init.method === 'GET' && pathname.startsWith(prefix + '/git/ref/heads/')) {
      const name = decodeURIComponent(pathname.slice((prefix + '/git/ref/heads/').length));
      return refs.has(name)
        ? Response.json({ref:'refs/heads/' + name, node_id:'fixture-ref', url, object:{type:'commit', sha:refs.get(name), url:'https://api.github.com/repos/unDead41/geodecoder/git/commits/' + refs.get(name)}})
        : Response.json({message:'Not Found'}, {status:404});
    }
    if (init.method === 'POST' && pathname.startsWith(prefix + '/branches/') && pathname.endsWith('/rename')) {
      const from = decodeURIComponent(pathname.slice((prefix + '/branches/').length, -'/rename'.length));
      const {new_name:to} = JSON.parse(init.body);
      if (!refs.has(from) || refs.has(to)) return Response.json({message:'Conflict'}, {status:422});
      const sha = refs.get(from);
      refs.delete(from); refs.set(to, sha);
      return Response.json({name:to, commit:{sha, url:'https://api.github.com/repos/unDead41/geodecoder/commits/' + sha}, protected:false}, {status:201});
    }
    assert.fail('Unexpected API operation: ' + init.method + ' ' + pathname);
  };
  return {refs, calls, fetchImpl};
}

const options = (mock, extra = {}) => ({registry:registry(), env:{GH_TOKEN:token}, fetchImpl:mock.fetchImpl, ...extra});
const writes = mock => mock.calls.filter(call => call.method !== 'GET');

test('default dry run checks exact refs and leaves every branch untouched', async () => {
  const mock = api({digitalize:a, 'digital-dwi':b, main:changed});
  const events = [];
  const result = await organizeBranches(options(mock, {onEvent:event=>events.push(event)}));
  assert.equal(result.mode, 'dry-run');
  assert.equal(result.pending, 2);
  assert.deepEqual(result.plan.map(row=>row.status), ['ready', 'ready']);
  assert.deepEqual(Object.fromEntries(mock.refs), {digitalize:a, 'digital-dwi':b, main:changed});
  assert.equal(mock.calls.length, 4);
  assert.equal(writes(mock).length, 0);
  assert.deepEqual(events.map(event=>event.event), ['preflight', 'complete']);
});

test('all preflight reads settle before a late collision can permit any mutation', async () => {
  let release;
  const barrier = new Promise(resolve=>{release=resolve;});
  let started = 0;
  const mock = api({digitalize:a, 'digital-dwi':b, 'digitalized-game-language':changed}, async call => {
    if (call.method === 'GET') { started++; await barrier; }
  });
  const running = organizeBranches(options(mock, {apply:true}));
  await new Promise(resolve=>setImmediate(resolve));
  const beforeRelease = started;
  const writesBeforeRelease = writes(mock).length;
  release();
  await assert.rejects(running, /[Cc]ollision/);
  assert.equal(beforeRelease, 4, 'Every source and destination read must start during preflight');
  assert.equal(writesBeforeRelease, 0);
  assert.equal(writes(mock).length, 0);
});

test('a changed source head blocks the entire apply, including earlier valid rows', async () => {
  const mock = api({digitalize:a, 'digital-dwi':changed});
  await assert.rejects(organizeBranches(options(mock, {apply:true})), /[Cc]hanged.*digital-dwi/);
  assert.equal(mock.calls.length, 4);
  assert.equal(writes(mock).length, 0);
});

test('an existing destination is a collision even when both refs share the expected commit', async () => {
  const mock = api({digitalize:a, 'digitalized-core-portal':a, 'digital-dwi':b});
  await assert.rejects(organizeBranches(options(mock, {apply:true})), /[Cc]ollision/);
  assert.equal(writes(mock).length, 0);
  assert.equal(mock.refs.get('digitalize'), a);
});

test('missing source and destination or a changed completed target stop before writes', async () => {
  for (const initial of [{'digital-dwi':b}, {'digitalized-core-portal':changed, 'digital-dwi':b}]) {
    const mock = api(initial);
    await assert.rejects(organizeBranches(options(mock, {apply:true})), /[Mm]issing|[Cc]hanged/);
    assert.equal(writes(mock).length, 0);
  }
});

test('matching completed renames are idempotent without recreating old branch aliases', async () => {
  const mock = api({'digitalized-core-portal':a, 'digitalized-game-language':b});
  const events = [];
  const result = await organizeBranches(options(mock, {apply:true, onEvent:event=>events.push(event)}));
  assert.equal(result.renamed, 0);
  assert.equal(result.alreadyRenamed, 2);
  assert.equal(writes(mock).length, 0);
  assert.deepEqual(events.filter(event=>event.event==='receipt').map(event=>event.status), ['already-renamed', 'already-renamed']);
  assert.equal(mock.refs.has('digitalize'), false);
});

test('apply uses native rename only and emits receipts after exact target verification', async () => {
  const mock = api({digitalize:a, 'digital-dwi':b, main:changed});
  const receipts = [];
  const result = await organizeBranches(options(mock, {apply:true, onEvent:event=>{
    if (event.event === 'receipt') {
      assert.equal(mock.refs.get(event.to), event.sha);
      assert.equal(mock.refs.has(event.from), false);
      assert.ok(mock.calls.some(call=>call.method==='GET' && call.url.endsWith('/git/ref/heads/' + event.to)));
      receipts.push(event);
    }
  }}));
  assert.equal(result.renamed, 2);
  assert.equal(result.pending, 0);
  assert.deepEqual(writes(mock).map(call=>[call.method, call.url, JSON.parse(call.body)]), [
    ['POST', 'https://api.github.com/repos/unDead41/geodecoder/branches/digitalize/rename', {new_name:'digitalized-core-portal'}],
    ['POST', 'https://api.github.com/repos/unDead41/geodecoder/branches/digital-dwi/rename', {new_name:'digitalized-game-language'}]
  ]);
  assert.equal(receipts.length, 2);
  assert.equal(mock.refs.get('main'), changed);
  for (const call of mock.calls) {
    assert.equal(call.headers.Authorization, 'Bearer ' + token);
    assert.equal(call.redirect, 'error');
  }
  const repeated = await organizeBranches(options(mock, {apply:true}));
  assert.equal(repeated.alreadyRenamed, 2);
  assert.equal(writes(mock).length, 2);
});

test('a source move after full preflight is caught by recheck before the first POST', async () => {
  let gets = 0;
  const mock = api({digitalize:a, 'digital-dwi':b}, async (call, refs) => {
    if (call.method === 'GET' && ++gets === 5) refs.set('digitalize', changed);
  });
  await assert.rejects(organizeBranches(options(mock, {apply:true})), /[Cc]hanged.*digitalize/);
  assert.equal(writes(mock).length, 0);
});

test('a failed native endpoint stops without create, delete, ref update or rollback fallbacks', async () => {
  const mock = api({digitalize:a, 'digital-dwi':b}, async call => call.method==='POST'
    ? Response.json({message:'private upstream detail ' + token}, {status:422}) : undefined);
  await assert.rejects(organizeBranches(options(mock, {apply:true})), error=>{
    assert.match(error.message, /HTTP 422/);
    assert.ok(!error.message.includes(token));
    assert.ok(!error.message.includes('private upstream detail'));
    return true;
  });
  assert.equal(writes(mock).length, 1);
  assert.ok(writes(mock)[0].url.endsWith('/branches/digitalize/rename'));
  assert.equal(mock.refs.get('digitalize'), a);
});

test('unexpected target SHA after native rename halts remaining operations and withholds a false receipt', async () => {
  const events = [];
  const mock = api({digitalize:a, 'digital-dwi':b}, async (call, refs) => {
    if (call.method==='GET' && call.url.endsWith('/digitalized-core-portal') && refs.has('digitalized-core-portal')) refs.set('digitalized-core-portal', changed);
  });
  await assert.rejects(organizeBranches(options(mock, {apply:true, onEvent:event=>events.push(event)})), /[Cc]hanged|[Vv]erif/);
  assert.equal(writes(mock).length, 1);
  assert.equal(events.filter(event=>event.event==='receipt').length, 0);
  assert.equal(mock.refs.get('digital-dwi'), b);
});

test('unsafe registries cannot redirect the token, touch preserved branches or plan duplicate refs', async () => {
  const invalid = [
    {...registry(), repository:'other/repo'},
    {...registry(), publicationBranch:'main-digital'},
    {...registry(), protectedBranches:[]},
    registry([{from:'main-digitalized', to:'digitalized-release-legacy', sha:a}]),
    registry([{from:'main', to:'digitalized-release-legacy', sha:a}]),
    registry([{from:'digitalize', to:'main-digitalized', sha:a}]),
    registry([{...rows[0], sha:'abc'}]),
    registry([{...rows[0], sha:[a]}]),
    registry([rows[0], {...rows[1], to:rows[0].to}]),
    registry([rows[0], {...rows[1], from:rows[0].from}])
  ];
  for (const input of invalid) {
    const mock = api({digitalize:a, 'digital-dwi':b});
    await assert.rejects(organizeBranches(options(mock, {registry:input, apply:true})), /[Rr]egistry|[Pp]rotected|[Pp]reserved|[Ii]nvalid|[Dd]uplicate/);
    assert.equal(mock.calls.length, 0);
  }
});

test('missing credentials fail before any request; existing GITHUB_TOKEN is accepted', async () => {
  const missing = api({digitalize:a, 'digital-dwi':b});
  await assert.rejects(organizeBranches(options(missing, {env:{}})), /GH_TOKEN.*GITHUB_TOKEN/);
  assert.equal(missing.calls.length, 0);
  const mock = api({digitalize:a, 'digital-dwi':b});
  await organizeBranches(options(mock, {env:{GITHUB_TOKEN:token}}));
  assert.ok(mock.calls.every(call=>call.headers.Authorization === 'Bearer ' + token));
});

test('nonexact or malformed reference responses never authorize a mutation', async () => {
  for (const response of [
    {ref:'refs/heads/elsewhere', object:{type:'commit', sha:a}},
    {ref:'refs/heads/digitalize', object:{type:'tag', sha:a}},
    {ref:'refs/heads/digitalize', object:{type:'commit', sha:[a]}},
    [{ref:'refs/heads/digitalize', object:{type:'commit', sha:a}}]
  ]) {
    const mock = api({digitalize:a, 'digital-dwi':b}, async call=>call.url.endsWith('/digitalize') ? Response.json(response) : undefined);
    await assert.rejects(organizeBranches(options(mock, {apply:true})), /[Ii]nvalid|[Ee]xact/);
    assert.equal(writes(mock).length, 0);
  }
});

test('CLI defaults to dry run and renders credential-safe structured failures', async t => {
  const directory = await mkdtemp(path.join(tmpdir(), 'geodecoder-branches-'));
  t.after(()=>rm(directory, {recursive:true, force:true}));
  const file = path.join(directory, 'registry.json');
  await writeFile(file, JSON.stringify(registry()));
  const mock = api({digitalize:a, 'digital-dwi':b});
  const out = [], errors = [];
  const base = {argv:['--registry', file], env:{GH_TOKEN:token}, stdout:line=>out.push(line), stderr:line=>errors.push(line)};
  assert.equal(await runCli({...base, fetchImpl:mock.fetchImpl}), 0);
  assert.equal(writes(mock).length, 0);
  assert.equal(JSON.parse(out.at(-1)).mode, 'dry-run');
  assert.equal(errors.length, 0);
  const failing = async ()=>{throw new Error('transport Authorization: Bearer ' + token);};
  assert.equal(await runCli({...base, fetchImpl:failing}), 1);
  assert.equal(JSON.parse(errors.at(-1)).event, 'error');
  assert.ok(!errors.join('').includes(token));
  assert.ok(!out.join('').includes(token));
  assert.equal(await runCli({...base, argv:['--token=' + token], fetchImpl:mock.fetchImpl}), 1);
  assert.ok(!errors.join('').includes(token));
});

test('checked-in registry is accepted and its full rename set can be reviewed without writes', async () => {
  const input = JSON.parse(await readFile(new URL('../docs/branch-registry.json', import.meta.url), 'utf8'));
  const mock = api(Object.fromEntries(input.renames.map(row=>[row.from,row.sha])));
  const result = await organizeBranches(options(mock, {registry:input}));
  assert.equal(result.pending, 11);
  assert.equal(mock.calls.length, 22);
  assert.equal(writes(mock).length, 0);
});
