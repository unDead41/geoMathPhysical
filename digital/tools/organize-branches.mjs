import {readFile} from 'node:fs/promises';
import {setTimeout as delay} from 'node:timers/promises';
import {pathToFileURL} from 'node:url';

const repository = 'unDead41/geodecoder';
const publicationBranch = 'main-digitalized';
const preserved = ['main-digitalized', 'main', 'sharing', 'codex/game-flow-rgb', 'codex/question-audio-elevenlabs', 'codex/question-bank-harmonised-lcd', 'codex/serial-unassign', 'testing/components'];
const shaPattern = /^[a-f0-9]{40}$/;
const defaultRegistry = new URL('../docs/branch-registry.json', import.meta.url);

class OrganizationError extends Error {}
const fail = message => { throw new OrganizationError(message); };

function validateRegistry(input) {
  if (input?.schemaVersion !== 1 || input.repository !== repository || input.publicationBranch !== publicationBranch)
    fail('Invalid registry identity; only the private GeoDecoder source repository is allowed.');
  if (!Array.isArray(input.protectedBranches) || !preserved.every(name=>input.protectedBranches.includes(name)))
    fail('Invalid registry: all preserved branches must be listed.');
  if (!Array.isArray(input.renames) || !input.renames.length) fail('Invalid registry: rename rows are required.');
  const blocked = new Set([...preserved, ...input.protectedBranches]);
  const sources = new Set(), destinations = new Set();
  const rows = input.renames.map(row=>{
    if (blocked.has(row?.from) || blocked.has(row?.to)) fail('Protected branch names cannot be renamed.');
    if (typeof row?.from !== 'string' || !/^(?:digital(?:ize)?(?:-[A-Za-z0-9-]+)?|main-digital)$/.test(row.from) ||
        typeof row.to !== 'string' || !/^digitalized-(?:core|game|ux|module|utility|release)-[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.to) ||
        typeof row.sha !== 'string' || !shaPattern.test(row.sha)) fail('Invalid registry rename row: digital names and a full commit SHA are required.');
    if (sources.has(row.from) || destinations.has(row.to)) fail('Duplicate source or destination in registry.');
    sources.add(row.from); destinations.add(row.to);
    return {from:row.from, to:row.to, sha:row.sha};
  });
  if ([...destinations].some(name=>sources.has(name))) fail('Invalid registry: rename chains are not allowed.');
  return rows;
}

function githubClient(env, fetchImpl) {
  const token = env.GH_TOKEN?.trim() || env.GITHUB_TOKEN?.trim();
  if (!token || /\s/.test(token)) fail('An existing GH_TOKEN or GITHUB_TOKEN environment variable is required.');
  if (typeof fetchImpl !== 'function') fail('This utility requires Node.js with fetch support.');
  async function request(endpoint, {method = 'GET', body} = {}) {
    let response;
    try {
      response = await fetchImpl('https://api.github.com/repos/' + repository + endpoint, {
        method, redirect:'error', signal:AbortSignal.timeout(15000),
        headers:{Accept:'application/vnd.github+json', Authorization:'Bearer ' + token, 'X-GitHub-Api-Version':'2026-03-10', ...(body ? {'Content-Type':'application/json'} : {})},
        ...(body ? {body:JSON.stringify(body)} : {})
      });
    } catch {
      fail(method === 'POST'
        ? 'Native rename outcome is unconfirmed; stop and inspect exact refs before rerunning.'
        : 'GitHub reference read failed; no error or credential details were logged.');
    }
    if (method === 'GET' && response.status === 404) return null;
    if (response.status !== (method === 'POST' ? 201 : 200))
      fail('GitHub returned HTTP ' + response.status + ' during ' + (method === 'POST' ? 'native rename; stopped without fallback.' : 'a reference read.'));
    try { return await response.json(); }
    catch { fail('Invalid GitHub JSON response; stop and inspect refs before rerunning.'); }
  }
  async function readRef(name) {
    // Git refs are exact; branch GETs may redirect an old renamed branch name.
    const value = await request('/git/ref/heads/' + encodeURIComponent(name));
    if (value === null) return null;
    if (value?.ref !== 'refs/heads/' + name || value.object?.type !== 'commit' || typeof value.object?.sha !== 'string' || !shaPattern.test(value.object.sha))
      fail('Invalid exact reference response for ' + name + '.');
    return value.object.sha;
  }
  return {readRef, rename:(from,to)=>request('/branches/' + encodeURIComponent(from) + '/rename', {method:'POST', body:{new_name:to}})};
}

async function preflight(rows, client) {
  const names = rows.flatMap(row=>[row.from,row.to]);
  const results = await Promise.allSettled(names.map(name=>client.readRef(name)));
  const failed = results.find(result=>result.status==='rejected');
  if (failed) throw failed.reason;
  const refs = new Map(names.map((name,index)=>[name,results[index].value]));
  const problems = [];
  const plan = rows.map(row=>{
    const source = refs.get(row.from), target = refs.get(row.to);
    if (source && source !== row.sha) problems.push('Changed source head: ' + row.from + '.');
    else if (source && target) problems.push('Destination collision: ' + row.to + '.');
    else if (!source && target && target !== row.sha) problems.push('Changed destination head: ' + row.to + '.');
    else if (!source && !target) problems.push('Missing source and destination: ' + row.from + ' (check repository access).');
    return {...row,status:source ? 'ready' : 'already-renamed'};
  });
  if (problems.length) fail('Preflight failed. ' + problems.join(' '));
  return plan;
}

async function verifyRename(row, client) {
  // GitHub can finish the native rename in the background. Never retry the POST.
  for (let attempt = 0; attempt < 6; attempt++) {
    const [target,source] = await Promise.all([client.readRef(row.to),client.readRef(row.from)]);
    if (target && target !== row.sha) fail('Verification failed: changed target head for ' + row.to + '.');
    if (source && source !== row.sha) fail('Verification failed: changed source head for ' + row.from + '.');
    if (target === row.sha && source === null) return;
    if (attempt < 5) await delay(200);
  }
  fail('Native rename verification is pending for ' + row.to + '; inspect refs before rerunning.');
}

export async function organizeBranches({registry, apply = false, env = process.env, fetchImpl = globalThis.fetch, onEvent = () => {}} = {}) {
  const rows = validateRegistry(registry);
  const client = githubClient(env, fetchImpl);
  const plan = await preflight(rows, client);
  const mode = apply ? 'apply' : 'dry-run';
  onEvent({event:'preflight',repository,mode,plan});
  const result = {repository,mode,plan,receipts:[],renamed:0,alreadyRenamed:plan.filter(row=>row.status==='already-renamed').length,pending:plan.filter(row=>row.status==='ready').length};
  if (apply) {
    result.alreadyRenamed = 0;
    for (const row of plan) {
      // Rename has no atomic expected-SHA parameter. Recheck each pair before POST.
      const [current] = await preflight([row], client);
      if (row.status === 'already-renamed' && current.status !== 'already-renamed')
        fail('Preflight state changed for ' + row.from + '; stopped before its rename.');
      let status = 'already-renamed';
      if (current.status === 'ready') {
        const response = await client.rename(row.from,row.to);
        await verifyRename(row,client);
        if (response?.name !== row.to || response.commit?.sha !== row.sha)
          fail('Native rename response did not match the verified target; inspect refs before rerunning.');
        status = 'renamed';
        result.renamed++;
      } else result.alreadyRenamed++;
      const receipt = {event:'receipt',repository,from:row.from,to:row.to,sha:row.sha,status};
      result.receipts.push(receipt);
      onEvent(receipt);
    }
    result.pending = 0;
  }
  const {receipts,plan:ignored,...summary} = result;
  onEvent({event:'complete',...summary});
  return result;
}

export async function runCli({argv = process.argv.slice(2), env = process.env, fetchImpl = globalThis.fetch,
  stdout = line=>process.stdout.write(line), stderr = line=>process.stderr.write(line)} = {}) {
  try {
    let file = defaultRegistry, apply = false, modeSeen = false, registrySeen = false;
    if (argv.length === 1 && argv[0] === '--help') {
      stdout('Usage: node tools/organize-branches.mjs [--dry-run | --apply] [--registry path]\nDefault: read-only dry run. Credentials: existing GH_TOKEN or GITHUB_TOKEN only.\n');
      return 0;
    }
    for (let index = 0; index < argv.length; index++) {
      if (argv[index] === '--apply' || argv[index] === '--dry-run') {
        if (modeSeen) fail('Choose exactly one mode: --dry-run or --apply.');
        modeSeen = true; apply = argv[index] === '--apply';
      } else if (argv[index] === '--registry') {
        if (registrySeen || !argv[index + 1] || argv[index + 1].startsWith('--')) fail('A single registry path is required.');
        registrySeen = true; file = argv[++index];
      } else fail('Unknown option. Use --help for supported arguments.');
    }
    let registry;
    try { registry = JSON.parse(await readFile(file,'utf8')); }
    catch { fail('Cannot read a valid branch registry JSON file.'); }
    await organizeBranches({registry,apply,env,fetchImpl,onEvent:event=>stdout(JSON.stringify(event) + '\n')});
    return 0;
  } catch (error) {
    stderr(JSON.stringify({event:'error',message:error instanceof OrganizationError ? error.message : 'Branch organization failed; no error or credential details were logged.'}) + '\n');
    return 1;
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) process.exitCode = await runCli();
